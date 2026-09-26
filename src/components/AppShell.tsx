import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,BarChart3,CalendarDays,CalendarRange,Captions,ChevronDown,ChevronLeft,ChevronRight,ClipboardList,ContactRound,DoorOpen,Gauge,History,KeyRound,
  ListChecks,LogOut,Map as MapIcon,MapPinned,Menu,PackageCheck,PanelLeftClose,PanelLeftOpen,PhoneCall,Radar,Route,Settings,ShieldCheck,
  SlidersHorizontal,UserRoundCog,Users,X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { hasAnyAdminPermission, hasPermission, profileForEmployee, type PermissionKey } from '../lib/access'
import { NotificationCenterBell } from './NotificationCenterBell'
import { InteractiveTour } from './InteractiveTour'
import { APP_VERSION } from '../lib/appVersion'

type NavItem = [to: string, label: string, Icon: LucideIcon, permission: PermissionKey | 'ADMIN_ANY']
type NavGroup = { id:string; label:string; Icon:LucideIcon; items:NavItem[] }
type ViewDensity = 'auto' | 'comfortable' | 'compact'

const VIEW_DENSITY_KEY='karaka-view-density'
const NAV_GROUP_KEY='gvd-navigation-open-group-v2'

const homeItem:NavItem=['/','Inicio',Gauge,'dashboard.view']
const groups:NavGroup[]=[
  {id:'operation',label:'Operación',Icon:Route,items:[
    ['/clientes','Clientes',Users,'clients.view'],['/mapa','Mapa',MapPinned,'map.view'],
    ['/planificacion','Planificación',ClipboardList,'planning.view'],['/rutas','Rutas',Route,'routes.view'],
    ['/jornadas','Jornadas',CalendarRange,'journeys.view'],['/tracking','Tracking',Radar,'tracking.view'],
    ['/captacion','Captación',Captions,'capture.view'],
  ]},
  {id:'commercial',label:'Gestión comercial',Icon:ContactRound,items:[
    ['/cobertura','Cobertura cartera',ListChecks,'coverage.view'],['/visitas','Visitas',MapPinned,'visits.view'],
    ['/llamadas','Llamadas',PhoneCall,'calls.view'],['/agenda','Agenda / Showroom',CalendarDays,'agenda.view'],
    ['/recepcion','Recepción',DoorOpen,'reception.view'],
  ]},
  {id:'logistics',label:'Logística',Icon:PackageCheck,items:[
    ['/logistica','Despacho y entregas',PackageCheck,'logistics.view'],
    ['/logistica/historial','Historial / POD',History,'logistics.view'],
    ['/logistica/incidencias','Incidencias',AlertTriangle,'logistics.tracking'],
    ['/logistica/accesos','Acceso de chofer',KeyRound,'logistics.manage'],
  ]},
  {id:'intelligence',label:'Inteligencia',Icon:BarChart3,items:[
    ['/reportes','Reportes',BarChart3,'reports.view'],['/calidad-datos','Calidad geográfica',ShieldCheck,'data_quality.view'],
  ]},
  {id:'administration',label:'Administración',Icon:Settings,items:[
    ['/administracion','Administración',UserRoundCog,'ADMIN_ANY'],['/configuracion','Configuración',Settings,'settings.view'],
  ]},
]

function initialDensity():ViewDensity{
  const saved=window.localStorage.getItem(VIEW_DENSITY_KEY)
  return saved==='comfortable'||saved==='compact'||saved==='auto'?saved:'auto'
}
function itemMatchesPath(to:string,pathname:string){return to==='/'?pathname==='/':pathname===to||pathname.startsWith(to+'/')}

export function AppShell(){
  const {employee,logout}=useAuth()
  const loc=useLocation()
  const navigate=useNavigate()
  const [collapsed,setCollapsed]=useState(()=>window.localStorage.getItem('karaka-sidebar-collapsed')==='1')
  const [densityMode,setDensityMode]=useState<ViewDensity>(initialDensity)
  const [viewport,setViewport]=useState(()=>({width:window.innerWidth,height:window.innerHeight}))
  const [drawer,setDrawer]=useState(false)
  const [viewOpen,setViewOpen]=useState(false)
  const activeGroupId=groups.find(group=>group.items.some(item=>itemMatchesPath(item[0],loc.pathname)))?.id||''
  const [openGroup,setOpenGroup]=useState(()=>activeGroupId||window.localStorage.getItem(NAV_GROUP_KEY)||'operation')

  const allItems:NavItem[]=[homeItem,...groups.flatMap(group=>group.items)]
  const title=allItems.find(item=>itemMatchesPath(item[0],loc.pathname))?.[1]||'Gestion de Ventas Diaria'
  const autoCompact=viewport.height<1180||viewport.width<1680
  const dense=densityMode==='compact'||(densityMode==='auto'&&autoCompact)

  useEffect(()=>{window.localStorage.setItem('karaka-sidebar-collapsed',collapsed?'1':'0')},[collapsed])
  useEffect(()=>{window.localStorage.setItem(VIEW_DENSITY_KEY,densityMode)},[densityMode])
  useEffect(()=>{if(openGroup)window.localStorage.setItem(NAV_GROUP_KEY,openGroup)},[openGroup])
  useEffect(()=>{if(activeGroupId)setOpenGroup(activeGroupId)},[activeGroupId])
  useEffect(()=>{
    let frame=0
    const sync=()=>{window.cancelAnimationFrame(frame);frame=window.requestAnimationFrame(()=>setViewport({width:window.innerWidth,height:window.innerHeight}))}
    window.addEventListener('resize',sync)
    return()=>{window.cancelAnimationFrame(frame);window.removeEventListener('resize',sync)}
  },[])

  const allowed=(permission:PermissionKey|'ADMIN_ANY')=>permission==='ADMIN_ANY'?hasAnyAdminPermission(employee):hasPermission(employee,permission)
  const availableTourPaths=allItems.filter(item=>allowed(item[3])).map(item=>item[0])
  const prepareTour=()=>{setCollapsed(false);setDrawer(false);setViewOpen(false)}
  const densityDescription=densityMode==='auto'
    ?'Automática · '+(dense?'compacta':'cómoda')+' para '+viewport.width+'×'+viewport.height
    :densityMode==='compact'?'Compacta · máxima área de trabajo':'Cómoda · mayor separación visual'

  const toggleGroup=(id:string)=>{
    if(collapsed){setCollapsed(false);setOpenGroup(id);return}
    if(id===activeGroupId&&openGroup===id)return
    setOpenGroup(current=>current===id?'':id)
  }

  const renderItem=([to,label,Icon]:NavItem,compact=false)=><NavLink
    key={to}
    to={to}
    end
    title={compact?label:undefined}
    onClick={()=>setDrawer(false)}
    className={({isActive})=>'nav-item nav-v2-item '+(isActive?'active':'')}
  ><span className="nav-v2-icon"><Icon size={18} strokeWidth={1.85}/></span><span className="nav-v2-item-label">{label}</span></NavLink>

  const renderNavigation=()=> <nav className="nav-v2" aria-label="Navegación principal">
    {allowed(homeItem[3])&&<div className="nav-v2-home">{renderItem(homeItem,collapsed)}</div>}
    {groups.map(group=>{
      const items=group.items.filter(item=>allowed(item[3]))
      if(!items.length)return null
      if(collapsed)return <div className={"nav-v2-rail-group nav-v2-group-"+group.id} key={group.id}>{items.map(item=>renderItem(item,true))}</div>
      const open=openGroup===group.id
      const containsActive=group.id===activeGroupId
      const GroupIcon=group.Icon
      return <section className={'nav-v2-group nav-v2-group-'+group.id+' '+(open?'open ':'')+(containsActive?'contains-active':'')} key={group.id}>
        <button type="button" className="nav-v2-group-trigger" onClick={()=>toggleGroup(group.id)} aria-expanded={open} aria-controls={'nav-group-'+group.id}>
          <span className="nav-v2-group-icon"><GroupIcon size={17} strokeWidth={1.85}/></span>
          <span>{group.label}</span>
          <ChevronDown className="nav-v2-chevron" size={16}/>
        </button>
        <div className="nav-v2-items" id={'nav-group-'+group.id} aria-hidden={!open}>
          <div className="nav-v2-items-inner">{items.map(item=>renderItem(item))}</div>
        </div>
      </section>
    })}
  </nav>

  const renderSidebarContent=()=> <>
    <div className="brand-block nav-v2-brand"><img src="/logo-karaka.png" alt=""/><div className="brand-copy"><b>Gestion de Ventas</b><span>Diaria</span></div></div>
    {renderNavigation()}
    <div className="app-version" title={'Versión técnica '+APP_VERSION.technical}>{APP_VERSION.compact}{APP_VERSION.isTest?' · PRUEBA':''}</div>
    <button className="logout nav-item nav-v2-item" onClick={()=>void logout()}><span className="nav-v2-icon"><LogOut size={18}/></span><span className="nav-v2-item-label">Cerrar sesión</span></button>
  </>

  return <div className={'app-layout nav-system-v2 '+(collapsed?'collapsed ':'')+(dense?'density-compact ':'density-comfortable ')+(densityMode==='auto'?'density-auto':'')} data-view-density={densityMode}>
    <aside className="sidebar">{renderSidebarContent()}<button className="collapse-btn" title={collapsed?'Mostrar menú lateral':'Ocultar menú lateral'} aria-label={collapsed?'Mostrar menú lateral':'Ocultar menú lateral'} onClick={()=>setCollapsed(!collapsed)}>{collapsed?<ChevronRight/>:<ChevronLeft/>}</button></aside>
    <div className={'mobile-drawer '+(drawer?'open':'')}><div className="drawer-panel"><button className="drawer-close" onClick={()=>setDrawer(false)} aria-label="Cerrar menú"><X/></button>{renderSidebarContent()}</div><button className="drawer-backdrop" onClick={()=>setDrawer(false)} aria-label="Cerrar menú"/></div>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setDrawer(true)} aria-label="Abrir menú"><Menu/></button><div><span className="eyebrow">ALMACENES KARAKA</span><h1>{title}</h1></div><div className="top-actions" style={{position:'relative'}}>
        <InteractiveTour availablePaths={availableTourPaths} onStart={prepareTour}/>
        <NotificationCenterBell onOpen={()=>setViewOpen(false)}/>
        <button className={'icon-btn '+(viewOpen?'active':'')} title="Controles de vista" aria-label="Controles de vista" onClick={()=>setViewOpen(v=>!v)}><SlidersHorizontal size={19}/></button>
        {viewOpen&&<div className="panel top-popover view-popover"><div className="panel-head"><div><b>Vista rápida</b><span>{profileForEmployee(employee)} · personaliza esta sesión</span></div></div><button className="view-option" onClick={()=>setCollapsed(v=>!v)}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}<div><b>{collapsed?'Mostrar menú lateral':'Ocultar menú lateral'}</b><span>Gana o recupera espacio de trabajo</span></div></button><div className="view-density-block"><div className="view-density-copy"><b>Densidad de pantalla</b><span>{densityDescription}</span></div><div className="view-density-options" role="group" aria-label="Densidad de pantalla"><button type="button" className={densityMode==='auto'?'active':''} onClick={()=>setDensityMode('auto')}>Automática</button><button type="button" className={densityMode==='comfortable'?'active':''} onClick={()=>setDensityMode('comfortable')}>Cómoda</button><button type="button" className={densityMode==='compact'?'active':''} onClick={()=>setDensityMode('compact')}>Compacta</button></div></div>{hasPermission(employee,'settings.view')&&<button className="view-option" onClick={()=>{setViewOpen(false);navigate('/configuracion')}}><Settings size={17}/><div><b>Configuración</b><span>Tema y preferencias personales</span></div></button>}</div>}
        <div className="user-chip"><div className="avatar">{employee?.full_name?.slice(0,1)||'K'}</div><div><b>{employee?.full_name}</b><span>{employee?.job_title}</span></div></div>
      </div></header>
      <section className="content"><Outlet/></section>
      <nav className="bottom-nav">{hasPermission(employee,'dashboard.view')&&<NavLink to="/"><Gauge/><span>Inicio</span></NavLink>}{hasPermission(employee,'clients.view')&&<NavLink to="/clientes"><Users/><span>Clientes</span></NavLink>}{hasPermission(employee,'map.view')&&<NavLink to="/mapa"><MapIcon/><span>Mapa</span></NavLink>}{hasPermission(employee,'routes.view')&&<NavLink to="/rutas"><Route/><span>Rutas</span></NavLink>}<button onClick={()=>setDrawer(true)}><Menu/><span>Más</span></button></nav>
    </main>
  </div>
}
