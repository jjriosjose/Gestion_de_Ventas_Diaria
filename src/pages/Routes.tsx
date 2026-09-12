import { useEffect,useMemo,useRef,useState } from 'react'
import { AlertTriangle,Ban,Camera,CheckCircle2,MapPin,Navigation,Play,Plus,RefreshCw,Route as RouteIcon,Square,Trash2,Upload,X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { currentPosition,googleMapsNavigation } from '../lib/geo'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../lib/access'
import { RouteSequenceMap } from '../components/RouteSequenceMap'
import { AdditionalVisitModal } from '../components/AdditionalVisitModal'
import { ClientTypeFilter } from '../components/ClientTypeFilter'
import type { ClientTypeFilterValue } from '../components/ClientTypeFilter'
import type { Employee } from '../types'
import { exportPdf,exportXlsx } from '../lib/export'
import '../styles/operational-v059.css'
import '../styles/executive-v060.css'
import '../styles/v064.css'
import '../styles/open-field-journeys.css'

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const localDateTime=(d=new Date())=>{const pad=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
const durationLabel=(start:string,end?:string|null)=>{const e=end?new Date(end):new Date();const min=Math.max(0,Math.round((e.getTime()-new Date(start).getTime())/60000));return min<60?`${min} min`:`${Math.floor(min/60)} h ${min%60} min`}
const terminalStopStatuses=['VISITADO','NO_VISITADO','REPROGRAMADO','CANCELADO']

export function Routes(){
  const {employee}=useAuth()
  const navigate=useNavigate()
  const admin=hasPermission(employee,'planning.manage')
  const isManager=employee?.employee_type==='Gestor'
  const isSeller=employee?.employee_type==='Vendedor'
  const [routeDate,setRouteDate]=useState(today())
  const [clientType,setClientType]=useState<ClientTypeFilterValue>('')
  const [plans,setPlans]=useState<any[]>([])
  const [employees,setEmployees]=useState<Employee[]>([])
  const [managerCounts,setManagerCounts]=useState<Record<string,number>>({})
  const [selected,setSelected]=useState<any|null>(null)
  const [selectedStopId,setSelectedStopId]=useState<string|null>(null)
  const [stops,setStops]=useState<any[]>([])
  const [session,setSession]=useState<any|null>(null)
  const [sessionVisits,setSessionVisits]=useState<any[]>([])
  const [activeSellerSession,setActiveSellerSession]=useState<any|null>(null)
  const [incidents,setIncidents]=useState<any[]>([])
  const [openVisit,setOpenVisit]=useState<any|null>(null)
  const [busy,setBusy]=useState(false)
  const [exceptionStop,setExceptionStop]=useState<any|null>(null)
  const [incidentOpen,setIncidentOpen]=useState(false)
  const [closureOpen,setClosureOpen]=useState(false)
  const [additionalOpen,setAdditionalOpen]=useState(false)

  const load=async()=>{
    const [{data:planData,error:planError},{data:employeeData,error:employeeError}]=await Promise.all([
      supabase.from('route_plans').select('*').in('plan_type',['VISITAS','MIXTA']).eq('route_date',routeDate).order('created_at',{ascending:false}).limit(150),
      supabase.from('employees').select('*').eq('active',true).order('full_name')
    ])
    if(planError||employeeError)return alert((planError||employeeError)?.message)
    let scoped=planData||[]
    const counts:Record<string,number>={}
    if(isSeller&&employee?.id)scoped=scoped.filter(p=>p.employee_id===employee.id)
    if(isManager&&employee?.id&&scoped.length){
      const ids=scoped.map(p=>p.id)
      const{data:scopeStops,error}=await supabase.from('route_stops').select('route_plan_id,clients(manager_employee_id,client_type)').in('route_plan_id',ids)
      if(error)return alert(error.message)
      ;(scopeStops||[]).forEach((row:any)=>{if(row.clients?.manager_employee_id===employee.id&&(!clientType||row.clients?.client_type===clientType))counts[row.route_plan_id]=(counts[row.route_plan_id]||0)+1})
      scoped=scoped.filter(p=>(counts[p.id]||0)>0)
    }
    setPlans(scoped)
    setManagerCounts(counts)
    setEmployees((employeeData||[]) as Employee[])
    if(selected&&!scoped.some(p=>p.id===selected.id)){setSelected(null);setStops([]);setSession(null);setSessionVisits([]);setIncidents([])}

    let sellerActive:any=null
    if(employee?.id){
      const [{data:openRows},{data:activeRows}]=await Promise.all([
        supabase.from('visits').select('id,route_session_id,route_stop_id,client_id,planned,started_at,clients(legal_name)').eq('employee_id',employee.id).is('ended_at',null).order('started_at').limit(1),
        isSeller?supabase.from('route_sessions').select('*,route_plans(*)').eq('employee_id',employee.id).eq('status','ACTIVA').is('ended_at',null).order('started_at',{ascending:false}).limit(1):Promise.resolve({data:[],error:null}) as any
      ])
      setOpenVisit((openRows||[])[0]||null)
      sellerActive=(activeRows||[])[0]||null
      setActiveSellerSession(sellerActive)
    }else{setOpenVisit(null);setActiveSellerSession(null)}

    if(selected&&scoped.some(p=>p.id===selected.id)){
      const [{data:stopData},{data:sessionRows}]=await Promise.all([
        supabase.from('route_stops').select('*,clients(id,codempr,legal_name,client_type,latitude,longitude,municipality,phone1,manager_employee_id)').eq('route_plan_id',selected.id).order('stop_order'),
        supabase.from('route_sessions').select('*').eq('route_plan_id',selected.id).order('started_at',{ascending:false}).limit(1)
      ])
      setStops(stopData||[])
      const latestSession=(sessionRows||[])[0]||null
      setSession(latestSession)
      if(latestSession){
        const [{data:incidentRows},{data:visitRows}]=await Promise.all([
          supabase.from('operational_incidents').select('*').eq('route_session_id',latestSession.id).neq('status','CANCELADA').order('started_at',{ascending:false}),
          supabase.from('visits').select('id,route_session_id,route_stop_id,client_id,planned,started_at,ended_at,result,purchase_result,clients(id,codempr,legal_name,client_type,municipality,latitude,longitude)').eq('route_session_id',latestSession.id).order('started_at',{ascending:true})
        ])
        setIncidents(incidentRows||[])
        setSessionVisits(visitRows||[])
      }else{setIncidents([]);setSessionVisits([])}
    }else if(!selected){setStops([]);setSession(null);setSessionVisits([]);setIncidents([])}

    if(isSeller&&!selected&&routeDate===today()){
      const focusPlan=sellerActive?.route_plan_id?scoped.find(p=>p.id===sellerActive.route_plan_id):scoped.find(p=>p.route_mode==='LIBRE')
      if(focusPlan)setSelected(focusPlan)
    }
  }
  useEffect(()=>{void load()},[selected?.id,employee?.id,routeDate,clientType])
  useEffect(()=>{setSelectedStopId(null)},[selected?.id,clientType])

  const empName=(id?:string|null)=>employees.find(e=>e.id===id)?.full_name||'—'
  const mine=selected?.employee_id===employee?.id
  const managerScopedStops=useMemo(()=>isManager&&employee?.id?stops.filter(s=>s.clients?.manager_employee_id===employee.id):stops,[stops,isManager,employee?.id])
  const displayStops=useMemo(()=>clientType?managerScopedStops.filter(s=>s.clients?.client_type===clientType):managerScopedStops,[managerScopedStops,clientType])
  const activeSession=session&&!session.ended_at&&session.status==='ACTIVA'?session:null
  const activeIncident=incidents.find(i=>i.status==='ACTIVA')||null
  const seriousIncident=incidents.find(i=>i.status==='FINALIZADA'&&['SUSPENDE_RUTA','FINALIZA_JORNADA'].includes(i.impact))||null
  const additionalVisits=useMemo(()=>sessionVisits.filter(v=>v.planned===false),[sessionVisits])
  const additionalCompleted=additionalVisits.filter(v=>!!v.ended_at).length
  const additionalInVisit=additionalVisits.filter(v=>!v.ended_at).length
  const plannedTodayAvailable=isSeller&&plans.some(p=>p.route_mode!=='LIBRE'&&p.route_date===today()&&['PLANIFICADA','ACTIVA'].includes(p.status))
  const freeJourneyToday=isSeller?plans.find(p=>p.route_mode==='LIBRE'&&p.route_date===today())||null:null
  const freeJourneyClosedToday=Boolean(freeJourneyToday&&freeJourneyToday.status==='FINALIZADA')
  const canStartOpenJourney=Boolean(isSeller&&routeDate===today()&&!activeSellerSession&&!plannedTodayAvailable&&!freeJourneyToday)

  const start=async()=>{
    if(!selected||!mine||!employee)return
    setBusy(true)
    try{
      if(selected.status!=='PLANIFICADA')throw new Error('Esta ruta ya no está disponible para iniciar. Actualiza la vista para consultar su estado actual.')
      if(selected.route_date!==today())throw new Error(`Esta ruta está planificada para ${selected.route_date}. Hoy es ${today()}. Solo puede iniciarse en su fecha programada.`)
      const{data:active}=await supabase.from('route_sessions').select('id').eq('employee_id',employee.id).is('ended_at',null).limit(1)
      if((active||[]).length)throw new Error('Ya tienes una jornada activa. Finalízala antes de iniciar otra ruta.')
      const p=await currentPosition()
      const{data,error}=await supabase.from('route_sessions').insert({route_plan_id:selected.id,employee_id:employee.id,session_date:selected.route_date,session_type:selected.plan_type,status:'ACTIVA',start_latitude:p.latitude,start_longitude:p.longitude,start_accuracy_m:p.accuracy}).select().single()
      if(error)throw error
      const{error:planError}=await supabase.from('route_plans').update({status:'ACTIVA'}).eq('id',selected.id).eq('status','PLANIFICADA')
      if(planError)throw planError
      setSession(data)
      setSelected({...selected,status:'ACTIVA'})
    }catch(e){alert(e instanceof Error?e.message:'Error al iniciar la ruta')}
    finally{setBusy(false);void load()}
  }

  const startOpenJourney=async()=>{
    if(!isSeller||!employee||!canStartOpenJourney)return
    setBusy(true)
    try{
      const p=await currentPosition()
      const{data,error}=await supabase.rpc('start_open_journey',{p_start_latitude:p.latitude,p_start_longitude:p.longitude,p_start_accuracy_m:p.accuracy})
      if(error)throw error
      setSelected({id:data?.route_plan_id,employee_id:employee.id,route_date:data?.route_date||today(),plan_type:'VISITAS',title:data?.title||'Jornada libre',status:'ACTIVA',route_mode:'LIBRE'})
      alert('Jornada libre iniciada. Ya puedes registrar tu primera visita.')
    }catch(e){alert(e instanceof Error?e.message:'No se pudo iniciar la jornada libre')}
    finally{setBusy(false);void load()}
  }

  const finishIncident=async()=>{
    if(!activeIncident||!mine||!activeSession)return
    setBusy(true)
    try{
      let p:any=null
      try{p=await currentPosition()}catch{}
      const patch:any={ended_at:new Date().toISOString(),status:'FINALIZADA'}
      if(p){patch.latitude=p.latitude;patch.longitude=p.longitude;patch.accuracy_m=p.accuracy}
      const{error}=await supabase.from('operational_incidents').update(patch).eq('id',activeIncident.id)
      if(error)throw error
    }catch(e){alert(e instanceof Error?e.message:'No se pudo finalizar la eventualidad')}
    finally{setBusy(false);void load()}
  }

  const removePlan=async()=>{
    if(!selected||!admin)return
    if(!window.confirm('Esta planificación nunca iniciada y todas sus paradas serán eliminadas. ¿Continuar?'))return
    setBusy(true)
    const{error}=await supabase.rpc('delete_unstarted_route_plan',{p_plan_id:selected.id})
    setBusy(false)
    if(error)return alert(error.message)
    setSelected(null);setStops([]);setSession(null);setSessionVisits([]);await load()
  }

  const startVisit=async(stop:any)=>{
    if(!activeSession||!mine||!employee)return alert('Debes iniciar la ruta primero')
    if(activeIncident)return alert('Finaliza la eventualidad activa antes de registrar una visita.')
    if(openVisit)return alert(`Ya tienes una visita abierta${openVisit.clients?.legal_name?` en ${openVisit.clients.legal_name}`:''}. Finalízala antes de otra llegada.`)
    setBusy(true)
    try{
      const p=await currentPosition()
      const{data,error}=await supabase.from('visits').insert({route_session_id:activeSession.id,route_stop_id:stop.id,client_id:stop.client_id,employee_id:employee.id,visit_kind:'CLIENTE',planned:true,started_at:new Date().toISOString(),start_latitude:p.latitude,start_longitude:p.longitude,start_accuracy_m:p.accuracy}).select().single()
      if(error)throw error
      const{error:stopError}=await supabase.from('route_stops').update({status:'EN_VISITA',visit_id:data.id}).eq('id',stop.id)
      if(stopError)throw stopError
      setOpenVisit({...data,clients:{legal_name:stop.clients?.legal_name}})
      setSelectedStopId(stop.id)
      alert('Llegada registrada. Finaliza la visita antes de iniciar otra.')
    }catch(e){alert(e instanceof Error?e.message:'Error al registrar la llegada')}
    finally{setBusy(false);void load()}
  }

  const plannedReport=displayStops.map(s=>({Origen:'PLANIFICADA',Orden:s.stop_order,Tipo:s.clients?.client_type||'',Cliente:s.clients?.legal_name||'',Codigo:s.clients?.codempr||'',Gestor:empName(s.clients?.manager_employee_id),Municipio:s.clients?.municipality||'',Prioridad:s.priority,Estado:s.status,Motivo:s.reason_not_visited||''}))
  const additionalReport=additionalVisits.map((v,index)=>({Origen:selected?.route_mode==='LIBRE'?'JORNADA_LIBRE':'ADICIONAL',Orden:index+1,Tipo:v.clients?.client_type||'',Cliente:v.clients?.legal_name||'',Codigo:v.clients?.codempr||'',Gestor:'',Municipio:v.clients?.municipality||'',Prioridad:'',Estado:v.ended_at?'VISITADO':'EN_VISITA',Motivo:''}))
  const report=[...plannedReport,...additionalReport]

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">PLAN VS EJECUCIÓN</span><h2>{isManager?'Mis clientes en ruta':'Rutas asignadas'}</h2><p>{isManager?'Consulta diariamente cuáles de tus clientes están programados, qué vendedor los visita y el avance de cada parada.':'Mapa, secuencia, ejecución y eventualidades de la jornada en calle.'}</p></div><div className="button-row"><ClientTypeFilter value={clientType} onChange={setClientType}/><label className="inline-date">Fecha<input type="date" value={routeDate} onChange={e=>{setRouteDate(e.target.value);setSelected(null)}}/></label><button className="secondary" onClick={()=>void load()}><RefreshCw size={17}/> Actualizar</button></div></div>
    {freeJourneyClosedToday&&routeDate===today()&&<div className="open-journey-banner"><div className="copy"><div className="icon"><CheckCircle2 size={21}/></div><div><b>Jornada del día finalizada</b><span>La Jornada Libre de hoy ya fue cerrada. Sus tiempos y visitas quedaron congelados y no puede iniciarse otra Jornada Libre hasta el próximo día.</span></div></div></div>}
    {canStartOpenJourney&&<div className="open-journey-banner"><div className="copy"><div className="icon"><RouteIcon size={21}/></div><div><b>No tienes una ruta planificada activa para hoy</b><span>Puedes iniciar una Jornada Libre y registrar clientes a medida que avances. Cada visita medirá llegada, tiempo de atención y salida sin crear cobertura planificada artificial.</span></div></div><button className="primary" disabled={busy} onClick={()=>void startOpenJourney()}><Play size={17}/>{busy?'Iniciando...':'Iniciar jornada libre'}</button></div>}
    {clientType&&<div className="route-manager-note"><b>Filtro visual {clientType}:</b> solo cambia las paradas mostradas. El control de pendientes y cierre de la ruta siempre considera la planificación completa.</div>}
    {isManager&&<div className="route-manager-note"><b>Visibilidad bidireccional:</b> aquí solo aparecen rutas que contienen clientes asignados a tu gestión. Al abrir una ruta verás tus clientes y el vendedor responsable.</div>}
    <div className="route-workspace">
      <div className="panel route-list">{plans.length?plans.map(plan=><button key={plan.id} className={`route-card ${selected?.id===plan.id?'selected':''}`} onClick={()=>setSelected(plan)}><div><b>{plan.route_mode==='LIBRE'?'Jornada libre':empName(plan.employee_id)}</b><span>{plan.route_date} · {isManager?`${managerCounts[plan.id]||0} de mis clientes${clientType?` ${clientType}`:''}`:plan.route_mode==='LIBRE'?'Visitas abiertas':'Visitas planificadas'}</span></div><span className={`status ${plan.status?.toLowerCase()}`}>{plan.status}</span></button>):<div className="empty-state"><b>{isManager?'No tienes clientes programados en rutas para esta fecha/filtro.':'No hay rutas para esta fecha.'}</b>{canStartOpenJourney&&<span>Puedes iniciar una jornada libre desde el aviso superior.</span>}</div>}</div>
      <div className="panel route-detail route-detail-compact">{!selected?<div className="empty-state"><MapPin/><b>Selecciona una ruta para ver mapa y secuencia</b></div>:<>
        <div className="route-detail-head"><div><div className={`route-mode-pill ${selected.route_mode==='LIBRE'?'open':'planned'}`}>{selected.route_mode==='LIBRE'?'Jornada libre':'Ruta planificada'}</div><b>{empName(selected.employee_id)}</b><span>{selected.route_date} · {selected.title}</span><span>{selected.route_mode==='LIBRE'?`${additionalCompleted} visita(s) finalizada(s)${additionalInVisit?` · ${additionalInVisit} en curso`:''}`:`${displayStops.length} paradas planificadas visibles · ${additionalCompleted} visita(s) adicional(es) finalizada(s)${additionalInVisit?` · ${additionalInVisit} en curso`:''}`}</span></div><div className="button-row"><button className="secondary compact" onClick={()=>void exportXlsx(`Ruta_${selected.route_date}`,report)}>Excel</button><button className="secondary compact" onClick={()=>exportPdf(`Ruta ${selected.route_date}`,report)}>PDF</button>{admin&&selected.status==='PLANIFICADA'&&selected.route_mode!=='LIBRE'&&<button className="danger compact" disabled={busy} onClick={()=>void removePlan()}><Trash2 size={15}/> Eliminar prueba</button>}</div></div>
        <RoutePerformance stops={managerScopedStops} isManager={isManager} clientType={clientType} routeMode={selected.route_mode||'PLANIFICADA'} additionalCompleted={isManager?0:additionalCompleted} additionalInVisit={isManager?0:additionalInVisit}/>
        {mine&&(activeSession||selected.status==='PLANIFICADA')&&<div className="route-actions">{activeSession?<><span className="live-pill"><i/> {selected.route_mode==='LIBRE'?'Jornada libre':'Ruta'} activa desde {new Date(activeSession.started_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}</span>{!openVisit&&<button className="primary compact" disabled={!!activeIncident} title={activeIncident?'Finaliza la eventualidad activa':selected.route_mode==='LIBRE'?'Registrar llegada a un cliente':'Registrar cliente fuera del plan'} onClick={()=>setAdditionalOpen(true)}><Plus size={16}/>{selected.route_mode==='LIBRE'?'Visitar cliente':'Visita adicional'}</button>}{openVisit&&<button className="primary compact" onClick={()=>navigate('/visitas')}><CheckCircle2 size={16}/> Finalizar visita actual</button>}<button className="danger" disabled={busy||!!openVisit||!!activeIncident} title={activeIncident?'Finaliza la eventualidad antes de cerrar':''} onClick={()=>setClosureOpen(true)}><Square size={18}/> Cerrar jornada</button></>:<button className="primary" disabled={busy||selected.route_date!==today()} title={selected.route_date!==today()?`Disponible el ${selected.route_date}`:''} onClick={()=>void start()}><Play size={18}/> Iniciar ruta / salida</button>}</div>}
        {session?.status==='FINALIZADA'&&session.closure_mode&&<div className={`route-closure-result ${session.closure_mode==='PARCIAL'?'partial':'normal'}`}><div><b>{session.closure_mode==='PARCIAL'?'Jornada cerrada parcialmente':'Jornada cerrada'}</b><span>{session.closure_reason_text||'Cierre registrado'}{session.closed_pending_count?` · ${session.closed_pending_count} pendiente(s) resueltos al cierre`:''}</span></div><strong>{session.ended_at?new Date(session.ended_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):''}</strong></div>}
        {session&&<div className="route-incident-bar"><AlertTriangle size={18}/>{activeIncident?<><span className="incident-live"><i/> Eventualidad activa · {activeIncident.incident_type}</span><span>{durationLabel(activeIncident.started_at)}</span>{mine&&activeSession&&<button className="primary compact" disabled={busy} onClick={()=>void finishIncident()}>Finalizar eventualidad</button>}</>:<><span>Eventualidades de jornada: {incidents.length}</span>{mine&&activeSession&&<button className="secondary compact" onClick={()=>setIncidentOpen(true)}><Plus size={15}/> Registrar eventualidad</button>}</>}</div>}
        {incidents.length>0&&<div className="incident-list">{incidents.slice(0,5).map(i=><div className="incident-item" key={i.id}><div><b>{i.incident_type}</b><span>{new Date(i.started_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})} → {i.ended_at?new Date(i.ended_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'activa'} · {durationLabel(i.started_at,i.ended_at)}</span></div><span>{i.impact.replaceAll('_',' ')}</span></div>)}</div>}
        {(additionalVisits.length>0||activeSession)&&!isManager&&<div className="additional-visits-panel"><div className="additional-visits-head"><div><b>{selected.route_mode==='LIBRE'?'Visitas de la jornada libre':'Visitas adicionales'}</b><span>{selected.route_mode==='LIBRE'?'Clientes elegidos durante la jornada.':'Actividad real fuera de la secuencia planificada; no aumenta el denominador de cobertura.'}</span></div><div className="additional-visits-count">{additionalVisits.length}</div></div>{additionalVisits.length?additionalVisits.map(v=><div className="additional-visit-row" key={v.id}><div className="main"><b>{v.clients?.legal_name||'Cliente'}</b><span>{v.clients?.codempr||'Sin código'} · {v.clients?.client_type||'SIN TIPO'} · {v.clients?.municipality||''}</span><small>{new Date(v.started_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}{v.ended_at?` → ${new Date(v.ended_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}`:' · visita en curso'}</small></div><div className="button-row"><span className={`state ${v.ended_at?'done':'open'}`}>{v.ended_at?'Finalizada':'En visita'}</span>{!v.ended_at&&<button className="primary compact" onClick={()=>navigate('/visitas')}><CheckCircle2 size={14}/> Finalizar</button>}</div></div>):<div className="empty-state"><b>{selected.route_mode==='LIBRE'?'Aún no hay visitas registradas':'Aún no hay visitas adicionales'}</b><span>{selected.route_mode==='LIBRE'?'Usa “Visitar cliente” para registrar la primera llegada de la jornada.':'Usa “Visita adicional” para registrar un cliente fuera del plan.'}</span></div>}</div>}
        {selected.route_mode==='LIBRE'?<div className="free-route-empty"><RouteIcon size={28}/><b>Jornada sin secuencia planificada</b><span>Esta jornada se construye con las visitas reales que vayas registrando. El historial, tiempos, GPS y Tracking se alimentan con esos eventos sin crear paradas artificiales.</span></div>:<div className="route-map-grid"><div className="route-map-panel"><RouteSequenceMap stops={displayStops} activeStopId={openVisit?.route_stop_id||null} selectedStopId={selectedStopId} onSelectStop={setSelectedStopId} height={540}/></div><div className="route-stop-panel"><div className="route-stop-summary"><div><b>{isManager?'Mis clientes en esta ruta':'Secuencia de paradas'}</b><span>{isManager?'Seguimiento diario del vendedor y tus clientes.':'Selecciona una parada para ubicarla en el mapa.'}</span></div><span>{displayStops.length}</span></div>{displayStops.length?displayStops.map(stop=>{const current=openVisit?.route_stop_id===stop.id;const blocked=!!openVisit&&!current;const nav=googleMapsNavigation(stop.clients?.latitude,stop.clients?.longitude);const state=current?'EN VISITA':String(stop.status||'PENDIENTE').replaceAll('_',' ');const terminal=terminalStopStatuses.includes(stop.status);return <div className={`route-stop-compact ${selectedStopId===stop.id?'selected':''} ${current?'current':''}`} key={stop.id} onClick={()=>setSelectedStopId(stop.id)}><span className="stop-order">{stop.stop_order}</span><div className="stop-copy"><b>{stop.clients?.legal_name||'Parada'}</b><span>{stop.clients?.codempr} · {stop.clients?.client_type||'SIN TIPO'} · {stop.clients?.municipality||''}</span><small>{isSeller?`Gestor: ${empName(stop.clients?.manager_employee_id)} · `:''}<strong>{state}</strong>{['NO_VISITADO','REPROGRAMADO','CANCELADO'].includes(stop.status)&&stop.reason_not_visited?` · ${stop.reason_not_visited}`:''}</small></div><div className="route-stop-actions" onClick={e=>e.stopPropagation()}>{nav&&<a className="icon-btn compact" target="_blank" rel="noreferrer" href={nav} title="Navegar"><Navigation size={15}/></a>}{mine&&activeSession&&!terminal&&<>{current?<button className="primary compact" onClick={()=>navigate('/visitas')}><CheckCircle2 size={14}/></button>:<button className="primary compact" disabled={busy||blocked||!!activeIncident} title={activeIncident?'Finaliza la eventualidad activa':blocked?'Finaliza la visita actual':'Registrar llegada'} onClick={()=>void startVisit(stop)}><Play size={14}/></button>}{!current&&<button className="secondary compact" disabled={blocked||!!activeIncident} title="No realizada / reprogramar" onClick={()=>setExceptionStop(stop)}><Ban size={14}/></button>}</>}</div></div>}):<div className="empty-state"><b>Esta ruta no tiene paradas visibles para tu perfil/filtro.</b></div>}</div></div>}
      </>}</div>
    </div>
    {exceptionStop&&<RouteException stop={exceptionStop} onClose={()=>setExceptionStop(null)} onSaved={()=>{setExceptionStop(null);void load()}}/>}
    {incidentOpen&&activeSession&&employee&&<IncidentModal session={activeSession} employeeId={employee.id} onClose={()=>setIncidentOpen(false)} onSaved={()=>{setIncidentOpen(false);void load()}}/>}
    {additionalOpen&&activeSession&&selected&&<AdditionalVisitModal sessionId={activeSession.id} plannedClientIds={stops.map(s=>s.client_id).filter(Boolean)} journeyMode={selected.route_mode||'PLANIFICADA'} onClose={()=>setAdditionalOpen(false)} onStarted={(result:any)=>{setAdditionalOpen(false);alert(`Llegada registrada${result?.client?.legal_name?` en ${result.client.legal_name}`:''}. Finaliza la visita antes de iniciar otra.`);void load()}}/>}
    {closureOpen&&activeSession&&selected&&<RouteClosureModal session={activeSession} stops={stops} seriousIncident={seriousIncident} routeMode={selected.route_mode||'PLANIFICADA'} additionalCompleted={additionalCompleted} onClose={()=>setClosureOpen(false)} onSaved={(result:any)=>{setClosureOpen(false);setSession({...activeSession,ended_at:result?.ended_at||new Date().toISOString(),status:'FINALIZADA',closure_mode:result?.closure_mode,closure_reason_code:result?.closure_reason_code,closure_reason_text:result?.closure_reason_text,closed_pending_count:result?.closed_pending_count||0});setSelected({...selected,status:'FINALIZADA'});void load()}}/>}
  </div>
}

function RoutePerformance({stops,isManager,clientType,routeMode,additionalCompleted,additionalInVisit}:{stops:any[];isManager:boolean;clientType:ClientTypeFilterValue;routeMode:string;additionalCompleted:number;additionalInVisit:number}){
  const total=stops.length
  const visited=stops.filter(s=>s.status==='VISITADO').length
  const inVisit=stops.filter(s=>s.status==='EN_VISITA').length
  const notVisited=stops.filter(s=>s.status==='NO_VISITADO').length
  const reprogrammed=stops.filter(s=>s.status==='REPROGRAMADO').length
  const cancelled=stops.filter(s=>s.status==='CANCELADO').length
  const pending=stops.filter(s=>s.status==='PENDIENTE').length
  const resolved=visited+notVisited+reprogrammed+cancelled
  const coverage=total?Math.round((visited/total)*100):0
  const resolution=total?Math.round((resolved/total)*100):0
  const free=routeMode==='LIBRE'
  return <div style={{margin:'12px 0 16px',padding:'14px',border:'1px solid var(--border)',borderRadius:14,background:'var(--surface-soft)'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:10}}><div><b>{isManager?'Rendimiento de mis clientes':free?'Actividad de jornada libre':'Rendimiento de la ruta'}</b><div style={{fontSize:12,opacity:.72}}>{isManager?'Calculado solo sobre los clientes asignados a tu gestión.':free?'No existe denominador planificado: se mide actividad real realizada.':'Cobertura real sobre todas las paradas planificadas; las visitas adicionales se muestran aparte.'}{clientType?' El filtro de Tipo es solo visual y no altera estos indicadores.':''}</div></div><strong style={{fontSize:24}}>{free?'Cobertura N/A':`${coverage}% cobertura`}</strong></div>
    {!free&&<div style={{height:10,borderRadius:999,overflow:'hidden',background:'var(--border)',marginBottom:12}}><div style={{height:'100%',width:`${Math.min(100,coverage)}%`,background:'var(--success)',transition:'width .2s ease'}}/></div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(105px,1fr))',gap:8}}>
      <Metric label={isManager?'Mis clientes':'Planificados'} value={total}/>
      <Metric label="Visitados plan" value={visited} detail={free?undefined:`${coverage}%`}/>
      <Metric label={free?'Realizadas':'Adicionales'} value={additionalCompleted}/>
      <Metric label="En visita" value={inVisit+additionalInVisit}/>
      <Metric label="Total visitas" value={visited+additionalCompleted}/>
      {!free&&<><Metric label="Pendientes" value={pending}/><Metric label="No realizados" value={notVisited}/><Metric label="Reprogramados" value={reprogrammed}/><Metric label="Resueltos" value={resolved} detail={`${resolution}%`}/></>}
    </div>
  </div>
}

function Metric({label,value,detail}:{label:string;value:number;detail?:string}){return <div style={{padding:'9px 10px',border:'1px solid var(--border)',borderRadius:10,background:'var(--surface)'}}><span style={{display:'block',fontSize:11,opacity:.7}}>{label}</span><b style={{fontSize:18}}>{value}</b>{detail&&<small style={{marginLeft:6,opacity:.7}}>{detail}</small>}</div>}

function RouteClosureModal({session,stops,seriousIncident,routeMode,additionalCompleted,onClose,onSaved}:{session:any;stops:any[];seriousIncident:any;routeMode:string;additionalCompleted:number;onClose:()=>void;onSaved:(result:any)=>void}){
  const reasons=[['FIN_JORNADA','Fin de jornada / tiempo agotado'],['TRAFICO_RETRASO','Tráfico o retrasos'],['CAMBIO_PRIORIDAD','Cambio de prioridad autorizado'],['EVENTUALIDAD','Eventualidad de jornada'],['SUSPENSION_SUPERVISOR','Suspensión por supervisor'],['REPROGRAMACION','Reprogramar todas las pendientes'],['OTRO','Otro']]
  const total=stops.length
  const visited=stops.filter(s=>s.status==='VISITADO').length
  const pending=stops.filter(s=>s.status==='PENDIENTE').length
  const resolved=stops.filter(s=>terminalStopStatuses.includes(s.status)).length
  const coverage=total?Math.round((visited/total)*1000)/10:0
  const resolution=total?Math.round((resolved/total)*1000)/10:0
  const free=routeMode==='LIBRE'
  const [reason,setReason]=useState(seriousIncident?'EVENTUALIDAD':'FIN_JORNADA')
  const [notes,setNotes]=useState('')
  const [busy,setBusy]=useState(false)
  const save=async()=>{
    if(reason==='OTRO'&&!notes.trim())return alert('Describe el motivo del cierre.')
    setBusy(true)
    try{
      let p:any=null
      try{p=await currentPosition()}catch{if(!window.confirm('No fue posible obtener el GPS de cierre. ¿Deseas cerrar la jornada sin ubicación final?'))return}
      const{data,error}=await supabase.rpc('finalize_route_session',{p_route_session_id:session.id,p_reason_code:pending>0?reason:null,p_notes:notes.trim()||null,p_end_latitude:p?.latitude??null,p_end_longitude:p?.longitude??null,p_end_accuracy_m:p?.accuracy??null})
      if(error)throw error
      onSaved(data)
    }catch(e){alert(e instanceof Error?e.message:'No se pudo cerrar la jornada')}
    finally{setBusy(false)}
  }
  return <div className="modal-wrap"><button className="modal-backdrop" onClick={busy?undefined:onClose}/><div className="modal large route-closure-modal"><div className="modal-head"><div><span className="eyebrow">CIERRE DE JORNADA</span><h3>{free?'Finalizar jornada libre':pending>0?'Cerrar ruta con pendientes':'Finalizar jornada de ruta'}</h3><p>Al confirmar, la hora de jornada queda congelada y deja de seguir acumulando tiempo.</p></div><button className="icon-btn" disabled={busy} onClick={onClose}><X/></button></div>
    <div className="closure-summary-grid"><Metric label="Planificados" value={total}/><Metric label="Visitados plan" value={visited} detail={free?undefined:`${coverage}%`}/><Metric label={free?'Visitas':'Adicionales'} value={additionalCompleted}/><Metric label="Pendientes" value={pending}/></div>
    {pending>0?<><div className="closure-warning"><AlertTriangle size={19}/><div><b>Quedan {pending} parada(s) pendientes.</b><span>Debes indicar por qué termina la jornada. Esas paradas no se contarán como visitadas.</span></div></div><div className="form-grid"><label className="span-2">Motivo del cierre<select value={reason} onChange={e=>setReason(e.target.value)}>{reasons.map(([code,text])=><option value={code} key={code}>{text}</option>)}</select><small>{reason==='REPROGRAMACION'?'Las pendientes pasarán a REPROGRAMADO.':'Las pendientes pasarán a NO VISITADO con este motivo.'}</small></label><label className="span-2">Observación {reason==='OTRO'?'(obligatoria)':'(opcional)'}<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Contexto adicional del cierre de jornada..."/></label></div></>:<div className="closure-ok"><CheckCircle2 size={20}/><div><b>{free?'Jornada libre lista para cerrar.':'No quedan paradas pendientes.'}</b><span>Se registrará GPS/hora de salida y quedará congelado el tiempo de jornada.</span></div></div>}
    <div className="closure-readout"><span>Cobertura plan <b>{free?'No aplica':`${coverage}%`}</b></span><span>Resolución plan <b>{free?'No aplica':`${resolution}%`}</b></span><span>Jornada acumulada <b>{durationLabel(session.started_at)}</b></span></div>
    <div className="modal-actions"><button className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="danger" disabled={busy} onClick={()=>void save()}><Square size={17}/>{busy?'Cerrando jornada...':'Cerrar jornada y detener tiempo'}</button></div>
  </div></div>
}

function RouteException({stop,onClose,onSaved}:{stop:any;onClose:()=>void;onSaved:()=>void}){
  const reasons=[['CLIENTE_CERRADO','Cliente cerrado'],['NO_ESTABA_RESPONSABLE','No estaba el responsable'],['REPROGRAMADA','Visita reprogramada'],['DIRECCION_INCORRECTA','Dirección incorrecta'],['NO_LOCALIZADO','Cliente no localizado'],['CAMBIO_RUTA','Cambio de ruta'],['OTRO','Otro']]
  const[reason,setReason]=useState(reasons[0][0])
  const[notes,setNotes]=useState('')
  const[busy,setBusy]=useState(false)
  const save=async()=>{setBusy(true);const reasonLabel=reasons.find(r=>r[0]===reason)?.[1]||reason;const status=reason==='REPROGRAMADA'?'REPROGRAMADO':'NO_VISITADO';const{error}=await supabase.from('route_stops').update({status,exception_reason_code:reason,reason_not_visited:reasonLabel,notes:notes||null}).eq('id',stop.id);setBusy(false);if(error)alert(error.message);else onSaved()}
  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal"><div className="modal-head"><div><span className="eyebrow">EXCEPCIÓN DE PARADA</span><h3>{stop.clients?.legal_name||'Cliente'}</h3></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="form-grid"><label className="span-2">Motivo<select value={reason} onChange={e=>setReason(e.target.value)}>{reasons.map(([code,text])=><option value={code} key={code}>{text}</option>)}</select></label><label className="span-2">Observación<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="danger" disabled={busy} onClick={()=>void save()}>{busy?'Guardando...':reason==='REPROGRAMADA'?'Registrar reprogramación':'Registrar no realizada'}</button></div></div></div>
}

function IncidentModal({session,employeeId,onClose,onSaved}:{session:any;employeeId:string;onClose:()=>void;onSaved:()=>void}){
  const TYPES=[['VEHICULO_AVERIADO','Vehículo averiado'],['NEUMATICO_PINCHADO','Neumático pinchado'],['ACCIDENTE','Accidente'],['TRAFICO_EXTRAORDINARIO','Tráfico extraordinario'],['PROBLEMA_MECANICO','Problema mecánico'],['COMBUSTIBLE','Combustible'],['CLIMA','Clima'],['CIERRE_VIA','Bloqueo / cierre de vía'],['ESPERA_EXTRAORDINARIA','Espera extraordinaria'],['TELEFONO_APP','Problema teléfono / app'],['ASUNTO_AUTORIZADO','Asunto personal autorizado'],['OTRO','Otro']]
  const[type,setType]=useState(TYPES[0][0]);const[impact,setImpact]=useState('RETRASO');const[startAt,setStartAt]=useState(localDateTime());const[endAt,setEndAt]=useState('');const[description,setDescription]=useState('');const[files,setFiles]=useState<File[]>([]);const[busy,setBusy]=useState(false);const input=useRef<HTMLInputElement|null>(null)
  const save=async()=>{
    if(!startAt)return alert('Indica la hora de inicio.')
    if(endAt&&new Date(endAt)<new Date(startAt))return alert('La hora final no puede ser anterior al inicio.')
    setBusy(true)
    try{
      let p:any=null;try{p=await currentPosition()}catch{}
      const{data,error}=await supabase.from('operational_incidents').insert({route_session_id:session.id,employee_id:employeeId,incident_type:TYPES.find(x=>x[0]===type)?.[1]||type,started_at:new Date(startAt).toISOString(),ended_at:endAt?new Date(endAt).toISOString():null,latitude:p?.latitude||null,longitude:p?.longitude||null,accuracy_m:p?.accuracy||null,description:description||null,impact,status:endAt?'FINALIZADA':'ACTIVA'}).select().single()
      if(error)throw error
      for(const file of files){
        const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
        const path=`incidents/${employeeId}/${data.id}/${crypto.randomUUID()}-${safe}`
        const{error:up}=await supabase.storage.from('karaka-photos').upload(path,file,{contentType:file.type||undefined});if(up)throw up
        const{error:photo}=await supabase.from('photos').insert({employee_id:employeeId,operational_incident_id:data.id,bucket_id:'karaka-photos',object_path:path,photo_type:'EVENTUALIDAD',mime_type:file.type||null,size_bytes:file.size,latitude:p?.latitude||null,longitude:p?.longitude||null,taken_at:new Date().toISOString()});if(photo)throw photo
      }
      onSaved()
    }catch(e){alert(e instanceof Error?e.message:'No se pudo guardar la eventualidad')}
    finally{setBusy(false)}
  }
  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal large"><div className="modal-head"><div><span className="eyebrow">EVENTUALIDAD DE JORNADA</span><h3>Registrar incidencia</h3><p>La duración quedará separada del tiempo de atención y trayecto en el reporte ejecutivo.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="form-grid"><label>Tipo<select value={type} onChange={e=>setType(e.target.value)}>{TYPES.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label>Impacto<select value={impact} onChange={e=>setImpact(e.target.value)}><option value="SIN_IMPACTO">Sin impacto significativo</option><option value="RETRASO">Retrasó la ruta</option><option value="SUSPENDE_RUTA">Suspendió la ruta</option><option value="FINALIZA_JORNADA">Finalizó la jornada</option></select></label><label>Desde<input type="datetime-local" value={startAt} onChange={e=>setStartAt(e.target.value)}/></label><label>Hasta (opcional)<input type="datetime-local" value={endAt} onChange={e=>setEndAt(e.target.value)}/><small>Déjalo vacío si la eventualidad sigue activa.</small></label><label className="span-2">Descripción<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Qué ocurrió, asistencia recibida, cambio de vehículo, condición de la vía..."/></label><label className="span-2 evidence-box">Evidencia opcional<div className="field"><Camera size={18}/><input ref={input} type="file" accept="image/*" capture="environment" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/></div><small>{files.length?`${files.length} archivo(s) listo(s)`:'Puedes tomar una foto o adjuntar evidencia.'}</small></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={()=>void save()}><Upload size={17}/>{busy?'Guardando...':'Guardar eventualidad'}</button></div></div></div>
}
