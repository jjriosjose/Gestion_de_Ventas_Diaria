import { useEffect,useMemo,useState } from 'react'
import { AlertTriangle,CalendarClock,CheckCircle2,ChevronRight,History,RotateCcw,Route as RouteIcon,ShieldCheck,X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Routes } from './Routes'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { hasPermission } from '../lib/access'
import '../styles/journeys-reporting.css'
import '../styles/stale-journey-guard.css'

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const dateLabel=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('es-DO',{day:'2-digit',month:'long',year:'numeric'})

type ResolutionAction='REVISADA'|'ANULADA'|'REPROGRAMADA'

export function RoutesWorkspace(){
  const {employee}=useAuth()
  const navigate=useNavigate()
  const [openJourney,setOpenJourney]=useState<any|null>(null)
  const [missedJourneys,setMissedJourneys]=useState<any[]>([])
  const [adminMissed,setAdminMissed]=useState<any[]>([])
  const [adminPanelOpen,setAdminPanelOpen]=useState(false)
  const [showResolved,setShowResolved]=useState(false)
  const [resolveTarget,setResolveTarget]=useState<any|null>(null)
  const canExecute=hasPermission(employee,'routes.execute')
  const canResolve=hasPermission(employee,'planning.manage')&&hasPermission(employee,'journeys.manage')

  const loadLifecycle=async()=>{
    if(!employee?.id){setOpenJourney(null);setMissedJourneys([]);setAdminMissed([]);return}
    const empty=Promise.resolve({data:[],error:null}) as any
    const [openResult,missedResult,adminResult]=await Promise.all([
      canExecute?supabase.from('executive_route_journeys_v4').select('route_plan_id,route_session_id,route_date,derived_status,planned_clients,visited_clients,pending_clients,coverage_pct,title,route_mode').eq('employee_id',employee.id).in('derived_status',['ACTIVA','PENDIENTE_CIERRE']).order('route_date',{ascending:false}).limit(1):empty,
      canExecute?supabase.from('executive_route_journeys_v4').select('route_plan_id,employee_id,full_name,route_date,derived_status,planned_clients,title,route_mode').eq('employee_id',employee.id).eq('derived_status','NO_INICIADA').lt('route_date',today()).order('route_date',{ascending:false}).limit(50):empty,
      canResolve?supabase.from('executive_route_journeys_v4').select('route_plan_id,employee_id,full_name,route_date,derived_status,planned_clients,title,route_mode').eq('derived_status','NO_INICIADA').lt('route_date',today()).order('route_date',{ascending:false}).limit(100):empty
    ])
    const allCandidates=[...(missedResult.data||[]),...(adminResult.data||[])]
    const ids=Array.from(new Set(allCandidates.map((row:any)=>row.route_plan_id).filter(Boolean))) as string[]
    const resolutionById=new Map<string,any>()
    if(ids.length){
      const{data:resolutionRows}=await supabase.from('route_plans').select('id,resolution_status,resolution_reason,resolved_at,resolved_by,reprogrammed_route_id').in('id',ids)
      ;(resolutionRows||[]).forEach((row:any)=>resolutionById.set(row.id,row))
    }
    const enrich=(row:any)=>({...row,...(resolutionById.get(row.route_plan_id)||{})})
    setOpenJourney((openResult.data||[])[0]||null)
    setMissedJourneys((missedResult.data||[]).map(enrich).filter((row:any)=>!row.resolution_status))
    setAdminMissed((adminResult.data||[]).map(enrich))
  }

  useEffect(()=>{
    void loadLifecycle()
    const refresh=()=>void loadLifecycle()
    window.addEventListener('focus',refresh)
    document.addEventListener('visibilitychange',refresh)
    return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}
  },[employee?.id,canExecute,canResolve])

  const stale=!!(openJourney?.derived_status==='PENDIENTE_CIERRE'||(openJourney?.route_date&&openJourney.route_date<today()))
  const latestMissed=missedJourneys[0]||null
  const unresolvedAdmin=useMemo(()=>adminMissed.filter(row=>!row.resolution_status),[adminMissed])
  const adminRows=useMemo(()=>showResolved?adminMissed:unresolvedAdmin,[adminMissed,showResolved,unresolvedAdmin])

  return <div className={stale?'routes-stale-journey':''}>
    {openJourney&&<div className={`route-global-journey-banner ${stale?'warning':''}`}>
      <div className="copy">{stale?<AlertTriangle/>:<RouteIcon/>}<div><b>{stale?`Jornada del ${dateLabel(openJourney.route_date)} pendiente de cierre`:'Jornada activa de hoy'}</b><span>{openJourney.visited_clients||0}/{openJourney.planned_clients||0} visitados · {Number(openJourney.coverage_pct||0)}% cobertura{stale?' · No puede continuar en una fecha posterior.':''}</span></div></div>
      {stale?<button className="primary compact" onClick={()=>navigate('/jornadas?status=PENDIENTE_CIERRE')}><CalendarClock size={16}/> Revisar y cerrar <ChevronRight size={15}/></button>:<span className="live-pill"><i/> En ejecución</span>}
    </div>}

    {missedJourneys.length>0&&!canResolve&&<div className="route-global-journey-banner warning">
      <div className="copy"><AlertTriangle/><div><b>{missedJourneys.length} ruta{missedJourneys.length===1?'':'s'} anterior{missedJourneys.length===1?'':'es'} no ejecutada{missedJourneys.length===1?'':'s'}</b><span>{latestMissed?`Última: ${dateLabel(latestMissed.route_date)} · ${latestMissed.planned_clients||0} parada(s). `:''}Estas rutas vencieron sin iniciarse; permanecen en el historial y no pueden ejecutarse fuera de su fecha.</span></div></div>
      <button className="secondary compact" onClick={()=>navigate('/jornadas?status=NO_INICIADA')}><CalendarClock size={16}/> Ver no ejecutadas <ChevronRight size={15}/></button>
    </div>}

    {canResolve&&unresolvedAdmin.length>0&&<div className="route-global-journey-banner warning admin-resolution-banner">
      <div className="copy"><ShieldCheck/><div><b>{unresolvedAdmin.length} ruta{unresolvedAdmin.length===1?'':'s'} no ejecutada{unresolvedAdmin.length===1?'':'s'} requiere{unresolvedAdmin.length===1?'':'n'} resolución administrativa</b><span>Puedes revisarla, anular la planificación o reprogramarla sin borrar el historial original.</span></div></div>
      <button className="primary compact" onClick={()=>setAdminPanelOpen(v=>!v)}><ShieldCheck size={16}/>{adminPanelOpen?'Ocultar gestión':'Gestionar no ejecutadas'}<ChevronRight size={15}/></button>
    </div>}

    {canResolve&&adminPanelOpen&&<section className="panel missed-route-admin-panel">
      <div className="missed-route-admin-head"><div><span className="eyebrow">CONTROL ADMINISTRATIVO</span><h3>Rutas no ejecutadas</h3><p>La resolución no elimina la ruta original ni sus paradas. El estado operacional “No ejecutada” se conserva para auditoría.</p></div><div className="button-row"><button className="secondary compact" onClick={()=>navigate('/jornadas?status=NO_INICIADA')}><History size={15}/> Ver historial</button><button className="secondary compact" onClick={()=>setShowResolved(v=>!v)}>{showResolved?'Solo pendientes':'Incluir resueltas'}</button></div></div>
      <div className="missed-route-admin-list">{adminRows.length?adminRows.map(row=><div className={`missed-route-admin-row ${row.resolution_status?'resolved':''}`} key={row.route_plan_id}>
        <div className="missed-route-date"><b>{new Date(`${row.route_date}T12:00:00`).toLocaleDateString('es-DO',{day:'2-digit',month:'short'})}</b><span>{new Date(`${row.route_date}T12:00:00`).getFullYear()}</span></div>
        <div className="missed-route-copy"><b>{row.full_name||'Vendedor'}</b><span>{row.title||'Ruta de visitas'} · {row.planned_clients||0} parada(s)</span>{row.resolution_status&&<small>{resolutionLabel(row.resolution_status)}{row.resolution_reason?` · ${row.resolution_reason}`:''}</small>}</div>
        <div className="missed-route-actions">{row.resolution_status?<span className={`resolution-pill ${String(row.resolution_status).toLowerCase()}`}><CheckCircle2 size={14}/>{resolutionLabel(row.resolution_status)}</span>:<button className="primary compact" onClick={()=>setResolveTarget(row)}><ShieldCheck size={15}/> Resolver</button>}</div>
      </div>):<div className="empty-state"><CheckCircle2/><b>No quedan rutas no ejecutadas pendientes de resolución.</b></div>}</div>
    </section>}

    <Routes/>
    {resolveTarget&&<RouteResolutionModal route={resolveTarget} onClose={()=>setResolveTarget(null)} onSaved={async()=>{setResolveTarget(null);await loadLifecycle()}}/>}
  </div>
}

function resolutionLabel(value:string){
  if(value==='REVISADA')return 'Revisada'
  if(value==='ANULADA')return 'Anulada'
  if(value==='REPROGRAMADA')return 'Reprogramada'
  return value
}

function RouteResolutionModal({route,onClose,onSaved}:{route:any;onClose:()=>void;onSaved:()=>void|Promise<void>}){
  const[action,setAction]=useState<ResolutionAction>('REVISADA')
  const[reason,setReason]=useState('')
  const[newDate,setNewDate]=useState(today())
  const[busy,setBusy]=useState(false)
  const save=async()=>{
    if(!reason.trim())return alert('Indica el motivo de la resolución administrativa.')
    if(action==='REPROGRAMADA'&&!newDate)return alert('Indica la nueva fecha de la ruta.')
    setBusy(true)
    try{
      const{data,error}=await supabase.rpc('resolve_unstarted_route_plan',{p_plan_id:route.route_plan_id,p_action:action,p_reason:reason.trim(),p_new_date:action==='REPROGRAMADA'?newDate:null})
      if(error)throw error
      const message=action==='REPROGRAMADA'?`Ruta reprogramada para ${dateLabel(newDate)}. La planificación original permanece en el historial.`:action==='ANULADA'?'Planificación anulada administrativamente. La ruta original permanece en el historial.':'Ruta marcada como revisada. El historial operacional permanece intacto.'
      alert(message)
      await onSaved()
      return data
    }catch(e){alert(e instanceof Error?e.message:'No se pudo resolver la ruta')}
    finally{setBusy(false)}
  }
  return <div className="modal-wrap"><button className="modal-backdrop" disabled={busy} onClick={busy?undefined:onClose}/><div className="modal route-resolution-modal"><div className="modal-head"><div><span className="eyebrow">RESOLUCIÓN ADMINISTRATIVA</span><h3>{route.full_name||'Ruta no ejecutada'}</h3><p>{dateLabel(route.route_date)} · {route.planned_clients||0} parada(s) · Nunca fue iniciada.</p></div><button className="icon-btn" disabled={busy} onClick={onClose}><X/></button></div>
    <div className="resolution-history-note"><History size={18}/><div><b>No se eliminará el historial.</b><span>La ruta original y sus paradas seguirán registradas como no ejecutadas. Esta acción solo documenta la decisión administrativa.</span></div></div>
    <div className="form-grid"><label className="span-2">Decisión<select value={action} onChange={e=>setAction(e.target.value as ResolutionAction)}><option value="REVISADA">Dar por revisada</option><option value="ANULADA">Anular planificación</option><option value="REPROGRAMADA">Reprogramar ruta</option></select><small>{action==='REVISADA'?'Reconoce que la ruta no fue ejecutada y la retira de pendientes administrativos.':action==='ANULADA'?'Registra que la planificación quedó anulada sin borrar sus datos.':'Creará una nueva ruta con las mismas paradas y conservará la original como no ejecutada.'}</small></label>{action==='REPROGRAMADA'&&<label className="span-2">Nueva fecha<input type="date" min={today()} value={newDate} onChange={e=>setNewDate(e.target.value)}/></label>}<label className="span-2">Motivo / observación<textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ej.: ruta creada por error, cambio de fecha autorizado, vendedor ausente..."/></label></div>
    <div className="modal-actions"><button className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={()=>void save()}>{action==='REPROGRAMADA'?<RotateCcw size={17}/>:<ShieldCheck size={17}/>} {busy?'Guardando...':action==='REVISADA'?'Confirmar revisión':action==='ANULADA'?'Confirmar anulación':'Crear reprogramación'}</button></div>
  </div></div>
}