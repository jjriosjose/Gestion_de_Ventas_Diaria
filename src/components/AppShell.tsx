import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,CalendarDays,CalendarRange,Captions,ChevronLeft,ChevronRight,ClipboardList,ContactRound,DoorOpen,Gauge,
  ListChecks,LogOut,Map as MapIcon,MapPinned,Menu,PanelLeftClose,PanelLeftOpen,PhoneCall,Route,Settings,ShieldCheck,
  SlidersHorizontal,UserRoundCog,Users,X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { hasAnyAdminPermission, hasPermission, profileForEmployee, type PermissionKey } from '../lib/access'
import { NotificationCenterBell } from './NotificationCenterBell'
import packageInfo from '../../package.json'

type NavItem = [to: string, label: string, Icon: LucideIcon, permission: PermissionKey | 'ADMIN_ANY']
type NavGroup = { label: string; items: NavItem[] }
const APP_VERSION=packageInfo.version

const groups: NavGroup[] = [
  { label: 'Operación', items: [
    ['/', 'Inicio', Gauge, 'dashboard.view'], ['/clientes', 'Clientes', Users, 'clients.view'], ['/mapa', 'Mapa', MapPinned, 'map.view'],
    ['/planificacion', 'Planificación', ClipboardList, 'planning.view'], ['/rutas', 'Rutas', Route, 'routes.view'], ['/jornadas', 'Jornadas', CalendarRange, 'journeys.view'], ['/captacion', 'Captación', Captions, 'capture.view'],
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
  const [viewOpen, setViewOpen] = useState(false)
  const loc = useLocation()
  const navigate = useNavigate()
  const allItems: NavItem[] = groups.flatMap((group) => group.items)
  const title = allItems.find((item) => item[0] === loc.pathname)?.[1] || 'Gestion de Ventas Diaria'

  useEffect(() => { window.localStorage.setItem('karaka-sidebar-collapsed', collapsed ? '1' : '0') }, [collapsed])
  useEffect(() => { window.localStorage.setItem('karaka-density', dense ? 'compact' : 'comfortable') }, [dense])

  const allowed = (permission: PermissionKey | 'ADMIN_ANY') => permission === 'ADMIN_ANY' ? hasAnyAdminPermission(employee) : hasPermission(employee, permission)

  const sidebar = <>
    <div className="brand-block"><img src="/logo-karaka.png" /><div className="brand-copy"><b>Gestion de Ventas</b><span>Diaria</span></div></div>
    <nav>{groups.map((group) => {
      const items = group.items.filter((item) => allowed(item[3])); if (!items.length) return null
      return <div className="nav-group" key={group.label}><span className="nav-label">{group.label}</span>{items.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setDrawer(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19}/><span>{label}</span></NavLink>)}</div>
    })}</nav>
    <div className="app-version">Versión {APP_VERSION}</div>
    <button className="logout nav-item" onClick={() => void logout()}><LogOut size={19}/><span>Cerrar sesión</span></button>
  </>

  return <div className={`app-layout ${collapsed ? 'collapsed' : ''} ${dense ? 'density-compact' : ''}`}>
    <aside className="sidebar">{sidebar}<button className="collapse-btn" title={collapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'} aria-label={collapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight/> : <ChevronLeft/>}</button></aside>
    <div className={`mobile-drawer ${drawer ? 'open' : ''}`}><div className="drawer-panel"><button className="drawer-close" onClick={() => setDrawer(false)}><X/></button>{sidebar}</div><button className="drawer-backdrop" onClick={() => setDrawer(false)} aria-label="Cerrar menú"/></div>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setDrawer(true)}><Menu/></button><div><span className="eyebrow">ALMACENES KARAKA</span><h1>{title}</h1></div><div className="top-actions" style={{ position: 'relative' }}>
        <NotificationCenterBell onOpen={() => setViewOpen(false)}/>
        <button className={`icon-btn ${viewOpen ? 'active' : ''}`} title="Controles de vista" aria-label="Controles de vista" onClick={() => setViewOpen(v => !v)}><SlidersHorizontal size={19}/></button>
        {viewOpen && <div className="panel top-popover view-popover"><div className="panel-head"><div><b>Vista rápida</b><span>{profileForEmployee(employee)} · personaliza esta sesión</span></div></div><button className="view-option" onClick={() => setCollapsed(v => !v)}>{collapsed ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}<div><b>{collapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'}</b><span>Gana o recupera espacio de trabajo</span></div></button><label className="view-option toggle-option"><input type="checkbox" checked={dense} onChange={(event) => setDense(event.target.checked)}/><div><b>Vista compacta</b><span>Reduce espacios en tablas y paneles</span></div></label>{hasPermission(employee,'settings.view') && <button className="view-option" onClick={() => { setViewOpen(false); navigate('/configuracion') }}><Settings size={17}/><div><b>Configuración</b><span>Tema y preferencias personales</span></div></button>}</div>}
        <div className="user-chip"><div className="avatar">{employee?.full_name?.slice(0,1) || 'K'}</div><div><b>{employee?.full_name}</b><span>{employee?.job_title}</span></div></div>
      </div></header>
      <section className="content"><Outlet/></section>
      <nav className="bottom-nav">{hasPermission(employee,'dashboard.view')&&<NavLink to="/"><Gauge/><span>Inicio</span></NavLink>}{hasPermission(employee,'clients.view')&&<NavLink to="/clientes"><Users/><span>Clientes</span></NavLink>}{hasPermission(employee,'map.view')&&<NavLink to="/mapa"><MapIcon/><span>Mapa</span></NavLink>}{hasPermission(employee,'routes.view')&&<NavLink to="/rutas"><Route/><span>Rutas</span></NavLink>}<button onClick={() => setDrawer(true)}><Menu/><span>Más</span></button></nav>
    </main>
  </div>
}
