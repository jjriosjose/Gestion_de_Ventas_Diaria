import { useEffect,useMemo,useState,type ReactNode } from 'react'
import { BarChart3,CalendarCheck2,Captions,CheckCheck,CircleDollarSign,MapPinCheck,PhoneCall,RefreshCw,Route,ShoppingBag,Users } from 'lucide-react'
import { Bar,BarChart,CartesianGrid,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { KpiCard } from '../components/KpiCard'
import { exportDashboardPdf,exportXlsx } from '../lib/export'

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const zero={active_employees:0,planned_clients:0,visited_clients:0,received_clients:0,purchase_clients:0,sales_amount:0,calls:0,calls_contacted:0,appointments:0,showroom_attended:0,prospects_captured:0,routes_started:0,routes_completed:0,route_execution_pct:0,call_contact_rate_pct:0}
const money=(value:any)=>`RD$${Number(value||0).toLocaleString('es-DO',{maximumFractionDigits:2})}`
const firstName=(name:string)=>name?.trim().split(/\s+/)[0]||'—'

export function Dashboard(){
 const [global,setGlobal]=useState<any>(zero)
 const [employees,setEmployees]=useState<any[]>([])
 const [stats,setStats]=useState({clients:0,geo:0,verified:0})
 const [busy,setBusy]=useState(true)

 const load=async()=>{
  setBusy(true)
  const day=today()
  const [{data:g},{data:e},{count:clients},{count:geo},{count:verified}]=await Promise.all([
   supabase.from('executive_daily_global_summary').select('*').eq('day',day).maybeSingle(),
   supabase.from('executive_daily_employee_summary').select('*').eq('day',day).order('operational_seconds',{ascending:false}),
   supabase.from('clients').select('*',{count:'exact',head:true}),
   supabase.from('clients').select('*',{count:'exact',head:true}).not('latitude','is',null).not('longitude','is',null),
   supabase.from('clients').select('*',{count:'exact',head:true}).eq('geo_status','VERIFICADA'),
  ])
  setGlobal(g||zero)
  setEmployees(e||[])
  setStats({clients:clients||0,geo:geo||0,verified:verified||0})
  setBusy(false)
 }

 useEffect(()=>{
  void load()
  const tables=['visits','calls','prospects','appointments','reception_entries','showroom_sessions','route_plans','route_stops','route_sessions','operational_incidents']
  const ch=tables.reduce((channel,table)=>channel.on('postgres_changes',{event:'*',schema:'public',table},()=>void load()),supabase.channel('dashboard-live-v062')).subscribe()
  const onFocus=()=>void load()
  window.addEventListener('focus',onFocus)
  return()=>{window.removeEventListener('focus',onFocus);void supabase.removeChannel(ch)}
 },[])

 const vendors=useMemo(()=>employees.filter(e=>e.employee_type==='Vendedor').sort((a,b)=>Number(b.visited_clients||0)-Number(a.visited_clients||0)||Number(b.sales_amount||0)-Number(a.sales_amount||0)),[employees])
 const managers=useMemo(()=>employees.filter(e=>e.employee_type==='Gestor').sort((a,b)=>(Number(b.calls_contacted||0)+Number(b.showroom_attended||0))-(Number(a.calls_contacted||0)+Number(a.showroom_attended||0))||Number(b.sales_amount||0)-Number(a.sales_amount||0)),[employees])
 const vendorChart=useMemo(()=>vendors.slice(0,8).map(e=>({name:firstName(e.full_name),Planificados:e.planned_clients||0,Visitados:e.visited_clients||0,Compras:e.purchase_clients||0})),[vendors])
 const managerChart=useMemo(()=>managers.slice(0,8).map(e=>({name:firstName(e.full_name),Llamadas:e.calls||0,Contactados:e.calls_contacted||0,Showroom:e.showroom_attended||0,Compras:e.purchase_clients||0})),[managers])
 const reportRows=employees.map(e=>({Empleado:e.full_name,Cargo:e.job_title||'',Tipo:e.employee_type,Planificados:e.planned_clients,Visitados:e.visited_clients,Recibidos:e.received_clients,Showroom:e.showroom_attended,Compraron:e.purchase_clients,Ventas:Number(e.sales_amount||0),Llamadas:e.calls,Contactados:e.calls_contacted,Citas:e.appointments,Captaciones:e.prospects_captured,RutasIniciadas:e.routes_started,RutasCerradas:e.routes_completed,Cumplimiento:`${e.route_compliance_pct||0}%`}))

 return <div className="page-stack executive-shell-v062">
  <div className="page-head"><div><span className="eyebrow">CENTRO DE OPERACIONES</span><h2>Resumen de hoy</h2><p>Lectura ejecutiva separada por función: operación de calle para Vendedores y CRM/Showroom para Gestores.</p></div><div className="button-row"><button className="secondary" onClick={()=>void load()}><RefreshCw size={17}/> Actualizar</button><button className="secondary" onClick={()=>void exportXlsx(`Resumen_Diario_${today()}`,reportRows)}>Excel</button><button className="secondary" onClick={()=>void exportDashboardPdf(today(),global,employees,stats)}>PDF ejecutivo</button></div></div>

  <div className="executive-band">
   <div className="executive-brand-card"><img src="/logo-karaka.png" alt="Almacenes Karaka"/><div className="executive-brand-copy"><span>DIRECCIÓN COMERCIAL · CONTROL DIARIO</span><b>Almacenes Karaka</b><small>{new Date(`${today()}T12:00:00`).toLocaleDateString('es-DO',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})} · información sincronizada con la operación registrada.</small></div></div>
   <div className="executive-pulse"><span>Ventas registradas hoy</span><strong>{money(global.sales_amount)}</strong><small>{global.purchase_clients||0} clientes con compra · calle + showroom</small></div>
  </div>

  <div className="kpi-grid">
   <KpiCard label="Clientes" value={stats.clients} sub={`${stats.geo} con GPS · ${stats.verified} verificadas`} Icon={Users}/>
   <KpiCard label="Planificados" value={global.planned_clients||0} sub={`${global.route_execution_pct||0}% ejecución`} Icon={Route}/>
   <KpiCard label="Visitados" value={global.visited_clients||0} sub={`${global.received_clients||0} recibidos`} Icon={MapPinCheck}/>
   <KpiCard label="Compraron" value={global.purchase_clients||0} sub={`${global.visit_purchase_clients||0} calle · ${global.showroom_purchase_clients||0} showroom`} Icon={ShoppingBag}/>
   <KpiCard label="Ventas" value={money(global.sales_amount)} sub="calle + showroom" Icon={CircleDollarSign}/>
   <KpiCard label="Llamadas" value={global.calls||0} sub={`${global.calls_contacted||0} contactadas · ${global.call_contact_rate_pct||0}%`} Icon={PhoneCall}/>
   <KpiCard label="Citas" value={global.appointments||0} sub={`${global.showroom_attended||0} showroom`} Icon={CalendarCheck2}/>
   <KpiCard label="Captaciones" value={global.prospects_captured||0} Icon={Captions}/>
   <KpiCard label="Rutas cerradas" value={global.routes_completed||0} sub={`${global.routes_started||0} iniciadas`} Icon={CheckCheck}/>
  </div>

  <div className="executive-chart-grid">
   <ChartPanel title="Vendedores · ejecución de calle" subtitle="Planificados, visitados y compras" loading={busy} empty={!vendorChart.length}><ResponsiveContainer width="100%" height={310}><BarChart data={vendorChart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="Planificados" fill="var(--chart-muted)" radius={[5,5,0,0]}/><Bar dataKey="Visitados" fill="var(--brand)" radius={[5,5,0,0]}/><Bar dataKey="Compras" fill="var(--success)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartPanel>
   <ChartPanel title="Gestores · CRM y Showroom" subtitle="Llamadas, contactos, showroom y compras" loading={busy} empty={!managerChart.length}><ResponsiveContainer width="100%" height={310}><BarChart data={managerChart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="Llamadas" fill="var(--chart-muted)" radius={[5,5,0,0]}/><Bar dataKey="Contactados" fill="var(--brand)" radius={[5,5,0,0]}/><Bar dataKey="Showroom" fill="var(--warning)" radius={[5,5,0,0]}/><Bar dataKey="Compras" fill="var(--success)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartPanel>
  </div>

  <div className="executive-section-grid">
   <TeamPanel title="Ranking de Vendedores" subtitle="Cobertura de ruta, visitas y resultado comercial" icon={<Route size={19}/>} count={vendors.length}>{vendors.length?vendors.slice(0,8).map((e,i)=><VendorRow key={e.employee_id} row={e} position={i+1}/>):<Empty text="Sin actividad de vendedores para esta fecha."/>}</TeamPanel>
   <TeamPanel title="Ranking de Gestores" subtitle="Contacto, showroom y conversión comercial" icon={<PhoneCall size={19}/>} count={managers.length}>{managers.length?managers.slice(0,8).map((e,i)=><ManagerRow key={e.employee_id} row={e} position={i+1}/>):<Empty text="Sin actividad de gestores para esta fecha."/>}</TeamPanel>
  </div>
 </div>
}

function ChartPanel({title,subtitle,loading,empty,children}:{title:string;subtitle:string;loading:boolean;empty:boolean;children:ReactNode}){return <div className="panel executive-chart-card"><div className="panel-head"><div><b>{title}</b><span>{subtitle}</span></div><BarChart3 size={19}/></div>{loading?<div className="skeleton tall"/>:empty?<Empty text="Todavía no hay actividad registrada."/>:children}</div>}
function TeamPanel({title,subtitle,icon,count,children}:{title:string;subtitle:string;icon:ReactNode;count:number;children:ReactNode}){return <section className="panel executive-team-panel"><div className="executive-team-header"><div className="executive-team-title"><div className="executive-team-title-icon">{icon}</div><div><b>{title}</b><span>{subtitle}</span></div></div><span className="badge">{count} con registro</span></div><div className="executive-team-content"><div className="executive-rank-list">{children}</div></div></section>}
function VendorRow({row,position}:{row:any;position:number}){const coverage=Number(row.route_compliance_pct||0);return <div className="executive-rank-row"><span className="executive-rank-position">{position}</span><div className="executive-rank-person"><b>{row.full_name}</b><small>{row.job_title||'Vendedor'} · {coverage}% cobertura</small></div><div className="executive-rank-kpis"><span><b>{row.visited_clients||0}/{row.planned_clients||0}</b> visitas</span><span><b>{row.purchase_clients||0}</b> compras</span></div><div className="executive-rank-result"><strong>{money(row.sales_amount)}</strong><small>{row.routes_completed||0} rutas cerradas</small></div></div>}
function ManagerRow({row,position}:{row:any;position:number}){return <div className="executive-rank-row"><span className="executive-rank-position">{position}</span><div className="executive-rank-person"><b>{row.full_name}</b><small>{row.job_title||'Gestor'} · {row.call_contact_rate_pct||0}% contacto</small></div><div className="executive-rank-kpis"><span><b>{row.calls_contacted||0}/{row.calls||0}</b> contactos</span><span><b>{row.showroom_attended||0}</b> showroom</span></div><div className="executive-rank-result"><strong>{money(row.sales_amount)}</strong><small>{row.purchase_clients||0} compras</small></div></div>}
function Empty({text}:{text:string}){return <div className="empty-state"><span>◇</span><b>{text}</b></div>}
