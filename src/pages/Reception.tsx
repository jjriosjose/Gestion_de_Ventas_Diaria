import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, DoorOpen, LogOut, Plus, Search, UserRoundCheck, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../lib/access'
import { ClientTypeFilter } from '../components/ClientTypeFilter'
import type { ClientTypeFilterValue } from '../components/ClientTypeFilter'
import '../styles/operational-v059.css'

const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
const dayEnd = () => { const d = dayStart(); d.setDate(d.getDate() + 1); return d }
const futureEnd = () => { const d = dayStart(); d.setDate(d.getDate() + 8); return d }

export function Reception() {
  const { employee } = useAuth()
  const canCreateProspect = hasPermission(employee, 'capture.create')
  const [appointments, setAppointments] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [clientType, setClientType] = useState<ClientTypeFilterValue>('')
  const [walkIn, setWalkIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')

  const load = async () => {
    setLoadError('')
    const start = dayStart().toISOString()
    const end = dayEnd().toISOString()
    const future = futureEnd().toISOString()
    const [a, e, c, m] = await Promise.all([
      supabase.from('appointments').select('*,clients(id,codempr,legal_name,client_type,phone1,mobile,contact_name,manager_employee_id),prospects(id,prospect_code,legal_name,phone,mobile),manager:employees!appointments_assigned_manager_id_fkey(id,full_name)').gte('appointment_at', start).lt('appointment_at', future).in('status', ['CONFIRMADA','REPROGRAMADA','PROGRAMADA','ASISTIO','FINALIZADA']).order('appointment_at'),
      supabase.from('reception_entries').select('*,clients(codempr,legal_name,client_type),prospects(prospect_code,legal_name),manager:employees!reception_entries_assigned_manager_id_fkey(full_name),appointments(appointment_at,status)').gte('check_in_at', start).lt('check_in_at', end).order('check_in_at', { ascending: false }),
      supabase.from('clients').select('id,codempr,client_type,legal_name,contact_name,manager_employee_id,phone1,mobile,province,municipality').order('legal_name'),
      supabase.from('employees').select('id,full_name').eq('active', true).eq('employee_type', 'Gestor').order('full_name'),
    ])
    const error = a.error || e.error || c.error || m.error
    if (error) setLoadError(error.message)
    setAppointments(a.data || [])
    setEntries(e.data || [])
    setClients(c.data || [])
    setManagers(m.data || [])
  }

  useEffect(() => { void load() }, [])

  const filteredAppointments = useMemo(() => appointments.filter(a => !clientType || !a.client_id || a.clients?.client_type === clientType), [appointments, clientType])
  const filteredEntries = useMemo(() => entries.filter(e => !clientType || !e.client_id || e.clients?.client_type === clientType), [entries, clientType])
  const filteredClients = useMemo(() => clients.filter(c => !clientType || c.client_type === clientType), [clients, clientType])
  const entryByAppointment = useMemo(() => new Map(filteredEntries.filter(e => e.appointment_id).map(e => [e.appointment_id, e])), [filteredEntries])
  const todayKey = new Date().toDateString()
  const expected = filteredAppointments.filter(a => a.appointment_at && new Date(a.appointment_at).toDateString() === todayKey && !entryByAppointment.has(a.id) && !['ASISTIO','FINALIZADA'].includes(a.status))
  const upcoming = filteredAppointments.filter(a => a.appointment_at && new Date(a.appointment_at).toDateString() !== todayKey && !entryByAppointment.has(a.id) && ['CONFIRMADA','REPROGRAMADA','PROGRAMADA'].includes(a.status))
  const inside = filteredEntries.filter(e => !['SALIO','CANCELADO'].includes(e.status))
  const waiting = inside.filter(e => e.status === 'EN_ESPERA').length
  const inService = inside.filter(e => e.status === 'EN_ATENCION').length

  const arriveAppointment = async (row: any) => {
    if (!employee?.id) return
    if (!row.assigned_manager_id) return alert('Esta cita aún no tiene Gestor asignado.')
    setBusy(true)
    try {
      const { error } = await supabase.from('reception_entries').insert({
        appointment_id: row.id,
        client_id: row.client_id || null,
        prospect_id: row.prospect_id || null,
        visitor_type: 'CITA',
        visitor_name: row.clients?.contact_name || row.clients?.legal_name || row.prospects?.legal_name || 'Cita',
        company_name: row.clients?.legal_name || row.prospects?.legal_name || null,
        phone: row.clients?.mobile || row.clients?.phone1 || row.prospects?.mobile || row.prospects?.phone || null,
        purpose: 'Cita showroom',
        assigned_manager_id: row.assigned_manager_id,
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

  const nameOf = (r: any) => r.visitor_name || r.clients?.legal_name || r.prospects?.legal_name || r.company_name || 'Visitante'

  return <div className="page-stack">
    <div className="page-head">
      <div><span className="eyebrow">CONTROL DE PRESENCIA</span><h2>Recepción showroom</h2><p>Control de citas, llegadas, espera, atención y salida. Una consulta general puede registrarse sin asignar gestor.</p></div>
      <div className="button-row"><ClientTypeFilter value={clientType} onChange={setClientType}/><button className="primary" onClick={() => setWalkIn(true)}><Plus size={17}/> Llegada sin cita</button></div>
    </div>

    <div className="kpi-grid">
      <div className="kpi-card"><div className="kpi-icon"><CalendarCheck/></div><div><span>Citas esperadas</span><strong>{expected.length}</strong><small>pendientes de llegar hoy</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><DoorOpen/></div><div><span>Dentro</span><strong>{inside.length}</strong><small>personas actualmente</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><Users/></div><div><span>En espera</span><strong>{waiting}</strong><small>pendientes de atención</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><UserRoundCheck/></div><div><span>En atención</span><strong>{inService}</strong><small>con un gestor</small></div></div>
    </div>

    {loadError && <div className="panel"><b>Error cargando Recepción</b><span>{loadError}</span></div>}

    <div className="panel">
      <div className="panel-head"><div><b>Citas esperadas hoy</b><span>Recepción confirma la llegada física; el gestor continúa la atención comercial.</span></div>{clientType&&<span className="badge">{clientType}</span>}</div>
      <div className="cards-list">
        {expected.length === 0 && <div className="empty-state"><b>No quedan citas confirmadas pendientes de llegada hoy.</b></div>}
        {expected.map(row => <div className="activity-card" key={row.id}><div className="activity-main"><b>{row.clients?.legal_name || row.prospects?.legal_name || 'Cita'}</b><span>{row.appointment_at ? new Date(row.appointment_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : ''} · {row.clients?.client_type||'SIN TIPO'} · Gestor: {row.manager?.full_name || 'Sin asignar'}</span><small>{row.status.replaceAll('_',' ')}{row.clients?.contact_name ? ` · ${row.clients.contact_name}` : ''}</small></div><button className="primary compact" disabled={busy} onClick={() => void arriveAppointment(row)}><DoorOpen size={15}/> Llegó</button></div>)}
      </div>
    </div>

    <div className="panel">
      <div className="panel-head"><div><b>Próximas citas confirmadas</b><span>Vista anticipada de los próximos 7 días.</span></div><span className="badge">{upcoming.length}</span></div>
      <div className="cards-list">
        {upcoming.length === 0 && <div className="empty-state"><b>No hay citas confirmadas en los próximos 7 días.</b></div>}
        {upcoming.slice(0, 30).map(row => <div className="activity-card" key={row.id}><div className="activity-main"><b>{row.clients?.legal_name || row.prospects?.legal_name || 'Cita'}</b><span>{new Date(row.appointment_at).toLocaleString('es-DO')} · {row.clients?.client_type||'SIN TIPO'} · Gestor: {row.manager?.full_name || 'Sin asignar'}</span><small>{row.status.replaceAll('_',' ')}</small></div></div>)}
      </div>
    </div>

    <div className="panel">
      <div className="panel-head"><div><b>Movimientos de hoy</b><span>La entrada y la salida se conservan aunque la persona no requiera atención de un gestor.</span></div></div>
      <div className="cards-list">
        {filteredEntries.length === 0 && <div className="empty-state"><b>Aún no hay entradas registradas.</b></div>}
        {filteredEntries.map(row => <div className="activity-card" key={row.id}><div className="activity-main"><b>{nameOf(row)}</b><span>{row.company_name && row.company_name !== row.visitor_name ? `${row.company_name} · ` : ''}Llegó {new Date(row.check_in_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })} · {row.clients?.client_type||'SIN TIPO'} · {row.manager?.full_name || 'Sin gestor asignado'}</span><small>{row.purpose || row.visitor_type.replaceAll('_',' ')} · {row.status.replaceAll('_',' ')}{row.check_out_at ? ` · salió ${new Date(row.check_out_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}` : ''}</small></div>{!['SALIO','CANCELADO'].includes(row.status) && <button className="secondary compact" onClick={() => void checkOut(row)}><LogOut size={15}/> Registrar salida</button>}</div>)}
      </div>
    </div>

    {walkIn && <WalkInModal clients={filteredClients} managers={managers} employeeId={employee?.id || ''} canCreateProspect={canCreateProspect} onClose={() => setWalkIn(false)} onSaved={() => { setWalkIn(false); void load() }}/>} 
  </div>
}

function WalkInModal({ clients, managers, employeeId, canCreateProspect, onClose, onSaved }: { clients: any[]; managers: any[]; employeeId: string; canCreateProspect: boolean; onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<'CLIENTE'|'NUEVO'>('CLIENTE')
  const [clientId, setClientId] = useState('')
  const [clientQuery, setClientQuery] = useState('')
  const [managerId, setManagerId] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [purposeType, setPurposeType] = useState('Consulta general')
  const [purposeDetail, setPurposeDetail] = useState('')
  const [notes, setNotes] = useState('')
  const [registerProspect, setRegisterProspect] = useState(false)
  const [busy, setBusy] = useState(false)
  const selectedClient = clients.find(c => c.id === clientId)

  const matches = useMemo(() => {
    const needle = clientQuery.trim().toLowerCase()
    if (!needle || selectedClient) return []
    return clients.filter(c => `${c.legal_name || ''} ${c.codempr || ''} ${c.contact_name || ''} ${c.phone1 || ''} ${c.mobile || ''} ${c.province || ''} ${c.municipality || ''}`.toLowerCase().includes(needle)).slice(0, 20)
  }, [clients, clientQuery, selectedClient])

  useEffect(() => {
    if (!selectedClient) return
    if (selectedClient.manager_employee_id) setManagerId(selectedClient.manager_employee_id)
    setCompany(selectedClient.legal_name || '')
    setVisitorName(selectedClient.contact_name || '')
    setPhone(selectedClient.mobile || selectedClient.phone1 || '')
  }, [selectedClient?.id])

  const chooseClient = (client: any) => { setClientId(client.id); setClientQuery(client.legal_name) }
  const clearClient = () => { setClientId(''); setClientQuery(''); setManagerId(''); setVisitorName(''); setCompany(''); setPhone('') }
  const switchMode = (next: 'CLIENTE'|'NUEVO') => { setMode(next); clearClient(); setRegisterProspect(false) }

  const save = async () => {
    if (!employeeId) return
    if (mode === 'CLIENTE' && !clientId) return alert('Busca y selecciona el cliente.')
    if (mode === 'NUEVO' && !visitorName.trim() && !company.trim()) return alert('Indica el nombre de la persona o empresa.')
    setBusy(true)
    try {
      let prospectId: string | null = null
      if (mode === 'NUEVO' && registerProspect) {
        const { data, error } = await supabase.from('prospects').insert({ legal_name: company.trim() || visitorName.trim(), contact_name: visitorName.trim() || null, phone: phone.trim() || null, captured_by_employee_id: employeeId, assigned_manager_id: managerId || null, status: 'NUEVO', notes: `Identificado como posible cliente desde recepción. ${notes.trim()}`.trim() }).select('id').single()
        if (error) throw error
        prospectId = data.id
      }
      const personName = visitorName.trim() || selectedClient?.contact_name || selectedClient?.legal_name || company.trim()
      const companyName = mode === 'CLIENTE' ? selectedClient?.legal_name || null : company.trim() || null
      const purpose = purposeDetail.trim() || purposeType
      const { error } = await supabase.from('reception_entries').insert({ client_id: mode === 'CLIENTE' ? clientId : null, prospect_id: prospectId, visitor_type: mode === 'CLIENTE' ? 'CLIENTE_SIN_CITA' : prospectId ? 'PROSPECTO' : 'VISITANTE', visitor_name: personName, company_name: companyName, phone: phone.trim() || selectedClient?.mobile || selectedClient?.phone1 || null, purpose, assigned_manager_id: managerId || null, check_in_by: employeeId, status: managerId ? 'EN_ESPERA' : 'REGISTRADO', notes: notes.trim() || null })
      if (error) throw error
      onSaved()
    } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo registrar la llegada') } finally { setBusy(false) }
  }

  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal large"><div className="modal-head"><div><span className="eyebrow">NUEVA ENTRADA</span><h3>Llegada sin cita</h3><p>Registra quién llegó, motivo y destino. El gestor es opcional.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <div className="tabs"><button className={mode === 'CLIENTE' ? 'active' : ''} onClick={() => switchMode('CLIENTE')}>Cliente existente</button><button className={mode === 'NUEVO' ? 'active' : ''} onClick={() => switchMode('NUEVO')}>Persona / empresa nueva</button></div>
    <div className="walkin-fields">
      {mode === 'CLIENTE' && <div className="span-2" style={{ position: 'relative' }}><label>Buscar cliente<div className="search-field"><Search size={18}/><input value={clientQuery} onChange={e => { setClientQuery(e.target.value); if (selectedClient) setClientId('') }} placeholder="Nombre, código, teléfono, contacto, municipio..."/></div></label>{matches.length > 0 && <div className="panel" style={{ position: 'absolute', zIndex: 10, left: 0, right: 0, top: '100%', maxHeight: 280, overflow: 'auto', padding: 8 }}>{matches.map(c => <button key={c.id} className="activity-card" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: 6 }} onClick={() => chooseClient(c)}><div className="activity-main"><b>{c.legal_name}</b><span>{c.codempr} · {c.client_type||'SIN TIPO'} · {c.contact_name || 'Sin contacto'}</span><small>{c.phone1 || c.mobile || 'Sin teléfono'} · {c.municipality || c.province || ''}</small></div></button>)}</div>}{selectedClient && <div className="selected-client"><div><b>{selectedClient.legal_name}</b><span>{selectedClient.codempr} · {selectedClient.client_type||'SIN TIPO'} · {selectedClient.phone1 || selectedClient.mobile || 'Sin teléfono'}</span></div><button className="secondary compact" onClick={clearClient}>Cambiar</button></div>}</div>}
      <label>Nombre de la persona<input value={visitorName} onChange={e => setVisitorName(e.target.value)} placeholder={mode==='CLIENTE'?'Contacto que llegó':'Nombre y apellido'}/></label>
      <label>Empresa / cliente<input value={company} onChange={e => setCompany(e.target.value)} disabled={mode==='CLIENTE'&&!!selectedClient} placeholder="Empresa o nombre comercial"/></label>
      <label>Teléfono<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Opcional"/></label>
      <label className="optional-label">Gestor / destino<select value={managerId} onChange={e => setManagerId(e.target.value)}><option value="">Sin gestor asignado</option>{managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label>
      <label>Tipo de visita<select value={purposeType} onChange={e => setPurposeType(e.target.value)}><option>Consulta general</option><option>Compra / ver mercancía</option><option>Seguimiento comercial</option><option>Entrega de documentos</option><option>Pago / asunto administrativo</option><option>Reunión</option><option>Otro</option></select></label>
      <label>Detalle del motivo<input value={purposeDetail} onChange={e => setPurposeDetail(e.target.value)} placeholder="Ej. retirar factura, consultar disponibilidad..."/></label>
      <label className="span-2">Observaciones<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Información útil para recepción o el gestor..."/></label>
      {mode==='NUEVO'&&canCreateProspect&&<div className="walkin-prospect-toggle span-2"><label className="checkbox"><input type="checkbox" checked={registerProspect} onChange={e=>setRegisterProspect(e.target.checked)}/> Registrar también como posible cliente / prospecto</label><div className="walkin-hint">Si está desmarcado, la persona queda únicamente en el control de recepción y no entra al módulo de Captación.</div></div>}
    </div>
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando...' : 'Registrar llegada'}</button></div>
  </div></div>
}
