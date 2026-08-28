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
  const {employee}=useAuth();const navigate=useNavigate();const [openJourney,setOpenJourney]=useState<any|null>(null)
  const canExecute=hasPermission(employee,'routes.execute')
  const loadOpen=async()=>{
    if(!employee?.id||!canExecute)return setOpenJourney(null)
    const {data}=await supabase.from('executive_route_journeys').select('route_plan_id,route_session_id,route_date,derived_status,planned_clients,visited_clients,pending_clients,coverage_pct,title').eq('employee_id',employee.id).in('derived_status',['ACTIVA','PENDIENTE_CIERRE']).order('route_date',{ascending:false}).limit(1)
    setOpenJourney((data||[])[0]||null)
  }
  useEffect(()=>{void loadOpen();const id=window.setInterval(()=>void loadOpen(),30000);return()=>window.clearInterval(id)},[employee?.id,canExecute])
  const stale=!!(openJourney?.derived_status==='PENDIENTE_CIERRE'||(openJourney?.route_date&&openJourney.route_date<today()))
  return <div className={stale?'routes-stale-journey':''}>
    {openJourney&&<div className={`route-global-journey-banner ${stale?'warning':''}`}>
      <div className="copy">{stale?<AlertTriangle/>:<RouteIcon/>}<div><b>{stale?`Jornada del ${dateLabel(openJourney.route_date)} pendiente de cierre`:'Jornada activa de hoy'}</b><span>{openJourney.visited_clients||0}/{openJourney.planned_clients||0} visitados · {Number(openJourney.coverage_pct||0)}% cobertura{stale?' · No puede continuar en una fecha posterior.':''}</span></div></div>
      {stale?<button className="primary compact" onClick={()=>navigate('/jornadas')}><CalendarClock size={16}/> Revisar y cerrar <ChevronRight size={15}/></button>:<span className="live-pill"><i/> En ejecución</span>}
    </div>}
    <Routes/>
  </div>
}
