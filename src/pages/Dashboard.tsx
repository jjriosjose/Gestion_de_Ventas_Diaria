import { useEffect,useMemo,useState } from 'react'
import { CalendarCheck2, Captions, CheckCheck, CircleDollarSign, MapPinCheck, PhoneCall, RefreshCw, Route, ShoppingBag, Users } from 'lucide-react'
import { Bar,BarChart,CartesianGrid,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { KpiCard } from '../components/KpiCard'
import { exportPdf,exportXlsx } from '../lib/export'

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const zero={active_employees:0,planned_clients:0,visited_clients:0,received_clients:0,purchase_clients:0,sales_amount:0,calls:0,calls_contacted:0,appointments:0,showroom_attended:0,prospects_captured:0,routes_started:0,routes_completed:0,route_execution_pct:0,call_contact_rate_pct:0}
const money=(value:any)=>`RD$${Number(value||0).toLocaleString('es-DO',{maximumFractionDigits:2})}`

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
  const ch=tables.reduce((channel,table)=>channel.on('postgres_changes',{event:'*',schema:'public',table},()=>void load()),supabase.channel('dashboard-live-v061')).subscribe()
  const onFocus=()=>void load()
  window.addEventListener('focus',onFocus)
  return()=>{window.removeEventListener('focus',onFocus);void supabase.removeChannel(ch)}
 },[])

 const chart=useMemo(()=>employees.slice(0,10).map(e=>({name:e.full_name.split(' ')[0],Planificados:e.planned_clients,Visitados:e.visited_clients,Showroom:e.showroom_attended,Compraron:e.purchase_clients})),[employees])
 const reportRows=employees.map(e=>({Empleado:e.full_name,Cargo:e.job_title||'',Planificados:e.planned_clients,Visitados:e.visited_clients,Recibidos:e.received_clients,Showroom:e.showroom_attended,Compraron:e.purchase_clients,Ventas:Number(e.sales_amount||0),Llamadas:e.calls,Citas:e.appointments,Captaciones:e.prospects_captured,RutasIniciadas:e.routes_started,RutasCerradas:e.routes_completed,Cumplimiento:`${e.route_compliance_pct||0}%`}))

 return <div className="page-stack"><div className="page-head"><div><span className="eyebrow">CENTRO DE OPERACIONES</span><h2>Resumen de hoy</h2><p>Actividad global, showroom, ventas y desempeño del equipo con la misma lógica del Reporte Ejecutivo.</p></div><div className="button-row"><button className="secondary" onClick={()=>void load()}><RefreshCw size={17}/> Actualizar</button><button className="secondary" onClick={()=>void exportXlsx(`Resumen_Diario_${today()}`,reportRows)}>Excel</button><button className="secondary" onClick={()=>exportPdf(`Resumen Diario ${today()}`,reportRows)}>PDF</button></div></div>
 <div className="kpi-grid">
  <KpiCard label="Clientes" value={stats.clients} sub={`${stats.geo} geo · ${stats.verified} verificadas`} Icon={Users}/>
  <KpiCard label="Planificados" value={global.planned_clients||0} sub={`${global.route_execution_pct||0}% ejecución`} Icon={Route}/>
  <KpiCard label="Visitados" value={global.visited_clients||0} sub={`${global.received_clients||0} recibidos`} Icon={MapPinCheck}/>
  <KpiCard label="Compraron" value={global.purchase_clients||0} sub={`${global.visit_purchase_clients||0} calle · ${global.showroom_purchase_clients||0} showroom`} Icon={ShoppingBag}/>
  <KpiCard label="Ventas" value={money(global.sales_amount)} sub="calle + showroom" Icon={CircleDollarSign}/>
  <KpiCard label="Llamadas" value={global.calls||0} sub={`${global.calls_contacted||0} contactadas · ${global.call_contact_rate_pct||0}%`} Icon={PhoneCall}/>
  <KpiCard label="Citas" value={global.appointments||0} sub={`${global.showroom_attended||0} showroom`} Icon={CalendarCheck2}/>
  <KpiCard label="Captaciones" value={global.prospects_captured||0} Icon={Captions}/>
  <KpiCard label="Rutas cerradas" value={global.routes_completed||0} sub={`${global.routes_started||0} iniciadas`} Icon={CheckCheck}/>
 </div>
 <div className="dashboard-grid"><div className="panel chart-panel"><div className="panel-head"><div><b>Actividad por colaborador</b><span>Plan, visitas, showroom y compras</span></div></div>{busy?<div className="skeleton tall"/>:chart.length?<ResponsiveContainer width="100%" height={320}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="Planificados" fill="var(--chart-muted)" radius={[5,5,0,0]}/><Bar dataKey="Visitados" fill="var(--brand)" radius={[5,5,0,0]}/><Bar dataKey="Showroom" fill="var(--warning)" radius={[5,5,0,0]}/><Bar dataKey="Compraron" fill="var(--success)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>:<Empty text="Todavía no hay actividad registrada hoy."/>}</div><div className="panel"><div className="panel-head"><div><b>Ranking operativo</b><span>Actividad registrada por colaborador</span></div></div><div className="ranking-list">{employees.length?employees.slice(0,8).map((e,i)=>{const activity=(e.visited_clients||0)+(e.calls||0)+(e.showroom_attended||0)+(e.prospects_captured||0);return <div className="ranking-row" key={e.employee_id}><span className="rank">{i+1}</span><div><b>{e.full_name}</b><small>{e.employee_type}</small></div><div className="rank-metrics"><b>{activity}</b><span>{e.visited_clients||0} visitas · {e.showroom_attended||0} showroom</span></div><div className="progress"><i style={{width:`${Math.min(100,Number(e.registered_utilization_pct||0))}%`}}/></div><strong>{money(e.sales_amount)}</strong></div>}):<Empty text="Sin actividad por empleado."/>}</div></div></div></div>
}
function Empty({text}:{text:string}){return <div className="empty-state"><span>◇</span><b>{text}</b></div>}
