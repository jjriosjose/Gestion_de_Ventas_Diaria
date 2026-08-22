import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, MapPinCheck, Pencil, Play, Search, Square, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { currentPosition } from '../lib/geo'
import { useAuth } from '../context/AuthContext'
import type { Employee } from '../types'

type CoverageRow = {
  client_id: string
  codempr: string
  legal_name: string
  company_code?: string | null
  region?: string | null
  province?: string | null
  municipality?: string | null
  vendor_employee_id?: string | null
  manager_employee_id?: string | null
  v_cartera?: string | null
  g_cartera?: string | null
  latitude?: number | null
  longitude?: number | null
  visits_per_month: number
  calls_per_month: number
  min_visit_gap_days: number
  min_call_gap_days: number
  visits_this_month: number
  calls_this_month: number
  last_visit_at?: string | null
  last_call_at?: string | null
  visits_remaining: number
  calls_remaining: number
  visit_status: string
  call_status: string
}

export function Coverage() {
  const { employee } = useAuth()
  const navigate = useNavigate()
  const admin = ['Administrador', 'Supervisor'].includes(employee?.app_role || '')
  const [rows, setRows] = useState<CoverageRow[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [mode, setMode] = useState<'VISITAS' | 'LLAMADAS'>('VISITAS')
  const [q, setQ] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [status, setStatus] = useState('')
  const [region, setRegion] = useState('')
  const [province, setProvince] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [onlyNever, setOnlyNever] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CoverageRow | null>(null)
  const [freeSession, setFreeSession] = useState<any | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data: coverage }, { data: staff }] = await Promise.all([
      supabase.from('client_management_coverage_current').select('*').order('legal_name').limit(5000),
      supabase.from('employees').select('*').eq('active', true).order('full_name'),
    ])
    setRows((coverage || []) as CoverageRow[])
    setEmployees((staff || []) as Employee[])
    if (employee?.employee_type === 'Vendedor') {
      const { data: session } = await supabase.from('route_sessions').select('*').eq('employee_id', employee.id).is('route_plan_id', null).is('ended_at', null).maybeSingle()
      setFreeSession(session || null)
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [employee?.id])

  const staffOptions = useMemo(() => employees.filter((item) => mode === 'VISITAS' ? item.employee_type === 'Vendedor' : item.employee_type === 'Gestor'), [employees, mode])
  const regions = useMemo(() => [...new Set(rows.map((r) => r.region).filter(Boolean) as string[])].sort(), [rows])
  const provinces = useMemo(() => [...new Set(rows.filter((r) => !region || r.region === region).map((r) => r.province).filter(Boolean) as string[])].sort(), [rows, region])
  const municipalities = useMemo(() => [...new Set(rows.filter((r) => (!region || r.region === region) && (!province || r.province === province)).map((r) => r.municipality).filter(Boolean) as string[])].sort(), [rows, region, province])

  const filtered = useMemo(() => rows.filter((row) => {
    const employeeId = mode === 'VISITAS' ? row.vendor_employee_id : row.manager_employee_id
    const state = mode === 'VISITAS' ? row.visit_status : row.call_status
    const last = mode === 'VISITAS' ? row.last_visit_at : row.last_call_at
    if (employeeFilter && employeeId !== employeeFilter) return false
    if (status && state !== status) return false
    if (region && row.region !== region) return false
    if (province && row.province !== province) return false
    if (municipality && row.municipality !== municipality) return false
    if (onlyNever && last) return false
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      if (!`${row.legal_name} ${row.codempr}`.toLowerCase().includes(needle)) return false
    }
    return true
  }), [rows, mode, employeeFilter, status, region, province, municipality, onlyNever, q])

  const summary = useMemo(() => {
    const target = filtered.filter((r) => (mode === 'VISITAS' ? r.visits_per_month : r.calls_per_month) > 0)
    const completed = target.filter((r) => (mode === 'VISITAS' ? r.visit_status : r.call_status) === 'CUMPLIDO').length
    const never = filtered.filter((r) => !(mode === 'VISITAS' ? r.last_visit_at : r.last_call_at)).length
    return { total: filtered.length, target: target.length, completed, pending: Math.max(target.length - completed, 0), never }
  }, [filtered, mode])

  const empName = (id?: string | null) => employees.find((e) => e.id === id)?.full_name || 'P/ASIGNAR'

  const startFreeDay = async () => {
    if (!employee || employee.employee_type !== 'Vendedor') return
    setBusy(true)
    try {
      const { data: other } = await supabase.from('route_sessions').select('id,route_plan_id').eq('employee_id', employee.id).is('ended_at', null).limit(1)
      if ((other || []).length) throw new Error('Ya tienes una jornada o ruta activa.')
      const p = await currentPosition()
      const { data, error } = await supabase.from('route_sessions').insert({
        employee_id: employee.id,
        route_plan_id: null,
        session_date: new Date().toISOString().slice(0, 10),
        session_type: 'VISITAS',
        status: 'ACTIVA',
        start_latitude: p.latitude,
        start_longitude: p.longitude,
        start_accuracy_m: p.accuracy,
      }).select().single()
      if (error) throw error
      setFreeSession(data)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible iniciar la jornada libre')
    } finally { setBusy(false) }
  }

  const endFreeDay = async () => {
    if (!freeSession || !employee) return
    setBusy(true)
    try {
      const { data: openVisits } = await supabase.from('visits').select('id').eq('employee_id', employee.id).is('ended_at', null).limit(1)
      if ((openVisits || []).length) throw new Error('Tienes una visita abierta. Finalízala antes de cerrar la jornada.')
      const p = await currentPosition()
      const { error } = await supabase.from('route_sessions').update({
        ended_at: new Date().toISOString(),
        end_latitude: p.latitude,
        end_longitude: p.longitude,
        end_accuracy_m: p.accuracy,
        status: 'FINALIZADA',
      }).eq('id', freeSession.id)
      if (error) throw error
      setFreeSession(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible finalizar la jornada')
    } finally { setBusy(false) }
  }

  const startSpontaneousVisit = async (row: CoverageRow) => {
    if (!employee || !freeSession || row.vendor_employee_id !== employee.id) return
    setBusy(true)
    try {
      const { data: openVisits } = await supabase.from('visits').select('id,clients(legal_name)').eq('employee_id', employee.id).is('ended_at', null).limit(1)
      if ((openVisits || []).length) throw new Error('Ya tienes una visita abierta. Debes finalizarla antes de llegar a otro cliente.')
      const p = await currentPosition()
      const { error } = await supabase.from('visits').insert({
        route_session_id: freeSession.id,
        client_id: row.client_id,
        employee_id: employee.id,
        visit_kind: 'ESPONTANEA',
        planned: false,
        started_at: new Date().toISOString(),
        start_latitude: p.latitude,
        start_longitude: p.longitude,
        start_accuracy_m: p.accuracy,
      })
      if (error) throw error
      navigate('/visitas')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible iniciar la visita')
    } finally { setBusy(false) }
  }

  const setModeSafe = (next: 'VISITAS' | 'LLAMADAS') => {
    setMode(next)
    setEmployeeFilter('')
    setStatus('')
    setOnlyNever(false)
  }

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">COBERTURA DE CARTERA</span><h2>Pendientes y frecuencia</h2><p>Controla qué clientes faltan por visitar o llamar, con o sin una ruta planificada.</p></div>{employee?.employee_type === 'Vendedor' && <div className="button-row">{freeSession ? <><span className="badge success">Jornada libre activa</span><button className="danger" disabled={busy} onClick={() => void endFreeDay()}><Square size={17}/> Finalizar jornada</button></> : <button className="primary" disabled={busy} onClick={() => void startFreeDay()}><Play size={17}/> Iniciar jornada libre</button>}</div>}</div>

    <div className="button-row"><button className={mode === 'VISITAS' ? 'primary' : 'secondary'} onClick={() => setModeSafe('VISITAS')}><MapPinCheck size={17}/> Visitas de vendedores</button><button className={mode === 'LLAMADAS' ? 'primary' : 'secondary'} onClick={() => setModeSafe('LLAMADAS')}><Clock3 size={17}/> Llamadas de gestores</button></div>

    <div className="kpi-grid"><div className="kpi-card"><div className="kpi-icon"><Search/></div><div><span>Clientes visibles</span><strong>{summary.total}</strong><small>Según filtros activos</small></div></div><div className="kpi-card"><div className="kpi-icon"><Clock3/></div><div><span>Con meta mensual</span><strong>{summary.target}</strong><small>{mode === 'VISITAS' ? 'Frecuencia de visita' : 'Frecuencia de llamada'}</small></div></div><div className="kpi-card"><div className="kpi-icon"><CheckCircle2/></div><div><span>Cumplidos</span><strong>{summary.completed}</strong><small>{summary.pending} pendientes</small></div></div><div className="kpi-card"><div className="kpi-icon"><X/></div><div><span>Nunca gestionados</span><strong>{summary.never}</strong><small>{mode === 'VISITAS' ? 'Sin visita registrada' : 'Sin llamada registrada'}</small></div></div></div>

    <div className="filter-bar"><div className="search-field"><Search size={18}/><input placeholder="Cliente o código..." value={q} onChange={(e) => setQ(e.target.value)}/></div><select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}><option value="">Todos los {mode === 'VISITAS' ? 'vendedores' : 'gestores'}</option>{staffOptions.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos los estados</option><option value="PENDIENTE">Pendientes</option><option value="CUMPLIDO">Cumplidos</option><option value="SIN_META">Sin meta</option></select><select value={region} onChange={(e) => { setRegion(e.target.value); setProvince(''); setMunicipality('') }}><option value="">Todas las regiones</option>{regions.map((x) => <option key={x}>{x}</option>)}</select><select value={province} onChange={(e) => { setProvince(e.target.value); setMunicipality('') }}><option value="">Todas las provincias</option>{provinces.map((x) => <option key={x}>{x}</option>)}</select><select value={municipality} onChange={(e) => setMunicipality(e.target.value)}><option value="">Todos los municipios</option>{municipalities.map((x) => <option key={x}>{x}</option>)}</select><label className="checkbox"><input type="checkbox" checked={onlyNever} onChange={(e) => setOnlyNever(e.target.checked)}/> Solo nunca gestionados</label></div>

    <div className="panel table-panel"><div className="table-meta"><b>{filtered.length.toLocaleString()} clientes</b><span>Todos los usuarios pueden consultar; solo administración define frecuencia.</span></div><div className="responsive-table"><table><thead><tr><th>Cliente</th><th>Responsable</th><th>Territorio</th><th>Meta mes</th><th>Realizadas</th><th>Faltan</th><th>Última gestión</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{loading ? <tr><td colSpan={9}><div className="skeleton"/></td></tr> : filtered.map((row) => {
      const target = mode === 'VISITAS' ? row.visits_per_month : row.calls_per_month
      const done = mode === 'VISITAS' ? row.visits_this_month : row.calls_this_month
      const remaining = mode === 'VISITAS' ? row.visits_remaining : row.calls_remaining
      const last = mode === 'VISITAS' ? row.last_visit_at : row.last_call_at
      const rowStatus = mode === 'VISITAS' ? row.visit_status : row.call_status
      const responsible = mode === 'VISITAS' ? row.vendor_employee_id : row.manager_employee_id
      const canVisit = mode === 'VISITAS' && employee?.employee_type === 'Vendedor' && responsible === employee.id && !!freeSession
      return <tr key={row.client_id}><td data-label="Cliente"><b>{row.legal_name}</b><small>{row.codempr} · {row.company_code || '—'}</small></td><td data-label="Responsable">{empName(responsible)}</td><td data-label="Territorio">{row.municipality || row.province || row.region || '—'}</td><td data-label="Meta mes">{target || '—'}</td><td data-label="Realizadas">{done}</td><td data-label="Faltan"><b>{remaining}</b></td><td data-label="Última gestión">{last ? new Date(last).toLocaleDateString('es-DO') : 'Nunca'}</td><td data-label="Estado"><span className={`badge ${rowStatus === 'CUMPLIDO' ? 'success' : ''}`}>{rowStatus === 'SIN_META' ? 'SIN META' : rowStatus}</span></td><td data-label="Acción"><div className="row-actions">{canVisit && <button className="primary compact" disabled={busy} onClick={() => void startSpontaneousVisit(row)}><MapPinCheck size={15}/> Llegué</button>}{admin && <button className="icon-btn" title="Definir frecuencia" onClick={() => setEditing(row)}><Pencil size={16}/></button>}</div></td></tr>
    })}</tbody></table></div></div>{editing && <PolicyModal row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load() }}/>}</div>
}

function PolicyModal({ row, onClose, onSaved }: { row: CoverageRow; onClose: () => void; onSaved: () => void }) {
  const [visits, setVisits] = useState(row.visits_per_month || 0)
  const [calls, setCalls] = useState(row.calls_per_month || 0)
  const [visitGap, setVisitGap] = useState(row.min_visit_gap_days || 0)
  const [callGap, setCallGap] = useState(row.min_call_gap_days || 0)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    const { error } = await supabase.from('client_management_policies').upsert({ client_id: row.client_id, visits_per_month: visits, calls_per_month: calls, min_visit_gap_days: visitGap, min_call_gap_days: callGap, active: true, notes: notes || null }, { onConflict: 'client_id' })
    setBusy(false)
    if (error) alert(error.message); else onSaved()
  }
  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal"><div className="modal-head"><div><span className="eyebrow">FRECUENCIA DE GESTIÓN</span><h3>{row.legal_name}</h3></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="form-grid"><label>Visitas por mes<input type="number" min="0" max="31" value={visits} onChange={(e) => setVisits(Number(e.target.value))}/></label><label>Llamadas por mes<input type="number" min="0" max="31" value={calls} onChange={(e) => setCalls(Number(e.target.value))}/></label><label>Separación mínima visitas (días)<input type="number" min="0" max="90" value={visitGap} onChange={(e) => setVisitGap(Number(e.target.value))}/></label><label>Separación mínima llamadas (días)<input type="number" min="0" max="90" value={callGap} onChange={(e) => setCallGap(Number(e.target.value))}/></label><label className="span-2">Nota administrativa<textarea value={notes} onChange={(e) => setNotes(e.target.value)}/></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando...' : 'Guardar frecuencia'}</button></div></div></div>
}
