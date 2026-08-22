import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BellRing,
  CalendarDays,
  Captions,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ContactRound,
  DoorOpen,
  Gauge,
  ListChecks,
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
import { supabase } from '../lib/supabase'

type NavItem = [to: string, label: string, Icon: LucideIcon]
type NavGroup = { label: string; items: NavItem[] }

type AlertItem = {
  id: string
  title: string
  message?: string | null
  created_at: string
  synthetic?: boolean
}

const groups: NavGroup[] = [
  { label: 'Operación', items: [['/', 'Inicio', Gauge], ['/clientes', 'Clientes', Users], ['/mapa', 'Mapa', MapPinned], ['/planificacion', 'Planificación', ClipboardList], ['/rutas', 'Rutas', Route], ['/captacion', 'Captación', Captions]] },
  { label: 'Gestión', items: [['/cobertura', 'Cobertura cartera', ListChecks], ['/visitas', 'Visitas', ContactRound], ['/llamadas', 'Llamadas', PhoneCall], ['/agenda', 'Agenda / Showroom', CalendarDays], ['/recepcion', 'Recepción', DoorOpen]] },
  { label: 'Inteligencia', items: [['/reportes', 'Reportes', BarChart3], ['/calidad-datos', 'Calidad geográfica', ShieldCheck]] },
  { label: 'Sistema', items: [['/administracion', 'Administración', UserRoundCog], ['/configuracion', 'Configuración', Settings]] },
]

export function AppShell() {
  const { employee, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [notifications, setNotifications] = useState<AlertItem[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const loc = useLocation()
  const navigate = useNavigate()
  const allItems: NavItem[] = groups.flatMap((group) => group.items)
  const title = allItems.find((item) => item[0] === loc.pathname)?.[1] || 'Gestion de Ventas Diaria'

  const loadNotifications = async () => {
    if (!employee?.id) return setNotifications([])
    const now = new Date()
    const soon = new Date(now); soon.setDate(soon.getDate() + 3)
    const [n, a] = await Promise.all([
      supabase.from('notifications').select('*').eq('employee_id', employee.id).eq('status', 'UNREAD').order('created_at', { ascending: false }).limit(10),
      supabase.from('appointments').select('id,status,appointment_at,requested_appointment_at,clients(legal_name),prospects(legal_name)').eq('employee_id', employee.id).in('status', ['PENDIENTE_VALIDACION','CONFIRMADA','REPROGRAMADA']).or(`appointment_at.lte.${soon.toISOString()},requested_appointment_at.lte.${soon.toISOString()}`).order('created_at', { ascending: false }).limit(20),
    ])
    const stored: AlertItem[] = (n.data || []).map((item: any) => ({ ...item, synthetic: false }))
    const upcoming: AlertItem[] = (a.data || []).map((item: any) => {
      const name = item.clients?.legal_name || item.prospects?.legal_name || 'Cliente'
      const date = item.appointment_at || item.requested_appointment_at
      const pending = item.status === 'PENDIENTE_VALIDACION'
      return {
        id: `appointment-${item.id}`,
        title: pending ? 'Showroom pendiente de validar' : 'Cita showroom próxima',
        message: `${name}${date ? ` · ${new Date(date).toLocaleString('es-DO')}` : ''}`,
        created_at: date || now.toISOString(),
        synthetic: true,
      }
    })
    const unique = new Map<string, AlertItem>()
    ;[...stored, ...upcoming].forEach((item) => unique.set(item.id, item))
    setNotifications(Array.from(unique.values()).slice(0, 20))
  }
  useEffect(() => { void loadNotifications() }, [employee?.id, loc.pathname])

  const openAlert = async (item: AlertItem) => {
    if (!item.synthetic) await supabase.from('notifications').update({ status: 'READ', read_at: new Date().toISOString() }).eq('id', item.id)
    setNotificationsOpen(false)
    navigate('/agenda')
    await loadNotifications()
  }

  const sidebar = <>
    <div className="brand-block"><img src="/logo-karaka.png" /><div className="brand-copy"><b>Gestion de Ventas</b><span>Diaria</span></div></div>
    <nav>{groups.map((group) => <div className="nav-group" key={group.label}><span className="nav-label">{group.label}</span>{group.items.map(([to, label, Icon]) => {
      if (to === '/administracion' && !['Administrador','Supervisor'].includes(employee?.app_role || '')) return null
      if (to === '/recepcion' && !['Administrador','Supervisor','Recepcionista'].includes(employee?.app_role || '') && employee?.employee_type !== 'Recepcion') return null
      return <NavLink key={to} to={to} end={to === '/'} onClick={() => setDrawer(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19}/><span>{label}</span></NavLink>
    })}</div>)}</nav>
    <button className="logout nav-item" onClick={() => void logout()}><LogOut size={19}/><span>Cerrar sesión</span></button>
  </>

  return <div className={`app-layout ${collapsed ? 'collapsed' : ''}`}>
    <aside className="sidebar">{sidebar}<button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight/> : <ChevronLeft/>}</button></aside>
    <div className={`mobile-drawer ${drawer ? 'open' : ''}`}><div className="drawer-panel"><button className="drawer-close" onClick={() => setDrawer(false)}><X/></button>{sidebar}</div><button className="drawer-backdrop" onClick={() => setDrawer(false)} aria-label="Cerrar menú"/></div>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setDrawer(true)}><Menu/></button><div><span className="eyebrow">ALMACENES KARAKA</span><h1>{title}</h1></div><div className="top-actions" style={{ position: 'relative' }}>
        <button className="icon-btn" title="Alertas" onClick={() => setNotificationsOpen(v => !v)} style={{ position: 'relative' }}><BellRing size={19}/>{notifications.length > 0 && <span style={{ position:'absolute',right:-5,top:-6,minWidth:18,height:18,borderRadius:9,background:'var(--brand)',color:'#fff',fontSize:9,display:'grid',placeItems:'center',padding:'0 4px' }}>{notifications.length}</span>}</button>
        {notificationsOpen && <div className="panel" style={{ position:'absolute',right:58,top:48,width:360,maxWidth:'80vw',zIndex:90,padding:10 }}><div className="panel-head"><div><b>Alertas operativas</b><span>{notifications.length ? `${notifications.length} pendientes o próximas` : 'No tienes alertas'}</span></div></div><div className="cards-list">{notifications.map(item => <button key={item.id} className="activity-card" onClick={() => void openAlert(item)} style={{ width:'100%',textAlign:'left',border:'1px solid var(--border)',background:'var(--surface)' }}><div className="activity-main"><b>{item.title}</b><span>{item.message || ''}</span><small>{item.synthetic ? 'Agenda / Showroom' : new Date(item.created_at).toLocaleString('es-DO')}</small></div></button>)}</div></div>}
        <button className="icon-btn" title="Filtros"><SlidersHorizontal size={19}/></button>
        <div className="user-chip"><div className="avatar">{employee?.full_name?.slice(0,1) || 'K'}</div><div><b>{employee?.full_name}</b><span>{employee?.job_title}</span></div></div>
      </div></header>
      <section className="content"><Outlet/></section>
      <nav className="bottom-nav"><NavLink to="/"><Gauge/><span>Inicio</span></NavLink><NavLink to="/clientes"><Users/><span>Clientes</span></NavLink><NavLink to="/mapa"><Map/><span>Mapa</span></NavLink><NavLink to="/rutas"><Route/><span>Rutas</span></NavLink><button onClick={() => setDrawer(true)}><Menu/><span>Más</span></button></nav>
    </main>
  </div>
}
