import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,BellRing,CalendarDays,Captions,ChevronLeft,ChevronRight,ClipboardList,ContactRound,DoorOpen,Gauge,
  ListChecks,LogOut,Map as MapIcon,MapPinned,Menu,PanelLeftClose,PanelLeftOpen,PhoneCall,Route,Settings,ShieldCheck,
  SlidersHorizontal,UserRoundCog,Users,X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { hasAnyAdminPermission, hasPermission, profileForEmployee, type PermissionKey } from '../lib/access'

type NavItem = [to: string, label: string, Icon: LucideIcon, permission: PermissionKey | 'ADMIN_ANY']
type NavGroup = { label: string; items: NavItem[] }
type AlertItem = { id: string; title: string; message?: string | null; created_at: string; synthetic?: boolean }

const groups: NavGroup[] = [
  { label: 'Operación', items: [
    ['/', 'Inicio', Gauge, 'dashboard.view'], ['/clientes', 'Clientes', Users, 'clients.view'], ['/mapa', 'Mapa', MapPinned, 'map.view'],
    ['/planificacion', 'Planificación', ClipboardList, 'planning.view'], ['/rutas', 'Rutas', Route, 'routes.view'], ['/captacion', 'Captación', Captions, 'capture.view'],
  ] },
  { label: 'Gestión', items: [
    ['/cobertura', 'Cobertura cartera', ListChecks, 'coverage.view'], ['/visitas', 'Visitas', ContactRound, 'visits.view'],
    ['/llamadas', 'Llamadas', PhoneCall, 'calls.view'], ['/agenda', 'Agenda / Showroom', CalendarDays, 'agenda.view'], ['/recepcion', 'Recepción', DoorOpen, 'reception.view'],
  ] },
  { label: 'Inteligencia', items: [['/reportes', 'Reportes', BarChart3, 'reports.view'], ['/calidad-datos', 'Calidad geográfica', ShieldCheck, 'data_quality.view']] },
  { label: 'Sistema', items: [['/administracion', 'Administración', UserRoundCog, 'ADMIN_ANY'], ['/configuracion', 'Configuración', Settings, 'settings.view']] },
]

export function AppShell() {
  const { employee, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem('karaka-sidebar-collapsed') === '1')
  const [dense, setDense] = useState(() => window.localStorage.getItem('karaka-density') === 'compact')
  const [drawer, setDrawer] = useState(false)
  const [notifications, setNotifications] = useState<AlertItem[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const loc = useLocation()
  const navigate = useNavigate()
  const allItems: NavItem[] = groups.flatMap((group) => group.items)
  const title = allItems.find((item) => item[0] === loc.pathname)?.[1] || 'Gestion de Ventas Diaria'

  useEffect(() => { window.localStorage.setItem('karaka-sidebar-collapsed', collapsed ? '1' : '0') }, [collapsed])
  useEffect(() => { window.localStorage.setItem('karaka-density', dense ? 'compact' : 'comfortable') }, [dense])

  const loadNotifications = async () => {
    if (!employee?.id) return setNotifications([])
    const now = new Date(); const soon = new Date(now); soon.setDate(soon.getDate() + 3)
    const [n, a] = await Promise.all([
      supabase.from('notifications').select('*').eq('employee_id', employee.id).eq('status', 'UNREAD').order('created_at', { ascending: false }).limit(10),
      supabase.from('appointments').select('id,status,appointment_at,requested_appointment_at,clients(legal_name),prospects(legal_name)').eq('employee_id', employee.id).in('status', ['PENDIENTE_VALIDACION','CONFIRMADA','REPROGRAMADA']).or(`appointment_at.lte.${soon.toISOString()},requested_appointment_at.lte.${soon.toISOString()}`).order('created_at', { ascending: false }).limit(20),
    ])
    const stored: AlertItem[] = (n.data || []).map((item: any) => ({ ...item, synthetic: false }))
    const upcoming: AlertItem[] = (a.data || []).map((item: any) => {
      const name = item.clients?.legal_name || item.prospects?.legal_name || 'Cliente'; const date = item.appointment_at || item.requested_appointment_at
      return { id: `appointment-${item.id}`, title: item.status === 'PENDIENTE_VALIDACION' ? 'Showroom pendiente de validar' : 'Cita showroom próxima', message: `${name}${date ? ` · ${new Date(date).toLocaleString('es-DO')}` : ''}`, created_at: date || now.toISOString(), synthetic: true }
    })
    const unique = new globalThis.Map<string, AlertItem>(); [...stored, ...upcoming].forEach((item) => unique.set(item.id, item)); setNotifications(Array.from(unique.values()).slice(0, 20))
  }
  useEffect(() => { void loadNotifications() }, [employee?.id, loc.pathname])

  const openAlert = async (item: AlertItem) => {
    if (!item.synthetic) await supabase.from('notifications').update({ status: 'READ', read_at: new Date().toISOString() }).eq('id', item.id)
    setNotificationsOpen(false); navigate('/agenda'); await loadNotifications()
  }

  const allowed = (permission: PermissionKey | 'ADMIN_ANY') => permission === 'ADMIN_ANY' ? hasAnyAdminPermission(employee) : hasPermission(employee, permission)

  const sidebar = <>
    <div className="brand-block"><img src="/logo-karaka.png" /><div className="brand-copy"><b>Gestion de Ventas</b><span>Diaria</span></div></div>
    <nav>{groups.map((group) => {
      const items = group.items.filter((item) => allowed(item[3])); if (!items.length) return null
      return <div className="nav-group" key={group.label}><span className="nav-label">{group.label}</span>{items.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setDrawer(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19}/><span>{label}</span></NavLink>)}</div>
    })}</nav>
    <button className="logout nav-item" onClick={() => void logout()}><LogOut size={19}/><span>Cerrar sesión</span></button>
  </>

  return <div className={`app-layout ${collapsed ? 'collapsed' : ''} ${dense ? 'density-compact' : ''}`}>
    <aside className="sidebar">{sidebar}<button className="collapse-btn" title={collapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'} aria-label={collapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight/> : <ChevronLeft/>}</button></aside>
    <div className={`mobile-drawer ${drawer ? 'open' : ''}`}><div className="drawer-panel"><button className="drawer-close" onClick={() => setDrawer(false)}><X/></button>{sidebar}</div><button className="drawer-backdrop" onClick={() => setDrawer(false)} aria-label="Cerrar menú"/></div>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setDrawer(true)}><Menu/></button><div><span className="eyebrow">ALMACENES KARAKA</span><h1>{title}</h1></div><div className="top-actions" style={{ position: 'relative' }}>
        <button className="icon-btn" title="Alertas" onClick={() => { setNotificationsOpen(v => !v); setViewOpen(false) }} style={{ position: 'relative' }}><BellRing size={19}/>{notifications.length > 0 && <span className="notification-count">{notifications.length}</span>}</button>
        {notificationsOpen && <div className="panel top-popover alerts-popover"><div className="panel-head"><div><b>Alertas operativas</b><span>{notifications.length ? `${notifications.length} pendientes o próximas` : 'No tienes alertas'}</span></div></div><div className="cards-list">{notifications.map(item => <button key={item.id} className="activity-card popover-action" onClick={() => void openAlert(item)}><div className="activity-main"><b>{item.title}</b><span>{item.message || ''}</span><small>{item.synthetic ? 'Agenda / Showroom' : new Date(item.created_at).toLocaleString('es-DO')}</small></div></button>)}</div></div>}
        <button className={`icon-btn ${viewOpen ? 'active' : ''}`} title="Controles de vista" aria-label="Controles de vista" onClick={() => { setViewOpen(v => !v); setNotificationsOpen(false) }}><SlidersHorizontal size={19}/></button>
        {viewOpen && <div className="panel top-popover view-popover"><div className="panel-head"><div><b>Vista rápida</b><span>{profileForEmployee(employee)} · personaliza esta sesión</span></div></div><button className="view-option" onClick={() => setCollapsed(v => !v)}>{collapsed ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}<div><b>{collapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'}</b><span>Gana o recupera espacio de trabajo</span></div></button><label className="view-option toggle-option"><input type="checkbox" checked={dense} onChange={(event) => setDense(event.target.checked)}/><div><b>Vista compacta</b><span>Reduce espacios en tablas y paneles</span></div></label>{hasPermission(employee,'settings.view') && <button className="view-option" onClick={() => { setViewOpen(false); navigate('/configuracion') }}><Settings size={17}/><div><b>Configuración</b><span>Tema y preferencias personales</span></div></button>}</div>}
        <div className="user-chip"><div className="avatar">{employee?.full_name?.slice(0,1) || 'K'}</div><div><b>{employee?.full_name}</b><span>{employee?.job_title}</span></div></div>
      </div></header>
      <section className="content"><Outlet/></section>
      <nav className="bottom-nav">{hasPermission(employee,'dashboard.view')&&<NavLink to="/"><Gauge/><span>Inicio</span></NavLink>}{hasPermission(employee,'clients.view')&&<NavLink to="/clientes"><Users/><span>Clientes</span></NavLink>}{hasPermission(employee,'map.view')&&<NavLink to="/mapa"><MapIcon/><span>Mapa</span></NavLink>}{hasPermission(employee,'routes.view')&&<NavLink to="/rutas"><Route/><span>Rutas</span></NavLink>}<button onClick={() => setDrawer(true)}><Menu/><span>Más</span></button></nav>
    </main>
  </div>
}
