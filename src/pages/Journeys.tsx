import { useEffect,useMemo,useState } from 'react'
import { AlertTriangle,CalendarDays,CheckCircle2,ChevronRight,Clock3,Download,FileSpreadsheet,FilterX,Gauge,Route,ShieldAlert,TimerReset } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { profileForEmployee } from '../lib/access'
import { exportPdf,exportXlsx } from '../lib/export'
import '../styles/journeys-reporting.css'

type PeriodMode='TODAY'|'WEEK'|'MONTH'|'RANGE'

type JourneyRow={
  route_plan_id:string
  route_session_id?:string|null
  employee_id:string
  full_name:string
  job_title?:string|null
  employee_type:string
  route_date:string
  plan_type:string
  title?:string|null
  plan_status:string
  session_status?:string|null
  started_at?:string|null
  ended_at?:string|null
  closure_mode?:string|null
  closure_reason_code?:string|null
  closure_reason_text?:string|null
  closed_pending_count:number
  derived_status:'NO_INICIADA'|'PLANIFICADA'|'PROGRAMADA'|'FINALIZADA_PARCIAL'|'FINALIZADA'|'PENDIENTE_CIERRE'|'ACTIVA'
  planned_clients:number
  visited_clients:number
  in_visit_clients:number
  pending_clients:number
  not_visited_clients:number
  reprogrammed_clients:number
  cancelled_clients:number
  resolved_clients:number
  coverage_pct:number
  resolution_pct:number
  route_window_seconds:number
  visit_seconds:number
  incident_seconds:number
  transit_wait_estimated_seconds:number
  estimated_distance_m:number
  open_visit_count:number
  incident_count:number
  active_incident_count:number
  client_types:string[]
  official_regions:string[]
  official_provinces:string[]
  official_municipalities:string[]
  official_area_name?:string|null
  official_area_level?:string|null
}

const localToday=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const ymd=(date:Date)=>date.toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const currentMonth=()=>localToday().slice(0,7)
const unique=(values:string[])=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'))
const pct=(num:number,den:number)=>den?Math.round((num/den)*1000)/10:0
const duration=(seconds?:number|null)=>{const total=Math.max(0,Math.round(Number(seconds||0)));const h=Math.floor(total/3600);const m=Math.round((total%3600)/60);return h?`${h} h ${m} min`:`${m} min`}
const time=(value?:string|null)=>value?new Date(value).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—'
const dateLabel=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('es-DO',{day:'2-digit',month:'short',year:'numeric'})
const km=(meters?:number|null)=>`${(Number(meters||0)/1000).toLocaleString('es-DO',{minimumFractionDigits:1,maximumFractionDigits:1})} km`
const statusLabel:Record<string,string>={NO_INICIADA:'No ejecutada',PLANIFICADA:'Planificada',PROGRAMADA:'Programada',FINALIZADA_PARCIAL:'Finalizada parcial',FINALIZADA:'Finalizada',PENDIENTE_CIERRE:'Pendiente de cierre',ACTIVA:'Activa hoy'}

function bounds(mode:PeriodMode,month:string,from:string,to:string){
  const today=localToday()
  if(mode==='TODAY')return {from:today,to:today}
  if(mode==='WEEK'){
    const base=new Date(`${today}T12:00:00`);const day=base.getDay()||7;const start=new Date(base);start.setDate(base.getDate()-day+1);const end=new Date(start);end.setDate(start.getDate()+6)
    return {from:ymd(start),to:ymd(end)}
  }
  if(mode==='MONTH'){
    const [year,m]=month.split('-').map(Number);const start=new Date(year,m-1,1,12);const end=new Date(year,m,0,12);return {from:ymd(start),to:ymd(end)}
  }
  return {from:from||today,to:to||from||today}
}

export function Journeys(){
  const {employee}=useAuth();const navigate=useNavigate();const profile=profileForEmployee(employee);const executive=['Administrador','Supervisor'].includes(profile)
  const [periodMode,setPeriodMode]=useState<PeriodMode>('MONTH');const [month,setMonth]=useState(currentMonth());const [from,setFrom]=useState(localToday());const [to,setTo]=useState(localToday())
  const [rows,setRows]=useState<JourneyRow[]>([]);const [employees,setEmployees]=useState<any[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('')
  const [employeeFilter,setEmployeeFilter]=useState('');const [statusFilter,setStatusFilter]=useState('');const [clientType,setClientType]=useState('');const [region,setRegion]=useState('');const [province,setProvince]=useState('');const [municipality,setMunicipality]=useState('')
  const [selected,setSelected]=useState<JourneyRow|null>(null);const [stops,setStops]=useState<any[]>([]);const [incidents,setIncidents]=useState<any[]>([]);const [busy,setBusy]=useState(false)
  const range=useMemo(()=>bounds(periodMode,month,from,to),[periodMode,month,from,to])

  const load=async()=>{
    setLoading(true);setError('')
    let q=supabase.from('executive_route_journeys_v2').select('*').gte('route_date',range.from).lte('route_date',range.to).order('route_date',{ascending:false}).order('started_at',{ascending:false})
    if(!executive&&employee?.id)q=q.eq('employee_id',employee.id)
    const [journeyResult,employeeResult]=await Promise.all([q,executive?supabase.from('employees').select('id,full_name,job_title,employee_type').eq('active',true).eq('employee_type','Vendedor').order('full_name'):Promise.resolve({data:[],error:null}) as any])
    const err=journeyResult.error||employeeResult.error
    if(err)setError(err.message)
    setRows((journeyResult.data||[]) as JourneyRow[]);setEmployees(employeeResult.data||[]);setLoading(false)
  }
  useEffect(()=>{void load()},[range.from,range.to,employee?.id,executive])
  useEffect(()=>{setProvince('');setMunicipality('')},[region]);useEffect(()=>setMunicipality(''),[province])

  const preTerritory=useMemo(()=>rows.filter(r=>(!employeeFilter||r.employee_id===employeeFilter)&&(!statusFilter||r.derived_status===statusFilter)&&(!clientType||r.client_types?.includes(clientType))),[rows,employeeFilter,statusFilter,clientType])
  const regionOptions=useMemo(()=>unique(preTerritory.flatMap(r=>r.official_regions||[])),[preTerritory])
  const provinceOptions=useMemo(()=>unique(preTerritory.filter(r=>!region||r.official_regions?.includes(region)).flatMap(r=>r.official_provinces||[])),[preTerritory,region])
  const municipalityOptions=useMemo(()=>unique(preTerritory.filter(r=>(!region||r.official_regions?.includes(region))&&(!province||r.official_provinces?.includes(province))).flatMap(r=>r.official_municipalities||[])),[preTerritory,region,province])
  const clientTypeOptions=useMemo(()=>unique(rows.flatMap(r=>r.client_types||[])),[rows])
  const filtered=useMemo(()=>preTerritory.filter(r=>(!region||r.official_regions?.includes(region))&&(!province||r.official_provinces?.includes(province))&&(!municipality||r.official_municipalities?.includes(municipality))),[preTerritory,region,province,municipality])

  const stats=useMemo(()=>{
    const planned=filtered.reduce((s,r)=>s+Number(r.planned_clients||0),0);const visited=filtered.reduce((s,r)=>s+Number(r.visited_clients||0),0);const resolved=filtered.reduce((s,r)=>s+Number(r.resolved_clients||0),0)
    return {
      journeys:filtered.length,started:filtered.filter(r=>!!r.route_session_id).length,active:filtered.filter(r=>r.derived_status==='ACTIVA').length,expired:filtered.filter(r=>r.derived_status==='PENDIENTE_CIERRE').length,finalized:filtered.filter(r=>['FINALIZADA','FINALIZADA_PARCIAL'].includes(r.derived_status)).length,notStarted:filtered.filter(r=>r.derived_status==='NO_INICIADA').length,
      planned,visited,resolved,coverage:pct(visited,planned),resolution:pct(resolved,planned),seconds:filtered.reduce((s,r)=>s+Number(r.route_window_seconds||0),0),distance:filtered.reduce((s,r)=>s+Number(r.estimated_distance_m||0),0),incidents:filtered.reduce((s,r)=>s+Number(r.incident_count||0),0)
    }
  },[filtered])

  const clearFilters=()=>{setEmployeeFilter('');setStatusFilter('');setClientType('');setRegion('');setProvince('');setMunicipality('')}
  const openDetail=async(row:JourneyRow)=>{
    setSelected(row);setStops([]);setIncidents([])
    const [s,i]=await Promise.all([
      supabase.from('route_stops').select('id,stop_order,status,reason_not_visited,exception_reason_code,official_region_at_plan,official_province_at_plan,official_municipality_at_plan,clients(codempr,legal_name,client_type)').eq('route_plan_id',row.route_plan_id).order('stop_order'),
      row.route_session_id?supabase.from('operational_incidents').select('id,incident_type,status,impact,started_at,ended_at,description').eq('route_session_id',row.route_session_id).neq('status','CANCELADA').order('started_at'):Promise.resolve({data:[],error:null}) as any
    ])
    setStops(s.data||[]);setIncidents(i.data||[])
  }
  const closeExpired=async(row:JourneyRow)=>{
    if(!row.route_session_id)return
    if(row.open_visit_count>0)return alert('Esta jornada conserva una visita abierta. Dirección debe revisar esa visita antes del cierre para no falsear la atención.')
    if(row.active_incident_count>0)return alert('Esta jornada conserva una eventualidad activa. Debe revisarse antes del cierre.')
    if(!window.confirm(`Cerrar la jornada vencida del ${dateLabel(row.route_date)}? Las paradas pendientes quedarán como no visitadas por jornada vencida.`))return
    setBusy(true)
    const {error}=await supabase.rpc('finalize_route_session',{p_route_session_id:row.route_session_id,p_reason_code:'JORNADA_VENCIDA',p_notes:'Cierre de jornada vencida desde Control de jornadas',p_end_latitude:null,p_end_longitude:null,p_end_accuracy_m:null})
    setBusy(false);if(error)return alert(error.message);setSelected(null);await load()
  }

  const report=filtered.map(r=>({Fecha:r.route_date,Vendedor:r.full_name,Estado:statusLabel[r.derived_status]||r.derived_status,Planificados:r.planned_clients,Visitados:r.visited_clients,'Cobertura %':Number(r.coverage_pct||0),Resueltos:r.resolved_clients,'Cierre operativo %':Number(r.resolution_pct||0),Inicio:time(r.started_at),Fin:time(r.ended_at),Jornada:duration(r.route_window_seconds),'Atención':duration(r.visit_seconds),'Traslado/espera':duration(r.transit_wait_estimated_seconds),'Distancia GPS':km(r.estimated_distance_m),Eventualidades:r.incident_count,'Región oficial':(r.official_regions||[]).join(', '),'Provincia oficial':(r.official_provinces||[]).join(', '),'Municipio oficial':(r.official_municipalities||[]).join(', '),'Motivo cierre':r.closure_reason_text||''}))

  return <div className="page-stack journey-page">
    <div className="page-head"><div><span className="eyebrow">CONTROL OPERATIVO</span><h2>{executive?'Control de jornadas':'Mis jornadas'}</h2><p>{executive?'Seguimiento de ejecución, cierres, cobertura y jornadas vencidas de la fuerza de ventas.':'Tu jornada pertenece a un único día operativo. Revisa pendientes de cierre sin buscar fecha por fecha.'}</p></div><div className="button-row"><button className="secondary" disabled={!filtered.length} onClick={()=>void exportXlsx(`Jornadas_${range.from}_${range.to}`,report)}><FileSpreadsheet size={17}/> Excel</button><button className="secondary" disabled={!filtered.length} onClick={()=>exportPdf(`Jornadas ${range.from} - ${range.to}`,report)}><Download size={17}/> PDF</button></div></div>

    <section className="panel journey-filter-panel"><div className="journey-filter-grid"><label>Período<select value={periodMode} onChange={e=>setPeriodMode(e.target.value as PeriodMode)}><option value="TODAY">Hoy</option><option value="WEEK">Semana actual</option><option value="MONTH">Mes</option><option value="RANGE">Rango personalizado</option></select></label>{periodMode==='MONTH'&&<label>Mes<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>}{periodMode==='RANGE'&&<><label>Desde<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></label></>}{executive&&<label>Vendedor<select value={employeeFilter} onChange={e=>setEmployeeFilter(e.target.value)}><option value="">Todos los vendedores</option>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></label>}<label>Estado<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Todos los estados</option><option value="ACTIVA">Activa hoy</option><option value="PENDIENTE_CIERRE">Pendiente de cierre</option><option value="PLANIFICADA">Planificada</option><option value="PROGRAMADA">Programada</option><option value="FINALIZADA">Finalizada</option><option value="FINALIZADA_PARCIAL">Finalizada parcial</option><option value="NO_INICIADA">No ejecutada</option></select></label><label>Tipo cliente<select value={clientType} onChange={e=>setClientType(e.target.value)}><option value="">Todos los tipos</option>{clientTypeOptions.map(v=><option key={v}>{v}</option>)}</select></label><label>Región oficial<select value={region} onChange={e=>setRegion(e.target.value)}><option value="">Todas las regiones</option>{regionOptions.map(v=><option key={v}>{v}</option>)}</select></label><label>Provincia oficial<select value={province} onChange={e=>setProvince(e.target.value)}><option value="">Todas las provincias</option>{provinceOptions.map(v=><option key={v}>{v}</option>)}</select></label><label>Municipio oficial<select value={municipality} onChange={e=>setMunicipality(e.target.value)}><option value="">Todos los municipios</option>{municipalityOptions.map(v=><option key={v}>{v}</option>)}</select></label></div><div className="journey-filter-foot"><span>{range.from} → {range.to} · {filtered.length} jornada(s) · División territorial oficial congelada al planificar</span><button className="secondary compact" onClick={clearFilters}><FilterX size={15}/> Limpiar filtros</button></div></section>

    {error&&<div className="panel journey-alert danger"><AlertTriangle/><div><b>No fue posible cargar Jornadas</b><span>{error}</span></div></div>}
    {loading?<div className="panel empty-state"><b>Calculando jornadas...</b></div>:<>
      <div className="journey-kpi-grid"><Kpi icon={<CalendarDays/>} label="Jornadas" value={stats.journeys} note={`${stats.started} iniciadas`}/><Kpi icon={<Gauge/>} label="Cobertura real" value={`${stats.coverage}%`} note={`${stats.visited}/${stats.planned} visitados`}/><Kpi icon={<CheckCircle2/>} label="Cierre operativo" value={`${stats.resolution}%`} note={`${stats.resolved}/${stats.planned} con resultado`}/><Kpi icon={<ShieldAlert/>} label="Pendientes de cierre" value={stats.expired} note={stats.expired?'requieren revisión':'sin jornadas vencidas'} emphasis={stats.expired>0}/><Kpi icon={<TimerReset/>} label="Finalizadas" value={stats.finalized} note={`${stats.notStarted} no ejecutada${stats.notStarted===1?'':'s'}`}/><Kpi icon={<Clock3/>} label="Horas de jornada" value={duration(stats.seconds)} note="ventana operativa acumulada"/><Kpi icon={<Route/>} label="Distancia GPS" value={km(stats.distance)} note="estimada por eventos"/><Kpi icon={<AlertTriangle/>} label="Eventualidades" value={stats.incidents} note="registradas en período"/></div>

      {!executive&&filtered.some(r=>r.derived_status==='PENDIENTE_CIERRE')&&<div className="panel journey-alert warning"><ShieldAlert/><div><b>Tienes una jornada de un día anterior pendiente de cierre.</b><span>No puede continuar ejecutándose. Revísala y ciérrala para liberar la operación del día actual.</span></div></div>}

      <section className="panel journey-table-panel"><div className="panel-head"><div><b>{executive?'Jornadas del período':'Historial de mis jornadas'}</b><span>Selecciona una fila para revisar paradas, eventualidades y cierre.</span></div><span>{filtered.length}</span></div><div className="journey-table-wrap"><table className="journey-table"><thead><tr><th>Fecha</th>{executive&&<th>Vendedor</th>}<th>Estado</th><th>Plan</th><th>Visitados</th><th>Cobertura</th><th>Cierre op.</th><th>Horario</th><th>Jornada</th><th></th></tr></thead><tbody>{filtered.map(row=><tr key={row.route_plan_id} className={row.derived_status==='PENDIENTE_CIERRE'?'expired-row':''} onClick={()=>void openDetail(row)}><td><b>{dateLabel(row.route_date)}</b><small>{row.title||'Ruta de visitas'}</small></td>{executive&&<td><b>{row.full_name}</b><small>{row.job_title||row.employee_type}</small></td>}<td><span className={`journey-status ${row.derived_status.toLowerCase()}`}>{statusLabel[row.derived_status]||row.derived_status}</span></td><td>{row.planned_clients}</td><td>{row.visited_clients}</td><td><b>{Number(row.coverage_pct||0)}%</b></td><td>{Number(row.resolution_pct||0)}%</td><td><small>{time(row.started_at)} → {time(row.ended_at)}</small></td><td>{duration(row.route_window_seconds)}</td><td><ChevronRight size={17}/></td></tr>)}</tbody></table>{!filtered.length&&<div className="empty-state"><CalendarDays/><b>No hay jornadas para los filtros seleccionados.</b></div>}</div></section>
    </>}

    {selected&&<div className="modal-wrap"><button className="modal-backdrop" onClick={()=>setSelected(null)}/><div className="modal journey-detail-modal"><div className="modal-head"><div><span className="eyebrow">DETALLE DE JORNADA</span><h3>{selected.full_name} · {dateLabel(selected.route_date)}</h3><p>{statusLabel[selected.derived_status]} · {selected.planned_clients} planificados · {selected.visited_clients} visitados</p></div><button className="icon-btn" onClick={()=>setSelected(null)}>×</button></div><div className="journey-detail-kpis"><Mini label="Cobertura" value={`${selected.coverage_pct}%`}/><Mini label="Cierre operativo" value={`${selected.resolution_pct}%`}/><Mini label="Jornada" value={duration(selected.route_window_seconds)}/><Mini label="Atención" value={duration(selected.visit_seconds)}/><Mini label="Traslado / espera" value={duration(selected.transit_wait_estimated_seconds)}/><Mini label="Distancia GPS" value={km(selected.estimated_distance_m)}/></div>{selected.derived_status==='PENDIENTE_CIERRE'&&<div className="journey-alert warning"><ShieldAlert/><div><b>Esta jornada está vencida y no puede continuar.</b><span>{selected.open_visit_count?`${selected.open_visit_count} visita(s) abierta(s) requieren revisión. `:''}{selected.active_incident_count?`${selected.active_incident_count} eventualidad(es) activa(s) requieren revisión.`:'Puedes cerrar administrativamente las paradas pendientes.'}</span></div></div>}<div className="journey-detail-grid"><div><div className="subhead"><b>Paradas</b><span>{stops.length}</span></div><div className="journey-stop-list">{stops.map((s:any)=><div className="journey-stop" key={s.id}><span>{s.stop_order}</span><div><b>{s.clients?.legal_name||'Parada'}</b><small>{s.clients?.codempr||''} · {s.clients?.client_type||''} · {s.official_municipality_at_plan||'Sin municipio oficial'}</small>{s.reason_not_visited&&<small>{s.reason_not_visited}</small>}</div><strong>{String(s.status).replaceAll('_',' ')}</strong></div>)}</div></div><div><div className="subhead"><b>Eventualidades</b><span>{incidents.length}</span></div><div className="journey-incident-list">{incidents.map((i:any)=><div className="journey-incident" key={i.id}><AlertTriangle size={16}/><div><b>{i.incident_type}</b><small>{time(i.started_at)} → {time(i.ended_at)} · {String(i.impact).replaceAll('_',' ')}</small></div></div>)}{!incidents.length&&<div className="empty-compact">Sin eventualidades registradas.</div>}</div><div className="journey-close-meta"><span>Inicio <b>{time(selected.started_at)}</b></span><span>Fin <b>{time(selected.ended_at)}</b></span><span>Cierre <b>{selected.closure_reason_text||'—'}</b></span></div></div></div><div className="modal-actions">{selected.derived_status==='ACTIVA'&&selected.route_date===localToday()&&<button className="primary" onClick={()=>navigate('/rutas')}><Route size={17}/> Ir a Rutas</button>}{selected.derived_status==='PENDIENTE_CIERRE'&&<button className="danger" disabled={busy||selected.open_visit_count>0||selected.active_incident_count>0} onClick={()=>void closeExpired(selected)}><ShieldAlert size={17}/> {busy?'Cerrando...':'Cerrar jornada vencida'}</button>}<button className="secondary" onClick={()=>setSelected(null)}>Cerrar detalle</button></div></div></div>}
  </div>
}

function Kpi({icon,label,value,note,emphasis=false}:{icon:React.ReactNode;label:string;value:React.ReactNode;note:string;emphasis?:boolean}){return <div className={`panel journey-kpi ${emphasis?'emphasis':''}`}><div className="journey-kpi-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>}
function Mini({label,value}:{label:string;value:string}){return <div className="journey-mini"><span>{label}</span><b>{value}</b></div>}
