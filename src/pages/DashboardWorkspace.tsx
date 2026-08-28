import { useEffect,useMemo,useState } from 'react'
import { AlertTriangle,CalendarRange,CheckCircle2,ChevronRight,Route } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Dashboard } from './Dashboard'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { hasPermission,profileForEmployee } from '../lib/access'
import '../styles/journeys-reporting.css'

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const pct=(a:number,b:number)=>b?Math.round((a/b)*1000)/10:0

export function DashboardWorkspace(){
  const {employee}=useAuth();const navigate=useNavigate();const [rows,setRows]=useState<any[]>([])
  const canView=hasPermission(employee,'journeys.view');const executive=['Administrador','Supervisor'].includes(profileForEmployee(employee))
  const load=async()=>{
    if(!employee?.id||!canView)return setRows([])
    let q=supabase.from('executive_route_journeys').select('route_plan_id,employee_id,route_date,derived_status,planned_clients,visited_clients,resolved_clients,coverage_pct').lte('route_date',today()).gte('route_date',today())
    if(!executive)q=q.eq('employee_id',employee.id)
    const current=await q
    let staleQ=supabase.from('executive_route_journeys').select('route_plan_id,employee_id,route_date,derived_status,planned_clients,visited_clients,resolved_clients,coverage_pct').eq('derived_status','PENDIENTE_CIERRE')
    if(!executive)staleQ=staleQ.eq('employee_id',employee.id)
    const stale=await staleQ
    const unique=new Map<string,any>();[...(current.data||[]),...(stale.data||[])].forEach(r=>unique.set(r.route_plan_id,r));setRows([...unique.values()])
  }
  useEffect(()=>{void load()},[employee?.id,canView,executive])
  const stats=useMemo(()=>{const todayRows=rows.filter(r=>r.route_date===today());const planned=todayRows.reduce((s,r)=>s+Number(r.planned_clients||0),0);const visited=todayRows.reduce((s,r)=>s+Number(r.visited_clients||0),0);return {active:todayRows.filter(r=>r.derived_status==='ACTIVA').length,finalized:todayRows.filter(r=>['FINALIZADA','FINALIZADA_PARCIAL'].includes(r.derived_status)).length,expired:rows.filter(r=>r.derived_status==='PENDIENTE_CIERRE').length,coverage:pct(visited,planned)}} , [rows])
  return <div className="dashboard-workspace">
    {canView&&<section className={`panel dashboard-journey-strip ${stats.expired?'has-warning':''}`}><div className="dashboard-journey-title"><CalendarRange/><div><span className="eyebrow">JORNADAS</span><b>{executive?'Control operativo de hoy':'Mi estado operativo'}</b></div></div><div className="dashboard-journey-metrics"><span><Route/> <b>{stats.active}</b> activas hoy</span><span><CheckCircle2/> <b>{stats.finalized}</b> finalizadas hoy</span><span className={stats.expired?'warn':''}><AlertTriangle/> <b>{stats.expired}</b> pendientes cierre</span><span><b>{stats.coverage}%</b> cobertura hoy</span></div><button className="secondary compact" onClick={()=>navigate('/jornadas')}>Ver Jornadas <ChevronRight size={15}/></button></section>}
    <Dashboard/>
  </div>
}
