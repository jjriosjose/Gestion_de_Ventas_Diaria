import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Camera, Check, MapPinCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { currentPosition, type GeoPoint } from '../lib/geo'
import { useAuth } from '../context/AuthContext'
import { exportPdf, exportXlsx } from '../lib/export'
import { ClientTypeFilter } from '../components/ClientTypeFilter'
import type { ClientTypeFilterValue } from '../components/ClientTypeFilter'
import '../styles/crm-v051.css'

export function Visits() {
  const { employee } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [clientType,setClientType]=useState<ClientTypeFilterValue>('')
  const [finish, setFinish] = useState<any | null>(null)

  const load = async () => {
    const { data } = await supabase.from('visits').select('*,clients(codempr,legal_name,client_type,manager_employee_id,contact_name,phone1,mobile),prospects(prospect_code,legal_name),employees(full_name)').order('started_at', { ascending: false }).limit(250)
    setRows(data || [])
  }
  useEffect(() => { void load() }, [])

  const visibleRows=useMemo(()=>rows.filter(r=>!clientType||!r.client_id||r.clients?.client_type===clientType),[rows,clientType])
  const report = visibleRows.map(r => ({
    Fecha: new Date(r.started_at).toLocaleDateString('es-DO'),
    TipoCliente: r.clients?.client_type || '',
    Empleado: r.employees?.full_name || '',
    Cliente: r.clients?.legal_name || r.prospects?.legal_name || '',
    Llegada: new Date(r.started_at).toLocaleTimeString('es-DO'),
    Salida: r.ended_at ? new Date(r.ended_at).toLocaleTimeString('es-DO') : '',
    Duracion: r.ended_at ? durationLabel(r.started_at, r.ended_at) : '',
    Recibido: r.received == null ? '' : r.received ? 'Sí' : 'No',
    Compra: r.purchase_result || '',
    MontoCompra: r.purchase_amount || '',
    Resultado: r.result || '',
    Contacto: r.contact_name || '',
    ProximaAccion: r.next_action || '',
  }))

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">GESTIÓN DE CALLE</span><h2>Visitas</h2><p>La llegada inicia la visita y la salida la finaliza. Solo puede existir una visita abierta por empleado.</p></div><div className="button-row"><ClientTypeFilter value={clientType} onChange={setClientType}/><button className="secondary" onClick={() => void exportXlsx('Gestion_Visitas', report)}>Excel</button><button className="secondary" onClick={() => exportPdf('Gestión de Visitas', report)}>PDF</button></div></div>
    <div className="cards-list">{visibleRows.map(r => <div className={`activity-card ${!r.ended_at ? 'open' : ''}`} key={r.id}><div className="activity-icon"><MapPinCheck/></div><div className="activity-main"><b>{r.clients?.legal_name || r.prospects?.legal_name || 'Visita'}</b><span>{r.employees?.full_name} · {r.clients?.client_type||'SIN TIPO'} · llegada {new Date(r.started_at).toLocaleString('es-DO')}</span><small>{r.ended_at ? `${r.result || r.purchase_result || 'Finalizada'} · ${durationLabel(r.started_at, r.ended_at)}${r.purchase_amount ? ` · RD$ ${Number(r.purchase_amount).toLocaleString('es-DO')}` : ''}` : 'VISITA EN CURSO · falta registrar la salida'}</small></div>{!r.ended_at && r.employee_id === employee?.id && <button className="primary compact" onClick={() => setFinish(r)}><Check size={16}/> Finalizar / salir</button>}</div>)}</div>
    {finish && <FinishVisit row={finish} onClose={() => setFinish(null)} onSaved={() => { setFinish(null); void load() }}/>} 
  </div>
}

function durationLabel(start: string, end: string) {
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

async function resolveExitPosition():Promise<{position:GeoPoint|null;cancelled:boolean}> {
  try { return {position:await currentPosition(),cancelled:false} }
  catch {
    const retry=window.confirm('No fue posible obtener la ubicación de salida. Pulsa Aceptar para intentar nuevamente o Cancelar para volver al formulario sin guardar todavía.')
    if(!retry)return {position:null,cancelled:true}
    try { return {position:await currentPosition(),cancelled:false} }
    catch {
      const withoutGps=window.confirm('El GPS sigue sin estar disponible. Pulsa Aceptar para finalizar la visita sin coordenadas o Cancelar para volver al formulario.')
      return withoutGps?{position:null,cancelled:false}:{position:null,cancelled:true}
    }
  }
}

function FinishVisit({ row, onClose, onSaved }: { row: any; onClose: () => void; onSaved: () => void }) {
  const { employee } = useAuth()
  const [received, setReceived] = useState('si')
  const [purchase, setPurchase] = useState('')
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [result, setResult] = useState('RECIBIDO')
  const [contact, setContact] = useState(row.clients?.contact_name || '')
  const [reason, setReason] = useState('')
  const [karaka, setKaraka] = useState('')
  const [competition, setCompetition] = useState('')
  const [notes, setNotes] = useState('')
  const [nextAction, setNextAction] = useState('SIN_SEGUIMIENTO')
  const [followUp, setFollowUp] = useState('')
  const [showroomInterest, setShowroomInterest] = useState('no')
  const [showroomDate, setShowroomDate] = useState('')
  const [showroomConfirmed, setShowroomConfirmed] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)

  const uploadPhotos = async (position: GeoPoint|null) => {
    if (!files.length || !employee) return
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${employee.id}/${row.id}/${crypto.randomUUID()}-${safe}`
      const { error: uploadError } = await supabase.storage.from('karaka-photos').upload(path, file, { contentType: file.type || undefined, upsert: false })
      if (uploadError) throw uploadError
      const { error: photoError } = await supabase.from('photos').insert({ client_id: row.client_id || null, visit_id: row.id, employee_id: employee.id, bucket_id: 'karaka-photos', object_path: path, photo_type: 'VISITA', mime_type: file.type || null, size_bytes: file.size, latitude: position?.latitude ?? null, longitude: position?.longitude ?? null, taken_at: new Date().toISOString() })
      if (photoError) throw photoError
    }
  }

  const save = async () => {
    if (!employee) return
    if (!purchase) return alert('Selecciona explícitamente el resultado comercial: Compró, No compró, Pendiente o Cliente no estaba / no gestionado.')
    if(showroomInterest==='si'&&!showroomDate)return alert('Selecciona la fecha y hora tentativa del showroom.')
    if(showroomInterest==='si'&&!showroomConfirmed)return alert('Confirma la fecha y hora tentativa del showroom antes de finalizar la visita.')
    setBusy(true)
    try {
      const gps=await resolveExitPosition()
      if(gps.cancelled)return
      const p=gps.position
      const endedAt = new Date().toISOString()
      const storedNextAction = showroomInterest === 'si' ? 'SHOWROOM' : nextAction === 'SIN_SEGUIMIENTO' ? null : nextAction
      const { error } = await supabase.from('visits').update({ ended_at: endedAt, end_latitude: p?.latitude ?? null, end_longitude: p?.longitude ?? null, end_accuracy_m: p?.accuracy ?? null, received: received === 'si', purchase_result: purchase, purchase_amount: purchase === 'COMPRO' && purchaseAmount ? Number(purchaseAmount) : null, result, contact_name: contact || null, no_purchase_reason: purchase === 'NO_COMPRO' || purchase === 'NO_GESTIONADO' ? reason || null : null, merchandise_comment: karaka || null, competitor_comment: competition || null, notes: notes || null, next_action: storedNextAction, follow_up_date: followUp || null }).eq('id', row.id)
      if (error) throw error
      if (row.route_stop_id) {
        const { error: stopError } = await supabase.from('route_stops').update({ status: 'VISITADO', visit_id: row.id }).eq('id', row.route_stop_id)
        if (stopError) throw stopError
      }
      if (row.client_id && p) {
        const { error: geoError } = await supabase.rpc('record_geo_verification_from_visit', { p_visit_id: row.id })
        if (geoError) console.warn('Geo verification pending:', geoError.message)
      }
      await uploadPhotos(p)

      if (showroomInterest === 'si') {
        const managerId = row.clients?.manager_employee_id || null
        const tentative = new Date(showroomDate).toISOString()
        const { error: appointmentError } = await supabase.from('appointments').insert({
          client_id: row.client_id,
          employee_id: managerId || employee.id,
          assigned_manager_id: managerId,
          requested_by_employee_id: employee.id,
          source_type: 'VISITA',
          source_visit_id: row.id,
          requested_at: endedAt,
          requested_appointment_at: tentative,
          appointment_at: tentative,
          appointment_type: 'SHOWROOM',
          status: 'PENDIENTE_VALIDACION',
          request_contact_name: contact || null,
          request_phone: row.clients?.phone1 || row.clients?.mobile || null,
          notes: notes || null,
        })
        if (appointmentError) throw appointmentError
        if (!managerId) alert('Solicitud de showroom creada. El cliente no tiene V-Gestor asignado; Dirección recibirá la alerta para asignar responsable sin perder la solicitud.')
      }
      onSaved()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al finalizar la visita')
    } finally { setBusy(false) }
  }

  const changeReceived=(value:string)=>{
    setReceived(value)
    if(value==='no'){
      setPurchase('NO_GESTIONADO')
      setResult('NO_RECIBIDO')
      if(!reason)setReason('Cliente no estaba / no fue posible realizar gestión comercial')
    }else{
      if(purchase==='NO_GESTIONADO')setPurchase('')
      if(result==='NO_RECIBIDO')setResult('RECIBIDO')
    }
  }

  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal large"><div className="modal-head"><div><span className="eyebrow">SALIDA DEL CLIENTE</span><h3>{row.clients?.legal_name || 'Cliente'}</h3><p>Al guardar se registra hora y GPS de salida; si el GPS falla podrás reintentarlo y, como último recurso, finalizar sin coordenadas.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <div className="form-grid">
      <label>¿Lo recibieron?<select value={received} onChange={e => changeReceived(e.target.value)}><option value="si">Sí</option><option value="no">No</option></select></label>
      <label>Quién lo atendió en el cliente<input value={contact} onChange={e => setContact(e.target.value)} placeholder="Nombre / cargo del contacto"/></label>
      <label>Resultado comercial<select value={purchase} onChange={e => setPurchase(e.target.value)}><option value="">Selecciona resultado...</option><option value="COMPRO">Compró</option><option value="NO_COMPRO">No compró</option><option value="PENDIENTE">Pendiente</option><option value="NO_GESTIONADO">Cliente no estaba / no gestionado</option></select></label>
      <label>Resultado visita<select value={result} onChange={e => setResult(e.target.value)}><option value="RECIBIDO">Recibido</option><option value="NO_RECIBIDO">No recibido</option><option value="CERRADO">Cerrado</option><option value="NO_LOCALIZADO">No localizado</option><option value="REPROGRAMAR">Reprogramar</option></select></label>
      {purchase === 'COMPRO' && <label className="span-2">Monto de compra (opcional)<input type="number" min="0" step="0.01" value={purchaseAmount} onChange={e => setPurchaseAmount(e.target.value)} placeholder="RD$"/><small>Si conoces el monto, quedará incluido en el reporte ejecutivo.</small></label>}
      {(purchase === 'NO_COMPRO'||purchase==='NO_GESTIONADO') && <label className="span-2">{purchase==='NO_GESTIONADO'?'Motivo / contexto':'Motivo no compra'}<input value={reason} onChange={e => setReason(e.target.value)}/></label>}
      <label className="span-2">Comentario mercancía Karaka<textarea value={karaka} onChange={e => setKaraka(e.target.value)}/></label>
      <label className="span-2">Comentario competencia<textarea value={competition} onChange={e => setCompetition(e.target.value)}/></label>

      <label>¿Posible visita al showroom?<select value={showroomInterest} onChange={e => {setShowroomInterest(e.target.value);if(e.target.value==='no'){setShowroomConfirmed(false);setShowroomDate('')}}}><option value="no">No</option><option value="si">Sí, cliente manifestó interés</option></select></label>
      <label>Próxima acción<select value={nextAction} onChange={e => setNextAction(e.target.value)} disabled={showroomInterest === 'si'}><option value="SIN_SEGUIMIENTO">Sin seguimiento</option><option value="VOLVER_VISITAR">Volver a visitar</option><option value="LLAMAR">Llamar</option><option value="ENVIAR_INFO">Enviar información</option><option value="OTRO">Otro</option></select></label>
      {showroomInterest === 'si' && <><label>Fecha/hora tentativa showroom<div style={{display:'flex',gap:8,alignItems:'center'}}><input type="datetime-local" value={showroomDate} onChange={e => {setShowroomDate(e.target.value);setShowroomConfirmed(false)}}/><button type="button" className="secondary compact" disabled={!showroomDate} onClick={e=>{e.preventDefault();setShowroomConfirmed(true);(document.activeElement as HTMLElement|null)?.blur()}}><Check size={15}/> Confirmar</button></div><small>{showroomConfirmed&&showroomDate?`✓ Confirmada: ${new Date(showroomDate).toLocaleString('es-DO')}`:'Selecciona fecha/hora y pulsa Confirmar.'}</small></label><label>Asignación<input disabled value={row.clients?.manager_employee_id ? 'Automática al V-Gestor' : 'PENDIENTE DE ASIGNACIÓN POR DIRECCIÓN'}/></label><div className="span-2 info-box"><CalendarClock size={19}/><div><b>Solicitud de showroom pendiente de validación</b><span>{row.clients?.manager_employee_id ? 'El V-Gestor deberá llamar al cliente, confirmar o reprogramar la cita y registrar posteriormente si asistió.' : 'La solicitud se guardará aunque el cliente no tenga V-Gestor. Dirección recibirá la alerta y, al asignar el Gestor oficial del cliente, la solicitud pasará automáticamente a su bandeja.'}</span></div></div></>}
      <label>Fecha seguimiento<input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}/></label>
      <div />

      <label className="span-2 evidence-box">Fotos / evidencia<div className="field"><Camera size={18}/><input type="file" accept="image/*" capture="environment" multiple onChange={e => setFiles(Array.from(e.target.files || []))}/></div><small>{files.length ? `${files.length} foto(s) listas para cargar: ${files.map(f => f.name).join(', ')}` : 'Desde el teléfono puedes abrir la cámara o seleccionar varias imágenes de la galería.'}</small></label>
      <label className="span-2">Observación<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Compromisos, comentarios del cliente, incidencias o información para seguimiento..."/></label>
    </div>
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando salida...' : 'Finalizar visita y salir'}</button></div></div></div>
}
