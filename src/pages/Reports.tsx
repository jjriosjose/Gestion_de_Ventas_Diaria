import { useEffect,useMemo,useState,type ReactNode } from 'react'
import { AlertTriangle,BarChart3,CalendarDays,Clock3,Download,FileSpreadsheet,MapPinCheck,PhoneCall,ShoppingBag,Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { exportPdf,exportXlsx } from '../lib/export'
import '../styles/executive-v060.css'

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const duration=(value?:number|null)=>{const total=Math.max(0,Math.round(Number(value||0)));const h=Math.floor(total/3600);const m=Math.round((total%3600)/60);return h?`${h} h ${m} min`:`${m} min`}
const time=(value?:string|null)=>value?new Date(value).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—'
const money=(value?:number|string|null)=>new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP',maximumFractionDigits:0}).format(Number(value||0))
const label=(value?:string|null)=>String(value||'—').replaceAll('_',' ')

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

  const selected=rows.find(r=>r.employee_id===selectedEmployee)||null
  const selectedTimeline=useMemo(()=>timeline.filter(r=>r.employee_id===selectedEmployee),[timeline,selectedEmployee])
  const ownGlobal=useMemo(()=>{if(executiveAccess||!selected)return null;return {active_employees:selected.operational_seconds>0?1:0,planned_clients:selected.planned_clients,visited_clients:selected.visited_clients,calls:selected.calls,calls_contacted:selected.calls_contacted,call_contact_rate_pct:selected.call_contact_rate_pct,showroom_attended:selected.showroom_attended,showroom_seconds:selected.showroom_seconds,purchase_clients:selected.purchase_clients,visit_purchase_clients:selected.visit_purchase_clients,showroom_purchase_clients:selected.showroom_purchase_clients,sales_amount:selected.sales_amount,transit_wait_estimated_seconds:selected.transit_wait_estimated_seconds,incidents:selected.incidents,incident_seconds:selected.incident_seconds,operational_seconds:selected.operational_seconds,route_execution_pct:selected.planned_clients?Math.round((selected.visited_clients/selected.planned_clients)*1000)/10:0}},[executiveAccess,selected])
  const summary=executiveAccess?global:ownGlobal

  const executiveDetail=rows.map(r=>({
    Empleado:r.full_name,Cargo:r.job_title||'',Tipo:r.employee_type,
    PrimeraGestion:time(r.first_activity_at),UltimaGestion:time(r.last_activity_at),Ventana:duration(r.activity_window_seconds),HorasOperativas:duration(r.operational_seconds),
    Planificados:r.planned_clients,Visitados:r.visited_clients,Recibidos:r.received_clients,
    Llamadas:r.calls,Contactados:r.calls_contacted,'Tiempo llamadas estimado':duration(r.call_estimated_seconds),
    Showroom:r.showroom_attended,'Tiempo showroom':duration(r.showroom_seconds),'Tiempo clientes':duration(r.visit_seconds),'Traslado/espera estimado':duration(r.transit_wait_estimated_seconds),
    Eventualidades:r.incidents,'Tiempo eventualidades':duration(r.incident_seconds),ComprasVisita:r.visit_purchase_clients,ComprasShowroom:r.showroom_purchase_clients,Compras:r.purchase_clients,Ventas:money(r.sales_amount),Captaciones:r.prospects_captured,
    'Utilizacion registrada %':r.registered_utilization_pct??'', 'Contacto %':r.call_contact_rate_pct??'', 'Cumplimiento ruta %':r.route_compliance_pct??''
  }))
  const timelineExport=selectedTimeline.map(r=>({Empleado:selected?.full_name||'',Tipo:r.activity_type,Inicio:time(r.started_at),Fin:time(r.ended_at),Duracion:duration(r.duration_seconds),Naturaleza:r.estimated?'Estimado':'Registrado',Gestion:r.label,Resultado:label(r.result),Monto:r.amount?money(r.amount):''}))

  return <div className="page-stack executive-report">
    <div className="page-head"><div><span className="eyebrow">{executiveAccess?'DIRECCIÓN · CIERRE OPERATIVO':'MI GESTIÓN · CIERRE DIARIO'}</span><h2>{executiveAccess?'Reporte Ejecutivo Diario':'Mi resumen diario'}</h2><p>{executiveAccess?'Lectura gerencial de actividad, tiempos, clientes, conversiones, ventas y eventualidades. Los tiempos estimados se identifican por separado.':'Resumen de tu actividad registrada, diferenciando tiempos reales y estimados.'}</p></div><div className="executive-head-actions"><label className="inline-date">Fecha<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button className="secondary" disabled={!rows.length} onClick={()=>void exportXlsx(`${executiveAccess?'Reporte_Ejecutivo':'Mi_Resumen'}_${date}`,executiveDetail)}><FileSpreadsheet size={17}/> Excel</button><button className="secondary" disabled={!rows.length} onClick={()=>exportPdf(`${executiveAccess?'Reporte Ejecutivo Diario':'Mi resumen diario'} ${date}`,executiveDetail)}><Download size={17}/> PDF</button></div></div>

    {error&&<div className="panel"><b>No fue posible cargar el reporte.</b><span>{error}</span></div>}
    {loading?<div className="panel empty-state"><b>Calculando cierre operativo...</b></div>:<>
      <section className="executive-hero panel"><div className="executive-title"><div className="executive-mark"><BarChart3/></div><div><span>{executiveAccess?'Resumen de la operación':'Resumen de tu jornada'}</span><strong>{new Date(`${date}T12:00:00`).toLocaleDateString('es-DO',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</strong><small>{executiveAccess?`${summary?.active_employees||0} colaboradores con actividad registrada`:selected?.full_name||'Sin actividad registrada'}</small></div></div><div className="executive-primary"><span>Horas operativas registradas</span><b>{duration(summary?.operational_seconds)}</b><small>Incluye tiempos exactos y estimados identificados</small></div></section>

      <div className="executive-kpis">
        {executiveAccess&&<Metric icon={<Users/>} label="Colaboradores activos" value={summary?.active_employees||0} note="con actividad en el día"/>}
        <Metric icon={<MapPinCheck/>} label="Clientes visitados" value={`${summary?.visited_clients||0}/${summary?.planned_clients||0}`} note={`${summary?.route_execution_pct||0}% ejecución vs plan`}/>
        <Metric icon={<PhoneCall/>} label="Gestiones telefónicas" value={summary?.calls||0} note={`${summary?.calls_contacted||0} contactadas · ${summary?.call_contact_rate_pct||0}%`}/>
        <Metric icon={<CalendarDays/>} label="Atenciones showroom" value={summary?.showroom_attended||0} note={duration(summary?.showroom_seconds)}/>
        <Metric icon={<ShoppingBag/>} label="Compras registradas" value={summary?.purchase_clients||0} note={`${summary?.visit_purchase_clients||0} calle · ${summary?.showroom_purchase_clients||0} showroom`}/>
        <Metric icon={<ShoppingBag/>} label="Ventas registradas" value={money(summary?.sales_amount)} note="monto capturado en la gestión"/>
        <Metric icon={<Clock3/>} label="Traslado / espera estimado" value={duration(summary?.transit_wait_estimated_seconds)} note="ventana de ruta menos atención e incidencias"/>
        <Metric icon={<AlertTriangle/>} label="Eventualidades" value={summary?.incidents||0} note={duration(summary?.incident_seconds)}/>
      </div>

      {executiveAccess&&<section className="panel executive-table-panel"><div className="panel-head"><div><b>Resumen por colaborador</b><span>Selecciona una persona para abrir el detalle cronológico del día.</span></div><span className="badge">{rows.length} con actividad</span></div><div className="responsive-table"><table className="executive-table"><thead><tr><th>Colaborador</th><th>Ventana</th><th>H. operativas</th><th>Llamadas</th><th>T. llamadas*</th><th>Visitas</th><th>T. clientes</th><th>Showroom</th><th>T. showroom</th><th>Trayecto/espera*</th><th>Event.</th><th>Compras</th><th>Ventas</th></tr></thead><tbody>{rows.map(r=><tr key={r.employee_id} className={selectedEmployee===r.employee_id?'selected-row':''} onClick={()=>setSelectedEmployee(r.employee_id)}><td data-label="Colaborador"><b>{r.full_name}</b><small>{r.job_title||r.employee_type}</small></td><td data-label="Ventana">{time(r.first_activity_at)}–{time(r.last_activity_at)}</td><td data-label="H. operativas"><b>{duration(r.operational_seconds)}</b><small>{r.registered_utilization_pct??0}% utilización registrada</small></td><td data-label="Llamadas">{r.calls}<small>{r.calls_contacted} contactadas</small></td><td data-label="T. llamadas*">{duration(r.call_estimated_seconds)}</td><td data-label="Visitas">{r.visited_clients}/{r.planned_clients}</td><td data-label="T. clientes">{duration(r.visit_seconds)}</td><td data-label="Showroom">{r.showroom_attended}</td><td data-label="T. showroom">{duration(r.showroom_seconds)}</td><td data-label="Trayecto/espera*">{duration(r.transit_wait_estimated_seconds)}</td><td data-label="Event.">{r.incidents}<small>{duration(r.incident_seconds)}</small></td><td data-label="Compras">{r.purchase_clients}<small>{r.visit_purchase_clients} calle · {r.showroom_purchase_clients} showroom</small></td><td data-label="Ventas"><b>{money(r.sales_amount)}</b></td></tr>)}</tbody></table></div><div className="executive-legend">* Tiempo estimado. Visitas, showroom y eventualidades usan marcas reales de inicio/fin. La ventana operativa va desde la primera hasta la última actividad identificada. Las categorías pueden solaparse; el total operativo nunca excede la ventana de actividad.</div></section>}

      {selected&&<section className="panel employee-executive-detail"><div className="panel-head"><div><span className="eyebrow">DETALLE DEL DÍA</span><b>{selected.full_name}</b><span>{selected.job_title||selected.employee_type} · {time(selected.first_activity_at)} → {time(selected.last_activity_at)}</span></div><div className="button-row"><button className="secondary compact" onClick={()=>void exportXlsx(`Cronologia_${selected.full_name}_${date}`,timelineExport)}>Excel detalle</button><button className="secondary compact" onClick={()=>exportPdf(`Cronología ${selected.full_name} ${date}`,timelineExport)}>PDF detalle</button></div></div>
        <div className="employee-time-strip"><TimeBlock label="Operativo" value={selected.operational_seconds}/><TimeBlock label="Clientes" value={selected.visit_seconds}/><TimeBlock label="Llamadas*" value={selected.call_estimated_seconds}/><TimeBlock label="Showroom" value={selected.showroom_seconds}/><TimeBlock label="Traslado/espera*" value={selected.transit_wait_estimated_seconds}/><TimeBlock label="Eventualidades" value={selected.incident_seconds}/></div>
        <div className="employee-result-strip"><span><b>{selected.calls}</b> intentos de llamada</span><span><b>{selected.calls_contacted}</b> contactados</span><span><b>{selected.visited_clients}</b> visitas</span><span><b>{selected.showroom_attended}</b> showroom</span><span><b>{selected.purchase_clients}</b> compras</span><span><b>{money(selected.sales_amount)}</b> ventas</span></div>
        <div className="executive-timeline"><div className="timeline-head"><b>Cronología operacional</b><span>Las filas marcadas EST. corresponden a duración aproximada.</span></div>{selectedTimeline.length?selectedTimeline.map(item=><div className={`timeline-row type-${String(item.activity_type).toLowerCase()}`} key={`${item.activity_type}-${item.source_id}`}><div className="timeline-time"><b>{time(item.started_at)}</b><span>{time(item.ended_at)}</span></div><div className="timeline-dot"/><div className="timeline-copy"><div><b>{label(item.activity_type)}</b>{item.estimated&&<span className="estimate-badge">EST.</span>}</div><strong>{item.label}</strong><span>{label(item.result)}{item.amount?` · ${money(item.amount)}`:''}</span></div><div className="timeline-duration">{duration(item.duration_seconds)}</div></div>):<div className="empty-state"><b>Sin detalle cronológico para esta fecha.</b></div>}</div>
      </section>}
    </>}
  </div>
}

function Metric({icon,label,value,note}:{icon:ReactNode;label:string;value:string|number;note:string}){return <div className="executive-metric"><div className="executive-metric-icon">{icon}</div><div><span>{label}</span><b>{value}</b><small>{note}</small></div></div>}
function TimeBlock({label,value}:{label:string;value:number}){return <div><span>{label}</span><b>{duration(value)}</b></div>}
