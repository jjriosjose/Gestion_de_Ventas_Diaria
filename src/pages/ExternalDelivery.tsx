import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AlertTriangle, Camera, CheckCircle2, ChevronRight, CircleAlert, Clock3, LoaderCircle, MapPin, Minus, Navigation, PackageCheck,
  Phone, Play, Plus, RefreshCw, RotateCcw, ShieldCheck, Truck, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SignaturePad } from '../components/SignaturePad'
import { currency } from '../lib/logistics'
import '../styles/delivery-driver.css'

type TripPayload = {
  trip: any
  stops: any[]
  documents: any[]
  incidents: any[]
}

type Geo = { latitude: number; longitude: number; accuracy: number } | null

const INCIDENT_TYPES = [
  'NEUMATICO_PINCHADO','AVERIA_MECANICA','ACCIDENTE','TRANSITO_CONGESTION','VIA_BLOQUEADA','PROBLEMA_SEGURIDAD',
  'RETRASO_CARGA','RETRASO_CLIENTE','CLIENTE_CERRADO','DIRECCION_INCORRECTA','RECHAZO_MERCANCIA','MERCANCIA_DANADA',
  'FALTANTE_MERCANCIA','PROBLEMA_DOCUMENTAL','PROBLEMA_VEHICULO','PROBLEMA_CHOFER','NO_LOCALIZA_DESTINO','OTRO',
]

const DELIVERY_EXCEPTION_REASONS = [
  ['FALTANTE_MERCANCIA', 'Faltante de mercancía'],
  ['RECHAZO_CLIENTE', 'Cliente rechazó parte'],
  ['RECHAZO_CLIENTE_TOTAL', 'Cliente rechazó factura completa'],
  ['MERCANCIA_DANADA', 'Mercancía dañada'],
  ['NO_CARGADA', 'Mercancía no cargada'],
  ['ERROR_DOCUMENTAL', 'Error documental'],
  ['OTRO', 'Otro'],
] as const

function label(value: string) {
  const map: Record<string,string> = {
    READY:'Listo para salir',IN_ROUTE:'En ruta',WITH_INCIDENT:'Con incidencia',RETURNING:'Retornando',COMPLETED:'Finalizado',
    PENDING:'Pendiente',EN_ROUTE:'En camino',AT_CLIENT:'En cliente',WAITING_UNLOAD:'Esperando descarga',UNLOADING:'Descargando',
    DELIVERED:'Entregada',PARTIAL:'Entrega parcial',NOT_DELIVERED:'No entregada',RESCHEDULED:'Reprogramada',CANCELLED:'Cancelada',
  }
  return map[value] || value.replace(/_/g,' ')
}

function incidentLabel(value: string) { return value.replace(/_/g, ' ').toLocaleLowerCase('es').replace(/^./, letter => letter.toUpperCase()) }
function terminal(status: string) { return ['DELIVERED','PARTIAL','NOT_DELIVERED','RESCHEDULED','CANCELLED'].includes(status) }

async function getGeo(): Promise<Geo> {
  if (!navigator.geolocation) return null
  return new Promise(resolve => navigator.geolocation.getCurrentPosition(
    position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
    () => resolve(null),
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 },
  ))
}

async function imageToDataUrl(file: File) {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file)
  })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source
  })
  const max = 1280
  const scale = Math.min(1, max / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
  const ctx = canvas.getContext('2d'); if (!ctx) return source
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', .72)
}

function clampPackages(value: unknown, loaded: unknown) {
  const max = Math.max(0, Math.trunc(Number(loaded) || 0))
  const parsed = Math.trunc(Number(value) || 0)
  return Math.max(0, Math.min(max, parsed))
}

export function ExternalDelivery() {
  const { token = '' } = useParams()
  const [pin, setPin] = useState(() => sessionStorage.getItem(`delivery-pin-${token}`) || '')
  const [payload, setPayload] = useState<TripPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [revisionNotice, setRevisionNotice] = useState(false)
  const revisionRef = useRef<number | null>(null)
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [incident, setIncident] = useState({ stopId:'', type:'NEUMATICO_PINCHADO', severity:'DELAY', description:'', stoppedTrip:false })
  const [resolvingIncidentId, setResolvingIncidentId] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [deliveryStopId, setDeliveryStopId] = useState<string | null>(null)
  const [deliveryStage, setDeliveryStage] = useState<'DETAILS'|'SIGNATURE'>('DETAILS')
  const [receiver, setReceiver] = useState({ name:'', document:'', phone:'', notes:'' })
  const [signature, setSignature] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [packageValues, setPackageValues] = useState<Record<string,string>>({})
  const [documentReasons, setDocumentReasons] = useState<Record<string,string>>({})
  const [documentNotes, setDocumentNotes] = useState<Record<string,string>>({})
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null)

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error: invokeError } = await supabase.functions.invoke('delivery-access', { body: { action, token, pin, ...extra } })
    if (invokeError) throw new Error((data as any)?.error || invokeError.message)
    if ((data as any)?.error) throw new Error((data as any).error)
    return data as TripPayload
  }

  const applyPayload = (next: TripPayload, announce = true) => {
    const nextRevision = Number(next.trip?.route_revision || 1)
    if (announce && revisionRef.current != null && nextRevision > revisionRef.current) setRevisionNotice(true)
    revisionRef.current = nextRevision
    setPayload(next)
    setLastSyncedAt(new Date())
  }

  const validate = async () => {
    if (!pin.trim()) return setError('Escribe el PIN de seguridad.')
    setLoading(true); setError(''); setMessage('')
    try {
      const data = await call('validate')
      sessionStorage.setItem(`delivery-pin-${token}`, pin)
      applyPayload(data, false)
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible abrir el viaje.') }
    finally { setLoading(false) }
  }

  const refresh = async () => {
    if (!payload) return
    setBusy(true); setError(''); setMessage('')
    try {
      applyPayload(await call('refresh'))
      setMessage('Ruta actualizada manualmente.')
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible actualizar.') }
    finally { setBusy(false) }
  }

  const stops = useMemo(() => [...(payload?.stops || [])].sort((a,b) => a.stop_order-b.stop_order), [payload])
  const completedCount = stops.filter(stop => terminal(stop.status)).length
  const nextStop = stops.find(stop => !terminal(stop.status)) || null
  const allDone = stops.length > 0 && completedCount === stops.length

  const event = async (action: 'trip_event'|'stop_event', values: Record<string, unknown>) => {
    if (payload?.trip?.status === 'COMPLETED') return setError('El viaje ya fue finalizado y está en modo solo lectura.')
    setBusy(true); setError(''); setMessage('')
    const geo = await getGeo()
    try {
      const data = await call(action, { ...values, ...(geo || {}) })
      applyPayload(data, false); setMessage(geo ? 'Evento registrado con GPS.' : 'Evento registrado. GPS no estuvo disponible.')
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible registrar el evento.') }
    finally { setBusy(false) }
  }

  const navigate = (stop: any) => {
    if (stop.planned_latitude == null || stop.planned_longitude == null) return
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.planned_latitude},${stop.planned_longitude}`, '_blank', 'noopener,noreferrer')
  }

  const setDeliveredPackages = (doc: any, value: unknown) => {
    const delivered = clampPackages(value, doc.packages_loaded)
    setPackageValues(current => ({ ...current, [doc.id]: String(delivered) }))
    if (delivered >= Number(doc.packages_loaded || 0)) {
      setDocumentReasons(current => ({ ...current, [doc.id]: '' }))
      setDocumentNotes(current => ({ ...current, [doc.id]: '' }))
    }
  }

  const openDelivery = (stop: any) => {
    const docs = (payload?.documents || []).filter(doc => doc.stop_id === stop.id)
    setPackageValues(Object.fromEntries(docs.map(doc => [doc.id, String(Math.max(0, Math.trunc(Number(doc.packages_loaded) || 0)))])))
    setDocumentReasons({})
    setDocumentNotes({})
    setExpandedDocumentId(null)
    setDeliveryStage('DETAILS')
    setReceiver({ name:'', document:'', phone:'', notes:'' }); setSignature(null); setPhoto(null); setDeliveryStopId(stop.id)
  }

  const buildDeliveryDocumentPayload = () => {
    if (!deliveryStopId || !payload) return []
    const docs = payload.documents.filter(doc => doc.stop_id === deliveryStopId)
    return docs.map(doc => {
      const delivered = clampPackages(packageValues[doc.id] ?? doc.packages_loaded, doc.packages_loaded)
      const loaded = Math.max(0, Math.trunc(Number(doc.packages_loaded) || 0))
      const selectedReason = delivered < loaded ? String(documentReasons[doc.id] || '').trim() : ''
      const selectedNote = delivered < loaded ? String(documentNotes[doc.id] || '').trim() : ''
      const fullClientRejection = selectedReason === 'RECHAZO_CLIENTE_TOTAL'
      return {
        id: doc.id,
        packages_delivered: delivered,
        exception_reason: fullClientRejection ? 'RECHAZO_CLIENTE' : selectedReason,
        exception_note: fullClientRejection ? ['Cliente rechazó factura completa', selectedNote].filter(Boolean).join(' · ') : selectedNote,
        ui_reason: selectedReason,
        label: doc.invoice_number ? `Factura ${doc.invoice_number}` : `Pedido ${doc.order_number}`,
        loaded,
      }
    })
  }

  const validateDeliveryDetails = () => {
    if (!receiver.name.trim()) { setError('Indica el nombre de quien recibe.'); return null }
    const documentPayload = buildDeliveryDocumentPayload()
    const missingReason = documentPayload.find(item => item.packages_delivered < item.loaded && !item.ui_reason)
    if (missingReason) {
      setExpandedDocumentId(missingReason.id)
      setError(`Selecciona el motivo de diferencia para ${missingReason.label}.`)
      return null
    }
    const missingOtherDetail = documentPayload.find(item => item.ui_reason === 'OTRO' && !item.exception_note)
    if (missingOtherDetail) {
      setExpandedDocumentId(missingOtherDetail.id)
      setError(`Describe el motivo para ${missingOtherDetail.label}.`)
      return null
    }
    return documentPayload
  }

  const continueToSignature = () => {
    if (!deliveryStopId || !payload) return
    if (payload.trip?.status === 'COMPLETED') return setError('El viaje ya fue finalizado y no acepta nuevas entregas.')
    setError('')
    const documentPayload = validateDeliveryDetails()
    if (!documentPayload) return
    setSignature(null)
    setDeliveryStage('SIGNATURE')
  }

  const submitDelivery = async () => {
    if (!deliveryStopId || !payload) return
    if (payload.trip?.status === 'COMPLETED') return setError('El viaje ya fue finalizado y no acepta nuevas entregas.')
    if (deliveryStage !== 'SIGNATURE') return setError('Completa primero los datos de entrega y continúa a firma.')
    const documentPayload = validateDeliveryDetails()
    if (!documentPayload) { setDeliveryStage('DETAILS'); return }
    if (!signature) return setError('Solicita la firma de quien recibe antes de confirmar la entrega.')
    setBusy(true); setError(''); setMessage('')
    const geo = await getGeo()
    try {
      const data = await call('delivery_result', {
        stop_id: deliveryStopId, result:'DELIVERED', ...(geo || {}), receiver_name: receiver.name, receiver_document: receiver.document,
        receiver_phone: receiver.phone, notes: receiver.notes, signature_data_url: signature, photo_data_url: photo,
        documents: documentPayload.map(({ label: _label, loaded: _loaded, ui_reason: _uiReason, ...item }) => item),
      })
      applyPayload(data, false); setDeliveryStage('DETAILS'); setDeliveryStopId(null); setMessage('Entrega registrada con conciliación por documento y firma.')
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible confirmar la entrega.') }
    finally { setBusy(false) }
  }

  const deliveryFailure = async (stopId: string, result: 'NOT_DELIVERED'|'RESCHEDULED') => {
    const notes = window.prompt(result === 'RESCHEDULED' ? 'Motivo de reprogramación' : 'Motivo de no entrega') || ''
    if (!notes.trim()) return
    setBusy(true); setError('')
    const geo = await getGeo()
    try { applyPayload(await call('delivery_result', { stop_id: stopId, result, notes, ...(geo || {}) }), false); setMessage('Resultado registrado.') }
    catch (err) { setError(err instanceof Error ? err.message : 'No fue posible registrar el resultado.') }
    finally { setBusy(false) }
  }

  const submitIncident = async () => {
    if (payload?.trip?.status === 'COMPLETED') return setError('El viaje ya fue finalizado y no acepta nuevas incidencias.')
    setBusy(true); setError('')
    const geo = await getGeo()
    try {
      applyPayload(await call('incident', { stop_id: incident.stopId || null, incident_type: incident.type, severity: incident.severity, description: incident.description, stopped_trip: incident.stoppedTrip, ...(geo || {}) }), false)
      setIncidentOpen(false); setIncident({ stopId:'', type:'NEUMATICO_PINCHADO', severity:'DELAY', description:'', stoppedTrip:false }); setMessage('Incidencia reportada. Podrás marcarla como resuelta desde esta misma ruta.')
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible registrar la incidencia.') }
    finally { setBusy(false) }
  }

  const submitIncidentResolution = async () => {
    if (!resolvingIncidentId) return
    if (!resolutionNotes.trim()) return setError('Describe brevemente cómo se resolvió la incidencia.')
    setBusy(true); setError(''); setMessage('')
    const geo = await getGeo()
    try {
      applyPayload(await call('resolve_incident', { incident_id: resolvingIncidentId, resolution_notes: resolutionNotes.trim(), ...(geo || {}) }), false)
      setResolvingIncidentId(null); setResolutionNotes(''); setMessage(geo ? 'Incidencia resuelta con hora y GPS.' : 'Incidencia resuelta. GPS no estuvo disponible.')
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible resolver la incidencia.') }
    finally { setBusy(false) }
  }

  const acknowledgeRevision = async () => {
    setRevisionNotice(false)
    try { applyPayload(await call('trip_event', { event_type:'ROUTE_UPDATE_ACK' }), false) } catch { /* no bloquea el viaje */ }
  }

  if (!payload) return <main className="external-delivery-login"><div className="external-delivery-card"><img src="/logo-karaka.png"/><span className="eyebrow">ENTREGA SEGURA</span><h1>Acceso de chofer</h1><p>Este enlace permite únicamente ejecutar el viaje que te fue asignado.</p><label>PIN de seguridad<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000"/></label>{error && <div className="driver-alert error"><AlertTriangle/>{error}</div>}<button className="primary full" disabled={loading || pin.length < 4} onClick={() => void validate()}>{loading ? <LoaderCircle className="spin"/> : <ShieldCheck/>}Abrir mi ruta</button><small>El acceso caduca automáticamente y no permite ver otras áreas de la aplicación.</small></div></main>

  const trip = payload.trip
  const canOperate = !['COMPLETED','CANCELLED'].includes(String(trip.status))
  const openIncidents = payload.incidents.filter(item => item.status === 'OPEN')
  const resolvingIncident = resolvingIncidentId ? payload.incidents.find(item => item.id === resolvingIncidentId) || null : null
  const deliveryDocuments = deliveryStopId ? payload.documents.filter(doc => doc.stop_id === deliveryStopId) : []
  const deliveryLoaded = deliveryDocuments.reduce((sum, doc) => sum + Math.max(0, Math.trunc(Number(doc.packages_loaded) || 0)), 0)
  const deliveryDelivered = deliveryDocuments.reduce((sum, doc) => sum + clampPackages(packageValues[doc.id] ?? doc.packages_loaded, doc.packages_loaded), 0)
  const deliveryReturned = Math.max(0, deliveryLoaded - deliveryDelivered)

  return <main className="external-delivery-shell">
    <header className="driver-topbar"><div><span>ENTREGA · {trip.trip_code}</span><b>{trip.driver_name_snapshot || 'Chofer'}</b></div><button title="Actualizar ruta manualmente" aria-label="Actualizar ruta manualmente" onClick={() => void refresh()} disabled={busy}><RefreshCw className={busy ? 'spin' : ''}/></button></header>
    <section className="driver-content">
      {revisionNotice && <div className="driver-route-update"><MapPin/><div><b>Ruta actualizada por Despacho</b><span>Hay nuevos datos o ubicaciones disponibles. No necesitas reiniciar la ruta.</span></div><button onClick={() => void acknowledgeRevision()}>Entendido</button></div>}
      {error && <div className="driver-alert error"><AlertTriangle/>{error}<button onClick={() => setError('')}><X/></button></div>}
      {message && <div className="driver-alert success"><CheckCircle2/>{message}<button onClick={() => setMessage('')}><X/></button></div>}

      <div className="driver-trip-card"><div className="driver-trip-head"><div className="driver-vehicle"><Truck/><div><b>{trip.vehicle_plate_snapshot || 'Vehículo'}</b><span>{trip.vehicle_type_snapshot || ''} · {trip.carrier_name_snapshot || 'Operación propia'}</span></div></div><span className={`driver-status ${String(trip.status).toLowerCase()}`}>{label(trip.status)}</span></div><div className="driver-progress"><div><span>Entregas</span><b>{completedCount} / {stops.length}</b></div><div><span>Bultos</span><b>{trip.total_packages}</b></div><div><span>Monto carga</span><b>{currency(trip.total_amount)}</b></div></div><div className="driver-progress-bar"><i style={{ width:`${stops.length ? Math.round(completedCount/stops.length*100) : 0}%` }}/></div><small>Revisión de ruta {trip.route_revision} · actualización manual · {lastSyncedAt ? `última ${lastSyncedAt.toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}` : 'sin actualizar'}</small></div>

      {['READY','LOADED','PREPARING'].includes(trip.status) && <button className="driver-main-action" disabled={busy} onClick={() => void event('trip_event',{event_type:'DEPARTED_ORIGIN'})}><Play/>Iniciar ruta · salir del centro de carga</button>}

      {canOperate && openIncidents.length > 0 && <div className="driver-trip-card"><div className="driver-section-head"><div><b>Incidencias abiertas</b><span>{openIncidents.length} pendiente(s) de confirmar como resuelta(s)</span></div></div>{openIncidents.map(item => <div key={item.id} className={item.severity === 'CRITICAL' || item.stopped_trip ? 'driver-alert error' : 'driver-route-update'}><CircleAlert/><div><b>{incidentLabel(item.incident_type)}</b><span>{item.description || 'Sin descripción'} · {item.severity === 'INFO' ? 'Informativa' : item.severity === 'DELAY' ? 'Demora' : 'Crítica'}{item.stopped_trip ? ' · viaje detenido' : ''}</span></div><button onClick={() => { setResolvingIncidentId(item.id); setResolutionNotes('') }}>Resolver</button></div>)}</div>}

      <div className="driver-section-head"><div><b>Paradas</b><span>{nextStop ? `Próxima: ${String(nextStop.stop_order).padStart(2,'0')} · ${nextStop.destination_name_snapshot}` : 'Todas tienen resultado'}</span></div>{canOperate && <button onClick={() => setIncidentOpen(true)}><CircleAlert/>Incidencia</button>}</div>

      <div className="driver-stop-stack">{stops.map(stop => {
        const docs = payload.documents.filter(doc => doc.stop_id === stop.id)
        const gpsReady = stop.planned_latitude != null && stop.planned_longitude != null
        return <article key={stop.id} className={`driver-stop ${terminal(stop.status) ? 'done' : nextStop?.id === stop.id ? 'next' : ''}`}>
          <div className="driver-stop-title"><span className="driver-stop-number">{String(stop.stop_order).padStart(2,'0')}</span><div><b>{stop.destination_name_snapshot}</b><span>{docs.map(doc => doc.invoice_number ? `F ${doc.invoice_number}` : `P ${doc.order_number}`).join(' · ')}</span></div><em>{label(stop.status)}</em></div>
          <div className="driver-stop-meta"><span><PackageCheck/> {stop.packages_loaded} bultos</span><span><Clock3/> {gpsReady ? 'GPS listo' : stop.geo_status === 'CAPTURED_AT_DELIVERY' ? 'GPS capturado' : 'Ubicación pendiente'}</span></div>
          {stop.destination_phone_snapshot && <a className="driver-phone" href={`tel:${stop.destination_phone_snapshot}`}><Phone/>Llamar al cliente</a>}
          {canOperate && !terminal(stop.status) && <div className="driver-stop-actions">
            <button className="secondary" disabled={!gpsReady} onClick={() => navigate(stop)}><Navigation/>{gpsReady ? 'Navegar' : 'Esperando ubicación'}</button>
            {stop.status === 'PENDING' && <button className="primary" disabled={busy} onClick={() => void event('stop_event',{stop_id:stop.id,event_type:'ARRIVED'})}><MapPin/>Llegué</button>}
            {stop.status === 'AT_CLIENT' && !stop.unload_started_at && <button className="primary" disabled={busy} onClick={() => void event('stop_event',{stop_id:stop.id,event_type:'UNLOAD_STARTED'})}><PackageCheck/>Iniciar descarga</button>}
            {stop.status === 'UNLOADING' && <button className="primary" disabled={busy} onClick={() => void event('stop_event',{stop_id:stop.id,event_type:'UNLOAD_FINISHED'})}><CheckCircle2/>Fin de descarga</button>}
            {stop.status === 'AT_CLIENT' && stop.unload_started_at && stop.unload_finished_at && <button className="primary" disabled={busy} onClick={() => openDelivery(stop)}><PackageCheck/>Confirmar entrega</button>}
          </div>}
          {canOperate && !terminal(stop.status) && stop.status !== 'PENDING' && <div className="driver-secondary-actions"><button onClick={() => void deliveryFailure(stop.id,'NOT_DELIVERED')}>No entregada</button><button onClick={() => void deliveryFailure(stop.id,'RESCHEDULED')}>Reprogramar</button></div>}
          {terminal(stop.status) && <div className="driver-stop-result"><CheckCircle2/><span>{label(stop.status)} · {stop.packages_delivered || 0} entregados / {stop.packages_returned || 0} retorno</span></div>}
        </article>
      })}</div>

      {allDone && trip.status !== 'COMPLETED' && <div className="driver-close-card"><CheckCircle2/><div><b>{trip.status === 'RETURNING' ? 'Regreso a base en curso' : 'Todas las paradas tienen resultado'}</b><span>{trip.status === 'RETURNING' ? 'Al llegar físicamente a la base, cierra el viaje para guardar la hora y el GPS final.' : 'Pulsa al salir del último cliente para iniciar el trayecto de regreso a base.'}</span></div>{trip.status === 'RETURNING' ? <button className="primary" disabled={busy} onClick={() => void event('trip_event',{event_type:'TRIP_COMPLETED'})}><MapPin/>Llegué a base · cerrar viaje</button> : <button className="primary" disabled={busy} onClick={() => void event('trip_event',{event_type:'RETURNED_ORIGIN'})}><RotateCcw/>Iniciar retorno a base</button>}</div>}
      {trip.status === 'COMPLETED' && <div className="driver-completed"><CheckCircle2/><h2>Viaje finalizado</h2><p>Las entregas y evidencias quedaron registradas. Este viaje está en modo solo lectura.</p></div>}
    </section>

    {incidentOpen && canOperate && <div className="driver-modal-wrap"><button className="driver-modal-backdrop" onClick={() => setIncidentOpen(false)}/><div className="driver-modal"><div className="driver-modal-head"><div><b>Registrar incidencia</b><span>Se enviará a Torre de Control con hora y GPS si está disponible.</span></div><button onClick={() => setIncidentOpen(false)}><X/></button></div><label>Parada relacionada<select value={incident.stopId} onChange={event => setIncident(current => ({...current,stopId:event.target.value}))}><option value="">Incidencia general del viaje</option>{stops.filter(stop => !terminal(stop.status)).map(stop => <option key={stop.id} value={stop.id}>{stop.stop_order}. {stop.destination_name_snapshot}</option>)}</select></label><label>Tipo<select value={incident.type} onChange={event => setIncident(current => ({...current,type:event.target.value}))}>{INCIDENT_TYPES.map(type => <option key={type} value={type}>{type.replace(/_/g,' ')}</option>)}</select></label><label>Severidad<select value={incident.severity} onChange={event => setIncident(current => ({...current,severity:event.target.value}))}><option value="INFO">Informativa</option><option value="DELAY">Genera demora</option><option value="CRITICAL">Crítica</option></select></label><label>Descripción<textarea value={incident.description} onChange={event => setIncident(current => ({...current,description:event.target.value}))} placeholder="Ej. Se pinchó un neumático delantero…"/></label><label className="driver-check"><input type="checkbox" checked={incident.stoppedTrip} onChange={event => setIncident(current => ({...current,stoppedTrip:event.target.checked}))}/><span>El viaje quedó detenido por esta incidencia</span></label><button className="primary full" disabled={busy} onClick={() => void submitIncident()}>{busy ? <LoaderCircle className="spin"/> : <CircleAlert/>}Reportar incidencia</button></div></div>}

    {resolvingIncident && canOperate && <div className="driver-modal-wrap"><button className="driver-modal-backdrop" onClick={() => setResolvingIncidentId(null)}/><div className="driver-modal"><div className="driver-modal-head"><div><b>Resolver incidencia</b><span>{incidentLabel(resolvingIncident.incident_type)} · confirma qué ocurrió antes de continuar.</span></div><button onClick={() => setResolvingIncidentId(null)}><X/></button></div><div className={resolvingIncident.severity === 'CRITICAL' || resolvingIncident.stopped_trip ? 'driver-alert error' : 'driver-route-update'}><CircleAlert/><div><b>{resolvingIncident.description || 'Incidencia reportada'}</b><span>{resolvingIncident.stopped_trip ? 'Esta incidencia marcó el viaje como detenido.' : 'La ruta puede continuar mientras se mantiene el seguimiento.'}</span></div></div><label>¿Cómo se resolvió?<textarea value={resolutionNotes} onChange={event => setResolutionNotes(event.target.value)} placeholder="Ej. Se reemplazó el neumático y el vehículo quedó operativo."/></label><button className="primary full" disabled={busy || !resolutionNotes.trim()} onClick={() => void submitIncidentResolution()}>{busy ? <LoaderCircle className="spin"/> : <CheckCircle2/>}Confirmar incidencia resuelta</button></div></div>}

    {deliveryStopId && payload && canOperate && <div className="driver-modal-wrap"><button className="driver-modal-backdrop" onClick={() => { if (!busy) { setDeliveryStage('DETAILS'); setDeliveryStopId(null) } }}/><div className={`driver-modal delivery-proof-modal ${deliveryStage === 'SIGNATURE' ? 'delivery-signature-stage' : ''}`}>
      {deliveryStage === 'DETAILS' ? <>
        <div className="driver-modal-head"><div><b>Confirmar entrega por documento</b><span>{stops.find(stop => stop.id === deliveryStopId)?.destination_name_snapshot} · {deliveryDocuments.length} documento(s)</span></div><button disabled={busy} onClick={() => setDeliveryStopId(null)}><X/></button></div>
        {error && <div className="driver-alert error"><AlertTriangle/>{error}</div>}
        <div className="driver-proof-summary"><div><span>Cargados</span><b>{deliveryLoaded}</b></div><div><span>Entregados</span><b>{deliveryDelivered}</b></div><div className={deliveryReturned > 0 ? 'has-return' : ''}><span>Retorno</span><b>{deliveryReturned}</b></div></div>
        <div className="driver-proof-docs">{deliveryDocuments.map(doc => {
          const loaded = Math.max(0, Math.trunc(Number(doc.packages_loaded) || 0))
          const delivered = clampPackages(packageValues[doc.id] ?? loaded, loaded)
          const returned = Math.max(0, loaded - delivered)
          const status = returned === 0 ? 'Completa' : delivered > 0 ? 'Parcial' : 'No entregada'
          const expanded = expandedDocumentId === doc.id
          return <div key={doc.id} className={`driver-proof-doc ${returned > 0 ? 'has-exception' : ''}`}>
            <button type="button" className="driver-proof-doc-head" onClick={() => setExpandedDocumentId(expanded ? null : doc.id)}>
              <ChevronRight className={expanded ? 'expanded' : ''}/><div><b>{doc.invoice_number ? `Factura ${doc.invoice_number}` : `Pedido ${doc.order_number}`}</b><span>{loaded} bultos cargados · {delivered} entregados</span></div><em className={returned === 0 ? 'complete' : delivered > 0 ? 'partial' : 'none'}>{status}</em>
            </button>
            {expanded && <div className="driver-proof-doc-body">
              <div className="driver-package-reconcile">
                <div><span>Cargados</span><b>{loaded}</b></div>
                <div className="driver-package-stepper"><span>Entregados</span><div><button type="button" onClick={() => setDeliveredPackages(doc, delivered - 1)} disabled={delivered <= 0}><Minus/></button><input inputMode="numeric" type="number" min="0" max={loaded} step="1" value={delivered} onChange={event => setDeliveredPackages(doc, event.target.value)}/><button type="button" onClick={() => setDeliveredPackages(doc, delivered + 1)} disabled={delivered >= loaded}><Plus/></button></div></div>
                <div className={returned > 0 ? 'has-return' : ''}><span>Retorno</span><b>{returned}</b></div>
              </div>
              {returned > 0 && <div className="driver-document-exception"><label>Motivo de la diferencia<select value={documentReasons[doc.id] || ''} onChange={event => setDocumentReasons(current => ({...current,[doc.id]:event.target.value}))}><option value="">Seleccionar motivo...</option>{DELIVERY_EXCEPTION_REASONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>{documentReasons[doc.id] === 'OTRO' && <label>Detalle obligatorio<input value={documentNotes[doc.id] || ''} onChange={event => setDocumentNotes(current => ({...current,[doc.id]:event.target.value}))} placeholder="Describe qué ocurrió con el bulto restante..."/></label>}</div>}
            </div>}
          </div>
        })}</div>
        {deliveryReturned > 0 && <div className="driver-reconcile-warning"><AlertTriangle/><span>La parada quedará como entrega parcial. Cada diferencia debe tener un motivo antes de continuar.</span></div>}
        <label>Nombre de quien recibe<input value={receiver.name} onChange={event => setReceiver(current => ({...current,name:event.target.value}))}/></label>
        <div className="driver-form-two"><label>Documento opcional<input value={receiver.document} onChange={event => setReceiver(current => ({...current,document:event.target.value}))}/></label><label>Teléfono opcional<input value={receiver.phone} onChange={event => setReceiver(current => ({...current,phone:event.target.value}))}/></label></div>
        <label className={`driver-photo-field ${photo ? 'ready' : ''}`}><Camera/><span>{photo ? 'Fotografía lista · tocar para cambiar' : 'Tomar foto de la entrega'}</span><input hidden type="file" accept="image/*" capture="environment" onChange={async event => { const file=event.target.files?.[0]; if(file)setPhoto(await imageToDataUrl(file)); event.target.value='' }}/></label>{photo && <img className="driver-photo-preview" src={photo} alt="Evidencia de entrega"/>}
        <label>Observación general de la entrega<textarea value={receiver.notes} onChange={event => setReceiver(current => ({...current,notes:event.target.value}))}/></label>
        <button className="primary full" disabled={busy || !receiver.name.trim()} onClick={continueToSignature}><ChevronRight/>Continuar a firma</button>
      </> : <>
        <div className="driver-modal-head"><div><b>Firma de recepción</b><span>{receiver.name} · {stops.find(stop => stop.id === deliveryStopId)?.destination_name_snapshot}</span></div><button disabled={busy} onClick={() => { setSignature(null); setDeliveryStage('DETAILS') }}><X/></button></div>
        {error && <div className="driver-alert error"><AlertTriangle/>{error}</div>}
        <div className="driver-signature-context"><div><span>Documentos</span><b>{deliveryDocuments.length}</b></div><div><span>Entregados</span><b>{deliveryDelivered}</b></div><div className={deliveryReturned > 0 ? 'has-return' : ''}><span>Retorno</span><b>{deliveryReturned}</b></div></div>
        <div className="driver-signature-instruction"><ShieldCheck/><div><b>Firma final del receptor</b><span>La entrega todavía no se ha guardado. Solicita la firma dentro del recuadro y confirma únicamente cuando termine.</span></div></div>
        <SignaturePad onChange={setSignature} disabled={busy}/>
        <div className="driver-signature-actions"><button className="secondary" disabled={busy} onClick={() => { setSignature(null); setError(''); setDeliveryStage('DETAILS') }}>Volver</button><button className="primary" disabled={busy || !signature} onClick={() => void submitDelivery()}>{busy ? <LoaderCircle className="spin"/> : <CheckCircle2/>}Confirmar firma y entrega</button></div>
      </>}
    </div></div>}
  </main>
}
