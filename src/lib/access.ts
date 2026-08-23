import type { AccessProfile, Employee } from '../types'

export type PermissionKey =
  | 'dashboard.view' | 'clients.view' | 'clients.edit' | 'map.view'
  | 'planning.view' | 'planning.manage' | 'routes.view' | 'routes.execute'
  | 'capture.view' | 'capture.create' | 'coverage.view' | 'visits.view' | 'visits.execute'
  | 'calls.view' | 'calls.manage' | 'agenda.view' | 'agenda.manage'
  | 'reception.view' | 'reception.manage' | 'reports.view' | 'data_quality.view'
  | 'admin.import' | 'admin.portfolio' | 'admin.users.manage' | 'settings.view'

export const ACCESS_PROFILES: AccessProfile[] = ['Administrador', 'Supervisor', 'Gestor', 'Vendedor', 'Recepcion', 'SoloLectura']

export const PERMISSION_GROUPS: Array<{ label: string; items: Array<{ key: PermissionKey; label: string }> }> = [
  { label: 'Operación', items: [
    { key: 'dashboard.view', label: 'Inicio' }, { key: 'clients.view', label: 'Clientes' }, { key: 'clients.edit', label: 'Editar clientes' },
    { key: 'map.view', label: 'Mapa' }, { key: 'planning.view', label: 'Ver planificación' }, { key: 'planning.manage', label: 'Crear planificación' },
    { key: 'routes.view', label: 'Ver rutas' }, { key: 'routes.execute', label: 'Ejecutar rutas' }, { key: 'capture.view', label: 'Ver captación' },
    { key: 'capture.create', label: 'Crear prospectos' },
  ] },
  { label: 'Gestión', items: [
    { key: 'coverage.view', label: 'Cobertura de cartera' }, { key: 'visits.view', label: 'Ver visitas' }, { key: 'visits.execute', label: 'Registrar visitas' },
    { key: 'calls.view', label: 'Ver llamadas' }, { key: 'calls.manage', label: 'Gestionar llamadas' }, { key: 'agenda.view', label: 'Ver agenda / showroom' },
    { key: 'agenda.manage', label: 'Gestionar agenda / showroom' }, { key: 'reception.view', label: 'Ver recepción' }, { key: 'reception.manage', label: 'Gestionar recepción' },
  ] },
  { label: 'Inteligencia', items: [
    { key: 'reports.view', label: 'Reportes' }, { key: 'data_quality.view', label: 'Calidad geográfica' },
  ] },
  { label: 'Administración', items: [
    { key: 'admin.import', label: 'Importar cartera' }, { key: 'admin.portfolio', label: 'Homologación de cartera' },
    { key: 'admin.users.manage', label: 'Administrar usuarios' }, { key: 'settings.view', label: 'Configuración' },
  ] },
]

const ALL_KEYS = PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.key))

const enabled = (...keys: PermissionKey[]) => new Set<PermissionKey>(keys)

const PROFILE_DEFAULTS: Record<AccessProfile, Set<PermissionKey>> = {
  Administrador: new Set(ALL_KEYS),
  Supervisor: enabled(
    'dashboard.view','clients.view','clients.edit','map.view','planning.view','planning.manage','routes.view','routes.execute',
    'capture.view','capture.create','coverage.view','visits.view','visits.execute','calls.view','calls.manage','agenda.view','agenda.manage',
    'reception.view','reception.manage','reports.view','data_quality.view','admin.import','admin.portfolio','settings.view'
  ),
  Gestor: enabled(
    'dashboard.view','clients.view','map.view','planning.view','routes.view','capture.view','capture.create','coverage.view','visits.view','visits.execute',
    'calls.view','calls.manage','agenda.view','agenda.manage','reports.view','settings.view'
  ),
  Vendedor: enabled(
    'dashboard.view','clients.view','map.view','planning.view','routes.view','routes.execute','capture.view','capture.create','coverage.view','visits.view','visits.execute',
    'calls.view','calls.manage','agenda.view','reports.view','settings.view'
  ),
  Recepcion: enabled('dashboard.view','clients.view','agenda.view','agenda.manage','reception.view','reception.manage','reports.view','settings.view'),
  SoloLectura: enabled('dashboard.view','clients.view','map.view','planning.view','routes.view','coverage.view','visits.view','calls.view','agenda.view','reports.view','data_quality.view','settings.view'),
}

export function profileForEmployee(employee?: Employee | null): AccessProfile {
  if (!employee) return 'SoloLectura'
  if (employee.access_profile && ACCESS_PROFILES.includes(employee.access_profile)) return employee.access_profile
  if (employee.app_role === 'Administrador') return 'Administrador'
  if (employee.app_role === 'Supervisor') return 'Supervisor'
  if (employee.app_role === 'Recepcionista' || employee.employee_type === 'Recepcion') return 'Recepcion'
  if (employee.employee_type === 'Gestor') return 'Gestor'
  if (employee.employee_type === 'Vendedor') return 'Vendedor'
  return 'SoloLectura'
}

export function inheritedPermission(profile: AccessProfile, permission: PermissionKey) {
  return PROFILE_DEFAULTS[profile].has(permission)
}

export function hasPermission(employee: Employee | null | undefined, permission: PermissionKey) {
  if (!employee?.active && employee?.active !== undefined) return false
  const overrides = employee?.permission_overrides || {}
  if (Object.prototype.hasOwnProperty.call(overrides, permission)) return overrides[permission] === true
  return inheritedPermission(profileForEmployee(employee), permission)
}

export function effectivePermissionMap(profile: AccessProfile, overrides: Record<string, boolean> = {}) {
  return Object.fromEntries(ALL_KEYS.map((key) => [key, Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] === true : inheritedPermission(profile, key)])) as Record<PermissionKey, boolean>
}

export function normalizePermissionOverride(profile: AccessProfile, overrides: Record<string, boolean>, permission: PermissionKey, value: boolean) {
  const next = { ...overrides }
  if (value === inheritedPermission(profile, permission)) delete next[permission]
  else next[permission] = value
  return next
}

export function profileIdentity(profile: AccessProfile, previous?: Employee | null) {
  if (profile === 'Administrador') return { app_role: 'Administrador' as const, employee_type: previous && ['Gerencia','Direccion'].includes(previous.employee_type) ? previous.employee_type : 'Gerencia' as const }
  if (profile === 'Supervisor') return { app_role: 'Supervisor' as const, employee_type: previous && ['Gerencia','Direccion'].includes(previous.employee_type) ? previous.employee_type : 'Direccion' as const }
  if (profile === 'Gestor') return { app_role: 'Usuario' as const, employee_type: 'Gestor' as const }
  if (profile === 'Vendedor') return { app_role: 'Usuario' as const, employee_type: 'Vendedor' as const }
  if (profile === 'Recepcion') return { app_role: 'Recepcionista' as const, employee_type: 'Recepcion' as const }
  return { app_role: 'SoloLectura' as const, employee_type: 'Otro' as const }
}

export function hasAnyAdminPermission(employee?: Employee | null) {
  return hasPermission(employee, 'admin.import') || hasPermission(employee, 'admin.portfolio') || hasPermission(employee, 'admin.users.manage')
}
