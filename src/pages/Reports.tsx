import { useEffect,useMemo,useState,type ReactNode } from 'react'
import { AlertTriangle,BarChart3,CalendarDays,Clock3,Download,FileSpreadsheet,MapPinCheck,PhoneCall,Route,ShoppingBag,Users } from 'lucide-react'
import { Bar,BarChart,CartesianGrid,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { exportExecutiveReportPdf,exportPdf,exportXlsx } from '../lib/export'
import '../styles/executive-v060.css'

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const duration=(value?:number|null)=>{const total=Math.max(0,Math.round(Number(value||0)));const h=Math.floor(total/3600);const m=Math.round((total%3600)/60);return h?`${h} h ${m} min`:`${m} min`}
const time=(value?:string|null)=>value?new Date(value).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—'
const money=(value?:number|string|null)=>new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP',maximumFractionDigits:0}).format(Number(value||0))
const label=(value?:string|null)=>String(value||'—').replaceAll('_',' ')
const firstName=(name:string)=>name?.trim().split(/\s+/)[0]||'—'

export function Reports(){
  const {employee}=useAuth()
  const executiveAccess=['Administrador','Supervisor'].includes(employee?.app_role||'')
  const [date,setDate]=useState(today())
  const [rows,setRows]=useState<any[]>([])
  const [global,setGlobal]=useState<any>(null)
  const [timeline,setTimeline]=useState<any[]>([])
  const [selectedEmployee,setSelectedEmployee]=useState('')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  const load=async()=>{
    setLoading(true);setError('')
    let employeeQuery=supabase.from('executive_daily_employee_summary').select('*').eq('day',date).order('operational_seconds',{ascending:false})
    let timelineQuery=supabase.from('executive_activity_timeline').select('*').eq('day',date).order('started_at',{ascending:true})
    if(!executiveAccess&&employee?.id){employeeQuery=employeeQuery.eq('employee_id',employee.id);timelineQuery=timelineQuery.eq('employee_id',employee.id)}
    const globalPromise=executiveAccess?supabase.from('executive_daily_global_summary').select('*').eq('day',date).maybeSingle():Promise.resolve({data:null,error:null})
    const [e,g,t]=await Promise.all([employeeQuery,globalPromise,timelineQuery])
    const err=e.error||g.error||t.error
    if(err)setError(err.message)
    const employeeRows=e.data||[]
    setRows(employeeRows);setGlobal(g.data||null);setTimeline(t.data||[])
    setSelectedEmployee(current=>current&&employeeRows.some(r=>r.employee_id===current)?current:(employeeRows[0]?.employee_id||''))
    setLoading(false)
  }
  useEffect(()=>{void load()},[date,employee?.id,executiveAccess])

  const vendors=useMemo(()=>rows.filter(r=>r.employee_type==='Vendedor'),[rows])
  const managers=useMemo(()=>rows.filter(r=>r.employee_type==='Gestor'),[rows])
  const others=useMemo(()=>rows.filter(r=>!['Vendedor','Gestor'].includes(r.employee_type)),[rows])
  const selected=rows.find(r=>r.employee_id===selectedEmployee)||null
  const selectedTimeline=useMemo(()=>timeline.filter(r=>r.employee_id===selectedEmployee),[timeline,selectedEmployee])
  const ownGlobal=useMemo(()=>{if(executiveAccess||!selected)return null;return {active_employees:selected.operational_seconds>0?1:0,planned_clients:selected.planned_clients,visited_clients:selected.visited_clients,calls:selected.calls,calls_contacted:selected.calls_contacted,call_contact_rate_pct:selected.call_contact_rate_pct,showroom_attended:selected.showroom_attended,showroom_seconds:selected.showroom_seconds,purchase_clients:selected.purchase_clients,visit_purchase_clients:selected.visit_purchase_clients,showroom_purchase_clients:selected.showroom_purchase_clients,sales_amount:selected.sales_amount,transit_wait_estimated_seconds:selected.transit_wait_estimated_seconds,incidents:selected.incidents,incident_seconds:selected.incident_seconds,operational_seconds:selected.operational_seconds,route_execution_pct:selected.planned_clients?Math.round((selected.visited_clients/selected.planned_clients)*1000)/10:0}},[executiveAccess,selected])
  const summary=executiveAccess?global:ownGlobal
  const vendorChart=useMemo(()=>vendors.slice(0,8).map(r=>({name:firstName(r.full_name),Plan:r.planned_clients||0,Visitados:r.visited_clients||0,Compras:r.purchase_clients||0})),[vendors])
  const managerChart=useMemo(()=>managers.slice(0,8).map(r=>({name:firstName(r.full_name),Llamadas:r.calls||0,Contactados:r.calls_contacted||0,Showroom:r.showroom_attended||0,Compras:r.purchase_clients||0})),[managers])

  const executiveDetail=rows.map(r=>({Empleado:r.full_name,Cargo:r.job_title||'',Tipo:r.employee_type,PrimeraGestion:time(r.first_activity_at),UltimaGestion:time(r.last_activity_at),Ventana:duration(r.activity_window_seconds),HorasOperativas:duration(r.operational_seconds),Planificados:r.planned_clients,Visitados:r.visited_clients,Recibidos:r.received_clients,Llamadas:r.calls,Contactados:r.calls_contacted,'Tiempo llamadas estimado':duration(r.call_estimated_seconds),Showroom:r.showroom_attended,'Tiempo showroom':duration(r.showroom_seconds),'Tiempo clientes':duration(r.visit_seconds),'Traslado/espera estimado':duration(r.transit_wait_estimated_seconds),Eventualidades:r.incidents,'Tiempo eventualidades':duration(r.incident_seconds),ComprasVisita:r.visit_purchase_clients,ComprasShowroom:r.showroom_purchase_clients,Compras:r.purchase_clients,Ventas:money(r.sales_amount),Captaciones:r.prospects_captured,'Utilizacion registrada %':r.registered_utilization_pct??'','Contacto %':r.call_contact_rate_pct??'','Cumplimiento ruta %':r.route_compliance_pct??''}))
  const timelineExport=selectedTimeline.map(r=>({Empleado:selected?.full_name||'',Tipo:r.activity_type,Inicio:time(r.started_at),Fin:time(r.ended_at),Duracion:duration(r.duration_seconds),Naturaleza:r.estimated?'Estimado':'Registrado',Gestion:r.label,Resultado:label(r.result),Monto:r.amount?money(r.amount):''}))

  return <div className="page-stack executive-report executive-shell-v062">
    <div className="page-head"><div><span className="eyebrow">{executiveAccess?'DIRECCIÓN · CIERRE OPERATIVO':'MI GESTIÓN · CIERRE DIARIO'}</span><h2>{executiveAccess?'Reporte Ejecutivo Diario':'Mi resumen diario'}</h2><p>{executiveAccess?'Vendedores y Gestores se analizan por separado para respetar la naturaleza de cada función.':'Resumen de tu actividad registrada, diferenciando tiempos reales y estimados.'}</p></div><div className="executive-head-actions"><label className="inline-date">Fecha<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button className="secondary" disabled={!rows.length} onClick={()=>void exportXlsx(`${executiveAccess?'Reporte_Ejecutivo':'Mi_Resumen'}_${date}`,executiveDetail)}><FileSpreadsheet size={17}/> Excel</button><button className="secondary" disabled={!rows.length} onClick={()=>executiveAccess?void exportExecutiveReportPdf(date,rows,summary):exportPdf(`Mi resumen diario ${date}`,executiveDetail)}><Download size={17}/> PDF ejecutivo</button></div></div>

    {error&&<div className="panel"><b>No fue posible cargar el reporte.</b><span>{error}</span></div>}
    {loading?<div className="panel empty-state"><b>Calculando cierre operativo...</b></div>:<>
      <div className="executive-band">
        <div className="executive-brand-card"><img src="/logo-karaka.png" alt="Almacenes Karaka"/><div className="executive-brand-copy"><span>{executiveAccess?'REPORTE GERENCIAL · DIRECCIÓN':'RESUMEN PERSONAL'}</span><b>{executiveAccess?'Cierre operativo diario':selected?.full_name||'Sin actividad'}</b><small>{new Date(`${date}T12:00:00`).toLocaleDateString('es-DO',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})} · tiempos reales y estimados identificados por separado.</small></div></div>
        <div className="executive-pulse"><span>Horas operativas registradas</span><strong>{duration(summary?.operational_seconds)}</strong><small>{executiveAccess?`${summary?.active_employees||0} colaboradores con actividad`:'ventana identificada de gestión'}</small></div>
      </div>

      <div className="executive-meter-grid">
        {executiveAccess&&<Meter icon={<Users/>} label="Colaboradores activos" value={summary?.active_employees||0} note="con actividad registrada"/>}
        <Meter icon={<MapPinCheck/>} label="Ejecución de ruta" value={`${summary?.visited_clients||0}/${summary?.planned_clients||0}`} note={`${summary?.route_execution_pct||0}% vs plan`} progress={summary?.route_execution_pct}/>
        <Meter icon={<PhoneCall/>} label="Contacto telefónico" value={`${summary?.calls_contacted||0}/${summary?.calls||0}`} note={`${summary?.call_contact_rate_pct||0}% efectividad`} progress={summary?.call_contact_rate_pct}/>
        <Meter icon={<CalendarDays/>} label="Showroom" value={summary?.showroom_attended||0} note={duration(summary?.showroom_seconds)}/>
        <Meter icon={<ShoppingBag/>} label="Compras" value={summary?.purchase_clients||0} note={`${summary?.visit_purchase_clients||0} calle · ${summary?.showroom_purchase_clients||0} showroom`}/>
        <Meter icon={<ShoppingBag/>} label="Ventas" value={money(summary?.sales_amount)} note="monto capturado"/>
        <Meter icon={<Clock3/>} label="Traslado / espera" value={duration(summary?.transit_wait_estimated_seconds)} note="estimado"/>
        <Meter icon={<AlertTriangle/>} label="Eventualidades" value={summary?.incidents||0} note={duration(summary?.incident_seconds)}/>
      </div>

      {executiveAccess&&<div className="executive-chart-grid">
        <ChartPanel title="Vendedores · operación de calle" subtitle="Plan, visitas y compras" empty={!vendorChart.length}><ResponsiveContainer width="100%" height={300}><BarChart data={vendorChart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="Plan" fill="var(--chart-muted)" radius={[5,5,0,0]}/><Bar dataKey="Visitados" fill="var(--brand)" radius={[5,5,0,0]}/><Bar dataKey="Compras" fill="var(--success)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartPanel>
        <ChartPanel title="Gestores · CRM y Showroom" subtitle="Llamadas, contactos, showroom y compras" empty={!managerChart.length}><ResponsiveContainer width="100%" height={300}><BarChart data={managerChart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="Llamadas" fill="var(--chart-muted)" radius={[5,5,0,0]}/><Bar dataKey="Contactados" fill="var(--brand)" radius={[5,5,0,0]}/><Bar dataKey="Showroom" fill="var(--warning)" radius={[5,5,0,0]}/><Bar dataKey="Compras" fill="var(--success)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartPanel>
      </div>}

      {executiveAccess&&<div className="report-team-stack">
        <VendorSection rows={vendors} selectedEmployee={selectedEmployee} onSelect={setSelectedEmployee}/>
        <ManagerSection rows={managers} selectedEmployee={selectedEmployee} onSelect={setSelectedEmployee}/>
        {others.length>0&&<OtherSection rows={others} selectedEmployee={selectedEmployee} onSelect={setSelectedEmployee}/>} 
      </div>}

      {selected&&<section className="panel employee-executive-detail"><div className="panel-head"><div><span className="eyebrow">DETALLE DEL DÍA</span><b>{selected.full_name}</b><span>{selected.job_title||selected.employee_type} · {time(selected.first_activity_at)} → {time(selected.last_activity_at)}</span></div><div className="button-row"><span className="report-role-badge">{selected.employee_type}</span><button className="secondary compact" onClick={()=>void exportXlsx(`Cronologia_${selected.full_name}_${date}`,timelineExport)}>Excel detalle</button><button className="secondary compact" onClick={()=>exportPdf(`Cronología ${selected.full_name} ${date}`,timelineExport)}>PDF detalle</button></div></div>
        <div className="employee-time-strip"><TimeBlock label="Operativo" value={selected.operational_seconds}/><TimeBlock label="Clientes" value={selected.visit_seconds}/><TimeBlock label="Llamadas*" value={selected.call_estimated_seconds}/><TimeBlock label="Showroom" value={selected.showroom_seconds}/><TimeBlock label="Traslado/espera*" value={selected.transit_wait_estimated_seconds}/><TimeBlock label="Eventualidades" value={selected.incident_seconds}/></div>
        <div className="employee-result-strip"><span><b>{selected.calls}</b> intentos de llamada</span><span><b>{selected.calls_contacted}</b> contactados</span><span><b>{selected.visited_clients}</b> visitas</span><span><b>{selected.showroom_attended}</b> showroom</span><span><b>{selected.purchase_clients}</b> compras</span><span><b>{money(selected.sales_amount)}</b> ventas</span></div>
        <div className="executive-timeline"><div className="timeline-head"><b>Cronología operacional</b><span>Las filas marcadas EST. corresponden a duración aproximada.</span></div>{selectedTimeline.length?selectedTimeline.map(item=><div className={`timeline-row type-${String(item.activity_type).toLowerCase()}`} key={`${item.activity_type}-${item.source_id}`}><div className="timeline-time"><b>{time(item.started_at)}</b><span>{time(item.ended_at)}</span></div><div className="timeline-dot"/><div className="timeline-copy"><div><b>{label(item.activity_type)}</b>{item.estimated&&<span className="estimate-badge">EST.</span>}</div><strong>{item.label}</strong><span>{label(item.result)}{item.amount?` · ${money(item.amount)}`:''}</span></div><div className="timeline-duration">{duration(item.duration_seconds)}</div></div>):<div className="empty-state"><b>Sin detalle cronológico para esta fecha.</b></div>}</div>
      </section>}
    </>}
  </div>
}

function Meter({icon,label,value,note,progress}:{icon:ReactNode;label:string;value:string|number;note:string;progress?:number}){return <div className="executive-meter"><div className="executive-meter-top"><span>{label}</span>{icon}</div><strong>{value}</strong>{progress!=null&&<div className="executive-meter-bar"><i style={{width:`${Math.max(0,Math.min(100,Number(progress||0)))}%`}}/></div>}<small>{note}</small></div>}
function ChartPanel({title,subtitle,empty,children}:{title:string;subtitle:string;empty:boolean;children:ReactNode}){return <div className="panel executive-chart-card"><div className="panel-head"><div><b>{title}</b><span>{subtitle}</span></div><BarChart3 size={19}/></div>{empty?<div className="empty-state"><b>Sin actividad para esta función.</b></div>:children}</div>}

function VendorSection({rows,selectedEmployee,onSelect}:{rows:any[];selectedEmployee:string;onSelect:(id:string)=>void}){const totals=teamTotals(rows);return <section className="panel report-team-card"><TeamHeader icon={<Route/>} title="Vendedores · Operación de calle" subtitle="Cobertura, visitas y resultado comercial" count={rows.length}/><div className="report-team-summary"><SummaryBox label="Planificados" value={totals.planned}/><SummaryBox label="Visitados" value={totals.visited}/><SummaryBox label="Cobertura" value={`${totals.planned?Math.round((totals.visited/totals.planned)*100):0}%`}/><SummaryBox label="Compras" value={totals.purchases}/><SummaryBox label="Ventas" value={money(totals.sales)}/></div>{rows.length?<div className="responsive-table"><table className="report-team-table"><thead><tr><th>Vendedor</th><th>Ventana</th><th>Plan</th><th>Visitados</th><th>Cobertura</th><th>Compras</th><th>Ventas</th><th>T. clientes</th><th>Trayecto/espera*</th><th>Event.</th></tr></thead><tbody>{rows.map(r=><tr key={r.employee_id} className={selectedEmployee===r.employee_id?'selected-row':''} onClick={()=>onSelect(r.employee_id)}><td><b>{r.full_name}</b><small>{r.job_title||'Vendedor'}</small></td><td>{time(r.first_activity_at)}–{time(r.last_activity_at)}</td><td>{r.planned_clients||0}</td><td><b>{r.visited_clients||0}</b><small>{r.received_clients||0} recibidos</small></td><td><b>{r.route_compliance_pct||0}%</b></td><td>{r.purchase_clients||0}</td><td><b>{money(r.sales_amount)}</b></td><td>{duration(r.visit_seconds)}</td><td>{duration(r.transit_wait_estimated_seconds)}</td><td>{r.incidents||0}<small>{duration(r.incident_seconds)}</small></td></tr>)}</tbody></table></div>:<div className="report-empty-role">No hay vendedores con actividad registrada en esta fecha.</div>}</section>}
function ManagerSection({rows,selectedEmployee,onSelect}:{rows:any[];selectedEmployee:string;onSelect:(id:string)=>void}){const totals=teamTotals(rows);return <section className="panel report-team-card"><TeamHeader icon={<PhoneCall/>} title="Gestores · CRM y Showroom" subtitle="Contacto, citas, showroom y conversión" count={rows.length}/><div className="report-team-summary"><SummaryBox label="Llamadas" value={totals.calls}/><SummaryBox label="Contactados" value={totals.contacted}/><SummaryBox label="Showroom" value={totals.showroom}/><SummaryBox label="Compras" value={totals.purchases}/><SummaryBox label="Ventas" value={money(totals.sales)}/></div>{rows.length?<div className="responsive-table"><table className="report-team-table"><thead><tr><th>Gestor</th><th>Ventana</th><th>Llamadas</th><th>Contactados</th><th>Contacto</th><th>T. llamadas*</th><th>Showroom</th><th>T. showroom</th><th>Compras</th><th>Ventas</th></tr></thead><tbody>{rows.map(r=><tr key={r.employee_id} className={selectedEmployee===r.employee_id?'selected-row':''} onClick={()=>onSelect(r.employee_id)}><td><b>{r.full_name}</b><small>{r.job_title||'Gestor'}</small></td><td>{time(r.first_activity_at)}–{time(r.last_activity_at)}</td><td>{r.calls||0}</td><td><b>{r.calls_contacted||0}</b></td><td>{r.call_contact_rate_pct||0}%</td><td>{duration(r.call_estimated_seconds)}</td><td>{r.showroom_attended||0}</td><td>{duration(r.showroom_seconds)}</td><td>{r.purchase_clients||0}</td><td><b>{money(r.sales_amount)}</b></td></tr>)}</tbody></table></div>:<div className="report-empty-role">No hay gestores con actividad registrada en esta fecha.</div>}</section>}
function OtherSection({rows,selectedEmployee,onSelect}:{rows:any[];selectedEmployee:string;onSelect:(id:string)=>void}){return <section className="panel report-team-card"><TeamHeader icon={<Users/>} title="Otras funciones" subtitle="Actividad operativa registrada fuera de Vendedores/Gestores" count={rows.length}/><div className="responsive-table"><table><thead><tr><th>Colaborador</th><th>Tipo</th><th>Ventana</th><th>Actividad</th><th>Compras</th><th>Ventas</th></tr></thead><tbody>{rows.map(r=><tr key={r.employee_id} className={selectedEmployee===r.employee_id?'selected-row':''} onClick={()=>onSelect(r.employee_id)}><td><b>{r.full_name}</b></td><td>{r.employee_type||r.job_title}</td><td>{time(r.first_activity_at)}–{time(r.last_activity_at)}</td><td>{Number(r.visited_clients||0)+Number(r.calls||0)+Number(r.showroom_attended||0)}</td><td>{r.purchase_clients||0}</td><td>{money(r.sales_amount)}</td></tr>)}</tbody></table></div></section>}
function TeamHeader({icon,title,subtitle,count}:{icon:ReactNode;title:string;subtitle:string;count:number}){return <div className="executive-team-header"><div className="executive-team-title"><div className="executive-team-title-icon">{icon}</div><div><b>{title}</b><span>{subtitle}</span></div></div><span className="badge">{count} registros</span></div>}
function SummaryBox({label,value}:{label:string;value:string|number}){return <div><span>{label}</span><b>{value}</b></div>}
function TimeBlock({label,value}:{label:string;value:number}){return <div><span>{label}</span><b>{duration(value)}</b></div>}
function teamTotals(rows:any[]){return rows.reduce((a,r)=>({planned:a.planned+Number(r.planned_clients||0),visited:a.visited+Number(r.visited_clients||0),calls:a.calls+Number(r.calls||0),contacted:a.contacted+Number(r.calls_contacted||0),showroom:a.showroom+Number(r.showroom_attended||0),purchases:a.purchases+Number(r.purchase_clients||0),sales:a.sales+Number(r.sales_amount||0)}),{planned:0,visited:0,calls:0,contacted:0,showroom:0,purchases:0,sales:0})}
