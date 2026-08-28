import { useEffect,useState } from 'react'
import { AlertTriangle,CalendarClock,ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Visits } from './Visits'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import '../styles/stale-journey-guard.css'

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const dateLabel=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('es-DO',{day:'2-digit',month:'long',year:'numeric'})

export function VisitsWorkspace(){
  const {employee}=useAuth();const navigate=useNavigate();const [stale,setStale]=useState<any|null>(null)
  const load=async()=>{
    if(!employee?.id)return setStale(null)
    const {data}=await supabase.from('visits').select('id,route_session_id,started_at,route_sessions(session_date,status,ended_at)').eq('employee_id',employee.id).is('ended_at',null).order('started_at',{ascending:true}).limit(1)
    const row:any=(data||[])[0]||null;const session:any=Array.isArray(row?.route_sessions)?row.route_sessions[0]:row?.route_sessions
    if(row?.route_session_id&&session?.session_date&&session.session_date<today()&&!session.ended_at)setStale({visit:row,session})
    else setStale(null)
  }
  useEffect(()=>{void load()},[employee?.id])
  return <div className={stale?'visits-stale-journey':''}>
    {stale&&<div className="stale-visit-banner"><div className="copy"><AlertTriangle/><div><b>Visita abierta dentro de una jornada vencida</b><span>La jornada corresponde al {dateLabel(stale.session.session_date)}. No puede finalizarse como actividad de hoy ni continuar operativamente.</span></div></div><button className="primary compact" onClick={()=>navigate('/jornadas')}><CalendarClock size={16}/> Revisar jornada <ChevronRight size={15}/></button></div>}
    <Visits/>
  </div>
}
