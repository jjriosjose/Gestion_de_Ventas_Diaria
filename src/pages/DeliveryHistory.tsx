import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarRange, Camera, CheckCircle2, FileText, LoaderCircle, MapPin, PackageCheck, RefreshCw, Route, Search, Signature, Truck, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { currency, localDate, type DeliveryDocument, type DeliveryStop, type DeliveryTrip } from '../lib/logistics'
import { DeliveryTripHistoryView } from '../components/DeliveryTripHistoryView'
import '../styles/logistics.css'
import '../styles/logistics-history.css'

type Proof = {
  id: string; trip_id: string; stop_id: string; receiver_name?: string | null; receiver_document?: string | null; receiver_phone?: string | null
  signature_object_path?: string | null; latitude?: number | null; longitude?: number | null; proof_quality: 'COMPLETE' | 'PARTIAL'; notes?: string | null
  captured_at: string
}
type Evidence = { id: string; trip_id: string; stop_id?: string | null; proof_id?: string | null; evidence_type: string; object_path: string; mime_type?: string | null; captured_at: string }
type ProofDocument = { proof_id: string; document_id: string }
type HistoryMode = 'DOCUMENTS' | 'TRIPS'

const EXCEPTION_LABELS: Record<string,string> = {
  FALTANTE_MERCANCIA: 'Faltante de mercancía',
  RECHAZO_CLIENTE: 'Cliente rechazó parte',
  MERCANCIA_DANADA: 'Mercancía dañada',
  NO_CARGADA: 'Mercancía no cargada',
  ERROR_DOCUMENTAL: 'Error documental',
  OTRO: 'Otro',
}

const STATUS_LABELS: Record<string,string> = {
  LOADED: 'Cargada', DELIVERED: 'Entregada', PARTIAL: 'Parcial', NOT_DELIVERED: 'No entregada', RESCHEDULED: 'Reprogramada', CANCELLED: 'Cancelada',
}

function deliveryException(notes?: string | null) {
  const line = String(notes || '').split('\n').find(item => item.trim().startsWith('[ENTREGA_EXCEPTION]'))
  if (!line) return null
  const raw = line.replace('[ENTREGA_EXCEPTION]', '').trim()
  const [code, ...detailParts] = raw.split('|').map(item => item.trim())
  return { code, label: EXCEPTION_LABELS[code] || code.replace(/_/g, ' '), detail: detailParts.join(' | ') }
}

function chunk<T>(items: T[], size = 100) {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

function defaultPeriod() {
  const today = localDate()
  return { from: `${today.slice(0, 7)}-01`, to: today }
}

export function DeliveryHistory() {
  const initialPeriod = useMemo(() => defaultPeriod(), [])
  const [trips, setTrips] = useState<DeliveryTrip[]>([])
  const [stops, setStops] = useState<DeliveryStop[]>([])
  const [documents, setDocuments] = useState<DeliveryDocument[]>([])
  const [proofs, setProofs] = useState<Proof[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [proofDocuments, setProofDocuments] = useState<ProofDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [mode, setMode] = useState<HistoryMode>('DOCUMENTS')
  const [q, setQ] = useState('')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [opening, setOpening] = useState('')
  const [dateFrom, setDateFrom] = useState(initialPeriod.from)
  const [dateTo, setDateTo] = useState(initialPeriod.to)
  const [appliedDateFrom, setAppliedDateFrom] = useState(initialPeriod.from)
  const [appliedDateTo, setAppliedDateTo] = useState(initialPeriod.to)

  const load = async (fromDate = appliedDateFrom, toDate = appliedDateTo) => {
    if (fromDate > toDate) { setMessage('La fecha Desde no puede ser posterior a la fecha Hasta.'); return }
    if (loadedOnce) setRefreshing(true)
    else setLoading(true)
    setMessage('')
    try {
      const loadedTrips: DeliveryTrip[] = []
      const pageSize = 500
      for (let offset = 0; ; offset += pageSize) {
        const tripRes = await supabase.from('delivery_trips').select('*')
          .gte('trip_date', fromDate).lte('trip_date', toDate)
          .order('trip_date', { ascending: false }).order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1)
        if (tripRes.error) throw tripRes.error
        const page = (tripRes.data || []) as DeliveryTrip[]
        loadedTrips.push(...page)
        if (page.length < pageSize) break
      }

      setTrips(loadedTrips)
      setSelectedDocId(null)
      const tripIds = loadedTrips.map(item => item.id)
      if (!tripIds.length) {
        setStops([]); setDocuments([]); setProofs([]); setEvidence([]); setProofDocuments([])
        return
      }

      const loadedStops: DeliveryStop[] = []
      const loadedDocs: DeliveryDocument[] = []
      const loadedProofs: Proof[] = []
      const loadedEvidence: Evidence[] = []
      for (const ids of chunk(tripIds)) {
        const [stopRes, docRes, proofRes, evidenceRes] = await Promise.all([
          supabase.from('delivery_stops').select('*').in('trip_id', ids).order('stop_order'),
          supabase.from('delivery_documents').select('*').in('trip_id', ids).order('created_at', { ascending: false }),
          supabase.from('delivery_proofs').select('*').in('trip_id', ids).order('captured_at', { ascending: false }),
          supabase.from('delivery_evidence').select('*').in('trip_id', ids).order('captured_at', { ascending: false }),
        ])
        const error = stopRes.error || docRes.error || proofRes.error || evidenceRes.error
        if (error) throw error
        loadedStops.push(...((stopRes.data || []) as DeliveryStop[]))
        loadedDocs.push(...((docRes.data || []) as DeliveryDocument[]))
        loadedProofs.push(...((proofRes.data || []) as Proof[]))
        loadedEvidence.push(...((evidenceRes.data || []) as Evidence[]))
      }
      setStops(loadedStops); setDocuments(loadedDocs); setProofs(loadedProofs); setEvidence(loadedEvidence)

      const links: ProofDocument[] = []
      const proofIds = loadedProofs.map(item => item.id)
      for (const ids of chunk(proofIds)) {
        const { data, error } = await supabase.from('delivery_proof_documents').select('proof_id,document_id').in('proof_id', ids)
        if (error) throw error
        links.push(...((data || []) as ProofDocument[]))
      }
      setProofDocuments(links)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible cargar el historial logístico.')
    } finally {
      setLoading(false); setRefreshing(false); setLoadedOnce(true)
    }
  }

  useEffect(() => { void load(initialPeriod.from, initialPeriod.to) }, [])

  const applyPeriod = () => {
    if (!dateFrom || !dateTo) { setMessage('Selecciona las fechas Desde y Hasta.'); return }
    if (dateFrom > dateTo) { setMessage('La fecha Desde no puede ser posterior a la fecha Hasta.'); return }
    setAppliedDateFrom(dateFrom); setAppliedDateTo(dateTo)
    void load(dateFrom, dateTo)
  }

  const tripMap = useMemo(() => new Map(trips.map(item => [item.id, item])), [trips])
  const stopMap = useMemo(() => new Map(stops.map(item => [item.id, item])), [stops])
  const visible = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('es')
    if (!term) return documents.slice(0, 150)
    return documents.filter(doc => {
      const trip = tripMap.get(doc.trip_id)
      const stop = stopMap.get(doc.stop_id)
      return [doc.invoice_number, doc.order_number, doc.client_name_snapshot, doc.external_client_code, trip?.trip_code, trip?.driver_name_snapshot, trip?.vehicle_plate_snapshot, stop?.destination_name_snapshot].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(term)
    }).slice(0, 250)
  }, [documents, q, tripMap, stopMap])
  const selected = documents.find(item => item.id === selectedDocId) || null
  const selectedTrip = selected ? tripMap.get(selected.trip_id) || null : null
  const selectedStop = selected ? stopMap.get(selected.stop_id) || null : null
  const selectedProofLink = selected ? proofDocuments.find(item => item.document_id === selected.id) || null : null
  const selectedProof = selectedProofLink ? proofs.find(item => item.id === selectedProofLink.proof_id) || null : null
  const selectedEvidence = selectedProof ? evidence.filter(item => item.proof_id === selectedProof.id) : []
  const selectedException = selected ? deliveryException(selected.notes) : null

  const openPrivate = async (path: string, key: string) => {
    setOpening(key); setMessage('')
    try {
      const { data, error } = await supabase.storage.from('delivery-evidence').createSignedUrl(path, 120)
      if (error) throw error
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible abrir la evidencia.') }
    finally { setOpening('') }
  }
  const openMap = () => {
    const lat = selectedProof?.latitude ?? selectedStop?.actual_delivery_latitude ?? selectedStop?.planned_latitude
    const lon = selectedProof?.longitude ?? selectedStop?.actual_delivery_longitude ?? selectedStop?.planned_longitude
    if (lat == null || lon == null) return
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, '_blank', 'noopener,noreferrer')
  }

  if (loading) return <div className="page-stack"><div className="panel empty-state"><LoaderCircle className="spin"/><b>Cargando historial logístico…</b></div></div>

  return <div className="page-stack logistics-page logistics-history-page">
    <div className="page-head"><div><span className="eyebrow">LOGÍSTICA · TRAZABILIDAD</span><h2>Historial y POD</h2><p>Consulta documentos y evidencia, o analiza cada viaje completo con mapa, timeline, paradas y comportamiento operativo.</p></div><button className="secondary" disabled={refreshing} onClick={() => void load()}>{refreshing ? <LoaderCircle className="spin" size={16}/> : <RefreshCw size={16}/>}Actualizar</button></div>
    {message && <div className="logistics-notice warning"><div><FileText/><span>{message}</span></div></div>}

    <div className="history-mode-switch panel" role="tablist" aria-label="Vista del historial logístico">
      <button role="tab" aria-selected={mode === 'DOCUMENTS'} className={mode === 'DOCUMENTS' ? 'active' : ''} onClick={() => setMode('DOCUMENTS')}><FileText size={16}/><span><b>Documentos</b><small>Factura, pedido y POD</small></span><i>{documents.length}</i></button>
      <button role="tab" aria-selected={mode === 'TRIPS'} className={mode === 'TRIPS' ? 'active' : ''} onClick={() => setMode('TRIPS')}><Route size={16}/><span><b>Viajes</b><small>Recorrido y comportamiento</small></span><i>{trips.length}</i></button>
    </div>

    <div className="panel history-period-toolbar">
      <div className="history-period-title"><CalendarRange size={18}/><div><b>Período de análisis</b><span>El rango se consulta directamente en el historial logístico.</span></div></div>
      <label><span>Desde</span><input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)}/></label>
      <label><span>Hasta</span><input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)}/></label>
      <button className="secondary history-period-apply" disabled={refreshing} onClick={applyPeriod}>{refreshing ? <LoaderCircle className="spin" size={15}/> : <Search size={15}/>}Aplicar período</button>
      <div className="history-period-loaded"><span>Rango cargado</span><b>{appliedDateFrom} → {appliedDateTo}</b></div>
    </div>

    {mode === 'TRIPS' ? <DeliveryTripHistoryView trips={trips} stops={stops} documents={documents} fromDate={appliedDateFrom} toDate={appliedDateTo}/> : <>
      <div className="panel"><div className="search-field"><Search size={17}/><input value={q} onChange={event => setQ(event.target.value)} placeholder="Buscar factura, pedido, cliente, viaje, chofer o placa…"/></div></div>
      <div className="logistics-trip-layout">
        <div className="panel table-panel"><div className="table-meta"><span>{visible.length} documentos visibles</span><span>{documents.length} en historial cargado</span></div><div className="responsive-table"><table><thead><tr><th>Factura / pedido</th><th>Cliente</th><th>Viaje</th><th>Chofer / vehículo</th><th>Bultos</th><th>Monto</th><th>Resultado</th></tr></thead><tbody>{visible.map(doc => { const trip=tripMap.get(doc.trip_id); return <tr key={doc.id} className={selectedDocId===doc.id?'selected-row':''} onClick={() => setSelectedDocId(doc.id)}><td><b>{doc.invoice_number ? `F ${doc.invoice_number}` : 'Sin factura'}</b><small>{doc.order_number ? `Pedido ${doc.order_number}` : doc.company_code || '—'}</small></td><td><b>{doc.client_name_snapshot}</b><small>{doc.external_client_code || (doc.client_id ? 'Cliente maestro' : 'Destino externo')}</small></td><td><b>{trip?.trip_code || '—'}</b><small>{trip?.trip_date || '—'}</small></td><td><b>{trip?.driver_name_snapshot || '—'}</b><small>{trip?.vehicle_plate_snapshot || '—'}</small></td><td>{doc.packages_delivered || 0} / {doc.packages_loaded || 0}<small>{doc.packages_returned ? `${doc.packages_returned} retorno` : ''}</small></td><td>{currency(doc.amount)}</td><td><span className={`badge ${doc.status==='DELIVERED'?'success':doc.status==='PARTIAL'?'warning':''}`}>{STATUS_LABELS[doc.status] || doc.status}</span></td></tr>})}</tbody></table></div></div>
        {selected ? <div className="panel logistics-trip-detail"><div className="panel-head"><div><b>{selected.invoice_number ? `Factura ${selected.invoice_number}` : `Pedido ${selected.order_number}`}</b><span>{selected.client_name_snapshot}</span></div><span className={`badge ${selected.status==='DELIVERED'?'success':selected.status==='PARTIAL'?'warning':''}`}>{STATUS_LABELS[selected.status] || selected.status}</span></div>
          <div className="history-pod-grid"><div><Truck/><span>Viaje</span><b>{selectedTrip?.trip_code || '—'}</b><small>{selectedTrip?.vehicle_plate_snapshot || 'Sin placa'}</small></div><div><UserRound/><span>Chofer</span><b>{selectedTrip?.driver_name_snapshot || '—'}</b><small>{selectedTrip?.carrier_name_snapshot || 'Operación propia'}</small></div><div><PackageCheck/><span>Bultos</span><b>{selected.packages_delivered || 0} / {selected.packages_loaded || 0}</b><small>{selected.packages_returned || 0} retorno</small></div><div><FileText/><span>Monto</span><b>{currency(selected.amount)}</b><small>{selectedStop ? `Parada ${selectedStop.stop_order}` : '—'}</small></div></div>
          {selectedException && <div className="history-document-exception"><AlertTriangle/><div><b>Diferencia de entrega</b><span>{selectedException.label}</span>{selectedException.detail && <small>{selectedException.detail}</small>}</div></div>}
          {selectedProof ? <div className="history-proof-card"><div className="history-proof-head"><CheckCircle2/><div><b>POD {selectedProof.proof_quality === 'COMPLETE' ? 'completo' : 'parcial'}</b><span>{new Date(selectedProof.captured_at).toLocaleString('es-DO')}</span></div></div><dl><div><dt>Recibió</dt><dd>{selectedProof.receiver_name || 'No registrado'}</dd></div><div><dt>Documento</dt><dd>{selectedProof.receiver_document || '—'}</dd></div><div><dt>Teléfono</dt><dd>{selectedProof.receiver_phone || '—'}</dd></div><div><dt>Observación</dt><dd>{selectedProof.notes || '—'}</dd></div></dl><div className="button-row">{selectedProof.signature_object_path && <button className="secondary compact" disabled={opening==='signature'} onClick={() => void openPrivate(selectedProof.signature_object_path!,'signature')}>{opening==='signature'?<LoaderCircle className="spin"/>:<Signature size={14}/>}Firma</button>}{selectedEvidence.map(item => <button key={item.id} className="secondary compact" disabled={opening===item.id} onClick={() => void openPrivate(item.object_path,item.id)}>{opening===item.id?<LoaderCircle className="spin"/>:<Camera size={14}/>}Foto</button>)}{(selectedProof.latitude!=null || selectedStop?.actual_delivery_latitude!=null || selectedStop?.planned_latitude!=null) && <button className="secondary compact" onClick={openMap}><MapPin size={14}/>Ubicación</button>}</div></div> : <div className="empty-state history-empty-proof"><FileText/><b>Sin POD asociado</b><p>El documento aún no tiene evidencia de recepción vinculada.</p></div>}
        </div> : <div className="panel empty-state"><Search/><b>Selecciona un documento</b><p>Verás aquí la trazabilidad y POD.</p></div>}
      </div>
    </>}
  </div>
}
