import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, History, PhoneCall, Search, ShoppingBag, UserRoundCheck, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { exportPdf, exportXlsx } from '../lib/export'
import { ClientTypeFilter } from '../components/ClientTypeFilter'
import type { ClientTypeFilterValue } from '../components/ClientTypeFilter'
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

const CRM_FILTERS = [
  ['', 'Todos los clientes'],
  ['NUNCA_LLAMADO', 'Nunca llamados'],
  ['LLAMADO_HOY', 'Llamados hoy'],
  ['SEGUIMIENTO', 'Con seguimiento'],
  ['SHOWROOM_PENDIENTE', 'Showroom por validar'],
  ['CITA_CONFIRMADA', 'Cita showroom confirmada'],
  ['VISITADO', 'Visitados por vendedor'],
  ['NO_VISITADO', 'Nunca visitados'],
  ['COMPRO_VISITA', 'Compró en visita'],
  ['NO_COMPRO_VISITA', 'No compró en visita'],
] as const

export function Calls() {
  const { employee } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [view, setView] = useState<'PORTFOLIO' | 'HISTORY'>('PORTFOLIO')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [q, setQ] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [managerFilter, setManagerFilter] = useState('')
  const [clientType, setClientType] = useState<ClientTypeFilterValue>('')
  const [clientFilter, setClientFilter] = useState('')
  const [callerFilter, setCallerFilter] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [crmFilter, setCrmFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [callRes, visitRes, appointmentRes, staffRes, portfolio] = await Promise.all([
        supabase.from('calls').select('*,clients(id,codempr,legal_name,client_type,vendor_employee_id,manager_employee_id),prospects(prospect_code,legal_name),caller:employees!calls_employee_id_fkey(full_name,employee_type)').order('occurred_at', { ascending: false }).limit(3000),
        supabase.from('visits').select('id,client_id,employee_id,started_at,ended_at,received,purchase_result,result,no_purchase_reason,contact_name,next_action,follow_up_date,notes,clients(client_type),operator:employees!visits_employee_id_fkey(full_name)').not('ended_at', 'is', null).order('ended_at', { ascending: false }).limit(5000),
        supabase.from('appointments').select('id,client_id,status,appointment_at,requested_appointment_at,source_type,employee_id,assigned_manager_id,requested_by_employee_id,created_at,clients(client_type)').order('created_at', { ascending: false }).limit(3000),
        supabase.from('employees').select('*').eq('active', true).order('full_name'),
        loadPortfolio(),
      ])
      const error = callRes.error || visitRes.error || appointmentRes.error || staffRes.error
      if (error) throw error
      setRows(callRes.data || [])
      setVisits(visitRes.data || [])
      setAppointments(appointmentRes.data || [])
      setEmployees((staffRes.data || []) as Employee[])
      setClients(portfolio)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No fue posible cargar el CRM')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const vendors = useMemo(() => employees.filter((e: any) => e.employee_type === 'Vendedor'), [employees])
  const managers = useMemo(() => employees.filter((e: any) => e.employee_type === 'Gestor'), [employees])
  const employeeName = (id?: string | null) => employees.find(e => e.id === id)?.full_name || '—'

  const lastCallByClient = useMemo(() => { const map = new Map<string, any>(); rows.forEach(row => { if (row.client_id && !map.has(row.client_id)) map.set(row.client_id, row) }); return map }, [rows])
  const lastVisitByClient = useMemo(() => { const map = new Map<string, any>(); visits.forEach(row => { if (row.client_id && !map.has(row.client_id)) map.set(row.client_id, row) }); return map }, [visits])
  const latestAppointmentByClient = useMemo(() => { const map = new Map<string, any>(); appointments.forEach(row => { if (row.client_id && !map.has(row.client_id)) map.set(row.client_id, row) }); return map }, [appointments])

  const basePortfolio = useMemo(() => clients.filter(c => {
    if (clientType && c.client_type !== clientType) return false
    if (vendorFilter && c.vendor_employee_id !== vendorFilter) return false
    if (managerFilter && c.manager_employee_id !== managerFilter) return false
    if (clientFilter && c.id !== clientFilter) return false
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      const hay = `${c.legal_name || ''} ${c.codempr || ''} ${c.contact_name || ''} ${c.phone1 || ''} ${c.mobile || ''} ${c.region || ''} ${c.province || ''} ${c.municipality || ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  }), [clients, clientType, vendorFilter, managerFilter, clientFilter, q])

  const filteredPortfolio = useMemo(() => basePortfolio.filter(c => {
    if (!crmFilter) return true
    const call = lastCallByClient.get(c.id)
    const visit = lastVisitByClient.get(c.id)
    const appt = latestAppointmentByClient.get(c.id)
    const today = new Date().toISOString().slice(0, 10)
    if (crmFilter === 'NUNCA_LLAMADO') return !call
    if (crmFilter === 'LLAMADO_HOY') return call && String(call.occurred_at).slice(0, 10) === today
    if (crmFilter === 'SEGUIMIENTO') return !!call?.follow_up_date || ['LLAMAR_MAS_TARDE', 'SEGUIMIENTO'].includes(call?.result)
    if (crmFilter === 'SHOWROOM_PENDIENTE') return ['PENDIENTE_VALIDACION', 'CONTACTANDO'].includes(appt?.status)
    if (crmFilter === 'CITA_CONFIRMADA') return ['CONFIRMADA', 'REPROGRAMADA', 'PROGRAMADA'].includes(appt?.status)
    if (crmFilter === 'VISITADO') return !!visit
    if (crmFilter === 'NO_VISITADO') return !visit
    if (crmFilter === 'COMPRO_VISITA') return visit?.purchase_result === 'COMPRO'
    if (crmFilter === 'NO_COMPRO_VISITA') return visit?.purchase_result === 'NO_COMPRO'
    return true
  }), [basePortfolio, crmFilter, lastCallByClient, lastVisitByClient, latestAppointmentByClient])

  useEffect(() => { if (clientFilter && !basePortfolio.some(c => c.id === clientFilter)) setClientFilter('') }, [basePortfolio, clientFilter])
  useEffect(() => { if (selectedClientId && !clients.some(c => c.id === selectedClientId)) setSelectedClientId('') }, [clients, selectedClientId])

  const visibleCalls = useMemo(() => rows.filter((r) => {
    if (clientType && r.clients?.client_type !== clientType) return false
    if (vendorFilter && r.clients?.vendor_employee_id !== vendorFilter) return false
    if (managerFilter && r.clients?.manager_employee_id !== managerFilter) return false
    if (clientFilter && r.client_id !== clientFilter) return false
    if (callerFilter && r.employee_id !== callerFilter) return false
    if (resultFilter && r.result !== resultFilter) return false
    if (from && new Date(r.occurred_at) < new Date(`${from}T00:00:00`)) return false
    if (to && new Date(r.occurred_at) > new Date(`${to}T23:59:59`)) return false
    if (q.trim()) { const needle = q.trim().toLowerCase(); const hay = `${r.clients?.legal_name || ''} ${r.clients?.codempr || ''} ${r.contact_name || ''} ${r.notes || ''}`.toLowerCase(); if (!hay.includes(needle)) return false }
    return true
  }), [rows, clientType, vendorFilter, managerFilter, clientFilter, callerFilter, resultFilter, from, to, q])

  const today = new Date().toISOString().slice(0, 10)
  const todayRows = visibleCalls.filter(r => String(r.occurred_at || '').slice(0, 10) === today)
  const showroomCount = visibleCalls.filter(r => r.result === 'INTERESADO_SHOWROOM' || r.appointment_created).length
  const purchaseCount = visibleCalls.filter(r => r.result === 'COMPRO').length
  const followupCount = visibleCalls.filter(r => ['LLAMAR_MAS_TARDE', 'SEGUIMIENTO'].includes(r.result) || r.follow_up_date).length
  const selectedClient = clients.find(c => c.id === selectedClientId) || null

  const report = visibleCalls.map(r => ({ Fecha: new Date(r.occurred_at).toLocaleString('es-DO'), TipoCliente: r.clients?.client_type || '', EjecutadaPor: r.caller?.full_name || '', Vendedor: employeeName(r.clients?.vendor_employee_id), Gestor: employeeName(r.clients?.manager_employee_id), Cliente: r.clients?.legal_name || r.prospects?.legal_name || '', Resultado: labelResult(r.result), Contacto: r.contact_name || '', Duracion: r.duration_seconds || '', Showroom: r.appointment_created ? 'Sí' : 'No', ProximaAccion: labelNextAction(r.next_action), Seguimiento: r.follow_up_date || '', Observacion: r.notes || '' }))

  const chooseClient = (id: string) => { setSelectedClientId(id); window.setTimeout(() => document.getElementById('crm-workbench')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30) }
  const startFromFilters = () => { if (filteredPortfolio.length === 1) chooseClient(filteredPortfolio[0].id); else document.getElementById('crm-cartera')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">CRM OPERATIVO</span><h2>Llamadas</h2><p>Cartera, contexto de visitas, showroom, seguimientos y gestión telefónica en una sola pantalla.</p></div><div className="button-row"><button className="secondary" onClick={() => void exportXlsx('Gestion_Llamadas', report)}>Excel</button><button className="secondary" onClick={() => exportPdf('Gestión de Llamadas', report)}>PDF</button><button className="primary" onClick={startFromFilters}><PhoneCall size={18}/> Registrar llamada</button></div></div>

    <div className="kpi-grid compact-kpis"><div className="kpi-card"><div className="kpi-icon"><PhoneCall/></div><div><span>Llamadas visibles</span><strong>{visibleCalls.length}</strong><small>{todayRows.length} hoy</small></div></div><div className="kpi-card"><div className="kpi-icon"><CalendarClock/></div><div><span>Showroom</span><strong>{showroomCount}</strong><small>solicitudes / interés</small></div></div><div className="kpi-card"><div className="kpi-icon"><Users/></div><div><span>Seguimientos</span><strong>{followupCount}</strong><small>pendientes o programados</small></div></div><div className="kpi-card"><div className="kpi-icon"><ShoppingBag/></div><div><span>Compraron</span><strong>{purchaseCount}</strong><small>reportados en llamada</small></div></div></div>

    <div className="panel planner-filter-panel"><div className="planner-filter-grid"><div className="search-field"><Search size={18}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cliente, código, teléfono, contacto, provincia..."/></div><ClientTypeFilter value={clientType} onChange={setClientType}/><select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}><option value="">Todos los vendedores</option>{vendors.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select><select value={managerFilter} onChange={e => setManagerFilter(e.target.value)}><option value="">Todos los gestores</option>{managers.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select><select value={clientFilter} onChange={e => setClientFilter(e.target.value)}><option value="">Todos los clientes ({basePortfolio.length})</option>{basePortfolio.slice(0, 500).map(c => <option key={c.id} value={c.id}>{c.legal_name} · {c.codempr}</option>)}</select><select value={crmFilter} onChange={e => setCrmFilter(e.target.value)}>{CRM_FILTERS.map(([value, label]) => <option value={value} key={value || 'all'}>{label}</option>)}</select><select value={callerFilter} onChange={e => setCallerFilter(e.target.value)}><option value="">Ejecutada por cualquiera</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select><select value={resultFilter} onChange={e => setResultFilter(e.target.value)}><option value="">Todos los resultados de llamada</option>{CALL_RESULTS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input type="date" value={from} onChange={e => setFrom(e.target.value)}/><input type="date" value={to} onChange={e => setTo(e.target.value)}/></div><div className="planner-filter-actions"><div className="meta"><span>{filteredPortfolio.length} clientes CRM</span>{clientType&&<span>{clientType}</span>}<span>{visibleCalls.length} llamadas</span></div><button className="secondary" onClick={() => { setQ(''); setClientType(''); setVendorFilter(''); setManagerFilter(''); setClientFilter(''); setCallerFilter(''); setResultFilter(''); setCrmFilter(''); setFrom(''); setTo('') }}>Limpiar filtros</button></div></div>

    {loadError && <div className="panel"><b>No fue posible cargar todos los datos del CRM.</b><span>{loadError}</span></div>}

    <div className="tabs"><button className={view === 'PORTFOLIO' ? 'active' : ''} onClick={() => setView('PORTFOLIO')}><Users size={16}/> Cartera / seguimiento</button><button className={view === 'HISTORY' ? 'active' : ''} onClick={() => setView('HISTORY')}><History size={16}/> Historial de llamadas</button></div>

    {view === 'PORTFOLIO' && <div id="crm-cartera" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 16, alignItems: 'start' }}>
      <div className="panel"><div className="panel-head"><div><b>Cartera priorizada</b><span>La lista conserva contexto de llamadas, visitas y showroom. Máximo 250 clientes visibles.</span></div><span className="badge">{filteredPortfolio.length} resultados</span></div><div className="cards-list" style={{ maxHeight: 650, overflow: 'auto' }}>{!loading && filteredPortfolio.length === 0 && <div className="empty-state"><b>No hay clientes con estos filtros.</b></div>}{filteredPortfolio.slice(0, 250).map(client => { const call = lastCallByClient.get(client.id); const visit = lastVisitByClient.get(client.id); const appointment = latestAppointmentByClient.get(client.id); return <button key={client.id} className="activity-card" onClick={() => chooseClient(client.id)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', borderColor: selectedClientId === client.id ? 'var(--brand-red)' : undefined }}><div className="activity-main"><b>{client.legal_name}</b><span>{client.codempr} · {client.client_type||'SIN TIPO'} · V: {employeeName(client.vendor_employee_id)} · G: {employeeName(client.manager_employee_id)}</span><small>Última llamada: {call ? `${new Date(call.occurred_at).toLocaleDateString('es-DO')} · ${labelResult(call.result)}` : 'Nunca'}</small><small>Última visita: {visit ? `${new Date(visit.ended_at).toLocaleDateString('es-DO')} · ${visit.operator?.full_name || employeeName(visit.employee_id)} · ${visit.purchase_result || visit.result || 'Gestionada'}` : 'Nunca'}</small>{appointment && <small>Showroom: {appointment.status.replaceAll('_', ' ')}{appointment.appointment_at ? ` · ${new Date(appointment.appointment_at).toLocaleString('es-DO')}` : ''}</small>}</div><div className="row-actions"><span className="badge">Gestionar</span></div></button> })}</div></div>
      <div id="crm-workbench" className="panel" style={{ position: 'sticky', top: 12 }}>{!selectedClient && <div className="empty-state"><PhoneCall size={28}/><b>Selecciona un cliente para gestionar</b><span>Filtra la cartera y pulsa un cliente. No tendrás que volver a buscarlo en otra ventana.</span></div>}{selectedClient && <ClientWorkbench key={selectedClient.id} employeeId={employee?.id || ''} client={selectedClient} employees={employees} lastCall={lastCallByClient.get(selectedClient.id)} lastVisit={lastVisitByClient.get(selectedClient.id)} appointment={latestAppointmentByClient.get(selectedClient.id)} onSaved={() => void load()}/>}</div>
    </div>}

    {view === 'HISTORY' && <div className="cards-list">{visibleCalls.length === 0 && <div className="panel empty-state"><b>No hay llamadas con los filtros actuales.</b></div>}{visibleCalls.map(r => <div className="activity-card" key={r.id}><div className="activity-icon"><PhoneCall/></div><div className="activity-main"><b>{r.clients?.legal_name || r.prospects?.legal_name || 'Gestión telefónica'}</b><span>{r.caller?.full_name || 'Usuario'} · {new Date(r.occurred_at).toLocaleString('es-DO')}</span><small>{r.clients?.client_type||'SIN TIPO'} · V: {employeeName(r.clients?.vendor_employee_id)} · G: {employeeName(r.clients?.manager_employee_id)} · {labelResult(r.result)}{r.contact_name ? ` · ${r.contact_name}` : ''}</small>{r.next_action && <small>Próxima acción: {labelNextAction(r.next_action)}{r.follow_up_date ? ` · ${r.follow_up_date}` : ''}</small>}{r.notes && <small>{r.notes}</small>}</div>{r.appointment_created && <span className="badge success"><CalendarClock size={13}/> Showroom</span>}</div>)}</div>}
  </div>
}

function ClientWorkbench({ employeeId, client, employees, lastCall, lastVisit, appointment, onSaved }: { employeeId: string; client: any; employees: Employee[]; lastCall?: any; lastVisit?: any; appointment?: any; onSaved: () => void }) {
  const [result, setResult] = useState('CONTACTADO'); const [contact, setContact] = useState(client.contact_name || ''); const [notes, setNotes] = useState(''); const [nextAction, setNextAction] = useState(''); const [followUp, setFollowUp] = useState(''); const [showroomDate, setShowroomDate] = useState(''); const [duration, setDuration] = useState(''); const [busy, setBusy] = useState(false)
  const employeeName = (id?: string | null) => employees.find(e => e.id === id)?.full_name || 'P/ASIGNAR'

  useEffect(() => { setContact(client.contact_name || ''); setResult('CONTACTADO'); setNotes(''); setNextAction(''); setFollowUp(''); setShowroomDate(''); setDuration('') }, [client.id])
  useEffect(() => { if (result === 'INTERESADO_SHOWROOM') setNextAction('VALIDAR_SHOWROOM'); else if (result === 'COMPRO') setNextAction('SEGUIMIENTO_PEDIDO'); else if (result === 'LLAMAR_MAS_TARDE') setNextAction('LLAMAR_NUEVAMENTE') }, [result])

  const save = async () => {
    if (!employeeId) return alert('No se pudo identificar el usuario activo.')
    setBusy(true)
    try {
      const now = new Date().toISOString(); const wantsShowroom = result === 'INTERESADO_SHOWROOM'
      const { data: call, error } = await supabase.from('calls').insert({ client_id: client.id, employee_id: employeeId, occurred_at: now, result, contact_name: contact || null, phone_used: client.phone1 || client.mobile || null, duration_seconds: duration ? Number(duration) * 60 : null, appointment_created: false, notes: notes || null, next_action: nextAction || (wantsShowroom ? 'VALIDAR_SHOWROOM' : null), follow_up_date: followUp || null }).select().single()
      if (error) throw error
      if (wantsShowroom) {
        const managerId=client.manager_employee_id||null
        const tentative = showroomDate ? new Date(showroomDate).toISOString() : null
        const { error: apptError } = await supabase.from('appointments').insert({ client_id: client.id, employee_id: managerId||employeeId, assigned_manager_id: managerId, requested_by_employee_id: employeeId, source_type: 'LLAMADA', created_from_call_id: call.id, requested_at: now, requested_appointment_at: tentative, appointment_at: tentative, appointment_type: 'SHOWROOM', status: 'PENDIENTE_VALIDACION', request_contact_name: contact || null, request_phone: client.phone1 || client.mobile || null, notes: notes || null })
        if (apptError) throw apptError
        await supabase.from('calls').update({ appointment_created: true }).eq('id', call.id)
        if(!managerId) alert('Solicitud de showroom creada. El cliente no tiene V-Gestor asignado; Dirección recibirá la alerta para asignar responsable.')
      }
      setNotes(''); setFollowUp(''); setShowroomDate(''); setDuration(''); onSaved()
    } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible guardar la llamada') } finally { setBusy(false) }
  }

  return <div><div className="panel-head"><div><span className="eyebrow">CLIENTE 360</span><b>{client.legal_name}</b><span>{client.codempr} · {client.client_type||'SIN TIPO'} · {client.phone1 || client.mobile || 'Sin teléfono'}</span></div><span className="badge">{employeeName(client.manager_employee_id)}</span></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginBottom: 14 }}><div className="info-box"><PhoneCall size={17}/><div><b>Última llamada</b><span>{lastCall ? `${new Date(lastCall.occurred_at).toLocaleString('es-DO')} · ${labelResult(lastCall.result)}` : 'Nunca'}</span></div></div><div className="info-box"><UserRoundCheck size={17}/><div><b>Última visita</b><span>{lastVisit ? `${new Date(lastVisit.ended_at).toLocaleString('es-DO')} · ${lastVisit.operator?.full_name || employeeName(lastVisit.employee_id)}` : 'Nunca'}</span></div></div><div className="info-box"><ShoppingBag size={17}/><div><b>Resultado visita</b><span>{lastVisit?.purchase_result || lastVisit?.result || 'Sin gestión'}</span></div></div><div className="info-box"><CalendarClock size={17}/><div><b>Showroom</b><span>{appointment ? appointment.status.replaceAll('_', ' ') : 'Sin cita'}</span></div></div></div>{lastVisit?.notes && <div className="selected-client" style={{ marginBottom: 14 }}><div><b>Nota de la última visita</b><span>{lastVisit.notes}</span></div></div>}<div className="form-grid"><label>Resultado / gestión<select value={result} onChange={e => setResult(e.target.value)}>{CALL_RESULTS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Persona contactada<input value={contact} onChange={e => setContact(e.target.value)} placeholder="Nombre / cargo"/></label><label>Duración aproximada (min)<input type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)}/></label><label>Próxima acción<select value={nextAction} onChange={e => setNextAction(e.target.value)}>{NEXT_ACTIONS.map(([value, label]) => <option value={value} key={value || 'none'}>{label}</option>)}</select></label><label>Fecha seguimiento<input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}/></label>{result === 'INTERESADO_SHOWROOM' && <label>Fecha/hora tentativa showroom<input type="datetime-local" value={showroomDate} onChange={e => setShowroomDate(e.target.value)}/></label>}{result === 'INTERESADO_SHOWROOM' && <div className="span-2 info-box"><CalendarClock size={18}/><div><b>Validación de showroom</b><span>{client.manager_employee_id?`La solicitud quedará pendiente para ${employeeName(client.manager_employee_id)}. No contará como cita pactada hasta confirmarse.`:'El cliente no tiene V-Gestor. La solicitud se conservará y Dirección recibirá la alerta para asignarla.'}</span></div></div>}<label className="span-2">Observación<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Necesidad, objeción, compromiso, información solicitada..."/></label></div><div className="modal-actions"><button className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando...' : 'Guardar gestión CRM'}</button></div></div>
}

function labelResult(value?: string) { return CALL_RESULTS.find(([code]) => code === value)?.[1] || value || 'Sin resultado' }
function labelNextAction(value?: string) { return NEXT_ACTIONS.find(([code]) => code === value)?.[1] || value || '—' }

async function loadPortfolio() {
  const all: any[] = []; const pageSize = 1000
  for (let from = 0; from < 5000; from += pageSize) {
    const { data, error } = await supabase.from('clients').select('id,codempr,client_type,legal_name,phone1,mobile,contact_name,vendor_employee_id,manager_employee_id,region,province,municipality,address1').order('legal_name').range(from, from + pageSize - 1)
    if (error) throw error
    all.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return all
}
