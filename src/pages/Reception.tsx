import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, DoorOpen, LogOut, Plus, UserRoundCheck, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const dayStart = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
const dayEnd = () => {
  const d = dayStart(); d.setDate(d.getDate() + 1); return d
}

export function Reception() {
  const { employee } = useAuth()
  const [appointments, setAppointments] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [walkIn, setWalkIn] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const start = dayStart().toISOString()
    const end = dayEnd().toISOString()
    const [a, e, c, m] = await Promise.all([
      supabase.from('appointments').select('*,clients(id,codempr,legal_name,phone1,mobile,manager_employee_id),prospects(id,prospect_code,legal_name,phone,mobile),employees(full_name)').gte('appointment_at', start).lt('appointment_at', end).in('status', ['CONFIRMADA','REPROGRAMADA','PROGRAMADA','ASISTIO','FINALIZADA']).order('appointment_at'),
      supabase.from('reception_entries').select('*,clients(codempr,legal_name),prospects(prospect_code,legal_name),manager:employees!reception_entries_assigned_manager_id_fkey(full_name),appointments(appointment_at,status)').gte('check_in_at', start).lt('check_in_at', end).order('check_in_at', { ascending: false }),
      supabase.from('clients').select('id,codempr,legal_name,manager_employee_id,phone1,mobile').order('legal_name'),
      supabase.from('employees').select('id,full_name').eq('active', true).eq('employee_type', 'Gestor').order('full_name'),
    ])
    setAppointments(a.data || [])
    setEntries(e.data || [])
    setClients(c.data || [])
    setManagers(m.data || [])
  }

  useEffect(() => { void load() }, [])

  const entryByAppointment = useMemo(() => new Map(entries.filter(e => e.appointment_id).map(e => [e.appointment_id, e])), [entries])
  const expected = appointments.filter(a => !entryByAppointment.has(a.id) && !['ASISTIO','FINALIZADA'].includes(a.status))
  const inside = entries.filter(e => !['SALIO','CANCELADO'].includes(e.status))
  const waiting = inside.filter(e => e.status === 'EN_ESPERA').length
  const inService = inside.filter(e => e.status === 'EN_ATENCION').length

  const arriveAppointment = async (row: any) => {
    if (!employee?.id) return
    setBusy(true)
    try {
      const { error } = await supabase.from('reception_entries').insert({
        appointment_id: row.id,
        client_id: row.client_id || null,
        prospect_id: row.prospect_id || null,
        visitor_type: 'CITA',
        visitor_name: row.clients?.legal_name || row.prospects?.legal_name || 'Cita',
        phone: row.clients?.mobile || row.clients?.phone1 || row.prospects?.mobile || row.prospects?.phone || null,
        purpose: 'Cita showroom',
        assigned_manager_id: row.employee_id,
        check_in_by: employee.id,
        status: 'EN_ESPERA',
      })
      if (error) throw error
      await supabase.from('appointments').update({ status: 'ASISTIO', attended_at: new Date().toISOString() }).eq('id', row.id)
      await load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo registrar la llegada')
    } finally { setBusy(false) }
  }

  const checkOut = async (entry: any) => {
    if (!employee?.id) return
    if (entry.status === 'EN_ATENCION') return alert('El gestor debe finalizar la atención antes de registrar la salida.')
    const { error } = await supabase.from('reception_entries').update({ status: 'SALIO', check_out_at: new Date().toISOString(), check_out_by: employee.id }).eq('id', entry.id)
    if (error) return alert(error.message)
    await load()
  }

  const nameOf = (r: any) => r.clients?.legal_name || r.prospects?.legal_name || r.company_name || r.visitor_name || 'Visitante'

  return <div className="page-stack">
    <div className="page-head">
      <div><span className="eyebrow">CONTROL DE PRESENCIA</span><h2>Recepción showroom</h2><p>Registro independiente de llegadas y salidas físicas. La gestión comercial permanece a cargo del gestor.</p></div>
      <button className="primary" onClick={() => setWalkIn(true)}><Plus size={17}/> Llegada sin cita</button>
    </div>

    <div className="kpi-grid">
      <div className="kpi-card"><div className="kpi-icon"><CalendarCheck/></div><div><span>Citas esperadas</span><strong>{expected.length}</strong><small>pendientes de llegar hoy</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><DoorOpen/></div><div><span>Dentro</span><strong>{inside.length}</strong><small>personas actualmente</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><Users/></div><div><span>En espera</span><strong>{waiting}</strong><small>pendientes de atención</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><UserRoundCheck/></div><div><span>En atención</span><strong>{inService}</strong><small>con un gestor</small></div></div>
    </div>

    <div className="panel">
      <div className="panel-head"><div><b>Citas esperadas hoy</b><span>La recepción registra la llegada real; la cita por sí sola no cuenta como asistencia.</span></div></div>
      <div className="cards-list">
        {expected.length === 0 && <div className="empty-state"><b>No quedan citas pendientes de llegada hoy.</b></div>}
        {expected.map(row => <div className="activity-card" key={row.id}><div className="activity-main"><b>{row.clients?.legal_name || row.prospects?.legal_name || 'Cita'}</b><span>{row.appointment_at ? new Date(row.appointment_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : ''} · Gestor: {row.employees?.full_name || 'Sin asignar'}</span><small>{row.status.replaceAll('_',' ')}</small></div><button className="primary compact" disabled={busy} onClick={() => void arriveAppointment(row)}><DoorOpen size={15}/> Llegó</button></div>)}
      </div>
    </div>

    <div className="panel">
      <div className="panel-head"><div><b>Movimientos de hoy</b><span>Entrada, espera, atención y salida se conservan como eventos físicos independientes.</span></div></div>
      <div className="cards-list">
        {entries.length === 0 && <div className="empty-state"><b>Aún no hay entradas registradas.</b></div>}
        {entries.map(row => <div className="activity-card" key={row.id}><div className="activity-main"><b>{nameOf(row)}</b><span>Llegó {new Date(row.check_in_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })} · {row.manager?.full_name || 'Sin gestor'}</span><small>{row.visitor_type.replaceAll('_',' ')} · {row.status.replaceAll('_',' ')}{row.check_out_at ? ` · salió ${new Date(row.check_out_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}` : ''}</small></div>{!['SALIO','CANCELADO'].includes(row.status) && <button className="secondary compact" onClick={() => void checkOut(row)}><LogOut size={15}/> Registrar salida</button>}</div>)}
      </div>
    </div>

    {walkIn && <WalkInModal clients={clients} managers={managers} employeeId={employee?.id || ''} onClose={() => setWalkIn(false)} onSaved={() => { setWalkIn(false); void load() }}/>} 
  </div>
}

function WalkInModal({ clients, managers, employeeId, onClose, onSaved }: { clients: any[]; managers: any[]; employeeId: string; onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<'CLIENTE'|'NUEVO'>('CLIENTE')
  const [clientId, setClientId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [purpose, setPurpose] = useState('Visita showroom')
  const [busy, setBusy] = useState(false)
  const selectedClient = clients.find(c => c.id === clientId)

  useEffect(() => {
    if (selectedClient?.manager_employee_id) setManagerId(selectedClient.manager_employee_id)
  }, [selectedClient?.manager_employee_id])

  const save = async () => {
    if (!employeeId) return
    if (!managerId) return alert('Selecciona el gestor que atenderá a la persona.')
    if (mode === 'CLIENTE' && !clientId) return alert('Selecciona el cliente.')
    if (mode === 'NUEVO' && !name.trim() && !company.trim()) return alert('Indica el nombre de la persona o empresa.')
    setBusy(true)
    try {
      let prospectId: string | null = null
      if (mode === 'NUEVO') {
        const { data, error } = await supabase.from('prospects').insert({ legal_name: company.trim() || name.trim(), contact_name: name.trim() || null, phone: phone.trim() || null, captured_by_employee_id: employeeId, assigned_manager_id: managerId, status: 'NUEVO', notes: 'Captado desde recepción showroom' }).select('id').single()
        if (error) throw error
        prospectId = data.id
      }
      const { error } = await supabase.from('reception_entries').insert({
        client_id: mode === 'CLIENTE' ? clientId : null,
        prospect_id: prospectId,
        visitor_type: mode === 'CLIENTE' ? 'CLIENTE_SIN_CITA' : 'NUEVO',
        visitor_name: mode === 'CLIENTE' ? selectedClient?.legal_name : name.trim() || company.trim(),
        company_name: mode === 'NUEVO' ? company.trim() || null : null,
        phone: mode === 'CLIENTE' ? selectedClient?.mobile || selectedClient?.phone1 || null : phone.trim() || null,
        purpose,
        assigned_manager_id: managerId,
        check_in_by: employeeId,
        status: 'EN_ESPERA',
      })
      if (error) throw error
      onSaved()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo registrar la llegada')
    } finally { setBusy(false) }
  }

  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal"><div className="modal-head"><div><span className="eyebrow">NUEVA ENTRADA</span><h3>Llegada sin cita</h3><p>Recepción registra presencia física; el gestor completará la atención comercial.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="tabs"><button className={mode === 'CLIENTE' ? 'active' : ''} onClick={() => setMode('CLIENTE')}>Cliente existente</button><button className={mode === 'NUEVO' ? 'active' : ''} onClick={() => setMode('NUEVO')}>Persona / empresa nueva</button></div><div className="form-grid one">{mode === 'CLIENTE' ? <label>Cliente<select value={clientId} onChange={e => setClientId(e.target.value)}><option value="">Seleccionar cliente...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.legal_name} · {c.codempr}</option>)}</select></label> : <><label>Persona contacto<input value={name} onChange={e => setName(e.target.value)}/></label><label>Empresa / nombre comercial<input value={company} onChange={e => setCompany(e.target.value)}/></label><label>Teléfono<input value={phone} onChange={e => setPhone(e.target.value)}/></label></>}<label>Gestor responsable<select value={managerId} onChange={e => setManagerId(e.target.value)}><option value="">Seleccionar gestor...</option>{managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label><label>Motivo<input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Compra, ver mercancía, seguimiento..."/></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando...' : 'Registrar llegada'}</button></div></div></div>
}
