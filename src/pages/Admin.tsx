import { useEffect, useMemo, useState } from 'react'
import ExcelJS from 'exceljs'
import { CheckCircle2, FileUp, Link2, RefreshCw, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { invokeAuthed } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Employee } from '../types'

type AdminTab = 'import' | 'users' | 'portfolio'
type PortfolioType = 'V' | 'G'
type MappingStatus = 'EMPLOYEE' | 'UNASSIGNED' | 'INTERNAL' | 'INACTIVE' | 'IGNORE' | 'PENDING'

type PortfolioMapping = {
  id: string
  portfolio_type: PortfolioType
  source_key: string
  source_label: string
  mapping_status: MappingStatus
  employee_id?: string | null
  notes?: string | null
}

type PortfolioGroup = {
  portfolio_type: PortfolioType
  source_key: string
  count: number
  examples: string[]
}

export function Admin() {
  const [tab, setTab] = useState<AdminTab>('import')
  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <span className="eyebrow">CONTROL DEL SISTEMA</span>
          <h2>Administración</h2>
          <p>Maestros, usuarios, homologación y configuraciones críticas.</p>
        </div>
      </div>
      <div className="tabs">
        <button className={tab === 'import' ? 'active' : ''} onClick={() => setTab('import')}><FileUp /> Importar cartera</button>
        <button className={tab === 'portfolio' ? 'active' : ''} onClick={() => setTab('portfolio')}><Link2 /> Homologación</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}><Users /> Usuarios</button>
      </div>
      {tab === 'import' ? <MasterImport /> : tab === 'portfolio' ? <PortfolioHomologation /> : <UsersAdmin />}
    </div>
  )
}

function MasterImport() {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [preview, setPreview] = useState<any | null>(null)
  const [busy, setBusy] = useState(false)
  const [applied, setApplied] = useState(false)

  const read = async (f: File) => {
    setBusy(true)
    setPreview(null)
    setApplied(false)
    try {
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await f.arrayBuffer() as any)
      const ws = wb.getWorksheet('cartera')
      if (!ws) throw new Error('El archivo no contiene la hoja cartera.')
      const headers = (ws.getRow(1).values as any[]).slice(1).map((v) => String(v ?? '').trim())
      const data: Record<string, unknown>[] = []
      ws.eachRow((row, n) => {
        if (n === 1) return
        const obj: Record<string, unknown> = {}
        headers.forEach((h, i) => {
          let v = (row.getCell(i + 1) as any).value
          if (v instanceof Date) v = v.toISOString()
          if (v && typeof v === 'object' && 'result' in v) v = (v as any).result
          obj[h] = v ?? null
        })
        if (obj['codempr'] || obj['RazonSocial']) data.push(obj)
      })
      setFile(f)
      setRows(data)
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await f.arrayBuffer())))
        .map((b) => b.toString(16).padStart(2, '0')).join('')
      const p = await invokeAuthed<any>('master-import', { mode: 'preview', rows: data, source_name: f.name, source_hash: hash })
      setPreview({ ...p, hash })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo leer el archivo')
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    if (!file || !preview) return
    setBusy(true)
    try {
      const data = await invokeAuthed<any>('master-import', { mode: 'apply', rows, source_name: file.name, source_hash: preview.hash })
      setPreview(data)
      setApplied(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-grid">
      <div className="panel import-drop">
        <FileUp size={42} />
        <h3>Actualizar maestro de cartera</h3>
        <p>Solo se procesa la hoja <b>cartera</b>. Las demás hojas no forman parte de esta importación.</p>
        <label className="primary file-button">Seleccionar Excel<input type="file" accept=".xlsx" hidden onChange={(e) => e.target.files?.[0] && void read(e.target.files[0])} /></label>
        {file && <small>{file.name} · {rows.length.toLocaleString()} filas leídas</small>}
      </div>
      <div className="panel">
        <div className="panel-head">
          <div>
            <b>{applied ? 'Resultado de actualización' : 'Vista previa'}</b>
            <span>{applied ? 'El maestro ya fue aplicado a la base central.' : 'Ningún cambio se aplica hasta confirmar.'}</span>
          </div>
        </div>
        {applied && <div className="success-banner"><CheckCircle2 size={18} /><b>Cartera actualizada correctamente.</b></div>}
        {busy ? <div className="skeleton tall" /> : preview?.summary ? (
          <div className="preview-grid">
            <Metric label="Filas" value={preview.summary.total_rows} />
            <Metric label={applied ? 'Insertados' : 'Nuevos'} value={preview.summary.inserted_rows} />
            <Metric label="Actualizar" value={preview.summary.updated_rows} />
            <Metric label="Sin cambios" value={preview.summary.unchanged_rows} />
            <Metric label="Con GPS" value={preview.summary.georeferenced_rows} />
            <Metric label="Errores" value={preview.summary.error_rows} danger={preview.summary.error_rows > 0} />
          </div>
        ) : <div className="empty-state"><b>Selecciona un maestro para analizarlo.</b></div>}
        {preview?.summary && preview.summary.error_rows === 0 && preview.mode !== 'apply' && !applied && (
          <button className="primary full" disabled={busy} onClick={() => void apply()}><CheckCircle2 /> Aplicar actualización</button>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return <div className={`preview-metric ${danger ? 'danger-text' : ''}`}><span>{label}</span><b>{Number(value || 0).toLocaleString()}</b></div>
}

function portfolioBase(value?: string | null) {
  return (value || '').split('-')[0].trim().toUpperCase()
}

function PortfolioHomologation() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [groups, setGroups] = useState<PortfolioGroup[]>([])
  const [mappings, setMappings] = useState<PortfolioMapping[]>([])
  const [filter, setFilter] = useState<'ALL' | PortfolioType>('ALL')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setBusy(true)
    try {
      const [clientResult, employeeResult, mappingResult] = await Promise.all([
        supabase.from('clients').select('v_cartera,g_cartera'),
        supabase.from('employees').select('*').eq('active', true).order('full_name'),
        supabase.from('portfolio_mappings').select('*').order('portfolio_type').order('source_key'),
      ])
      if (clientResult.error) throw clientResult.error
      if (employeeResult.error) throw employeeResult.error
      if (mappingResult.error) throw mappingResult.error

      const grouped = new Map<string, { portfolio_type: PortfolioType; source_key: string; count: number; examples: Set<string> }>()
      for (const row of clientResult.data || []) {
        const values: Array<[PortfolioType, string | null]> = [['V', row.v_cartera], ['G', row.g_cartera]]
        for (const [portfolioType, raw] of values) {
          const sourceKey = portfolioBase(raw)
          if (!sourceKey) continue
          const key = `${portfolioType}:${sourceKey}`
          const current = grouped.get(key) || { portfolio_type: portfolioType, source_key: sourceKey, count: 0, examples: new Set<string>() }
          current.count += 1
          if (raw) current.examples.add(raw)
          grouped.set(key, current)
        }
      }

      setGroups(Array.from(grouped.values()).map((g) => ({ ...g, examples: Array.from(g.examples).slice(0, 3) })).sort((a, b) => b.count - a.count))
      setEmployees((employeeResult.data || []) as Employee[])
      setMappings((mappingResult.data || []) as PortfolioMapping[])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo cargar la homologación')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const mappingMap = useMemo(() => new Map(mappings.map((m) => [`${m.portfolio_type}:${m.source_key}`, m])), [mappings])
  const visible = groups.filter((g) => filter === 'ALL' || g.portfolio_type === filter)

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <b>Homologación V-CARTERA / G-CARTERA</b>
          <span>Conserva el texto original del maestro y vincula cada cartera con el usuario operativo correcto.</span>
        </div>
        <div className="button-row">
          <select value={filter} onChange={(e) => setFilter(e.target.value as 'ALL' | PortfolioType)}>
            <option value="ALL">Todas</option>
            <option value="V">V-CARTERA</option>
            <option value="G">G-CARTERA</option>
          </select>
          <button className="secondary" onClick={() => void load()}><RefreshCw size={17} /></button>
        </div>
      </div>
      <div className="info-banner">
        <b>Importante:</b> P/ASIGNAR puede ser válido cuando el cliente solo corresponde al gestor/showroom. Homologar no oculta clientes ni operaciones; todos los usuarios mantienen visibilidad global.
      </div>
      {busy ? <div className="skeleton tall" /> : (
        <div className="responsive-table">
          <table>
            <thead><tr><th>Origen</th><th>Clientes</th><th>Variantes</th><th>Estado</th><th>Vincular a</th><th>Acción</th></tr></thead>
            <tbody>
              {visible.map((g) => (
                <PortfolioMappingRow
                  key={`${g.portfolio_type}:${g.source_key}`}
                  group={g}
                  mapping={mappingMap.get(`${g.portfolio_type}:${g.source_key}`)}
                  employees={employees.filter((e) => g.portfolio_type === 'V' ? e.employee_type === 'Vendedor' : e.employee_type === 'Gestor')}
                  onSaved={load}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PortfolioMappingRow({ group, mapping, employees, onSaved }: { group: PortfolioGroup; mapping?: PortfolioMapping; employees: Employee[]; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<MappingStatus>(mapping?.mapping_status || 'PENDING')
  const [employeeId, setEmployeeId] = useState(mapping?.employee_id || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatus(mapping?.mapping_status || 'PENDING')
    setEmployeeId(mapping?.employee_id || '')
  }, [mapping?.mapping_status, mapping?.employee_id])

  const save = async () => {
    if (status === 'EMPLOYEE' && !employeeId) return alert('Selecciona el empleado a vincular')
    setSaving(true)
    try {
      const { data, error } = await supabase.rpc('set_portfolio_mapping', {
        p_portfolio_type: group.portfolio_type,
        p_source_key: group.source_key,
        p_mapping_status: status,
        p_employee_id: status === 'EMPLOYEE' ? employeeId : null,
        p_notes: null,
      })
      if (error) throw error
      await onSaved()
      alert(`Homologación aplicada a ${Number(data || 0).toLocaleString()} clientes.`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td data-label="Origen"><b>{group.portfolio_type}-CARTERA · {group.source_key}</b></td>
      <td data-label="Clientes">{group.count.toLocaleString()}</td>
      <td data-label="Variantes"><small>{group.examples.join(' · ')}</small></td>
      <td data-label="Estado">
        <select value={status} onChange={(e) => setStatus(e.target.value as MappingStatus)}>
          <option value="EMPLOYEE">Empleado activo</option>
          <option value="UNASSIGNED">Sin asignar / no aplica</option>
          <option value="INTERNAL">Gestión interna</option>
          <option value="INACTIVE">Empleado histórico/inactivo</option>
          <option value="IGNORE">Ignorar como asignación</option>
          <option value="PENDING">Pendiente de validar</option>
        </select>
      </td>
      <td data-label="Vincular a">
        <select value={employeeId} disabled={status !== 'EMPLOYEE'} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Seleccionar...</option>
          {employees.map((e) => <option value={e.id} key={e.id}>{e.full_name}</option>)}
        </select>
      </td>
      <td data-label="Acción"><button className="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Guardando...' : 'Guardar'}</button></td>
    </tr>
  )
}

function UsersAdmin() {
  const [users, setUsers] = useState<Employee[]>([])
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Employee | null>(null)
  const load = async () => {
    try {
      const d = await invokeAuthed<any>('admin-users', { action: 'list' })
      setUsers(d.users || [])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }
  useEffect(() => { void load() }, [])
  return (
    <div className="panel">
      <div className="panel-head">
        <div><b>Usuarios del sistema</b><span>{users.length} perfiles empresariales</span></div>
        <div className="button-row"><button className="secondary" onClick={() => void load()}><RefreshCw size={17} /></button><button className="primary" onClick={() => setOpen(true)}><UserPlus size={17} /> Nuevo usuario</button></div>
      </div>
      <div className="responsive-table">
        <table>
          <thead><tr><th>Usuario</th><th>Nick</th><th>Cargo</th><th>Tipo</th><th>Rol</th><th>Teléfono</th><th>Estado</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id} onDoubleClick={() => setEdit(u)}><td data-label="Usuario"><b>{u.full_name}</b></td><td data-label="Nick">{u.username}</td><td data-label="Cargo">{u.job_title}</td><td data-label="Tipo">{u.employee_type}</td><td data-label="Rol"><span className="badge">{u.app_role}</span></td><td data-label="Teléfono">{u.phone_display}</td><td data-label="Estado"><button className="link-btn" onClick={() => setEdit(u)}>{u.active === false ? 'Inactivo' : 'Activo'} · Editar</button></td></tr>)}</tbody>
        </table>
      </div>
      {(open || edit) && <UserModal user={edit} onClose={() => { setOpen(false); setEdit(null) }} onSaved={() => { setOpen(false); setEdit(null); void load() }} />}
    </div>
  )
}

function UserModal({ user, onClose, onSaved }: { user: Employee | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>(user || { full_name: '', username: '', job_title: '', app_role: 'Usuario', employee_type: 'Vendedor', phone_display: '', active: true, initial_password: '' })
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      await invokeAuthed('admin-users', user ? { action: 'update', id: user.id, ...f } : { action: 'create', ...f })
      onSaved()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="modal-wrap">
      <button className="modal-backdrop" onClick={onClose} />
      <div className="modal">
        <div className="modal-head"><div><span className="eyebrow">{user ? 'EDITAR' : 'CREAR'} USUARIO</span><h3>{user?.full_name || 'Nuevo usuario'}</h3></div><button className="icon-btn" onClick={onClose}><X /></button></div>
        <div className="form-grid one">
          <label>Nombre completo<input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></label>
          <label>Nick<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
          <label>Cargo<input value={f.job_title || ''} onChange={(e) => setF({ ...f, job_title: e.target.value })} /></label>
          <label>Tipo<select value={f.employee_type} onChange={(e) => setF({ ...f, employee_type: e.target.value })}><option>Gerencia</option><option>Direccion</option><option>Gestor</option><option>Vendedor</option><option>Otro</option></select></label>
          <label>Rol<select value={f.app_role} onChange={(e) => setF({ ...f, app_role: e.target.value })}><option>Administrador</option><option>Supervisor</option><option>Usuario</option><option>SoloLectura</option></select></label>
          <label>Teléfono<input value={f.phone_display || ''} onChange={(e) => setF({ ...f, phone_display: e.target.value })} /></label>
          {!user && <label>Clave inicial<input type="password" value={f.initial_password || ''} onChange={(e) => setF({ ...f, initial_password: e.target.value })} /></label>}
          {user && <label>Nueva clave (opcional)<input type="password" value={f.new_password || ''} onChange={(e) => setF({ ...f, new_password: e.target.value })} /></label>}
          <label className="checkbox"><input type="checkbox" checked={f.active !== false} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Usuario activo</label>
        </div>
        <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={() => void save()}><ShieldCheck size={17} />{busy ? 'Guardando...' : 'Guardar'}</button></div>
      </div>
    </div>
  )
}
