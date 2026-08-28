import { useEffect,useState } from 'react'
import { AlertTriangle,BriefcaseBusiness,MapPinned,ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Journeys } from './Journeys'
import { CrmOperations } from './CrmOperations'
import { useAuth } from '../context/AuthContext'
import { profileForEmployee } from '../lib/access'
import { supabase } from '../lib/supabase'
import '../styles/journey-recovery.css'
import '../styles/product-system.css'

const dateLabel=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('es-DO',{day:'2-digit',month:'long',year:'numeric'})

export function JourneysWorkspace(){
  const {employee}=useAuth();const profile=profileForEmployee(employee);const executive=['Administrador','Supervisor'].includes(profile);const manager=profile==='Gestor';const [params,setParams]=useSearchParams();const requested=params.get('tab');const initial: 'street'|'crm'=manager?'crm':requested==='crm'&&executive?'crm':'street';const [tab,setTab]=useState<'street'|'crm'>(initial);const [unsafe,setUnsafe]=useState<any[]>([]);const [busy,setBusy]=useState('');const [revision,setRevision]=useState(0)
  const switchTab=(next:'street'|'crm')=>{setTab(next);const p=new URLSearchParams(params);p.set('tab',next);p.delete('journey');setParams(p,{replace:true})}
  const load=async()=>{
    if(!executive)return setUnsafe([])
    const {data}=await supabase.from('executive_route_journeys_v2').select('route_plan_id,route_session_id,employee_id,full_name,route_date,planned_clients,visited_clients,coverage_pct,open_visit_count,active_incident_count').eq('derived_status','PENDIENTE_CIERRE').order('route_date',{ascending:true})
    setUnsafe((data||[]).filter((r:any)=>Number(r.open_visit_count||0)>0||Number(r.active_incident_count||0)>0))
  }
  useEffect(()=>{void load()},[executive,revision])
  const regularize=async(row:any)=>{if(!row.route_session_id)return;if(!window.confirm(`Regularizar administrativamente la jornada de ${row.full_name} del ${dateLabel(row.route_date)}? Las actividades abiertas se cerrarán al límite del día y las paradas incompletas NO contarán como visitadas.`))return;setBusy(row.route_session_id);const{error}=await supabase.rpc('resolve_expired_route_session',{p_route_session_id:row.route_session_id,p_notes:'Regularización administrativa desde Control Operativo'});setBusy('');if(error)return alert(error.message);alert('Jornada regularizada y cerrada con trazabilidad administrativa.');setRevision(v=>v+1)}
  return <div className="page-stack operational-control-shell">
    {executive&&<div className="operation-tabs" role="tablist" aria-label="Tipo de operación"><button className={tab==='street'?'active':''} onClick={()=>switchTab('street')}><MapPinned/> Calle</button><button className={tab==='crm'?'active':''} onClick={()=>switchTab('crm')}><BriefcaseBusiness/> CRM / Showroom</button></div>}
    {tab==='street'&&<>{executive&&unsafe.length>0&&<section className="panel journey-recovery-panel"><div className="journey-recovery-head"><div><span className="eyebrow">REQUIERE INTERVENCIÓN</span><b>Jornadas vencidas con actividad abierta</b><small>No pueden continuar. La regularización cierra técnicamente al límite del día y conserva la parada como no visitada.</small></div><span>{unsafe.length}</span></div><div className="journey-recovery-list">{unsafe.map(row=><div className="journey-recovery-item" key={row.route_plan_id}><AlertTriangle/><div><b>{row.full_name}</b><span>{dateLabel(row.route_date)} · {row.visited_clients}/{row.planned_clients} visitados · {Number(row.coverage_pct||0)}% cobertura</span><small>{row.open_visit_count?`${row.open_visit_count} visita(s) abierta(s)`:''}{row.open_visit_count&&row.active_incident_count?' · ':''}{row.active_incident_count?`${row.active_incident_count} eventualidad(es) activa(s)`:''}</small></div><button className="primary compact" disabled={busy===row.route_session_id} onClick={()=>void regularize(row)}><ShieldCheck size={15}/>{busy===row.route_session_id?'Regularizando...':'Regularizar y cerrar'}</button></div>)}</div></section>}<Journeys key={revision}/></>}
    {tab==='crm'&&<CrmOperations/>}
  </div>
}
