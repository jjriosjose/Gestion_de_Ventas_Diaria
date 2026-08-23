import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Navigation, PenLine, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { googleMapsNavigation } from '../lib/geo'
import { exportPdf, exportXlsx } from '../lib/export'
import { hasPermission } from '../lib/access'
import type { Client, Employee } from '../types'
import { useAuth } from '../context/AuthContext'

const PAGE = 50

export function Clients() {
  const { employee } = useAuth()
  const canEdit = hasPermission(employee, 'clients.edit')
  const [rows, setRows] = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [q, setQ] = useState('')
  const [company, setCompany] = useState('')
  const [vendor, setVendor] = useState('')
  const [manager, setManager] = useState('')
  const [managerIdsForVendor, setManagerIdsForVendor] = useState<Set<string> | null>(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Client | null>(null)

  const load = async () => {
    setLoading(true)
    let req = supabase.from('clients').select('id,company_code,codempr,cod_empresa,v_cartera,g_cartera,vendor_employee_id,manager_employee_id,vendor_assignment_override,manager_assignment_override,region,province,municipality,client_type,legal_name,contact_name,address1,display_name,phone1,phone2,mobile,email,longitude,latitude,active_status,last_invoice_date,last_invoice_amount,credit_days,geo_status,geo_verified_at', { count: 'exact' })
    if (q.trim()) req = req.or(`legal_name.ilike.%${q.trim()}%,codempr.ilike.%${q.trim()}%,phone1.ilike.%${q.trim()}%,mobile.ilike.%${q.trim()}%`)
    if (company) req = req.eq('company_code', company)
    if (vendor) req = req.eq('vendor_employee_id', vendor)
    if (manager) req = req.eq('manager_employee_id', manager)
    const { data, count } = await req.order('legal_name').range(page * PAGE, page * PAGE + PAGE - 1)
    setRows((data || []) as Client[]); setTotal(count || 0); setLoading(false)
  }

  const loadEmployees = async () => {
    const { data } = await supabase.from('employees').select('*').eq('active', true).in('employee_type', ['Vendedor','Gestor']).order('full_name')
    setEmployees((data || []) as Employee[])
  }

  useEffect(() => { const t = setTimeout(() => void load(), 250); return () => clearTimeout(t) }, [q, company, vendor, manager, page])
  useEffect(() => { void loadEmployees() }, [])
  useEffect(() => {
    setManager('')
    if (!vendor) return setManagerIdsForVendor(null)
    void supabase.from('clients').select('manager_employee_id').eq('vendor_employee_id', vendor).not('manager_employee_id', 'is', null).limit(5000).then(({ data }) => setManagerIdsForVendor(new Set((data || []).map((row: any) => row.manager_employee_id).filter(Boolean))))
  }, [vendor])

  const vendors = useMemo(() => employees.filter((e) => e.employee_type === 'Vendedor'), [employees])
  const managers = useMemo(() => employees.filter((e) => e.employee_type === 'Gestor' && (!managerIdsForVendor || managerIdsForVendor.has(e.id))), [employees, managerIdsForVendor])
  const employeeName = (id?: string | null) => employees.find((e) => e.id === id)?.full_name || null

  const exportAll = async (kind: 'xlsx' | 'pdf') => {
    let req = supabase.from('clients').select('codempr,company_code,legal_name,v_cartera,g_cartera,vendor_employee_id,manager_employee_id,region,province,municipality,phone1,mobile,email,latitude,longitude,active_status,geo_status')
    if (q.trim()) req = req.or(`legal_name.ilike.%${q.trim()}%,codempr.ilike.%${q.trim()}%`)
    if (company) req = req.eq('company_code', company)
    if (vendor) req = req.eq('vendor_employee_id', vendor)
    if (manager) req = req.eq('manager_employee_id', manager)
    const { data } = await req.order('legal_name').limit(5000)
    const out = (data || []).map((r: any) => ({ Codigo: r.codempr, Empresa: r.company_code, 'Razon Social': r.legal_name, Vendedor: employeeName(r.vendor_employee_id) || r.v_cartera, Gestor: employeeName(r.manager_employee_id) || r.g_cartera, Region: r.region, Provincia: r.province, Municipio: r.municipality, Telefono: r.phone1, Celular: r.mobile, Email: r.email, Latitud: r.latitude, Longitud: r.longitude, Estado: r.active_status, 'Calidad Geo': r.geo_status }))
    if (kind === 'xlsx') await exportXlsx('Maestro_Clientes', out); else exportPdf('Maestro de Clientes', out)
  }

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">MAESTRO EDITABLE</span><h2>Clientes</h2><p>Consulta centralizada de la cartera vigente.</p></div><div className="button-row"><button className="secondary" onClick={() => void exportAll('xlsx')}>Excel</button><button className="secondary" onClick={() => void exportAll('pdf')}>PDF</button></div></div>
    <div className="filter-bar clients-filter-bar"><div className="search-field"><Search size={18}/><input placeholder="Buscar razón social, código o teléfono..." value={q} onChange={e => { setQ(e.target.value); setPage(0) }}/></div><select value={company} onChange={e => { setCompany(e.target.value); setPage(0) }}><option value="">Todas las empresas</option><option>KARAKA</option><option>DISTRIBUIDORA</option></select><select value={vendor} onChange={e => { setVendor(e.target.value); setPage(0) }}><option value="">Todos los vendedores</option>{vendors.map((item) => <option value={item.id} key={item.id}>{item.full_name}</option>)}</select><select value={manager} onChange={e => { setManager(e.target.value); setPage(0) }}><option value="">{vendor ? 'Gestores de este vendedor' : 'Todos los gestores'}</option>{managers.map((item) => <option value={item.id} key={item.id}>{item.full_name}</option>)}</select></div>
    <div className="panel table-panel"><div className="table-meta"><b>{total.toLocaleString()} clientes</b><span>Página {page + 1} de {Math.max(1, Math.ceil(total / PAGE))}</span></div><div className="responsive-table"><table><thead><tr><th>Cliente</th><th>Empresa</th><th>Vendedor</th><th>Gestor</th><th>Ubicación</th><th>Contacto</th><th>Acciones</th></tr></thead><tbody>{loading ? <tr><td colSpan={7}><div className="skeleton"/></td></tr> : rows.map(c => <tr key={c.id}><td data-label="Cliente"><b>{c.legal_name}</b><small>{c.codempr}</small></td><td data-label="Empresa"><span className="badge">{c.company_code || '—'}</span></td><td data-label="Vendedor"><span>{employeeName(c.vendor_employee_id) || c.v_cartera || '—'}</span>{c.vendor_assignment_override && <small>Asignación manual</small>}</td><td data-label="Gestor"><span>{employeeName(c.manager_employee_id) || c.g_cartera || '—'}</span>{c.manager_assignment_override && <small>Asignación manual</small>}</td><td data-label="Ubicación"><span>{c.municipality || c.province || '—'}</span><small>{c.latitude != null ? <><MapPin size={12}/> Georreferenciado · {geoLabel(c.geo_status)}</> : 'Sin coordenadas · SIN GEO'}</small></td><td data-label="Contacto"><span>{c.phone1 || c.mobile || '—'}</span><small>{c.contact_name || ''}</small></td><td data-label="Acciones"><div className="row-actions">{googleMapsNavigation(c.latitude, c.longitude) && <a className="icon-btn" href={googleMapsNavigation(c.latitude, c.longitude)!} target="_blank" rel="noreferrer" title="Navegar"><Navigation size={17}/></a>}{canEdit && <button className="icon-btn" onClick={() => setEdit(c)} title="Editar"><PenLine size={17}/></button>}</div></td></tr>)}</tbody></table></div><div className="pagination"><button disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft/></button><span>{page + 1}</span><button disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}><ChevronRight/></button></div></div>
    {edit && <EditClient client={edit} employees={employees} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void load() }}/>} 
  </div>
}

function geoLabel(status?: string | null) { return status === 'VERIFICADA' ? 'Verificada' : status === 'POSIBLE_ERROR' ? 'Posible error' : status === 'SIN_GEO' ? 'Sin geo' : 'Sin verificar' }

function EditClient({ client, employees, onClose, onSaved }: { client: Client; employees: Employee[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ ...client }); const [vendorMode, setVendorMode] = useState(client.vendor_assignment_override ? 'MANUAL' : 'AUTO'); const [managerMode, setManagerMode] = useState(client.manager_assignment_override ? 'MANUAL' : 'AUTO'); const [vendorId, setVendorId] = useState(client.vendor_employee_id || ''); const [managerId, setManagerId] = useState(client.manager_employee_id || ''); const [busy, setBusy] = useState(false)
  const vendors = useMemo(() => employees.filter(e => e.employee_type === 'Vendedor'), [employees]); const managers = useMemo(() => employees.filter(e => e.employee_type === 'Gestor'), [employees]); const set = (k: keyof Client, value: any) => setF(x => ({ ...x, [k]: value }))
  const save = async () => { setBusy(true); try { const { error } = await supabase.from('clients').update({ legal_name: f.legal_name, contact_name: f.contact_name, address1: f.address1, phone1: f.phone1, phone2: f.phone2, mobile: f.mobile, email: f.email, region: f.region, province: f.province, municipality: f.municipality, latitude: f.latitude == null ? null : Number(f.latitude), longitude: f.longitude == null ? null : Number(f.longitude), active_status: f.active_status }).eq('id', client.id); if (error) throw error; const { error: vendorError } = await supabase.rpc('set_client_assignment', { p_client_id: client.id, p_assignment_type: 'V', p_employee_id: vendorMode === 'MANUAL' && vendorId ? vendorId : null, p_use_homologation: vendorMode === 'AUTO' }); if (vendorError) throw vendorError; const { error: managerError } = await supabase.rpc('set_client_assignment', { p_client_id: client.id, p_assignment_type: 'G', p_employee_id: managerMode === 'MANUAL' && managerId ? managerId : null, p_use_homologation: managerMode === 'AUTO' }); if (managerError) throw managerError; onSaved() } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible guardar los cambios') } finally { setBusy(false) } }
  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal large"><div className="modal-head"><div><span className="eyebrow">EDITAR MAESTRO</span><h3>{client.legal_name}</h3><p>Las asignaciones manuales quedan protegidas de futuras importaciones.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="form-grid"><label>Razón social<input value={f.legal_name || ''} onChange={e => set('legal_name', e.target.value)}/></label><label>Contacto<input value={f.contact_name || ''} onChange={e => set('contact_name', e.target.value)}/></label><label>Teléfono<input value={f.phone1 || ''} onChange={e => set('phone1', e.target.value)}/></label><label>Celular<input value={f.mobile || ''} onChange={e => set('mobile', e.target.value)}/></label><label>Asignación vendedor<select value={vendorMode} onChange={e => setVendorMode(e.target.value)}><option value="AUTO">Usar homologación V-CARTERA</option><option value="MANUAL">Asignación manual</option></select></label><label>Vendedor<select disabled={vendorMode === 'AUTO'} value={vendorId} onChange={e => setVendorId(e.target.value)}><option value="">P/ASIGNAR</option>{vendors.map(e => <option value={e.id} key={e.id}>{e.full_name}</option>)}</select></label><label>Asignación gestor<select value={managerMode} onChange={e => setManagerMode(e.target.value)}><option value="AUTO">Usar homologación G-CARTERA</option><option value="MANUAL">Asignación manual</option></select></label><label>Gestor<select disabled={managerMode === 'AUTO'} value={managerId} onChange={e => setManagerId(e.target.value)}><option value="">P/ASIGNAR</option>{managers.map(e => <option value={e.id} key={e.id}>{e.full_name}</option>)}</select></label><label>Región<input value={f.region || ''} onChange={e => set('region', e.target.value)}/></label><label>Provincia<input value={f.province || ''} onChange={e => set('province', e.target.value)}/></label><label>Municipio<input value={f.municipality || ''} onChange={e => set('municipality', e.target.value)}/></label><label>Estado<input value={f.active_status || ''} onChange={e => set('active_status', e.target.value)}/></label><label>Latitud<input type="number" step="any" value={f.latitude ?? ''} onChange={e => set('latitude', e.target.value === '' ? null : Number(e.target.value))}/></label><label>Longitud<input type="number" step="any" value={f.longitude ?? ''} onChange={e => set('longitude', e.target.value === '' ? null : Number(e.target.value))}/></label><label className="span-2">Dirección<input value={f.address1 || ''} onChange={e => set('address1', e.target.value)}/></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando...' : 'Guardar cambios'}</button></div></div></div>
}
