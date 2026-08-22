import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  Captions,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ContactRound,
  Gauge,
  LogOut,
  Map,
  MapPinned,
  Menu,
  PhoneCall,
  Route,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCog,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

type NavItem = [to: string, label: string, Icon: LucideIcon]
type NavGroup = {
  label: string
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      ['/', 'Inicio', Gauge],
      ['/clientes', 'Clientes', Users],
      ['/mapa', 'Mapa', MapPinned],
      ['/planificacion', 'Planificación', ClipboardList],
      ['/rutas', 'Rutas', Route],
      ['/captacion', 'Captación', Captions],
    ],
  },
  {
    label: 'Gestión',
    items: [
      ['/visitas', 'Visitas', ContactRound],
      ['/llamadas', 'Llamadas', PhoneCall],
      ['/agenda', 'Agenda / Showroom', CalendarDays],
    ],
  },
  {
    label: 'Inteligencia',
    items: [
      ['/reportes', 'Reportes', BarChart3],
      ['/calidad-datos', 'Calidad geográfica', ShieldCheck],
    ],
  },
  {
    label: 'Sistema',
    items: [
      ['/administracion', 'Administración', UserRoundCog],
      ['/configuracion', 'Configuración', Settings],
    ],
  },
]

export function AppShell() {
  const { employee, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const loc = useLocation()
  const allItems: NavItem[] = groups.flatMap((group) => group.items)
  const title = allItems.find((item) => item[0] === loc.pathname)?.[1] || 'Gestion de Ventas Diaria'

  const sidebar = (
    <>
      <div className="brand-block">
        <img src="/logo-karaka.png" />
        <div className="brand-copy">
          <b>Gestion de Ventas</b>
          <span>Diaria</span>
        </div>
      </div>
      <nav>
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <span className="nav-label">{group.label}</span>
            {group.items.map(([to, label, Icon]) => {
              if (
                to === '/administracion' &&
                !['Administrador', 'Supervisor'].includes(employee?.app_role || '')
              ) {
                return null
              }

              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setDrawer(false)}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <button className="logout nav-item" onClick={() => void logout()}>
        <LogOut size={19} />
        <span>Cerrar sesión</span>
      </button>
    </>
  )

  return (
    <div className={`app-layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        {sidebar}
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </aside>

      <div className={`mobile-drawer ${drawer ? 'open' : ''}`}>
        <div className="drawer-panel">
          <button className="drawer-close" onClick={() => setDrawer(false)}>
            <X />
          </button>
          {sidebar}
        </div>
        <button
          className="drawer-backdrop"
          onClick={() => setDrawer(false)}
          aria-label="Cerrar menú"
        />
      </div>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setDrawer(true)}>
            <Menu />
          </button>
          <div>
            <span className="eyebrow">ALMACENES KARAKA</span>
            <h1>{title}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-btn" title="Filtros">
              <SlidersHorizontal size={19} />
            </button>
            <div className="user-chip">
              <div className="avatar">{employee?.full_name?.slice(0, 1) || 'K'}</div>
              <div>
                <b>{employee?.full_name}</b>
                <span>{employee?.job_title}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="content">
          <Outlet />
        </section>

        <nav className="bottom-nav">
          <NavLink to="/">
            <Gauge />
            <span>Inicio</span>
          </NavLink>
          <NavLink to="/clientes">
            <Users />
            <span>Clientes</span>
          </NavLink>
          <NavLink to="/mapa">
            <Map />
            <span>Mapa</span>
          </NavLink>
          <NavLink to="/rutas">
            <Route />
            <span>Rutas</span>
          </NavLink>
          <button onClick={() => setDrawer(true)}>
            <Menu />
            <span>Más</span>
          </button>
        </nav>
      </main>
    </div>
  )
}
