import { useEffect,useState } from 'react'
import { AlertTriangle,CalendarClock,ChevronRight,Route as RouteIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Routes } from './Routes'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { hasPermission } from '../lib/access'
import '../styles/journeys-reporting.css'
import '../styles/stale-journey-guard.css'

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const dateLabel=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('es-DO',{day:'2-digit',month:'long',year:'numeric'})

export function RoutesWorkspace(){
  const {employee}=useAuth();const navigate=useNavigate();const [openJourney,setOpenJourney]=useState<any|null>(null);const [missedJourneys,setMissedJourneys]=useState<any[]>([])
  const canExecute=hasPermission(employee,'routes.execute')
  const loadLifecycle=async()=>{
    if(!employee?.id||!canExecute){setOpenJourney(null);setMissedJourneys([]);return}
    const [openResult,missedResult]=await Promise.all([
      supabase.from('executive_route_journeys_v4').select('route_plan_id,route_session_id,route_date,derived_status,planned_clients,visited_clients,pending_clients,coverage_pct,title,route_mode').eq('employee_id',employee.id).in('derived_status',['ACTIVA','PENDIENTE_CIERRE']).order('route_date',{ascending:false}).limit(1),
      supabase.from('executive_route_journeys_v4').select('route_plan_id,route_date,derived_status,planned_clients,title,route_mode').eq('employee_id',employee.id).eq('derived_status','NO_INICIADA').lt('route_date',today()).order('route_date',{ascending:false}).limit(20)
    ])
    setOpenJourney((openResult.data||[])[0]||null)
    setMissedJourneys(missedResult.data||[])
  }
  useEffect(()=>{
    void loadLifecycle()
    const refresh=()=>void loadLifecycle()
    window.addEventListener('focus',refresh)
    document.addEventListener('visibilitychange',refresh)
    return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}
  },[employee?.id,canExecute])
  const stale=!!(openJourney?.derived_status==='PENDIENTE_CIERRE'||(openJourney?.route_date&&openJourney.route_date<today()))
  const latestMissed=missedJourneys[0]||null
  return <div className={stale?'routes-stale-journey':''}>
    {openJourney&&<div className={`route-global-journey-banner ${stale?'warning':''}`}>
      <div className="copy">{stale?<AlertTriangle/>:<RouteIcon/>}<div><b>{stale?`Jornada del ${dateLabel(openJourney.route_date)} pendiente de cierre`:'Jornada activa de hoy'}</b><span>{openJourney.visited_clients||0}/{openJourney.planned_clients||0} visitados · {Number(openJourney.coverage_pct||0)}% cobertura{stale?' · No puede continuar en una fecha posterior.':''}</span></div></div>
      {stale?<button className="primary compact" onClick={()=>navigate('/jornadas?status=PENDIENTE_CIERRE')}><CalendarClock size={16}/> Revisar y cerrar <ChevronRight size={15}/></button>:<span className="live-pill"><i/> En ejecución</span>}
    </div>}
    {missedJourneys.length>0&&<div className="route-global-journey-banner warning">
      <div className="copy"><AlertTriangle/><div><b>{missedJourneys.length} ruta{missedJourneys.length===1?'':'s'} anterior{missedJourneys.length===1?'':'es'} no ejecutada{missedJourneys.length===1?'':'s'}</b><span>{latestMissed?`Última: ${dateLabel(latestMissed.route_date)} · ${latestMissed.planned_clients||0} parada(s). `:''}Estas rutas vencieron sin iniciarse; permanecen en el historial y no pueden ejecutarse fuera de su fecha.</span></div></div>
      <button className="secondary compact" onClick={()=>navigate('/jornadas?status=NO_INICIADA')}><CalendarClock size={16}/> Ver no ejecutadas <ChevronRight size={15}/></button>
    </div>}
    <Routes/>
  </div>
}