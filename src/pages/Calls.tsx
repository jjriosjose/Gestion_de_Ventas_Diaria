import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, PhoneCall, Plus, Search, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { exportPdf, exportXlsx } from '../lib/export'
import type { Employee } from '../types'

const CALL_RESULTS = [
  ['CONTACTADO', 'Contactado'],
  ['NO_CONTESTA', 'No contesta'],
  ['OCUPADO', 'Ocupado'],
  ['TELEFONO_INCORRECTO', 'Teléfono incorrecto'],
  ['LLAMAR_MAS_TARDE', 'Llamar más tarde'],
  ['SEGUIMIENTO', 'Seguimiento'],
  ['INTERESADO_SHOWROOM', 'Va a visitar showroom'],
  ['COMPRO', 'Compró'],
  ['NO_COMPRO', 'No compró'],
  ['NO_INTERESADO', 'No interesado'],
] as const

const NEXT_ACTIONS = [
  ['', 'Sin próxima acción'],
  ['LLAMAR_NUEVAMENTE', 'Llamar nuevamente'],
  ['VISITA_VENDEDOR', 'Asignar / sugerir visita del vendedor'],
  ['VALIDAR_SHOWROOM', 'Validar cita de showroom'],
  ['SEGUIMIENTO_PEDIDO', 'Seguimiento de pedido'],
  ['ENVIAR_INFO', 'Enviar información'],
  ['OTRO', 'Otro seguimiento'],
] as const

export function Calls() {
  const { employee } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [managerFilter, setManagerFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [callerFilter, setCallerFilter] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = async () => {
    const [{ data: calls }, { data: staff }, portfolio] = await Promise.all([
      supabase.from('calls').select('*,clients(id,codempr,legal_name,vendor_employee_id,manager_employee_id),prospects(prospect_code,legal_name),employees(full_name,employee_type)').order('occurred_at', { ascending: false }).limit(1500),
      supabase.from('employees').select('*').eq('active', true).order('full_name'),
      loadPortfolio(),
    ])
    setRows(calls || [])
    setEmployees((staff || []) as Employee[])
    setClients(portfolio)
  }
  useEffect(() => { void load() }, [])

  const vendors = useMemo(() => employees.filter((e: any) => e.employee_type === 'Vendedor'), [employees])
  const managers = useMemo(() => employees.filter((e: any) => e.employee_type === 'Gestor'), [employees])
  const employeeName = (id?: string | null) => employees.find(e => e.id === id)?.full_name || '—'

  const filteredClients = useMemo(() => clients.filter(c => {
    if (vendorFilter && c.vendor_employee_id !== vendorFilter) return false
    if (managerFilter && c.manager_employee_id !== managerFilter) return false
    return true
  }), [clients, vendorFilter, managerFilter])

  useEffect(() => {
    if (clientFilter && !filteredClients.some(c => c.id === clientFilter)) setClientFilter('')
  }, [filteredClients, clientFilter])

  const visible = useMemo(() => rows.filter((r) => {
    if (vendorFilter && r.clients?.vendor_employee_id !== vendorFilter) return false
    if (managerFilter && r.clients?.manager_employee_id !== managerFilter) return false
    if (clientFilter && r.client_id !== clientFilter) return false
    if (callerFilter && r.employee_id !== callerFilter) return false
    if (resultFilter && r.result !== resultFilter) return false
    if (from && new Date(r.occurred_at) < new Date(`${from}T00:00:00`)) return false
    if (to && new Date(r.occurred_at) > new Date(`${to}T23:59:59`)) return false
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      const hay = `${r.clients?.legal_name || ''} ${r.clients?.codempr || ''} ${r.contact_name || ''} ${r.notes || ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  }), [rows, vendorFilter, managerFilter, clientFilter, callerFilter, resultFilter, from, to, q])

  const today = new Date().toISOString().slice(0, 10)
  const todayRows = visible.filter(r => String(r.occurred_at || '').slice(0, 10) === today)
  const showroomCount = visible.filter(r => r.result === 'INTERESADO_SHOWROOM' || r.appointment_created).length
  const purchaseCount = visible.filter(r => r.result === 'COMPRO').length
  const followupCount = visible.filter(r => ['LLAMAR_MAS_TARDE', 'SEGUIMIENTO'].includes(r.result) || r.follow_up_date).length

  const report = visible.map(r => ({
    Fecha: new Date(r.occurred_at).toLocaleString('es-DO'),
    EjecutadaPor: r.employees?.full_name || '',
    Vendedor: employeeName(r.clients?.vendor_employee_id),
    Gestor: employeeName(r.clients?.manager_employee_id),
    Cliente: r.clients?.legal_name || r.prospects?.legal_name || '',
    Resultado: labelResult(r.result),
    Contacto: r.contact_name || '',
    Duracion: r.duration_seconds || '',
    Showroom: r.appointment_created ? 'Sí' : 'No',
    ProximaAccion: labelNextAction(r.next_action),
    Seguimiento: r.follow_up_date || '',
    Observacion: r.notes || '',
  }))

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">CRM OPERATIVO</span><h2>Llamadas</h2><p>Gestión telefónica por cartera, vendedor, gestor, cliente, resultado y próxima acción.</p></div><div className="button-row"><button className="secondary" onClick={() => void exportXlsx('Gestion_Llamadas', report)}>Excel</button><button className="secondary" onClick={() => exportPdf('Gestión de Llamadas', report)}>PDF</button><button className="primary" onClick={() => setOpen(true)}><Plus size={18}/> Registrar llamada</button></div></div>

    <div className="kpi-grid compact-kpis">
      <div className="kpi-card"><div className="kpi-icon"><PhoneCall/></div><div><span>Visibles</span><strong>{visible.length}</strong><small>{todayRows.length} hoy</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><CalendarClock/></div><div><span>Showroom</span><strong>{showroomCount}</strong><small>solicitudes / interés</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><Users/></div><div><span>Seguimientos</span><strong>{followupCount}</strong><small>pendientes o programados</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><PhoneCall/></div><div><span>Compraron</span><strong>{purchaseCount}</strong><small>reportados en llamada</small></div></div>
    </div>

    <div className="panel planner-filter-panel">
      <div className="planner-filter-grid">
        <div className="search-field"><Search size={18}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cliente, código, contacto u observación..."/></div>
        <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}><option value="">Todos los vendedores</option>{vendors.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
        <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)}><option value="">Todos los gestores</option>{managers.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}><option value="">Todos los clientes ({filteredClients.length})</option>{filteredClients.map(c => <option key={c.id} value={c.id}>{c.legal_name} · {c.codempr}</option>)}</select>
        <select value={callerFilter} onChange={e => setCallerFilter(e.target.value)}><option value="">Ejecutada por cualquiera</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
        <select value={resultFilter} onChange={e => setResultFilter(e.target.value)}><option value="">Todos los resultados</option>{CALL_RESULTS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}/>
        <input type="date" value={to} onChange={e => setTo(e.target.value)}/>
      </div>
      <div className="planner-filter-actions"><div className="meta"><span>{visible.length} llamadas</span><span>{filteredClients.length} clientes en la cartera filtrada</span></div><button className="secondary" onClick={() => { setQ(''); setVendorFilter(''); setManagerFilter(''); setClientFilter(''); setCallerFilter(''); setResultFilter(''); setFrom(''); setTo('') }}>Limpiar filtros</button></div>
    </div>

    <div className="cards-list">{visible.map(r => <div className="activity-card" key={r.id}><div className="activity-icon"><PhoneCall/></div><div className="activity-main"><b>{r.clients?.legal_name || r.prospects?.legal_name || 'Gestión telefónica'}</b><span>{r.employees?.full_name} · {new Date(r.occurred_at).toLocaleString('es-DO')}</span><small>V: {employeeName(r.clients?.vendor_employee_id)} · G: {employeeName(r.clients?.manager_employee_id)} · {labelResult(r.result)}{r.contact_name ? ` · ${r.contact_name}` : ''}</small>{r.next_action && <small>Próxima acción: {labelNextAction(r.next_action)}{r.follow_up_date ? ` · ${r.follow_up_date}` : ''}</small>}{r.notes && <small>{r.notes}</small>}</div>{r.appointment_created && <span className="badge success"><CalendarClock size={13}/> Showroom</span>}</div>)}</div>
    {open && <NewCall employeeId={employee?.id || ''} employees={employees} clients={clients} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); void load() }}/>} 
  </div>
}

function labelResult(value?: string) {
  return CALL_RESULTS.find(([code]) => code === value)?.[1] || value || 'Sin resultado'
}

function labelNextAction(value?: string) {
  return NEXT_ACTIONS.find(([code]) => code === value)?.[1] || value || '—'
}

function NewCall({ employeeId, employees, clients, onClose, onSaved }: { employeeId: string; employees: Employee[]; clients: any[]; onClose: () => void; onSaved: () => void }) {
  const vendors = employees.filter((e: any) => e.employee_type === 'Vendedor')
  const managers = employees.filter((e: any) => e.employee_type === 'Gestor')
  const [vendorId, setVendorId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [clientId, setClientId] = useState('')
  const [result, setResult] = useState('CONTACTADO')
  const [contact, setContact] = useState('')
  const [notes, setNotes] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [showroomDate, setShowroomDate] = useState('')
  const [duration, setDuration] = useState('')
  const [busy, setBusy] = useState(false)

  const portfolio = useMemo(() => clients.filter(c => {
    if (vendorId && c.vendor_employee_id !== vendorId) return false
    if (managerId && c.manager_employee_id !== managerId) return false
    return true
  }), [clients, vendorId, managerId])
  const client = clients.find(c => c.id === clientId) || null

  useEffect(() => {
    if (clientId && !portfolio.some(c => c.id === clientId)) setClientId('')
  }, [portfolio, clientId])

  useEffect(() => {
    if (client?.contact_name) setContact(client.contact_name)
  }, [client?.id])

  useEffect(() => {
    if (result === 'INTERESADO_SHOWROOM') setNextAction('VALIDAR_SHOWROOM')
    else if (result === 'COMPRO' && !nextAction) setNextAction('SEGUIMIENTO_PEDIDO')
    else if (result === 'LLAMAR_MAS_TARDE' && !nextAction) setNextAction('LLAMAR_NUEVAMENTE')
  }, [result])

  const save = async () => {
    if (!client) return alert('Selecciona un cliente')
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const wantsShowroom = result === 'INTERESADO_SHOWROOM'
      const { data: call, error } = await supabase.from('calls').insert({ client_id: client.id, employee_id: employeeId, occurred_at: now, result, contact_name: contact || null, phone_used: client.phone1 || client.mobile || null, duration_seconds: duration ? Number(duration) * 60 : null, appointment_created: false, notes: notes || null, next_action: nextAction || (wantsShowroom ? 'VALIDAR_SHOWROOM' : null), follow_up_date: followUp || null }).select().single()
      if (error) throw error

      if (wantsShowroom) {
        if (!client.manager_employee_id) {
          alert('Llamada guardada. Este cliente no tiene V-Gestor asignado, por lo que la solicitud de showroom no pudo asignarse.')
        } else {
          const tentative = showroomDate ? new Date(showroomDate).toISOString() : null
          const { error: apptError } = await supabase.from('appointments').insert({ client_id: client.id, employee_id: client.manager_employee_id, assigned_manager_id: client.manager_employee_id, requested_by_employee_id: employeeId, source_type: 'LLAMADA', created_from_call_id: call.id, requested_at: now, requested_appointment_at: tentative, appointment_at: tentative, appointment_type: 'SHOWROOM', status: 'PENDIENTE_VALIDACION', request_contact_name: contact || null, request_phone: client.phone1 || client.mobile || null, notes: notes || null })
          if (apptError) throw apptError
          await supabase.from('calls').update({ appointment_created: true }).eq('id', call.id)
        }
      }
      onSaved()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible guardar la llamada')
    } finally { setBusy(false) }
  }

  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal large"><div className="modal-head"><div><span className="eyebrow">CRM · NUEVA GESTIÓN</span><h3>Registrar llamada</h3><p>Primero filtra la cartera; luego selecciona el cliente y registra el resultado comercial.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <div className="form-grid">
      <label>Vendedor de cartera<select value={vendorId} onChange={e => setVendorId(e.target.value)}><option value="">Todos los vendedores</option>{vendors.map(e => <option value={e.id} key={e.id}>{e.full_name}</option>)}</select></label>
      <label>Gestor de cartera<select value={managerId} onChange={e => setManagerId(e.target.value)}><option value="">Todos los gestores</option>{managers.map(e => <option value={e.id} key={e.id}>{e.full_name}</option>)}</select></label>
      <label className="span-2">Cliente<select value={clientId} onChange={e => setClientId(e.target.value)}><option value="">Seleccionar cliente ({portfolio.length})</option>{portfolio.map(c => <option value={c.id} key={c.id}>{c.legal_name} · {c.codempr}</option>)}</select></label>
    </div>
    {client && <div className="selected-client"><div><b>{client.legal_name}</b><span>{client.codempr} · V: {employees.find(e => e.id === client.vendor_employee_id)?.full_name || 'P/ASIGNAR'} · G: {employees.find(e => e.id === client.manager_employee_id)?.full_name || 'P/ASIGNAR'}</span></div></div>}
    <div className="form-grid">
      <label>Resultado / gestión<select value={result} onChange={e => setResult(e.target.value)}>{CALL_RESULTS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Persona contactada<input value={contact} onChange={e => setContact(e.target.value)} placeholder="Nombre / cargo"/></label>
      <label>Duración aproximada (min)<input type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)}/></label>
      <label>Próxima acción<select value={nextAction} onChange={e => setNextAction(e.target.value)}>{NEXT_ACTIONS.map(([value, label]) => <option value={value} key={value || 'none'}>{label}</option>)}</select></label>
      <label>Fecha seguimiento<input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}/></label>
      {result === 'INTERESADO_SHOWROOM' && <label>Fecha/hora tentativa showroom<input type="datetime-local" value={showroomDate} onChange={e => setShowroomDate(e.target.value)}/></label>}
      {result === 'INTERESADO_SHOWROOM' && <div className="span-2 info-box"><CalendarClock size={18}/><div><b>Validación automática por el gestor</b><span>Al guardar, la solicitud se asignará a {employees.find(e => e.id === client?.manager_employee_id)?.full_name || 'SIN V-GESTOR ASIGNADO'} para confirmar la cita con el cliente.</span></div></div>}
      <label className="span-2">Observación<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Necesidad, objeción, compromiso, información solicitada..."/></label>
    </div>
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy || !client} onClick={() => void save()}>{busy ? 'Guardando...' : 'Guardar gestión CRM'}</button></div></div></div>
}

async function loadPortfolio() {
  const all: any[] = []
  const pageSize = 1000
  for (let from = 0; from < 5000; from += pageSize) {
    const { data, error } = await supabase.from('clients').select('id,codempr,legal_name,phone1,mobile,contact_name,vendor_employee_id,manager_employee_id').order('legal_name').range(from, from + pageSize - 1)
    if (error) throw error
    all.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return all
}
