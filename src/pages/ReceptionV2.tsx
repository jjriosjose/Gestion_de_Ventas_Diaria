import { useEffect,useMemo,useState } from 'react'
import { CalendarCheck,CalendarRange,Coffee,DoorOpen,LogOut,Plus,Search,UserRoundCheck,Users,X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../lib/access'
import { ClientTypeFilter } from '../components/ClientTypeFilter'
import type { ClientTypeFilterValue } from '../components/ClientTypeFilter'
import { loadClientsPaged } from '../lib/clientLoader'

const CLIENT_COLUMNS='id,codempr,client_type,legal_name,contact_name,manager_employee_id,phone1,mobile,region,province,municipality'
const todayKey=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const addDaysKey=(days:number)=>{const d=new Date();d.setDate(d.getDate()+days);return d.toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})}
const startOfTodayIso=()=>`${todayKey()}T00:00:00-04:00`
const endOfTodayIso=()=>`${addDaysKey(1)}T00:00:00-04:00`
const statusLabel=(v?:string)=>v==='ALMUERZO'?'Almuerzo':v==='EN_ATENCION'?'En atención':'Disponible'
const sourceLabel=(v?:string)=>v==='VISITA'?'Visita vendedor':v==='LLAMADA'?'Llamada CRM':v==='RECEPCION'?'Recepción':v||'Manual'
const appointmentDate=(row:any)=>row.appointment_at||row.requested_appointment_at||null
const dateKeyOf=(value?:string|null)=>value?new Date(value).toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'}):''
const activeAppointment=(status?:string)=>['CONFIRMADA','REPROGRAMADA','PROGRAMADA'].includes(status||'')
const pendingAppointment=(status?:string)=>['PENDIENTE_VALIDACION','CONTACTANDO'].includes(status||'')
const VISIT_DETAIL_OPTIONS=['Realizar compra','Visitar showroom / ver mercancía','Cotización / consulta de precios','Seguimiento comercial','Reunión con Gestor','Reclamo / servicio al cliente','Entrega / retiro de documentación','Entrega / retiro de mercancía','Consulta general','Otro'] as const

export function ReceptionV2(){
 const {employee}=useAuth();const navigate=useNavigate();const canCreateProspect=hasPermission(employee,'capture.create')
 const [appointments,setAppointments]=useState<any[]>([]),[entries,setEntries]=useState<any[]>([]),[clients,setClients]=useState<any[]>([]),[managers,setManagers]=useState<any[]>([]),[availability,setAvailability]=useState<any[]>([])
 const [clientType,setClientType]=useState<ClientTypeFilterValue>(''),[managerFilter,setManagerFilter]=useState(''),[sourceFilter,setSourceFilter]=useState(''),[appointmentStatus,setAppointmentStatus]=useState('ACTIVAS'),[movementStatus,setMovementStatus]=useState(''),[q,setQ]=useState('')
 const [from,setFrom]=useState(todayKey()),[to,setTo]=useState(addDaysKey(30)),[walkIn,setWalkIn]=useState(false),[busy,setBusy]=useState(false),[loadError,setLoadError]=useState('')

 const load=async()=>{
  setLoadError('')
  const [a,e,portfolio,m,av]=await Promise.all([
   supabase.from('appointments').select('*,clients(id,codempr,legal_name,client_type,phone1,mobile,contact_name,manager_employee_id,region,province,municipality),prospects(id,prospect_code,legal_name,phone,mobile),manager:employees!appointments_assigned_manager_id_fkey(id,full_name),requester:employees!appointments_requested_by_employee_id_fkey(id,full_name)').order('appointment_at',{ascending:true}).limit(2000),
   supabase.from('reception_entries').select('*,clients(codempr,legal_name,client_type),prospects(prospect_code,legal_name),manager:employees!reception_entries_assigned_manager_id_fkey(id,full_name),appointments(appointment_at,status,source_type)').gte('check_in_at',startOfTodayIso()).lt('check_in_at',endOfTodayIso()).order('check_in_at',{ascending:false}),
   loadClientsPaged(CLIENT_COLUMNS),
   supabase.from('employees').select('id,full_name').eq('active',true).eq('employee_type','Gestor').order('full_name'),
   supabase.from('manager_reception_availability_v1').select('*').order('full_name'),
  ])
  const error=a.error||e.error||m.error||av.error;if(error)setLoadError(error.message)
  setAppointments(a.data||[]);setEntries(e.data||[]);setClients(portfolio);setManagers(m.data||[]);setAvailability(av.data||[])
 }
 useEffect(()=>{void load()},[])

 const matchesSearch=(row:any)=>{if(!q.trim())return true;const n=q.trim().toLowerCase();const h=`${row.clients?.legal_name||''} ${row.clients?.codempr||''} ${row.prospects?.legal_name||''} ${row.manager?.full_name||''} ${row.requester?.full_name||''} ${row.request_contact_name||''} ${row.request_phone||''} ${row.visitor_name||''} ${row.company_name||''} ${row.phone||''} ${row.purpose||''}`.toLowerCase();return h.includes(n)}
 const appointmentScope=useMemo(()=>appointments.filter(row=>{
  const d=appointmentDate(row);if(!d)return false
  if(clientType&&row.client_id&&row.clients?.client_type!==clientType)return false
  if(managerFilter&&row.assigned_manager_id!==managerFilter)return false
  if(sourceFilter&&row.source_type!==sourceFilter)return false
  if(!matchesSearch(row))return false
  return true
 }),[appointments,clientType,managerFilter,sourceFilter,q])
 const inSelectedWindow=(row:any)=>{const key=dateKeyOf(appointmentDate(row));if(from&&key<from)return false;if(to&&key>to)return false;return true}
 const preAgenda=useMemo(()=>appointmentScope.filter(row=>pendingAppointment(row.status)&&inSelectedWindow(row)),[appointmentScope,from,to])
 const visibleAgenda=useMemo(()=>appointmentScope.filter(row=>{
  if(!inSelectedWindow(row)||pendingAppointment(row.status))return false
  if(appointmentStatus==='ACTIVAS'&&!activeAppointment(row.status))return false
  if(appointmentStatus&&appointmentStatus!=='ACTIVAS'&&appointmentStatus!=='TODAS'&&row.status!==appointmentStatus)return false
  return true
 }),[appointmentScope,from,to,appointmentStatus])
 const filteredEntries=useMemo(()=>entries.filter(row=>{
  if(clientType&&row.client_id&&row.clients?.client_type!==clientType)return false
  if(managerFilter&&row.assigned_manager_id!==managerFilter)return false
  if(movementStatus&&row.status!==movementStatus)return false
  if(!matchesSearch(row))return false
  return true
 }),[entries,clientType,managerFilter,movementStatus,q])
 const filteredClients=useMemo(()=>clients.filter(c=>!clientType||c.client_type===clientType),[clients,clientType])
 const entryByAppointment=useMemo(()=>new Map(entries.filter(e=>e.appointment_id).map(e=>[e.appointment_id,e])),[entries])
 const today=todayKey(),day7=addDaysKey(7),day30=addDaysKey(30)
 const activeFuture=appointmentScope.filter(a=>activeAppointment(a.status)&&dateKeyOf(appointmentDate(a))>=today&&!entryByAppointment.has(a.id))
 const expectedToday=activeFuture.filter(a=>dateKeyOf(appointmentDate(a))===today)
 const upcoming7=activeFuture.filter(a=>{const k=dateKeyOf(appointmentDate(a));return k>=today&&k<=day7})
 const upcoming30=activeFuture.filter(a=>{const k=dateKeyOf(appointmentDate(a));return k>=today&&k<=day30})
 const nextAppointment=[...activeFuture].sort((a,b)=>new Date(appointmentDate(a)).getTime()-new Date(appointmentDate(b)).getTime())[0]
 const presenceScope=entries.filter(row=>(!clientType||!row.client_id||row.clients?.client_type===clientType)&&(!managerFilter||row.assigned_manager_id===managerFilter)&&matchesSearch(row))
 const inside=presenceScope.filter(e=>!['SALIO','CANCELADO'].includes(e.status)),waiting=inside.filter(e=>e.status==='EN_ESPERA').length,inService=inside.filter(e=>e.status==='EN_ATENCION').length
 const visibleAvailability=availability.filter(a=>!managerFilter||a.employee_id===managerFilter)

 const setWindow=(days:number)=>{setFrom(todayKey());setTo(addDaysKey(days));setAppointmentStatus('ACTIVAS')}
 const resetFilters=()=>{setQ('');setClientType('');setManagerFilter('');setSourceFilter('');setAppointmentStatus('ACTIVAS');setMovementStatus('');setFrom(todayKey());setTo(addDaysKey(30))}
 const arriveAppointment=async(row:any)=>{if(!employee?.id)return;if(!row.assigned_manager_id)return alert('Esta cita aún no tiene Gestor asignado.');if(dateKeyOf(appointmentDate(row))!==today)return alert('La llegada se registra el día de la cita. Si el cliente llegó antes, utilice Llegada sin cita.');setBusy(true);try{const {error}=await supabase.from('reception_entries').insert({appointment_id:row.id,client_id:row.client_id||null,prospect_id:row.prospect_id||null,visitor_type:'CITA',visitor_name:row.clients?.contact_name||row.clients?.legal_name||row.prospects?.legal_name||'Cita',company_name:row.clients?.legal_name||row.prospects?.legal_name||null,phone:row.clients?.mobile||row.clients?.phone1||row.prospects?.mobile||row.prospects?.phone||null,purpose:'Cita showroom',assigned_manager_id:row.assigned_manager_id,check_in_by:employee.id,status:'EN_ESPERA'});if(error)throw error;await supabase.from('appointments').update({status:'ASISTIO',attended_at:new Date().toISOString()}).eq('id',row.id);await load()}catch(e){alert(e instanceof Error?e.message:'No se pudo registrar la llegada')}finally{setBusy(false)}}
 const checkOut=async(entry:any)=>{if(!employee?.id)return;if(entry.status==='EN_ATENCION')return alert('El Gestor debe finalizar la atención antes de registrar la salida.');const {error}=await supabase.from('reception_entries').update({status:'SALIO',check_out_at:new Date().toISOString(),check_out_by:employee.id}).eq('id',entry.id);if(error)return alert(error.message);await load()}
 const nameOf=(r:any)=>r.visitor_name||r.clients?.legal_name||r.prospects?.legal_name||r.company_name||'Visitante'
 const nextSummary=nextAppointment?`${new Date(appointmentDate(nextAppointment)).toLocaleString('es-DO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · ${nextAppointment.clients?.legal_name||nextAppointment.prospects?.legal_name||'Cliente'}`:'Sin citas futuras'

 return <div className="page-stack">
  <div className="page-head"><div><span className="eyebrow">CONTROL DE PRESENCIA Y AGENDA</span><h2>Recepción showroom</h2><p>Agenda futura, pre-agenda, llegadas, espera, atención y salida en una sola vista operativa.</p></div><div className="button-row"><button className="secondary" onClick={()=>void load()}>Actualizar</button><button className="primary" onClick={()=>setWalkIn(true)}><Plus size={17}/> Llegada sin cita</button></div></div>

  <div className="kpi-grid">
   <Kpi label="Por validar" value={preAgenda.length} sub="pre-agenda pendiente del Gestor" Icon={CalendarRange}/>
   <Kpi label="Citas hoy" value={expectedToday.length} sub="pendientes de llegar" Icon={CalendarCheck}/>
   <Kpi label="Próximos 7 días" value={upcoming7.length} sub="agenda confirmada" Icon={CalendarRange}/>
   <Kpi label="Próximos 30 días" value={upcoming30.length} sub={nextSummary} Icon={CalendarRange}/>
   <Kpi label="Dentro" value={inside.length} sub="personas actualmente" Icon={DoorOpen}/>
   <Kpi label="En espera" value={waiting} sub="pendientes de atención" Icon={Users}/>
   <Kpi label="En atención" value={inService} sub="con un gestor" Icon={UserRoundCheck}/>
  </div>

  <div className="panel planner-filter-panel">
   <div className="panel-head"><div><b>Agenda operativa de Recepción</b><span>Consulta solicitudes por validar y citas confirmadas en cualquier rango futuro.</span></div><div className="button-row"><button className="secondary compact" onClick={()=>setWindow(0)}>Hoy</button><button className="secondary compact" onClick={()=>setWindow(7)}>7 días</button><button className="secondary compact" onClick={()=>setWindow(30)}>30 días</button><button className="secondary compact" onClick={()=>setWindow(90)}>90 días</button></div></div>
   <div className="planner-filter-grid">
    <div className="search-field"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cliente, código, contacto, gestor..."/></div>
    <ClientTypeFilter value={clientType} onChange={setClientType}/>
    <select value={managerFilter} onChange={e=>setManagerFilter(e.target.value)}><option value="">Todos los gestores</option>{managers.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
    <select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option value="">Todos los orígenes</option><option value="VISITA">Visita vendedor</option><option value="LLAMADA">Llamada CRM</option><option value="MANUAL">Manual</option><option value="RECEPCION">Recepción</option></select>
    <select value={appointmentStatus} onChange={e=>setAppointmentStatus(e.target.value)}><option value="ACTIVAS">Citas activas</option><option value="TODAS">Todos los estados confirmados/históricos</option><option value="CONFIRMADA">Confirmada</option><option value="REPROGRAMADA">Reprogramada</option><option value="PROGRAMADA">Programada</option><option value="ASISTIO">Asistió</option><option value="FINALIZADA">Finalizada</option><option value="NO_ASISTIO">No asistió</option><option value="CANCELADA">Cancelada</option></select>
    <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" value={to} onChange={e=>setTo(e.target.value)}/>
   </div>
   <div className="planner-filter-actions"><div className="meta"><span>{preAgenda.length} por validar</span><span>{visibleAgenda.length} citas visibles</span><span>{nextSummary}</span></div><button className="secondary" onClick={resetFilters}>Limpiar filtros</button></div>
  </div>

  {loadError&&<div className="panel"><b>Error cargando Recepción</b><span>{loadError}</span></div>}

  <div className="panel"><div className="panel-head"><div><b>Pre-agenda · solicitudes por validar</b><span>Son intereses con fecha tentativa. Recepción puede anticiparlos, pero no cuentan como cita hasta que el Gestor confirme la fecha/hora real.</span></div><span className="badge">{preAgenda.length}</span></div><div className="cards-list">{preAgenda.length===0&&<div className="empty-state"><b>No hay solicitudes pendientes de validación en este período.</b></div>}{preAgenda.slice(0,100).map(row=>{const when=appointmentDate(row);return <div className="activity-card" key={row.id}><div className="date-box"><b>{when?new Date(when).toLocaleDateString('es-DO',{day:'2-digit'}):'—'}</b><span>{when?new Date(when).toLocaleDateString('es-DO',{month:'short'}):''}</span></div><div className="activity-main"><b>{row.clients?.legal_name||row.prospects?.legal_name||'Solicitud showroom'}</b><span>{when?`Tentativa ${new Date(when).toLocaleString('es-DO',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}`:'Sin fecha tentativa'} · Gestor: {row.manager?.full_name||'Sin asignar'}</span><small>{row.status.replaceAll('_',' ')} · {sourceLabel(row.source_type)}{row.requester?.full_name?` · solicitado por ${row.requester.full_name}`:''}</small></div><button className="secondary compact" onClick={()=>navigate(`/agenda?appointment=${row.id}`)}>Gestionar en Agenda</button></div>})}</div></div>

  <div className="panel"><div className="panel-head"><div><b>Calendario de llegadas confirmadas</b><span>Solo fecha/hora real confirmada, cliente, origen y Gestor responsable.</span></div><span className="badge">{visibleAgenda.length}</span></div><div className="cards-list">{visibleAgenda.length===0&&<div className="empty-state"><b>No hay citas confirmadas con los filtros seleccionados.</b><span>Amplía el rango de fechas o revisa la pre-agenda.</span></div>}{visibleAgenda.slice(0,100).map(row=>{const when=appointmentDate(row),key=dateKeyOf(when),arrived=entryByAppointment.get(row.id);return <div className="activity-card" key={row.id}><div className="date-box"><b>{when?new Date(when).toLocaleDateString('es-DO',{day:'2-digit'}):'—'}</b><span>{when?new Date(when).toLocaleDateString('es-DO',{month:'short'}):''}</span></div><div className="activity-main"><b>{row.clients?.legal_name||row.prospects?.legal_name||'Cita'}</b><span>{when?new Date(when).toLocaleString('es-DO',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Sin fecha'} · Gestor: {row.manager?.full_name||'Sin asignar'}</span><small>{row.status.replaceAll('_',' ')} · {sourceLabel(row.source_type)} · {row.clients?.client_type||'SIN TIPO'}{row.request_contact_name?` · Contacto: ${row.request_contact_name}`:''}</small>{arrived&&<small>Llegada registrada · {new Date(arrived.check_in_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})} · {arrived.status.replaceAll('_',' ')}</small>}</div><div className="row-actions">{key===today&&activeAppointment(row.status)&&!arrived&&<button className="primary compact" disabled={busy} onClick={()=>void arriveAppointment(row)}><DoorOpen size={15}/> Llegó</button>}<button className="secondary compact" onClick={()=>navigate(`/agenda?appointment=${row.id}`)}>Gestionar en Agenda</button></div></div>})}</div></div>

  <div className="panel"><div className="panel-head"><div><b>Disponibilidad de Gestores</b><span>Estado operativo y carga actual para asignaciones de Recepción.</span></div><span className="badge">{visibleAvailability.length}</span></div><div className="cards-list">{visibleAvailability.map(a=><div className="activity-card" key={a.employee_id}><div className="activity-icon">{a.availability_status==='ALMUERZO'?<Coffee/>:a.availability_status==='EN_ATENCION'?<UserRoundCheck/>:<Users/>}</div><div className="activity-main"><b>{a.full_name}</b><span>{statusLabel(a.availability_status)} · {a.waiting_clients||0} esperando · {a.active_clients||0} en atención</span><small>{a.availability_status==='ALMUERZO'&&a.lunch_started_at?`Salió a comer ${new Date(a.lunch_started_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}`:a.oldest_waiting_at?`Espera más antigua: ${new Date(a.oldest_waiting_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}`:'Sin espera actual'}</small></div><span className={`badge ${a.availability_status==='DISPONIBLE'?'success':''}`}>{statusLabel(a.availability_status)}</span></div>)}</div></div>

  <div className="panel"><div className="panel-head"><div><b>Movimientos de hoy</b><span>Entrada, espera, atención y salida física con filtro operativo.</span></div><div className="button-row"><select value={movementStatus} onChange={e=>setMovementStatus(e.target.value)}><option value="">Todos los estados</option><option value="EN_ESPERA">En espera</option><option value="EN_ATENCION">En atención</option><option value="ATENCION_FINALIZADA">Atención finalizada</option><option value="REGISTRADO">Registrado</option><option value="SALIO">Salió</option></select></div></div><div className="cards-list">{filteredEntries.length===0&&<div className="empty-state"><b>No hay movimientos con los filtros actuales.</b></div>}{filteredEntries.map(row=><div className="activity-card" key={row.id}><div className="activity-main"><b>{nameOf(row)}</b><span>{row.company_name&&row.company_name!==row.visitor_name?`${row.company_name} · `:''}Llegó {new Date(row.check_in_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})} · {row.manager?.full_name||'Sin gestor asignado'}</span><small>{row.purpose||row.visitor_type.replaceAll('_',' ')} · {row.status.replaceAll('_',' ')}{row.check_out_at?` · salió ${new Date(row.check_out_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}`:''}</small></div>{!['SALIO','CANCELADO'].includes(row.status)&&<button className="secondary compact" onClick={()=>void checkOut(row)}><LogOut size={15}/> Registrar salida</button>}</div>)}</div></div>

  {walkIn&&<WalkInModal clients={filteredClients} managers={managers} availability={availability} employeeId={employee?.id||''} canCreateProspect={canCreateProspect} onClose={()=>setWalkIn(false)} onSaved={async()=>{setWalkIn(false);await load()}}/>}
 </div>
}
function Kpi({label,value,sub,Icon}:{label:string;value:any;sub:string;Icon:any}){return <div className="kpi-card"><div className="kpi-icon"><Icon/></div><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></div>}

function WalkInModal({clients,managers,availability,employeeId,canCreateProspect,onClose,onSaved}:{clients:any[];managers:any[];availability:any[];employeeId:string;canCreateProspect:boolean;onClose:()=>void;onSaved:()=>Promise<void>|void}){
 const [mode,setMode]=useState<'CLIENTE'|'NUEVO'>('CLIENTE'),[clientId,setClientId]=useState(''),[clientQuery,setClientQuery]=useState(''),[managerId,setManagerId]=useState(''),[visitorName,setVisitorName]=useState(''),[company,setCompany]=useState(''),[phone,setPhone]=useState(''),[purposeType,setPurposeType]=useState('Atención comercial'),[purposeDetail,setPurposeDetail]=useState(''),[notes,setNotes]=useState(''),[registerProspect,setRegisterProspect]=useState(false),[busy,setBusy]=useState(false)
 const selectedClient=clients.find(c=>c.id===clientId),commercial=['Atención comercial','Showroom / compra','Cotización'].includes(purposeType),managerState=(id:string)=>availability.find(a=>a.employee_id===id)
 const matches=useMemo(()=>{const n=clientQuery.trim().toLowerCase();if(!n||selectedClient)return[];return clients.filter(c=>`${c.legal_name||''} ${c.codempr||''} ${c.contact_name||''} ${c.phone1||''} ${c.mobile||''} ${c.province||''} ${c.municipality||''}`.toLowerCase().includes(n)).slice(0,20)},[clients,clientQuery,selectedClient])
 useEffect(()=>{if(!selectedClient)return;setManagerId(selectedClient.manager_employee_id||'');setCompany(selectedClient.legal_name||'');setVisitorName(selectedClient.contact_name||'');setPhone(selectedClient.mobile||selectedClient.phone1||'')},[selectedClient?.id])
 const chooseClient=(c:any)=>{setClientId(c.id);setClientQuery(c.legal_name)},clear=()=>{setClientId('');setClientQuery('');setManagerId('');setVisitorName('');setCompany('');setPhone('');setPurposeDetail('')}
 const save=async()=>{if(!employeeId)return;if(mode==='CLIENTE'&&!clientId)return alert('Busca y selecciona el cliente.');if(mode==='NUEVO'&&!visitorName.trim()&&!company.trim())return alert('Indica el nombre de la persona o empresa.');if(commercial&&!managerId)return alert('Toda llegada comercial debe quedar asignada a un Gestor.');if(!purposeDetail)return alert('Selecciona el detalle de la visita.');if(purposeDetail==='Otro'&&!notes.trim())return alert('Para “Otro”, detalla el requerimiento en Observación.');setBusy(true);try{let prospectId:string|null=null;if(mode==='NUEVO'&&registerProspect){const {data,error}=await supabase.from('prospects').insert({legal_name:company.trim()||visitorName.trim(),contact_name:visitorName.trim()||null,phone:phone.trim()||null,captured_by_employee_id:employeeId,assigned_manager_id:managerId||null,status:'NUEVO',notes:`Identificado desde recepción. ${notes.trim()}`.trim()}).select('id').single();if(error)throw error;prospectId=data.id}const person=visitorName.trim()||selectedClient?.contact_name||selectedClient?.legal_name||company.trim(),companyName=mode==='CLIENTE'?selectedClient?.legal_name||null:company.trim()||null,purpose=purposeDetail;const {error}=await supabase.from('reception_entries').insert({client_id:mode==='CLIENTE'?clientId:null,prospect_id:prospectId,visitor_type:mode==='CLIENTE'?'CLIENTE_SIN_CITA':prospectId?'PROSPECTO':'VISITANTE',visitor_name:person,company_name:companyName,phone:phone.trim()||selectedClient?.mobile||selectedClient?.phone1||null,purpose,assigned_manager_id:managerId||null,check_in_by:employeeId,status:managerId?'EN_ESPERA':'REGISTRADO',notes:notes||null});if(error)throw error;await onSaved()}catch(e){alert(e instanceof Error?e.message:'No se pudo registrar la llegada')}finally{setBusy(false)}}
 return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal large"><div className="modal-head"><div><span className="eyebrow">LLEGADA SIN CITA</span><h3>Registrar visitante</h3><p>Si la gestión es comercial debe quedar asociada a un Gestor.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="tabs"><button className={mode==='CLIENTE'?'active':''} onClick={()=>{setMode('CLIENTE');clear()}}>Cliente existente</button><button className={mode==='NUEVO'?'active':''} onClick={()=>{setMode('NUEVO');clear()}}>Persona / empresa nueva</button></div><div className="form-grid">{mode==='CLIENTE'?<label className="span-2">Buscar cliente<div className="search-field"><Search/><input value={clientQuery} onChange={e=>{setClientQuery(e.target.value);if(clientId)setClientId('')}} placeholder="Nombre, código, teléfono, provincia..."/></div>{matches.length>0&&<div className="cards-list">{matches.map(c=><button className="activity-card" type="button" key={c.id} onClick={()=>chooseClient(c)}><div className="activity-main"><b>{c.legal_name}</b><span>{c.codempr} · {c.province||'—'} / {c.municipality||'—'}</span></div></button>)}</div>}</label>:<><label>Persona<input value={visitorName} onChange={e=>setVisitorName(e.target.value)}/></label><label>Empresa<input value={company} onChange={e=>setCompany(e.target.value)}/></label><label>Teléfono<input value={phone} onChange={e=>setPhone(e.target.value)}/></label>{canCreateProspect&&<label className="checkbox"><input type="checkbox" checked={registerProspect} onChange={e=>setRegisterProspect(e.target.checked)}/> Registrar como prospecto</label>}</>}
 <label>Motivo<select value={purposeType} onChange={e=>{setPurposeType(e.target.value);setPurposeDetail('')}}><option>Atención comercial</option><option>Showroom / compra</option><option>Cotización</option><option>Consulta general</option><option>Entrega / retiro</option><option>Otro</option></select></label><label>Gestor responsable<select value={managerId} onChange={e=>setManagerId(e.target.value)} disabled={!!selectedClient?.manager_employee_id}><option value="">{commercial?'Selecciona Gestor':'Sin Gestor / consulta general'}</option>{managers.map(m=>{const s=managerState(m.id),disabled=!selectedClient?.manager_employee_id&&s?.availability_status==='ALMUERZO';return <option value={m.id} key={m.id} disabled={disabled}>{m.full_name} · {statusLabel(s?.availability_status)} · {s?.waiting_clients||0} esperando</option>})}</select><small>{selectedClient?.manager_employee_id?'Se conserva el Gestor oficial del cliente.':'Para clientes sin Gestor, Recepción ve disponibilidad y carga.'}</small></label><label className="span-2">Detalle de visita<select value={purposeDetail} onChange={e=>setPurposeDetail(e.target.value)}><option value="">Selecciona detalle...</option>{VISIT_DETAIL_OPTIONS.map(option=><option value={option} key={option}>{option}</option>)}</select><small>Si eliges “Otro”, describe el requerimiento en Observación.</small></label><label className="span-2">Observación<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Detalles adicionales, requerimiento especial, información relevante..."/></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={()=>void save()}>{busy?'Registrando...':'Registrar llegada'}</button></div></div></div>
}