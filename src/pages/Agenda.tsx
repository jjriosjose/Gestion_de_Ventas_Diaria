import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, DoorOpen, PhoneCall, RotateCcw, ShoppingBag, UserRoundCheck, X, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { exportPdf, exportXlsx } from '../lib/export'

export function Agenda() {
  const { employee } = useAuth()
  const admin = ['Administrador', 'Supervisor'].includes(employee?.app_role || '')
  const [rows, setRows] = useState<any[]>([])
  const [receptions, setReceptions] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [validate, setValidate] = useState<any | null>(null)
  const [finish, setFinish] = useState<any | null>(null)

  const load = async () => {
    const [a, r, s] = await Promise.all([
      supabase.from('appointments').select('*,clients(codempr,legal_name,phone1,mobile),prospects(prospect_code,legal_name,phone,mobile),employees(full_name),requester:employees!appointments_requested_by_employee_id_fkey(full_name)').order('created_at', { ascending: false }).limit(500),
      supabase.from('reception_entries').select('*,clients(codempr,legal_name),prospects(prospect_code,legal_name),manager:employees!reception_entries_assigned_manager_id_fkey(full_name)').order('check_in_at', { ascending: false }).limit(500),
      supabase.from('showroom_sessions').select('*').order('started_at', { ascending: false }).limit(500),
    ])
    setRows(a.data || [])
    setReceptions(r.data || [])
    setSessions(s.data || [])
  }
  useEffect(() => { void load() }, [])

  const visible = useMemo(() => rows.filter(r => !statusFilter || r.status === statusFilter), [rows, statusFilter])
  const count = (status: string) => rows.filter(r => r.status === status).length
  const receptionByAppointment = useMemo(() => new Map(receptions.filter(r => r.appointment_id).map(r => [r.appointment_id, r])), [receptions])
  const sessionByReception = useMemo(() => new Map(sessions.map(s => [s.reception_entry_id, s])), [sessions])
  const canManage = (r: any) => admin || r.employee_id === employee?.id
  const today = new Date().toDateString()
  const todayAppointments = rows.filter(r => r.appointment_at && new Date(r.appointment_at).toDateString() === today && ['CONFIRMADA','REPROGRAMADA','PROGRAMADA','ASISTIO','FINALIZADA'].includes(r.status)).length
  const arrived = receptions.filter(r => new Date(r.check_in_at).toDateString() === today).length
  const inService = receptions.filter(r => r.status === 'EN_ATENCION').length
  const purchased = sessions.filter(s => s.purchased === true && s.ended_at).length

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
      assigned_manager_id: row.employee_id,
      check_in_by: employee.id,
      status: 'EN_ESPERA',
    })
    if (error) return alert(error.message)
    await supabase.from('appointments').update({ status: 'ASISTIO', attended_at: new Date().toISOString() }).eq('id', row.id)
    await load()
  }

  const startService = async (entry: any) => {
    if (!employee?.id) return
    if (!admin && entry.assigned_manager_id !== employee.id) return alert('Solo el gestor asignado puede iniciar esta atención.')
    if (entry.status !== 'EN_ESPERA') return
    const existing = sessionByReception.get(entry.id)
    if (!existing) {
      const { error } = await supabase.from('showroom_sessions').insert({ reception_entry_id: entry.id, appointment_id: entry.appointment_id || null, client_id: entry.client_id || null, prospect_id: entry.prospect_id || null, manager_employee_id: entry.assigned_manager_id || employee.id, started_at: new Date().toISOString() })
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

  const report = visible.map(r => ({ FechaTentativa: r.appointment_at ? new Date(r.appointment_at).toLocaleString('es-DO') : '', Cliente: r.clients?.legal_name || r.prospects?.legal_name || '', Responsable: r.employees?.full_name || '', SolicitadoPor: r.requester?.full_name || '', Tipo: r.appointment_type, Estado: r.status, Compro: r.purchased == null ? '' : r.purchased ? 'Sí' : 'No', Notas: r.notes || r.validation_notes || '' }))

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

    <div className="panel">
      <div className="panel-head"><div><b>Embudo de citas</b><span>Las solicitudes no cuentan como citas pactadas hasta que el gestor las confirma.</span></div><div className="button-row"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Todos los estados</option><option value="PENDIENTE_VALIDACION">Pendiente validación</option><option value="CONTACTANDO">Contactando</option><option value="CONFIRMADA">Confirmada</option><option value="REPROGRAMADA">Reprogramada</option><option value="NO_CONFIRMADA">No confirmada</option><option value="CANCELADA">Cancelada</option><option value="ASISTIO">Asistió</option><option value="NO_ASISTIO">No asistió</option><option value="FINALIZADA">Finalizada</option></select></div></div>
      <div className="calendar-list">{visible.map(r => {
        const reception = receptionByAppointment.get(r.id)
        return <div className="appointment-card" key={r.id}><div className="date-box">{r.appointment_at ? <><b>{new Date(r.appointment_at).getDate()}</b><span>{new Date(r.appointment_at).toLocaleDateString('es-DO', { month: 'short' })}</span></> : <><Clock3/><span>Por definir</span></>}</div><div className="activity-main"><b>{r.clients?.legal_name || r.prospects?.legal_name || 'Cita'}</b><span>{r.appointment_at ? new Date(r.appointment_at).toLocaleString('es-DO') : 'Sin fecha confirmada'} · {r.employees?.full_name || 'Sin responsable'}</span><small>{r.status.replaceAll('_', ' ')} · {r.appointment_type}{r.requester?.full_name ? ` · solicitada por ${r.requester.full_name}` : ''}</small>{reception && <small>Llegada: {new Date(reception.check_in_at).toLocaleString('es-DO')} · {reception.status.replaceAll('_',' ')}</small>}</div>{canManage(r) && <div className="row-actions">{r.status === 'PENDIENTE_VALIDACION' && <><button className="primary compact" onClick={() => setValidate(r)}><PhoneCall size={15}/> Validar</button><button className="secondary compact" onClick={() => void update(r.id, 'CONTACTANDO')}>No contesta</button></>}{r.status === 'CONTACTANDO' && <button className="primary compact" onClick={() => setValidate(r)}><PhoneCall size={15}/> Reintentar</button>}{['CONFIRMADA','PROGRAMADA','REPROGRAMADA'].includes(r.status) && !reception && <><button className="success-btn compact" onClick={() => void registerArrival(r)}><DoorOpen size={16}/> Llegó</button><button className="secondary compact" onClick={() => setValidate(r)}><RotateCcw size={15}/> Reprogramar</button><button className="secondary compact" onClick={() => void update(r.id, 'NO_ASISTIO')}><XCircle size={16}/> No asistió</button></>}</div>}</div>
      })}</div>
    </div>

    <div className="panel">
      <div className="panel-head"><div><b>Personas en showroom</b><span>Llegada física y atención comercial se miden por separado.</span></div></div>
      <div className="cards-list">{receptions.filter(r => !['SALIO','CANCELADO'].includes(r.status)).map(r => {
        const session = sessionByReception.get(r.id)
        const canService = admin || r.assigned_manager_id === employee?.id
        const name = r.clients?.legal_name || r.prospects?.legal_name || r.company_name || r.visitor_name || 'Visitante'
        return <div className="activity-card" key={r.id}><div className="activity-main"><b>{name}</b><span>Llegó {new Date(r.check_in_at).toLocaleTimeString('es-DO', { hour:'2-digit', minute:'2-digit' })} · {r.manager?.full_name || 'Sin gestor'}</span><small>{r.visitor_type.replaceAll('_',' ')} · {r.status.replaceAll('_',' ')}{session?.started_at ? ` · atención ${new Date(session.started_at).toLocaleTimeString('es-DO', { hour:'2-digit', minute:'2-digit' })}` : ''}</small></div><div className="row-actions">{r.status === 'EN_ESPERA' && canService && <button className="primary compact" onClick={() => void startService(r)}><UserRoundCheck size={15}/> Iniciar atención</button>}{r.status === 'EN_ATENCION' && canService && <button className="primary compact" onClick={() => setFinish({ entry:r, session })}><CheckCircle2 size={15}/> Finalizar atención</button>}{r.status === 'ATENCION_FINALIZADA' && <button className="secondary compact" onClick={() => void checkOut(r)}><DoorOpen size={15}/> Registrar salida</button>}</div></div>
      })}</div>
    </div>

    {validate && <ValidateAppointment row={validate} employeeId={employee?.id || ''} onClose={() => setValidate(null)} onSaved={() => { setValidate(null); void load() }}/>} 
    {finish && <FinishShowroom entry={finish.entry} session={finish.session} onClose={() => setFinish(null)} onSaved={() => { setFinish(null); void load() }}/>} 
  </div>
}

function ValidateAppointment({ row, employeeId, onClose, onSaved }: { row: any; employeeId: string; onClose: () => void; onSaved: () => void }) {
  const tentative = row.appointment_at || row.requested_appointment_at
  const [date, setDate] = useState(tentative ? localDateTime(tentative) : '')
  const [notes, setNotes] = useState(row.validation_notes || '')
  const [busy, setBusy] = useState(false)

  const save = async (status: 'CONFIRMADA' | 'REPROGRAMADA' | 'NO_CONFIRMADA' | 'CANCELADA') => {
    if (['CONFIRMADA', 'REPROGRAMADA'].includes(status) && !date) return alert('Indica la fecha y hora acordada con el cliente.')
    setBusy(true)
    try {
      const patch: any = { status, validation_notes: notes || null }
      if (date) patch.appointment_at = new Date(date).toISOString()
      if (status === 'CONFIRMADA') { patch.confirmed_at = new Date().toISOString(); patch.confirmed_by_employee_id = employeeId }
      const { error } = await supabase.from('appointments').update(patch).eq('id', row.id)
      if (error) throw error
      onSaved()
    } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible actualizar la solicitud') } finally { setBusy(false) }
  }

  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal"><div className="modal-head"><div><span className="eyebrow">VALIDAR SHOWROOM</span><h3>{row.clients?.legal_name || 'Cliente'}</h3><p>Registra el resultado de la llamada de confirmación o reprogramación.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="form-grid one"><label>Fecha y hora acordada<input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}/></label><label>Nota de validación<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Con quién habló, condiciones, observaciones..."/></label></div><div className="modal-actions" style={{ flexWrap:'wrap' }}><button className="secondary" disabled={busy} onClick={() => void save('NO_CONFIRMADA')}>No confirma</button><button className="danger" disabled={busy} onClick={() => void save('CANCELADA')}>Cancelar cita</button><button className="secondary" disabled={busy} onClick={() => void save('REPROGRAMADA')}>Reprogramar</button><button className="primary" disabled={busy} onClick={() => void save('CONFIRMADA')}>Confirmar cita</button></div></div></div>
}

function FinishShowroom({ entry, session, onClose, onSaved }: { entry: any; session: any; onClose: () => void; onSaved: () => void }) {
  const [outcome, setOutcome] = useState('NO_COMPRA')
  const [purchased, setPurchased] = useState(false)
  const [amount, setAmount] = useState('')
  const [attendedBy, setAttendedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!session?.id) return alert('No se encontró la sesión de showroom.')
    setBusy(true)
    try {
      const ended = new Date().toISOString()
      const { error } = await supabase.from('showroom_sessions').update({ ended_at: ended, outcome, purchased, purchase_amount: purchased && amount ? Number(amount) : null, attended_by_name: attendedBy || null, notes: notes || null, next_action: nextAction || null, follow_up_date: followUp || null }).eq('id', session.id)
      if (error) throw error
      const { error: entryError } = await supabase.from('reception_entries').update({ status: 'ATENCION_FINALIZADA', service_ended_at: ended, service_ended_by: session.manager_employee_id }).eq('id', entry.id)
      if (entryError) throw entryError
      if (entry.appointment_id) await supabase.from('appointments').update({ status: 'FINALIZADA', purchased, notes: notes || null }).eq('id', entry.appointment_id)
      onSaved()
    } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo finalizar la atención') } finally { setBusy(false) }
  }

  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal"><div className="modal-head"><div><span className="eyebrow">CIERRE SHOWROOM</span><h3>{entry.clients?.legal_name || entry.prospects?.legal_name || entry.visitor_name || 'Visitante'}</h3><p>Finaliza la gestión comercial. La salida física se registra después.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="form-grid"><label>Resultado<select value={outcome} onChange={e => { setOutcome(e.target.value); if (e.target.value === 'COMPRA') setPurchased(true) }}><option value="COMPRA">Compró</option><option value="NO_COMPRA">No compró</option><option value="PENDIENTE">Pendiente</option><option value="SEGUIMIENTO">Seguimiento</option><option value="COTIZACION">Cotización</option><option value="OTRO">Otro</option></select></label><label className="checkbox"><input type="checkbox" checked={purchased} onChange={e => setPurchased(e.target.checked)}/> Registró compra</label>{purchased && <label>Monto compra<input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}/></label>}<label>Quién lo atendió<input value={attendedBy} onChange={e => setAttendedBy(e.target.value)}/></label><label>Próxima acción<input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Llamar, cotizar, seguimiento..."/></label><label>Fecha seguimiento<input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}/></label><label style={{ gridColumn:'1 / -1' }}>Observaciones<textarea value={notes} onChange={e => setNotes(e.target.value)}/></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando...' : 'Finalizar atención'}</button></div></div></div>
}

function localDateTime(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
