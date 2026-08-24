import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, DoorOpen, PhoneCall, RotateCcw, Search, ShoppingBag, UserRoundCheck, X, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { exportPdf, exportXlsx } from '../lib/export'
import { ClientTypeFilter } from '../components/ClientTypeFilter'
import type { ClientTypeFilterValue } from '../components/ClientTypeFilter'

export function Agenda() {
  const { employee } = useAuth()
  const admin = ['Administrador', 'Supervisor'].includes(employee?.app_role || '')
  const [rows, setRows] = useState<any[]>([])
  const [receptions, setReceptions] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [managerFilter, setManagerFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [clientType, setClientType] = useState<ClientTypeFilterValue>('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loadError, setLoadError] = useState('')
  const [validate, setValidate] = useState<any | null>(null)
  const [finish, setFinish] = useState<any | null>(null)

  const load = async () => {
    setLoadError('')
    const [a, r, s, e] = await Promise.all([
      supabase.from('appointments').select('*,clients(codempr,legal_name,client_type,phone1,mobile,vendor_employee_id,manager_employee_id),prospects(prospect_code,legal_name,phone,mobile),manager:employees!appointments_assigned_manager_id_fkey(id,full_name,employee_type),requester:employees!appointments_requested_by_employee_id_fkey(id,full_name,employee_type)').order('created_at', { ascending: false }).limit(1500),
      supabase.from('reception_entries').select('*,clients(codempr,legal_name,client_type),prospects(prospect_code,legal_name),manager:employees!reception_entries_assigned_manager_id_fkey(full_name)').order('check_in_at', { ascending: false }).limit(1000),
      supabase.from('showroom_sessions').select('*,clients(client_type)').order('started_at', { ascending: false }).limit(1000),
      supabase.from('employees').select('id,full_name,employee_type,active').eq('active', true).order('full_name'),
    ])
    const error = a.error || r.error || s.error || e.error
    if (error) setLoadError(error.message)
    setRows(a.data || [])
    setReceptions(r.data || [])
    setSessions(s.data || [])
    setEmployees(e.data || [])
  }

  useEffect(() => { void load() }, [])

  const managers = useMemo(() => employees.filter(e => e.employee_type === 'Gestor'), [employees])
  const scopeRows = useMemo(() => rows.filter(r => {
    if (clientType && r.clients?.client_type !== clientType) return false
    if (managerFilter && r.assigned_manager_id !== managerFilter && r.employee_id !== managerFilter) return false
    if (sourceFilter && r.source_type !== sourceFilter) return false
    const referenceDate = r.appointment_at || r.requested_appointment_at || r.requested_at || r.created_at
    if (from && referenceDate && new Date(referenceDate) < new Date(`${from}T00:00:00`)) return false
    if (to && referenceDate && new Date(referenceDate) > new Date(`${to}T23:59:59`)) return false
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      const hay = `${r.clients?.legal_name || ''} ${r.clients?.codempr || ''} ${r.requester?.full_name || ''} ${r.manager?.full_name || ''} ${r.request_contact_name || ''} ${r.request_phone || ''} ${r.notes || ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  }), [rows, clientType, managerFilter, sourceFilter, from, to, q])

  const visible = useMemo(() => scopeRows.filter(r => !statusFilter || r.status === statusFilter), [scopeRows, statusFilter])
  const count = (status: string) => scopeRows.filter(r => r.status === status).length
  const filteredReceptions = useMemo(() => receptions.filter(r => !clientType || !r.client_id || r.clients?.client_type === clientType), [receptions, clientType])
  const filteredSessions = useMemo(() => sessions.filter(s => !clientType || !s.client_id || s.clients?.client_type === clientType), [sessions, clientType])
  const receptionByAppointment = useMemo(() => new Map(filteredReceptions.filter(r => r.appointment_id).map(r => [r.appointment_id, r])), [filteredReceptions])
  const sessionByReception = useMemo(() => new Map(filteredSessions.map(s => [s.reception_entry_id, s])), [filteredSessions])
  const canManage = (r: any) => admin || (!!r.assigned_manager_id && r.assigned_manager_id === employee?.id)
  const today = new Date().toDateString()
  const todayAppointments = scopeRows.filter(r => r.appointment_at && new Date(r.appointment_at).toDateString() === today && ['CONFIRMADA','REPROGRAMADA','PROGRAMADA','ASISTIO','FINALIZADA'].includes(r.status)).length
  const arrived = filteredReceptions.filter(r => new Date(r.check_in_at).toDateString() === today).length
  const inService = filteredReceptions.filter(r => r.status === 'EN_ATENCION').length
  const purchased = filteredSessions.filter(s => s.purchased === true && s.ended_at).length

  const update = async (id: string, status: string) => {
    const patch: any = { status }
    if (status === 'ASISTIO') patch.attended_at = new Date().toISOString()
    if (status === 'NO_ASISTIO') patch.attended_at = null
    const { error } = await supabase.from('appointments').update(patch).eq('id', id)
    if (error) alert(error.message)
    await load()
  }

  const registerArrival = async (row: any) => {
    if (!employee?.id) return
    if (!row.assigned_manager_id) return alert('Esta solicitud aún no tiene Gestor asignado. Dirección debe asignarla antes de registrar la llegada.')
    const existing = receptionByAppointment.get(row.id)
    if (existing) return alert('La llegada de esta cita ya fue registrada.')
    const { error } = await supabase.from('reception_entries').insert({
      appointment_id: row.id,
      client_id: row.client_id || null,
      prospect_id: row.prospect_id || null,
      visitor_type: 'CITA',
      visitor_name: row.clients?.legal_name || row.prospects?.legal_name || 'Cita showroom',
      phone: row.clients?.mobile || row.clients?.phone1 || row.prospects?.mobile || row.prospects?.phone || null,
      purpose: 'Cita showroom',
      assigned_manager_id: row.assigned_manager_id,
      check_in_by: employee.id,
      status: 'EN_ESPERA',
    })
    if (error) return alert(error.message)
    await supabase.from('appointments').update({ status: 'ASISTIO', attended_at: new Date().toISOString() }).eq('id', row.id)
    await load()
  }

  const startService = async (entry: any) => {
    if (!employee?.id) return
    if (!entry.assigned_manager_id) return alert('Esta atención no tiene Gestor asignado.')
    if (!admin && entry.assigned_manager_id !== employee.id) return alert('Solo el gestor asignado puede iniciar esta atención.')
    if (entry.status !== 'EN_ESPERA') return
    const existing = sessionByReception.get(entry.id)
    if (!existing) {
      const responsible = entry.assigned_manager_id
      const { error } = await supabase.from('showroom_sessions').insert({ reception_entry_id: entry.id, appointment_id: entry.appointment_id || null, client_id: entry.client_id || null, prospect_id: entry.prospect_id || null, manager_employee_id: responsible, attended_by_employee_id: responsible, started_at: new Date().toISOString() })
      if (error) return alert(error.message)
    }
    const { error } = await supabase.from('reception_entries').update({ status: 'EN_ATENCION', service_started_at: new Date().toISOString(), service_started_by: employee.id }).eq('id', entry.id)
    if (error) return alert(error.message)
    await load()
  }

  const checkOut = async (entry: any) => {
    if (!employee?.id) return
    if (entry.status === 'EN_ATENCION') return alert('Primero debe finalizar la atención comercial.')
    const { error } = await supabase.from('reception_entries').update({ status: 'SALIO', check_out_at: new Date().toISOString(), check_out_by: employee.id }).eq('id', entry.id)
    if (error) return alert(error.message)
    await load()
  }

  const report = visible.map(r => ({
    FechaTentativa: r.appointment_at ? new Date(r.appointment_at).toLocaleString('es-DO') : '',
    TipoCliente: r.clients?.client_type || '',
    Cliente: r.clients?.legal_name || r.prospects?.legal_name || '',
    Responsable: r.manager?.full_name || '',
    SolicitadoPor: r.requester?.full_name || '',
    Origen: r.source_type || '',
    Tipo: r.appointment_type,
    Estado: r.status,
    Compro: r.purchased == null ? '' : r.purchased ? 'Sí' : 'No',
    Notas: r.notes || r.validation_notes || '',
  }))

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">AGENDA Y SHOWROOM</span><h2>Citas, asistencia y conversión</h2><p>Intención → validación → cita confirmada → llegada → atención → compra/no compra → salida.</p></div><div className="button-row"><button className="secondary" onClick={() => void exportXlsx('Agenda_Showroom', report)}>Excel</button><button className="secondary" onClick={() => exportPdf('Agenda Showroom', report)}>PDF</button></div></div>

    <div className="kpi-grid">
      <button className="kpi-card" onClick={() => setStatusFilter('PENDIENTE_VALIDACION')}><div className="kpi-icon"><PhoneCall/></div><div><span>Por validar</span><strong>{count('PENDIENTE_VALIDACION')}</strong><small>requieren llamada del gestor</small></div></button>
      <button className="kpi-card" onClick={() => setStatusFilter('CONFIRMADA')}><div className="kpi-icon"><CheckCircle2/></div><div><span>Confirmadas</span><strong>{count('CONFIRMADA')}</strong><small>citas pactadas</small></div></button>
      <div className="kpi-card"><div className="kpi-icon"><CalendarDays/></div><div><span>Citas hoy</span><strong>{todayAppointments}</strong><small>agenda del día</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><DoorOpen/></div><div><span>Llegaron</span><strong>{arrived}</strong><small>check-in hoy</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><UserRoundCheck/></div><div><span>En atención</span><strong>{inService}</strong><small>gestiones abiertas</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><ShoppingBag/></div><div><span>Compraron</span><strong>{purchased}</strong><small>conversiones cerradas</small></div></div>
    </div>

    <div className="panel planner-filter-panel"><div className="planner-filter-grid"><div className="search-field"><Search size={18}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cliente, código, contacto, responsable..."/></div><ClientTypeFilter value={clientType} onChange={setClientType}/><select value={managerFilter} onChange={e => setManagerFilter(e.target.value)}><option value="">Todos los gestores</option>{managers.map(m => <option value={m.id} key={m.id}>{m.full_name}</option>)}</select><select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}><option value="">Todos los orígenes</option><option value="LLAMADA">Llamada</option><option value="VISITA">Visita vendedor</option><option value="MANUAL">Manual</option></select><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Todos los estados</option><option value="PENDIENTE_VALIDACION">Pendiente validación</option><option value="CONTACTANDO">Contactando</option><option value="CONFIRMADA">Confirmada</option><option value="REPROGRAMADA">Reprogramada</option><option value="NO_CONFIRMADA">No confirmada</option><option value="CANCELADA">Cancelada</option><option value="ASISTIO">Asistió</option><option value="NO_ASISTIO">No asistió</option><option value="FINALIZADA">Finalizada</option></select><input type="date" value={from} onChange={e => setFrom(e.target.value)}/><input type="date" value={to} onChange={e => setTo(e.target.value)}/></div><div className="planner-filter-actions"><div className="meta"><span>{visible.length} gestiones visibles</span>{clientType&&<span>{clientType}</span>}<span>{scopeRows.length} en el período/cartera</span></div><button className="secondary" onClick={() => { setQ(''); setClientType(''); setManagerFilter(''); setSourceFilter(''); setStatusFilter(''); setFrom(''); setTo('') }}>Limpiar filtros</button></div></div>

    {loadError && <div className="panel"><b>Error cargando Agenda / Showroom</b><span>{loadError}</span></div>}

    <div className="panel"><div className="panel-head"><div><b>Embudo de citas</b><span>Las solicitudes aparecen desde que se generan. No cuentan como cita pactada hasta que el gestor las confirma.</span></div><span className="badge">{visible.length} registros</span></div><div className="calendar-list">{!loadError && visible.length === 0 && <div className="empty-state"><b>No hay citas con los filtros actuales.</b></div>}{visible.map(r => {const reception = receptionByAppointment.get(r.id);const displayDate = r.appointment_at || r.requested_appointment_at;return <div className="appointment-card" key={r.id}><div className="date-box">{displayDate ? <><b>{new Date(displayDate).getDate()}</b><span>{new Date(displayDate).toLocaleDateString('es-DO', { month: 'short' })}</span></> : <><Clock3/><span>Por definir</span></>}</div><div className="activity-main"><b>{r.clients?.legal_name || r.prospects?.legal_name || 'Cita'}</b><span>{displayDate ? new Date(displayDate).toLocaleString('es-DO') : 'Sin fecha tentativa'} · {r.clients?.client_type||'SIN TIPO'} · Gestor: {r.manager?.full_name || 'Sin responsable'}</span><small>{r.status.replaceAll('_', ' ')} · {r.appointment_type} · origen {r.source_type || 'MANUAL'}{r.requester?.full_name ? ` · solicitada por ${r.requester.full_name}` : ''}</small>{!r.assigned_manager_id&&<small>PENDIENTE DE ASIGNACIÓN POR DIRECCIÓN</small>}{r.request_contact_name && <small>Contacto: {r.request_contact_name}{r.request_phone ? ` · ${r.request_phone}` : ''}</small>}{r.validation_notes && <small>Validación: {r.validation_notes}</small>}{reception && <small>Llegada: {new Date(reception.check_in_at).toLocaleString('es-DO')} · {reception.status.replaceAll('_',' ')}</small>}</div>{canManage(r) && <div className="row-actions">{r.status === 'PENDIENTE_VALIDACION' && r.assigned_manager_id && <><button className="primary compact" onClick={() => setValidate(r)}><PhoneCall size={15}/> Validar</button><button className="secondary compact" onClick={() => void update(r.id, 'CONTACTANDO')}>No contesta</button></>}{r.status === 'CONTACTANDO' && r.assigned_manager_id && <button className="primary compact" onClick={() => setValidate(r)}><PhoneCall size={15}/> Reintentar</button>}{['CONFIRMADA','PROGRAMADA','REPROGRAMADA'].includes(r.status) && !reception && <><button className="success-btn compact" onClick={() => void registerArrival(r)}><DoorOpen size={16}/> Llegó</button><button className="secondary compact" onClick={() => setValidate(r)}><RotateCcw size={15}/> Reprogramar</button><button className="secondary compact" onClick={() => void update(r.id, 'NO_ASISTIO')}><XCircle size={16}/> No asistió</button></>}</div>}</div>})}</div></div>

    <div className="panel"><div className="panel-head"><div><b>Personas en showroom</b><span>Llegada física y atención comercial se miden por separado.</span></div></div><div className="cards-list">{filteredReceptions.filter(r => !['SALIO','CANCELADO'].includes(r.status)).length === 0 && <div className="empty-state"><b>No hay personas actualmente dentro del showroom.</b></div>}{filteredReceptions.filter(r => !['SALIO','CANCELADO'].includes(r.status)).map(r => {const session = sessionByReception.get(r.id);const canService = admin || r.assigned_manager_id === employee?.id;const name = r.clients?.legal_name || r.prospects?.legal_name || r.company_name || r.visitor_name || 'Visitante';return <div className="activity-card" key={r.id}><div className="activity-main"><b>{name}</b><span>Llegó {new Date(r.check_in_at).toLocaleTimeString('es-DO', { hour:'2-digit', minute:'2-digit' })} · {r.clients?.client_type||'SIN TIPO'} · {r.manager?.full_name || 'Sin gestor'}</span><small>{r.visitor_type.replaceAll('_',' ')} · {r.status.replaceAll('_',' ')}{session?.started_at ? ` · atención ${new Date(session.started_at).toLocaleTimeString('es-DO', { hour:'2-digit', minute:'2-digit' })}` : ''}</small></div><div className="row-actions">{r.status === 'EN_ESPERA' && canService && <button className="primary compact" onClick={() => void startService(r)}><UserRoundCheck size={15}/> Iniciar atención</button>}{r.status === 'EN_ATENCION' && canService && <button className="primary compact" onClick={() => setFinish({ entry:r, session })}><CheckCircle2 size={15}/> Finalizar atención</button>}{r.status === 'ATENCION_FINALIZADA' && <button className="secondary compact" onClick={() => void checkOut(r)}><DoorOpen size={15}/> Registrar salida</button>}</div></div>})}</div></div>

    {validate && <ValidateAppointment row={validate} employeeId={employee?.id || ''} onClose={() => setValidate(null)} onSaved={() => { setValidate(null); void load() }}/>} 
    {finish && <FinishShowroom entry={finish.entry} session={finish.session} managers={managers} onClose={() => setFinish(null)} onSaved={() => { setFinish(null); void load() }}/>} 
  </div>
}

function ValidateAppointment({ row, employeeId, onClose, onSaved }: { row: any; employeeId: string; onClose: () => void; onSaved: () => void }) {
  const tentative = row.appointment_at || row.requested_appointment_at
  const [date, setDate] = useState(tentative ? localDateTime(tentative) : '')
  const [notes, setNotes] = useState(row.validation_notes || '')
  const [busy, setBusy] = useState(false)
  const save = async (status: 'CONFIRMADA' | 'REPROGRAMADA' | 'NO_CONFIRMADA' | 'CANCELADA') => {if (['CONFIRMADA', 'REPROGRAMADA'].includes(status) && !date) return alert('Indica la fecha y hora acordada con el cliente.');setBusy(true);try {const patch: any = { status, validation_notes: notes || null };if (date) patch.appointment_at = new Date(date).toISOString();if (status === 'CONFIRMADA') { patch.confirmed_at = new Date().toISOString(); patch.confirmed_by_employee_id = employeeId };const { error } = await supabase.from('appointments').update(patch).eq('id', row.id);if (error) throw error;onSaved()} catch (error) { alert(error instanceof Error ? error.message : 'No fue posible actualizar la solicitud') } finally { setBusy(false) }}
  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal"><div className="modal-head"><div><span className="eyebrow">VALIDAR SHOWROOM</span><h3>{row.clients?.legal_name || 'Cliente'}</h3><p>Registra el resultado de la llamada de confirmación o reprogramación.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="form-grid one"><label>Fecha y hora acordada<input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}/></label><label>Nota de validación<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Con quién habló, condiciones, observaciones..."/></label></div><div className="modal-actions" style={{ flexWrap:'wrap' }}><button className="secondary" disabled={busy} onClick={() => void save('NO_CONFIRMADA')}>No confirma</button><button className="danger" disabled={busy} onClick={() => void save('CANCELADA')}>Cancelar cita</button><button className="secondary" disabled={busy} onClick={() => void save('REPROGRAMADA')}>Reprogramar</button><button className="primary" disabled={busy} onClick={() => void save('CONFIRMADA')}>Confirmar cita</button></div></div></div>
}

function FinishShowroom({ entry, session, managers, onClose, onSaved }: { entry: any; session: any; managers:any[]; onClose: () => void; onSaved: () => void }) {
  const [outcome, setOutcome] = useState('NO_COMPRA')
  const [purchased, setPurchased] = useState(false)
  const [amount, setAmount] = useState('')
  const [attendedById, setAttendedById] = useState(session?.attended_by_employee_id || session?.manager_employee_id || entry.assigned_manager_id || '')
  const [notes, setNotes] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!session?.id) return alert('No se encontró la sesión de showroom.')
    if (!attendedById) return alert('Selecciona el gestor que realmente atendió al cliente.')
    const attendedByName = managers.find(m => m.id === attendedById)?.full_name || null
    setBusy(true)
    try {
      const ended = new Date().toISOString()
      const { error } = await supabase.from('showroom_sessions').update({ ended_at: ended, outcome, purchased, purchase_amount: purchased && amount ? Number(amount) : null, attended_by_employee_id: attendedById, attended_by_name: attendedByName, notes: notes || null, next_action: nextAction || null, follow_up_date: followUp || null }).eq('id', session.id)
      if (error) throw error
      const { error: entryError } = await supabase.from('reception_entries').update({ status: 'ATENCION_FINALIZADA', service_ended_at: ended, service_ended_by: attendedById }).eq('id', entry.id)
      if (entryError) throw entryError
      if (entry.appointment_id) await supabase.from('appointments').update({ status: 'FINALIZADA', purchased, notes: notes || null }).eq('id', entry.appointment_id)
      onSaved()
    } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo finalizar la atención') } finally { setBusy(false) }
  }

  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal"><div className="modal-head"><div><span className="eyebrow">CIERRE SHOWROOM</span><h3>{entry.clients?.legal_name || entry.prospects?.legal_name || entry.visitor_name || 'Visitante'}</h3><p>Finaliza la gestión comercial. La salida física se registra después.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="form-grid"><label>Resultado<select value={outcome} onChange={e => { setOutcome(e.target.value); if (e.target.value === 'COMPRA') setPurchased(true) }}><option value="COMPRA">Compró</option><option value="NO_COMPRA">No compró</option><option value="PENDIENTE">Pendiente</option><option value="SEGUIMIENTO">Seguimiento</option><option value="COTIZACION">Cotización</option><option value="OTRO">Otro</option></select></label><label className="checkbox"><input type="checkbox" checked={purchased} onChange={e => setPurchased(e.target.checked)}/> Registró compra</label>{purchased && <label>Monto compra<input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}/></label>}<label>Quién lo atendió<select value={attendedById} onChange={e => setAttendedById(e.target.value)}><option value="">Selecciona gestor...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label><label>Próxima acción<input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Llamar, cotizar, seguimiento..."/></label><label>Fecha seguimiento<input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}/></label><label style={{ gridColumn:'1 / -1' }}>Observaciones<textarea value={notes} onChange={e => setNotes(e.target.value)}/></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando...' : 'Finalizar atención'}</button></div></div></div>
}

function localDateTime(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
