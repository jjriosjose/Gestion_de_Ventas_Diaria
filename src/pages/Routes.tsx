import { useEffect, useMemo, useState } from 'react'
import { Ban, CheckCircle2, MapPin, Navigation, Play, RefreshCw, Square, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { currentPosition, googleMapsNavigation } from '../lib/geo'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../lib/access'
import { RouteSequenceMap } from '../components/RouteSequenceMap'
import type { Employee } from '../types'
import { exportPdf, exportXlsx } from '../lib/export'
import '../styles/operational-v059.css'

export function Routes() {
  const { employee } = useAuth()
  const navigate = useNavigate()
  const admin = hasPermission(employee, 'planning.manage')
  const [plans, setPlans] = useState<any[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [stops, setStops] = useState<any[]>([])
  const [session, setSession] = useState<any | null>(null)
  const [openVisit, setOpenVisit] = useState<any | null>(null)
  const [busy, setBusy] = useState(false)
  const [exceptionStop, setExceptionStop] = useState<any | null>(null)

  const load = async () => {
    const [{ data: planData }, { data: employeeData }] = await Promise.all([
      supabase.from('route_plans').select('*').eq('plan_type', 'VISITAS').order('route_date', { ascending: false }).limit(100),
      supabase.from('employees').select('*'),
    ])
    setPlans(planData || [])
    setEmployees((employeeData || []) as Employee[])

    if (employee?.id) {
      const { data: openRows } = await supabase.from('visits').select('id,route_session_id,route_stop_id,client_id,started_at,clients(legal_name)').eq('employee_id', employee.id).is('ended_at', null).order('started_at', { ascending: true }).limit(1)
      setOpenVisit((openRows || [])[0] || null)
    } else setOpenVisit(null)

    if (selected) {
      const { data: stopData } = await supabase.from('route_stops').select('*,clients(id,codempr,legal_name,latitude,longitude,municipality,phone1)').eq('route_plan_id', selected.id).order('stop_order')
      setStops(stopData || [])
      const { data: routeSession } = await supabase.from('route_sessions').select('*').eq('route_plan_id', selected.id).eq('employee_id', employee?.id || '').is('ended_at', null).maybeSingle()
      setSession(routeSession || null)
    } else {
      setStops([])
      setSession(null)
    }
  }

  useEffect(() => { void load() }, [selected?.id, employee?.id])
  useEffect(() => { setSelectedStopId(null) }, [selected?.id])

  const empName = (id: string) => employees.find((item) => item.id === id)?.full_name || '—'
  const mine = selected?.employee_id === employee?.id
  const mappedStops = useMemo(() => stops.filter((stop) => stop.clients?.latitude != null && stop.clients?.longitude != null).length, [stops])

  const start = async () => {
    if (!selected || !mine || !employee) return
    setBusy(true)
    try {
      const { data: active } = await supabase.from('route_sessions').select('id,route_plan_id').eq('employee_id', employee.id).is('ended_at', null).limit(1)
      if ((active || []).length) throw new Error('Ya tienes una jornada activa. Finalízala antes de iniciar otra ruta.')
      const position = await currentPosition()
      const { data, error } = await supabase.from('route_sessions').insert({ route_plan_id: selected.id, employee_id: employee.id, session_date: selected.route_date, session_type: selected.plan_type, status: 'ACTIVA', start_latitude: position.latitude, start_longitude: position.longitude, start_accuracy_m: position.accuracy }).select().single()
      if (error) throw error
      const { error: planError } = await supabase.from('route_plans').update({ status: 'ACTIVA' }).eq('id', selected.id)
      if (planError) throw planError
      setSession(data)
      setSelected({ ...selected, status: 'ACTIVA' })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al iniciar la ruta')
    } finally {
      setBusy(false)
      void load()
    }
  }

  const end = async () => {
    if (!session || !selected || !employee) return
    setBusy(true)
    try {
      const [{ data: openVisits }, { data: unresolved }] = await Promise.all([
        supabase.from('visits').select('id').eq('employee_id', employee.id).is('ended_at', null).limit(5),
        supabase.from('route_stops').select('id,status').eq('route_plan_id', selected.id).in('status', ['PENDIENTE', 'EN_VISITA']).limit(100),
      ])
      if ((openVisits || []).length) throw new Error('Existe una visita abierta. Debes registrar la salida antes de cerrar la ruta.')
      if ((unresolved || []).length) throw new Error(`Aún tienes ${(unresolved || []).length} parada(s) pendientes. Puedes resolverlas en el orden que prefieras, pero debes visitarlas o registrar el motivo de no realización.`)
      const position = await currentPosition()
      const { error } = await supabase.from('route_sessions').update({ ended_at: new Date().toISOString(), end_latitude: position.latitude, end_longitude: position.longitude, end_accuracy_m: position.accuracy, status: 'FINALIZADA' }).eq('id', session.id)
      if (error) throw error
      const { error: planError } = await supabase.from('route_plans').update({ status: 'FINALIZADA' }).eq('id', selected.id)
      if (planError) throw planError
      setSession(null)
      setSelected({ ...selected, status: 'FINALIZADA' })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al finalizar la ruta')
    } finally {
      setBusy(false)
      void load()
    }
  }

  const removePlan = async () => {
    if (!selected || !admin) return
    if (!window.confirm('Esta planificación nunca iniciada y todas sus paradas serán eliminadas. ¿Continuar?')) return
    setBusy(true)
    const { error } = await supabase.rpc('delete_unstarted_route_plan', { p_plan_id: selected.id })
    setBusy(false)
    if (error) return alert(error.message)
    setSelected(null)
    setStops([])
    setSession(null)
    await load()
    alert('Planificación eliminada correctamente')
  }

  const startVisit = async (stop: any) => {
    if (!session || !mine || !employee) return alert('Debes iniciar la ruta primero')
    if (openVisit) return alert(`Ya tienes una visita abierta${openVisit.clients?.legal_name ? ` en ${openVisit.clients.legal_name}` : ''}. Finalízala antes de registrar otra llegada.`)
    setBusy(true)
    try {
      const { data: openVisits } = await supabase.from('visits').select('id,clients(legal_name)').eq('employee_id', employee.id).is('ended_at', null).limit(1)
      if ((openVisits || []).length) throw new Error('Ya tienes una visita abierta. Finalízala antes de registrar otra llegada.')
      const position = await currentPosition()
      const { data, error } = await supabase.from('visits').insert({ route_session_id: session.id, route_stop_id: stop.id, client_id: stop.client_id, employee_id: employee.id, visit_kind: 'CLIENTE', planned: true, started_at: new Date().toISOString(), start_latitude: position.latitude, start_longitude: position.longitude, start_accuracy_m: position.accuracy }).select().single()
      if (error) throw error
      const { error: stopError } = await supabase.from('route_stops').update({ status: 'EN_VISITA', visit_id: data.id }).eq('id', stop.id)
      if (stopError) throw stopError
      setOpenVisit({ ...data, clients: { legal_name: stop.clients?.legal_name } })
      setSelectedStopId(stop.id)
      alert('Llegada registrada. Esta visita debe finalizarse antes de iniciar otra.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al registrar la llegada')
    } finally {
      setBusy(false)
      void load()
    }
  }

  const report = stops.map((stop) => ({ Orden: stop.stop_order, Cliente: stop.clients?.legal_name || '', Codigo: stop.clients?.codempr || '', Municipio: stop.clients?.municipality || '', Prioridad: stop.priority, Estado: stop.status, Motivo: stop.reason_not_visited || '' }))

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">PLAN VS EJECUCIÓN</span><h2>Rutas asignadas</h2><p>Mapa y secuencia de paradas. La línea muestra el orden planificado; la navegación vial se abre con Google Maps.</p></div><button className="secondary" onClick={() => void load()}><RefreshCw size={17} /> Actualizar</button></div>
    <div className="route-workspace">
      <div className="panel route-list">{plans.map((plan) => <button key={plan.id} className={`route-card ${selected?.id === plan.id ? 'selected' : ''}`} onClick={() => setSelected(plan)}><div><b>{empName(plan.employee_id)}</b><span>{plan.route_date} · Visitas</span></div><span className={`status ${plan.status?.toLowerCase()}`}>{plan.status}</span></button>)}</div>
      <div className="panel route-detail route-detail-compact">{!selected ? <div className="empty-state"><MapPin /><b>Selecciona una ruta para ver mapa y secuencia</b></div> : <>
        <div className="route-detail-head"><div><b>{empName(selected.employee_id)}</b><span>{selected.route_date} · {selected.title}</span><span>{stops.length} paradas · {mappedStops} con GPS</span></div><div className="button-row"><button className="secondary compact" onClick={() => void exportXlsx(`Ruta_${selected.route_date}`, report)}>Excel</button><button className="secondary compact" onClick={() => exportPdf(`Ruta ${selected.route_date}`, report)}>PDF</button>{admin && selected.status === 'PLANIFICADA' && <button className="danger compact" disabled={busy} onClick={() => void removePlan()}><Trash2 size={15} /> Eliminar prueba</button>}</div></div>
        {mine && <div className="route-actions">{!session ? <button className="primary" disabled={busy || selected.status === 'FINALIZADA'} onClick={() => void start()}><Play size={18} /> Iniciar ruta / salida</button> : <><span className="live-pill"><i /> Ruta activa desde {new Date(session.started_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}</span>{openVisit && <button className="primary compact" onClick={() => navigate('/visitas')}><CheckCircle2 size={16}/> Finalizar visita actual</button>}<button className="danger" disabled={busy || !!openVisit} onClick={() => void end()}><Square size={18} /> Finalizar ruta</button></>}</div>}
        <div className="route-map-grid">
          <div className="route-map-panel"><RouteSequenceMap stops={stops} activeStopId={openVisit?.route_stop_id || null} selectedStopId={selectedStopId} onSelectStop={setSelectedStopId} height={540}/></div>
          <div className="route-stop-panel"><div className="route-stop-summary"><div><b>Secuencia de paradas</b><span>Selecciona una parada para ubicarla en el mapa.</span></div><span>{stops.length}</span></div>{stops.length ? stops.map((stop) => { const current = openVisit?.route_stop_id === stop.id; const blockedByOtherVisit = !!openVisit && !current; const nav = googleMapsNavigation(stop.clients?.latitude, stop.clients?.longitude); return <div className={`route-stop-compact ${selectedStopId === stop.id ? 'selected' : ''} ${current ? 'current' : ''}`} key={stop.id} onClick={() => setSelectedStopId(stop.id)}><span className="stop-order">{stop.stop_order}</span><div className="stop-copy"><b>{stop.clients?.legal_name || 'Parada'}</b><span>{stop.clients?.codempr} · {stop.clients?.municipality || ''}</span><small>{current ? 'EN VISITA · registra la salida' : stop.status}</small></div><div className="route-stop-actions" onClick={(event) => event.stopPropagation()}>{nav && <a className="icon-btn compact" target="_blank" rel="noreferrer" href={nav} title="Navegar"><Navigation size={15}/></a>}{mine && session && stop.status !== 'VISITADO' && <>{current ? <button className="primary compact" onClick={() => navigate('/visitas')}><CheckCircle2 size={14}/></button> : <button className="primary compact" disabled={busy || blockedByOtherVisit || stop.status === 'NO_VISITADO'} title={blockedByOtherVisit ? 'Finaliza la visita actual' : 'Registrar llegada'} onClick={() => void startVisit(stop)}><Play size={14}/></button>}{!current && stop.status !== 'NO_VISITADO' && <button className="secondary compact" disabled={blockedByOtherVisit} title="No realizada" onClick={() => setExceptionStop(stop)}><Ban size={14}/></button>}</>}</div></div> }) : <div className="empty-state"><b>Esta ruta no tiene paradas.</b></div>}</div>
        </div>
      </>}</div>
    </div>
    {exceptionStop && <RouteException stop={exceptionStop} onClose={() => setExceptionStop(null)} onSaved={() => { setExceptionStop(null); void load() }} />}
  </div>
}

function RouteException({ stop, onClose, onSaved }: { stop: any; onClose: () => void; onSaved: () => void }) {
  const reasons = [['CLIENTE_CERRADO', 'Cliente cerrado'], ['NO_ESTABA_RESPONSABLE', 'No estaba el responsable'], ['REPROGRAMADA', 'Visita reprogramada'], ['DIRECCION_INCORRECTA', 'Dirección incorrecta'], ['NO_LOCALIZADO', 'Cliente no localizado'], ['CAMBIO_RUTA', 'Cambio de ruta'], ['OTRO', 'Otro']]
  const [reason, setReason] = useState(reasons[0][0])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    const label = reasons.find((item) => item[0] === reason)?.[1] || reason
    const { error } = await supabase.from('route_stops').update({ status: 'NO_VISITADO', exception_reason_code: reason, reason_not_visited: label, notes: notes || null }).eq('id', stop.id)
    setBusy(false)
    if (error) alert(error.message); else onSaved()
  }
  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose} /><div className="modal"><div className="modal-head"><div><span className="eyebrow">EXCEPCIÓN DE RUTA</span><h3>{stop.clients?.legal_name || 'Cliente'}</h3></div><button className="icon-btn" onClick={onClose}><X /></button></div><div className="form-grid"><label className="span-2">Motivo<select value={reason} onChange={(event) => setReason(event.target.value)}>{reasons.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label><label className="span-2">Observación<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Detalle opcional..." /></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="danger" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando...' : 'Registrar no realizada'}</button></div></div></div>
}
