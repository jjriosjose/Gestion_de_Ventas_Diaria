import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, PhoneCall, Plus, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { exportPdf, exportXlsx } from '../lib/export'
import type { Employee } from '../types'

export function Calls() {
  const { employee } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = async () => {
    const [{ data: calls }, { data: staff }] = await Promise.all([
      supabase.from('calls').select('*,clients(codempr,legal_name,manager_employee_id),prospects(prospect_code,legal_name),employees(full_name,employee_type)').order('occurred_at', { ascending: false }).limit(1000),
      supabase.from('employees').select('*').eq('active', true).order('full_name'),
    ])
    setRows(calls || [])
    setEmployees((staff || []) as Employee[])
  }
  useEffect(() => { void load() }, [])

  const visible = useMemo(() => rows.filter((r) => {
    if (employeeFilter && r.employee_id !== employeeFilter) return false
    if (resultFilter && r.result !== resultFilter) return false
    if (from && new Date(r.occurred_at) < new Date(`${from}T00:00:00`)) return false
    if (to && new Date(r.occurred_at) > new Date(`${to}T23:59:59`)) return false
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      const hay = `${r.clients?.legal_name || ''} ${r.clients?.codempr || ''} ${r.contact_name || ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  }), [rows, employeeFilter, resultFilter, from, to, q])

  const report = visible.map(r => ({ Fecha: new Date(r.occurred_at).toLocaleString('es-DO'), Empleado: r.employees?.full_name || '', Cliente: r.clients?.legal_name || r.prospects?.legal_name || '', Resultado: r.result || '', Contacto: r.contact_name || '', Duracion: r.duration_seconds || '', Cita: r.appointment_created ? 'Sí' : 'No', Seguimiento: r.follow_up_date || '', Observacion: r.notes || '' }))

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">GESTIÓN TELEFÓNICA</span><h2>Llamadas</h2><p>Historial compartido, seguimientos y solicitudes de showroom del equipo.</p></div><div className="button-row"><button className="secondary" onClick={() => void exportXlsx('Gestion_Llamadas', report)}>Excel</button><button className="secondary" onClick={() => exportPdf('Gestión de Llamadas', report)}>PDF</button><button className="primary" onClick={() => setOpen(true)}><Plus size={18}/> Registrar llamada</button></div></div>
    <div className="filter-bar"><div className="search-field"><Search size={18}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cliente, código o contacto..."/></div><select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}><option value="">Todos los empleados</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select><select value={resultFilter} onChange={e => setResultFilter(e.target.value)}><option value="">Todos los resultados</option><option value="CONTACTADO">Contactado</option><option value="NO_CONTESTA">No contesta</option><option value="OCUPADO">Ocupado</option><option value="TELEFONO_INCORRECTO">Teléfono incorrecto</option><option value="LLAMAR_MAS_TARDE">Llamar más tarde</option><option value="SEGUIMIENTO">Seguimiento</option><option value="INTERESADO_SHOWROOM">Interesado showroom</option><option value="NO_INTERESADO">No interesado</option></select><input type="date" value={from} onChange={e => setFrom(e.target.value)}/><input type="date" value={to} onChange={e => setTo(e.target.value)}/></div>
    <div className="table-meta"><b>{visible.length} llamadas visibles</b><span>Todos pueden consultar la gestión compartida.</span></div>
    <div className="cards-list">{visible.map(r => <div className="activity-card" key={r.id}><div className="activity-icon"><PhoneCall/></div><div className="activity-main"><b>{r.clients?.legal_name || r.prospects?.legal_name || 'Gestión telefónica'}</b><span>{r.employees?.full_name} · {new Date(r.occurred_at).toLocaleString('es-DO')}</span><small>{labelResult(r.result)}{r.contact_name ? ` · ${r.contact_name}` : ''}{r.notes ? ` · ${r.notes}` : ''}</small></div>{r.appointment_created && <span className="badge success"><CalendarClock size={13}/> Showroom</span>}</div>)}</div>
    {open && <NewCall employeeId={employee?.id || ''} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); void load() }}/>} 
  </div>
}

function labelResult(value?: string) {
  const labels: Record<string, string> = { CONTACTADO: 'Contactado', NO_CONTESTA: 'No contesta', OCUPADO: 'Ocupado', TELEFONO_INCORRECTO: 'Teléfono incorrecto', LLAMAR_MAS_TARDE: 'Llamar más tarde', SEGUIMIENTO: 'Seguimiento', INTERESADO_SHOWROOM: 'Interesado en showroom', NO_INTERESADO: 'No interesado' }
  return labels[value || ''] || value || 'Sin resultado'
}

function NewCall({ employeeId, onClose, onSaved }: { employeeId: string; onClose: () => void; onSaved: () => void }) {
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<any[]>([])
  const [client, setClient] = useState<any | null>(null)
  const [result, setResult] = useState('CONTACTADO')
  const [contact, setContact] = useState('')
  const [notes, setNotes] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [showroomDate, setShowroomDate] = useState('')
  const [duration, setDuration] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) return setFound([])
      const { data } = await supabase.from('clients').select('id,codempr,legal_name,phone1,mobile,contact_name,manager_employee_id').or(`legal_name.ilike.%${query.trim()}%,codempr.ilike.%${query.trim()}%`).limit(12)
      setFound(data || [])
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (client?.contact_name && !contact) setContact(client.contact_name)
  }, [client?.id])

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
          alert('Llamada guardada. Este cliente no tiene V-Gestor homologado, por lo que la solicitud de showroom no pudo asignarse.')
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

  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal large"><div className="modal-head"><div><span className="eyebrow">NUEVA GESTIÓN</span><h3>Registrar llamada</h3><p>La llamada cuenta para la cobertura mensual del gestor.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div>{!client ? <><div className="search-field"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cliente..."/></div><div className="pick-list small">{found.map(c => <button className="pick-row" key={c.id} onClick={() => setClient(c)}><div><b>{c.legal_name}</b><span>{c.codempr}</span></div><Plus/></button>)}</div></> : <div className="selected-client"><b>{client.legal_name}</b><span>{client.codempr} · {client.manager_employee_id ? 'V-Gestor asignado' : 'SIN V-GESTOR'}</span><button onClick={() => setClient(null)}>Cambiar</button></div>}<div className="form-grid"><label>Resultado<select value={result} onChange={e => setResult(e.target.value)}><option value="CONTACTADO">Contactado</option><option value="NO_CONTESTA">No contesta</option><option value="OCUPADO">Ocupado</option><option value="TELEFONO_INCORRECTO">Teléfono incorrecto</option><option value="LLAMAR_MAS_TARDE">Llamar más tarde</option><option value="SEGUIMIENTO">Seguimiento</option><option value="INTERESADO_SHOWROOM">Interesado en showroom</option><option value="NO_INTERESADO">No interesado</option></select></label><label>Persona contactada<input value={contact} onChange={e => setContact(e.target.value)}/></label><label>Duración aproximada (min)<input type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)}/></label><label>Próxima acción<input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Seguimiento, enviar info..."/></label><label>Fecha seguimiento<input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}/></label>{result === 'INTERESADO_SHOWROOM' && <label>Fecha/hora tentativa showroom<input type="datetime-local" value={showroomDate} onChange={e => setShowroomDate(e.target.value)}/></label>}<label className="span-2">Observación<textarea value={notes} onChange={e => setNotes(e.target.value)}/></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy || !client} onClick={() => void save()}>{busy ? 'Guardando...' : 'Guardar llamada'}</button></div></div></div>
}
