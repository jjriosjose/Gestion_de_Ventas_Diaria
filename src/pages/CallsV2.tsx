import { useEffect,useMemo,useState } from 'react'
import { CalendarClock,Check,History,PhoneCall,Search,ShoppingBag,Users,X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { exportPdf,exportXlsx } from '../lib/export'
import { ClientTypeFilter } from '../components/ClientTypeFilter'
import type { ClientTypeFilterValue } from '../components/ClientTypeFilter'
import { CrmTerritoryFilters,type CrmTerritoryMode } from '../components/CrmTerritoryFilters'
import { EMPTY_OFFICIAL_SELECTION,loadOfficialAreaDirectory,matchesOfficialSelection } from '../lib/officialTerritory'
import type { OfficialArea,OfficialSelection } from '../lib/officialTerritory'
import { loadGeoAssessmentMap } from '../lib/geoQuality'
import type { GeoAssessment } from '../lib/geoQuality'
import { loadClientsPaged } from '../lib/clientLoader'
import type { Employee } from '../types'

const CALL_RESULTS=[
 ['CONTACTADO','Contactado'],['NO_CONTESTA','No contesta'],['OCUPADO','Ocupado'],['TELEFONO_INCORRECTO','Teléfono incorrecto'],
 ['LLAMAR_MAS_TARDE','Llamar más tarde'],['SEGUIMIENTO','Seguimiento'],['INTERESADO_SHOWROOM','Va a visitar showroom'],
 ['COMPRO','Compró'],['NO_COMPRO','No compró'],['NO_INTERESADO','No interesado'],
] as const
const NEXT_ACTIONS=[['','Sin próxima acción'],['LLAMAR_NUEVAMENTE','Llamar nuevamente'],['VISITA_VENDEDOR','Asignar / sugerir visita del vendedor'],['VALIDAR_SHOWROOM','Validar cita de showroom'],['SEGUIMIENTO_PEDIDO','Seguimiento de pedido'],['ENVIAR_INFO','Enviar información'],['OTRO','Otro seguimiento']] as const
const CRM_FILTERS=[['','Todos los clientes'],['NUNCA_LLAMADO','Nunca llamados'],['CONTACTADO','Contactados'],['PENDIENTE','Pendientes de gestión'],['SEGUIMIENTO','Con seguimiento'],['SHOWROOM_PENDIENTE','Showroom por validar'],['CITA_CONFIRMADA','Cita showroom confirmada'],['COMPRO_LLAMADA','Compró por llamada'],['NO_COMPRO_LLAMADA','No compró por llamada'],['VISITADO','Visitados por vendedor'],['NO_VISITADO','Nunca visitados']] as const
const CLIENT_COLUMNS='id,codempr,company_code,client_type,legal_name,contact_name,phone1,mobile,vendor_employee_id,manager_employee_id,region,province,municipality'
const todayKey=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const money=(value:any)=>`RD$${Number(value||0).toLocaleString('es-DO',{maximumFractionDigits:2})}`

export function CallsV2(){
 const {employee}=useAuth()
 const [calls,setCalls]=useState<any[]>([]),[visits,setVisits]=useState<any[]>([]),[appointments,setAppointments]=useState<any[]>([]),[clients,setClients]=useState<any[]>([]),[employees,setEmployees]=useState<Employee[]>([])
 const [officialAreas,setOfficialAreas]=useState<OfficialArea[]>([]),[geoAssessments,setGeoAssessments]=useState<Map<string,GeoAssessment>>(new Map())
 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[view,setView]=useState<'PORTFOLIO'|'HISTORY'>('PORTFOLIO'),[selectedClientId,setSelectedClientId]=useState('')
 const [quickOpen,setQuickOpen]=useState(false),[quickQuery,setQuickQuery]=useState('')
 const [q,setQ]=useState(''),[clientType,setClientType]=useState<ClientTypeFilterValue>(''),[territoryMode,setTerritoryMode]=useState<CrmTerritoryMode>('MASTER'),[region,setRegion]=useState(''),[province,setProvince]=useState(''),[municipality,setMunicipality]=useState(''),[officialSelection,setOfficialSelection]=useState<OfficialSelection>(EMPTY_OFFICIAL_SELECTION)
 const [vendorFilter,setVendorFilter]=useState(''),[managerFilter,setManagerFilter]=useState(''),[crmFilter,setCrmFilter]=useState(''),[callerFilter,setCallerFilter]=useState(''),[resultFilter,setResultFilter]=useState(''),[directionFilter,setDirectionFilter]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState('')

 const load=async()=>{
  setLoading(true);setLoadError('')
  try{
   const [callRes,visitRes,appointmentRes,staffRes,portfolio,areas,assessmentMap]=await Promise.all([
    supabase.from('calls').select('*,clients(id,codempr,legal_name,client_type,vendor_employee_id,manager_employee_id,region,province,municipality),prospects(prospect_code,legal_name),caller:employees!calls_employee_id_fkey(full_name,employee_type)').order('occurred_at',{ascending:false}).limit(4000),
    supabase.from('visits').select('id,client_id,employee_id,started_at,ended_at,purchase_result,purchase_amount,result,follow_up_date,next_action,clients(client_type)').not('ended_at','is',null).order('ended_at',{ascending:false}).limit(5000),
    supabase.from('appointments').select('id,client_id,status,appointment_at,requested_appointment_at,source_type,assigned_manager_id,requested_by_employee_id,created_at').order('created_at',{ascending:false}).limit(3000),
    supabase.from('employees').select('*').eq('active',true).order('full_name'),
    loadClientsPaged(CLIENT_COLUMNS),loadOfficialAreaDirectory(),loadGeoAssessmentMap(),
   ])
   const error=callRes.error||visitRes.error||appointmentRes.error||staffRes.error;if(error)throw error
   setCalls(callRes.data||[]);setVisits(visitRes.data||[]);setAppointments(appointmentRes.data||[]);setEmployees((staffRes.data||[]) as Employee[]);setClients(portfolio);setOfficialAreas(areas);setGeoAssessments(assessmentMap)
  }catch(e){setLoadError(e instanceof Error?e.message:'No fue posible cargar el CRM')}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])
 useEffect(()=>{setProvince('');setMunicipality('')},[region]);useEffect(()=>setMunicipality(''),[province])
 useEffect(()=>{if(territoryMode==='MASTER')setOfficialSelection(EMPTY_OFFICIAL_SELECTION);else{setRegion('');setProvince('');setMunicipality('')}},[territoryMode])

 const vendors=useMemo(()=>employees.filter((e:any)=>e.employee_type==='Vendedor'),[employees]),managers=useMemo(()=>employees.filter((e:any)=>e.employee_type==='Gestor'),[employees])
 const employeeName=(id?:string|null)=>employees.find(e=>e.id===id)?.full_name||'—'
 const lastCallByClient=useMemo(()=>{const m=new Map<string,any>();calls.forEach(r=>{if(r.client_id&&!m.has(r.client_id))m.set(r.client_id,r)});return m},[calls])
 const lastVisitByClient=useMemo(()=>{const m=new Map<string,any>();visits.forEach(r=>{if(r.client_id&&!m.has(r.client_id))m.set(r.client_id,r)});return m},[visits])
 const latestAppointmentByClient=useMemo(()=>{const m=new Map<string,any>();appointments.forEach(r=>{if(r.client_id&&!m.has(r.client_id))m.set(r.client_id,r)});return m},[appointments])

 const territorialClients=useMemo(()=>clients.filter(c=>{
  if(clientType&&c.client_type!==clientType)return false
  if(territoryMode==='MASTER'){
   if(region&&c.region!==region)return false;if(province&&c.province!==province)return false;if(municipality&&c.municipality!==municipality)return false
  }else if(!matchesOfficialSelection(geoAssessments.get(c.id),officialAreas,officialSelection))return false
  if(vendorFilter&&c.vendor_employee_id!==vendorFilter)return false;if(managerFilter&&c.manager_employee_id!==managerFilter)return false
  if(q.trim()){const n=q.trim().toLowerCase();const h=`${c.legal_name||''} ${c.codempr||''} ${c.contact_name||''} ${c.phone1||''} ${c.mobile||''} ${c.region||''} ${c.province||''} ${c.municipality||''}`.toLowerCase();if(!h.includes(n))return false}
  return true
 }),[clients,clientType,territoryMode,region,province,municipality,officialSelection,officialAreas,geoAssessments,vendorFilter,managerFilter,q])

 const filteredPortfolio=useMemo(()=>territorialClients.filter(c=>{
  if(!crmFilter)return true;const call=lastCallByClient.get(c.id),visit=lastVisitByClient.get(c.id),appt=latestAppointmentByClient.get(c.id)
  if(crmFilter==='NUNCA_LLAMADO')return !call
  if(crmFilter==='CONTACTADO')return !!call&&!['NO_CONTESTA','OCUPADO','TELEFONO_INCORRECTO'].includes(call.result)
  if(crmFilter==='PENDIENTE')return !call||!!call.follow_up_date||['NO_CONTESTA','OCUPADO','LLAMAR_MAS_TARDE','SEGUIMIENTO'].includes(call.result)||['PENDIENTE_VALIDACION','CONTACTANDO'].includes(appt?.status)
  if(crmFilter==='SEGUIMIENTO')return !!call?.follow_up_date||['LLAMAR_MAS_TARDE','SEGUIMIENTO'].includes(call?.result)
  if(crmFilter==='SHOWROOM_PENDIENTE')return ['PENDIENTE_VALIDACION','CONTACTANDO'].includes(appt?.status)
  if(crmFilter==='CITA_CONFIRMADA')return ['CONFIRMADA','REPROGRAMADA','PROGRAMADA'].includes(appt?.status)
  if(crmFilter==='COMPRO_LLAMADA')return call?.result==='COMPRO'
  if(crmFilter==='NO_COMPRO_LLAMADA')return call?.result==='NO_COMPRO'
  if(crmFilter==='VISITADO')return !!visit
  if(crmFilter==='NO_VISITADO')return !visit
  return true
 }),[territorialClients,crmFilter,lastCallByClient,lastVisitByClient,latestAppointmentByClient])

 const territorialIds=useMemo(()=>new Set(territorialClients.map(c=>c.id)),[territorialClients])
 const visibleCalls=useMemo(()=>calls.filter(r=>{
  if(r.client_id&&!territorialIds.has(r.client_id))return false;if(callerFilter&&r.employee_id!==callerFilter)return false;if(resultFilter&&r.result!==resultFilter)return false;if(directionFilter&&r.call_direction!==directionFilter)return false
  if(from&&new Date(r.occurred_at)<new Date(`${from}T00:00:00`))return false;if(to&&new Date(r.occurred_at)>new Date(`${to}T23:59:59`))return false
  if(q.trim()&&!r.client_id){const n=q.trim().toLowerCase();if(!`${r.prospects?.legal_name||''} ${r.contact_name||''} ${r.notes||''}`.toLowerCase().includes(n))return false}
  return true
 }),[calls,territorialIds,callerFilter,resultFilter,directionFilter,from,to,q])

 const contactedIds=useMemo(()=>new Set(visibleCalls.filter(r=>r.client_id&&!['NO_CONTESTA','OCUPADO','TELEFONO_INCORRECTO'].includes(r.result)).map(r=>r.client_id)),[visibleCalls])
 const pendingCount=filteredPortfolio.filter(c=>{const call=lastCallByClient.get(c.id),appt=latestAppointmentByClient.get(c.id);return !call||!!call.follow_up_date||['NO_CONTESTA','OCUPADO','LLAMAR_MAS_TARDE','SEGUIMIENTO'].includes(call.result)||['PENDIENTE_VALIDACION','CONTACTANDO'].includes(appt?.status)}).length
 const purchaseRows=visibleCalls.filter(r=>r.result==='COMPRO'),callSales=purchaseRows.reduce((s,r)=>s+Number(r.purchase_amount||0),0),coverage=territorialClients.length?Math.round((contactedIds.size/territorialClients.length)*1000)/10:0
 const selectedClient=clients.find(c=>c.id===selectedClientId)||null
 const quickCandidates=useMemo(()=>{const n=quickQuery.trim().toLowerCase();const base=n?clients.filter(c=>`${c.legal_name||''} ${c.codempr||''} ${c.contact_name||''} ${c.phone1||''} ${c.mobile||''}`.toLowerCase().includes(n)):filteredPortfolio;return base.slice(0,30)},[quickQuery,clients,filteredPortfolio])

 const report=visibleCalls.map(r=>({Fecha:new Date(r.occurred_at).toLocaleString('es-DO'),Direccion:r.call_direction==='ENTRANTE'?'Entrante':'Saliente',TipoCliente:r.clients?.client_type||'',Region:r.clients?.region||'',Provincia:r.clients?.province||'',Municipio:r.clients?.municipality||'',EjecutadaPor:r.caller?.full_name||'',Vendedor:employeeName(r.clients?.vendor_employee_id),Gestor:employeeName(r.clients?.manager_employee_id),Cliente:r.clients?.legal_name||r.prospects?.legal_name||'',Resultado:labelResult(r.result),MontoCompra:Number(r.purchase_amount||0),Contacto:r.contact_name||'',DuracionSeg:r.duration_seconds||'',Showroom:r.appointment_created?'Sí':'No',ProximaAccion:labelNextAction(r.next_action),Seguimiento:r.follow_up_date||'',Observacion:r.notes||''}))
 const clearFilters=()=>{setQ('');setClientType('');setTerritoryMode('MASTER');setRegion('');setProvince('');setMunicipality('');setOfficialSelection(EMPTY_OFFICIAL_SELECTION);setVendorFilter('');setManagerFilter('');setCrmFilter('');setCallerFilter('');setResultFilter('');setDirectionFilter('');setFrom('');setTo('')}
 const manageClient=(clientId:string)=>{setSelectedClientId(clientId);setView('PORTFOLIO');setQuickOpen(false);setQuickQuery('');window.setTimeout(()=>document.getElementById('crm-workbench')?.scrollIntoView({behavior:'smooth',block:'nearest'}),30)}

 return <div className="page-stack">
  <div className="page-head"><div><span className="eyebrow">CRM TERRITORIAL</span><h2>Llamadas</h2><p>Cartera por territorio, cobertura telefónica, seguimientos, ventas y showroom en una sola pantalla.</p></div><div className="button-row"><button className="secondary" onClick={()=>void exportXlsx('CRM_Territorial_Llamadas',report)}>Excel</button><button className="secondary" onClick={()=>exportPdf('CRM Territorial · Llamadas',report)}>PDF</button><button className="primary" onClick={()=>{setView('PORTFOLIO');setQuickOpen(true)}}><PhoneCall size={18}/> Registrar llamada</button></div></div>
  <div className="kpi-grid compact-kpis">
   <Kpi label="Clientes cartera" value={territorialClients.length} sub="según filtros" Icon={Users}/><Kpi label="Contactados" value={contactedIds.size} sub={`${coverage}% cobertura telefónica`} Icon={PhoneCall}/><Kpi label="Pendientes" value={pendingCount} sub="requieren gestión" Icon={History}/><Kpi label="Llamadas visibles" value={visibleCalls.length} sub={`${visibleCalls.filter(r=>String(r.occurred_at).slice(0,10)===todayKey()).length} hoy`} Icon={PhoneCall}/><Kpi label="Compraron" value={purchaseRows.length} sub="vía llamada" Icon={ShoppingBag}/><Kpi label="Ventas llamada" value={money(callSales)} sub="monto registrado" Icon={ShoppingBag}/>
  </div>
  <div className="panel planner-filter-panel">
   <CrmTerritoryFilters clients={clients} mode={territoryMode} onModeChange={setTerritoryMode} region={region} onRegionChange={setRegion} province={province} onProvinceChange={setProvince} municipality={municipality} onMunicipalityChange={setMunicipality} officialAreas={officialAreas} officialSelection={officialSelection} onOfficialSelectionChange={setOfficialSelection}/>
   <div className="planner-filter-grid"><div className="search-field"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cliente, código, teléfono, contacto..."/></div><ClientTypeFilter value={clientType} onChange={setClientType}/><select value={vendorFilter} onChange={e=>setVendorFilter(e.target.value)}><option value="">Todos los vendedores</option>{vendors.map(e=><option value={e.id} key={e.id}>{e.full_name}</option>)}</select><select value={managerFilter} onChange={e=>setManagerFilter(e.target.value)}><option value="">Todos los gestores</option>{managers.map(e=><option value={e.id} key={e.id}>{e.full_name}</option>)}</select><select value={crmFilter} onChange={e=>setCrmFilter(e.target.value)}>{CRM_FILTERS.map(([v,l])=><option value={v} key={v||'all'}>{l}</option>)}</select><select value={callerFilter} onChange={e=>setCallerFilter(e.target.value)}><option value="">Ejecutada por cualquiera</option>{employees.map(e=><option value={e.id} key={e.id}>{e.full_name}</option>)}</select><select value={resultFilter} onChange={e=>setResultFilter(e.target.value)}><option value="">Todos los resultados</option>{CALL_RESULTS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><select value={directionFilter} onChange={e=>setDirectionFilter(e.target.value)}><option value="">Entrantes y salientes</option><option value="SALIENTE">Salientes</option><option value="ENTRANTE">Entrantes</option></select><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></div>
   <div className="planner-filter-actions"><div className="meta"><span>{filteredPortfolio.length} clientes visibles</span><span>{visibleCalls.length} llamadas</span><span>{coverage}% cobertura</span></div><button className="secondary" onClick={clearFilters}>Limpiar filtros</button></div>
  </div>
  {loadError&&<div className="panel"><b>No fue posible cargar todos los datos del CRM.</b><span>{loadError}</span></div>}
  <div className="tabs"><button className={view==='PORTFOLIO'?'active':''} onClick={()=>setView('PORTFOLIO')}><Users size={16}/> Cartera / seguimiento</button><button className={view==='HISTORY'?'active':''} onClick={()=>setView('HISTORY')}><History size={16}/> Historial de llamadas</button></div>
  {view==='PORTFOLIO'?<div className="crm-call-split" id="crm-cartera"><div className="panel crm-call-list-panel"><div className="panel-head"><div><b>Cartera priorizada</b><span>Selecciona un cliente y gestiona sin salir de esta pantalla.</span></div><span className="badge">{filteredPortfolio.length}</span></div><div className="cards-list crm-call-client-list">{loading?<div className="skeleton tall"/>:filteredPortfolio.slice(0,250).map(c=>{const call=lastCallByClient.get(c.id),appt=latestAppointmentByClient.get(c.id);return <div key={c.id} className={`activity-card crm-client-row ${selectedClientId===c.id?'selected':''}`}><div className="activity-main"><b>{c.legal_name}</b><span>{c.codempr} · {c.client_type||'SIN TIPO'} · {c.region||'—'} / {c.province||'—'} / {c.municipality||'—'}</span><small>V: {employeeName(c.vendor_employee_id)} · G: {employeeName(c.manager_employee_id)} · última llamada: {call?new Date(call.occurred_at).toLocaleString('es-DO'):'Nunca'}{appt?` · showroom ${String(appt.status).replaceAll('_',' ')}`:''}</small></div><button type="button" className="secondary compact" onClick={()=>manageClient(c.id)}>Gestionar</button></div>})}</div></div><div className="crm-call-workbench-slot">{selectedClient?<CallWorkbench client={selectedClient} employee={employee} lastCall={lastCallByClient.get(selectedClient.id)} lastVisit={lastVisitByClient.get(selectedClient.id)} lastAppointment={latestAppointmentByClient.get(selectedClient.id)} onSaved={load}/>:<div className="panel empty-state"><PhoneCall/><b>Selecciona un cliente para gestionar</b><span>El formulario aparecerá aquí inmediatamente y permanecerá visible mientras recorres la cartera.</span></div>}</div></div>:<div className="panel"><div className="panel-head"><div><b>Historial de llamadas</b><span>{visibleCalls.length} registros visibles.</span></div></div><div className="cards-list">{visibleCalls.slice(0,500).map(r=><div className="activity-card" key={r.id}><div className="activity-icon"><PhoneCall/></div><div className="activity-main"><b>{r.clients?.legal_name||r.prospects?.legal_name||'Llamada'}</b><span>{new Date(r.occurred_at).toLocaleString('es-DO')} · {r.call_direction==='ENTRANTE'?'Entrante':'Saliente'} · {r.caller?.full_name||'—'}</span><small>{labelResult(r.result)}{r.purchase_amount?` · ${money(r.purchase_amount)}`:''}{r.next_action?` · ${labelNextAction(r.next_action)}`:''}</small></div></div>)}</div></div>}
  {quickOpen&&<div className="modal-wrap"><button className="modal-backdrop" onClick={()=>setQuickOpen(false)}/><div className="modal large crm-call-picker"><div className="modal-head"><div><span className="eyebrow">REGISTRAR LLAMADA</span><h3>Selecciona el cliente</h3><p>Busca por nombre, código, contacto o teléfono. Después tendrás toda la ficha 360 para registrar la gestión.</p></div><button className="icon-btn" onClick={()=>setQuickOpen(false)}><X/></button></div><div className="search-field"><Search size={18}/><input autoFocus value={quickQuery} onChange={e=>setQuickQuery(e.target.value)} placeholder="Buscar cliente..."/></div><div className="cards-list crm-call-picker-list">{quickCandidates.length===0?<div className="empty-state"><b>No se encontraron clientes.</b></div>:quickCandidates.map(c=><div className="activity-card crm-client-row" key={c.id}><div className="activity-main"><b>{c.legal_name}</b><span>{c.codempr} · {c.client_type||'SIN TIPO'}</span><small>V: {employeeName(c.vendor_employee_id)} · G: {employeeName(c.manager_employee_id)} · {c.region||'—'} / {c.province||'—'} / {c.municipality||'—'}</small></div><button type="button" className="primary compact" onClick={()=>manageClient(c.id)}>Gestionar</button></div>)}</div></div></div>}
 </div>
}

function Kpi({label,value,sub,Icon}:{label:string;value:any;sub:string;Icon:any}){return <div className="kpi-card"><div className="kpi-icon"><Icon/></div><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></div>}

function CallWorkbench({client,employee,lastCall,lastVisit,lastAppointment,onSaved}:{client:any;employee:any;lastCall:any;lastVisit:any;lastAppointment:any;onSaved:()=>Promise<void>|void}){
 const [result,setResult]=useState('CONTACTADO'),[direction,setDirection]=useState('SALIENTE'),[contact,setContact]=useState(client.contact_name||''),[duration,setDuration]=useState('5'),[purchaseAmount,setPurchaseAmount]=useState(''),[nextAction,setNextAction]=useState(''),[followUp,setFollowUp]=useState(''),[notes,setNotes]=useState(''),[showroomDate,setShowroomDate]=useState(''),[showroomConfirmed,setShowroomConfirmed]=useState(false),[busy,setBusy]=useState(false)
 useEffect(()=>{setContact(client.contact_name||'');setPurchaseAmount('');setNotes('');setShowroomDate('');setShowroomConfirmed(false)},[client.id])
 const showroom=result==='INTERESADO_SHOWROOM'
 const save=async()=>{
  if(!employee?.id)return;if(result==='COMPRO'&&Number(purchaseAmount)<=0)return alert('Indica el monto de la compra registrada por llamada.')
  if(showroom&&!showroomDate)return alert('Selecciona la fecha/hora tentativa del showroom.');if(showroom&&!showroomConfirmed)return alert('Confirma la fecha/hora tentativa antes de guardar.')
  setBusy(true)
  try{
   const payload:any={client_id:client.id,employee_id:employee.id,occurred_at:new Date().toISOString(),result,call_direction:direction,duration_seconds:Math.max(0,Number(duration||0))*60,contact_name:contact||null,phone_used:client.mobile||client.phone1||null,appointment_created:showroom,purchase_amount:result==='COMPRO'?Number(purchaseAmount):null,next_action:showroom?'VALIDAR_SHOWROOM':nextAction||null,follow_up_date:followUp||null,notes:notes||null}
   const {data:call,error}=await supabase.from('calls').insert(payload).select('id').single();if(error)throw error
   if(showroom){const managerId=client.manager_employee_id||null,tentative=new Date(showroomDate).toISOString();const {error:appointmentError}=await supabase.from('appointments').insert({client_id:client.id,employee_id:managerId||employee.id,created_from_call_id:call.id,assigned_manager_id:managerId,requested_by_employee_id:employee.id,source_type:'LLAMADA',requested_at:new Date().toISOString(),requested_appointment_at:tentative,appointment_at:tentative,appointment_type:'SHOWROOM',status:'PENDIENTE_VALIDACION',request_contact_name:contact||null,request_phone:client.mobile||client.phone1||null,notes:notes||null});if(appointmentError)throw appointmentError;if(!managerId)alert('Solicitud creada sin Gestor oficial. Dirección deberá asignar responsable antes de validar la cita.')}
   await onSaved();setResult('CONTACTADO');setPurchaseAmount('');setNextAction('');setFollowUp('');setNotes('');setShowroomDate('');setShowroomConfirmed(false);alert('Gestión CRM registrada correctamente.')
  }catch(e){alert(e instanceof Error?e.message:'No se pudo registrar la llamada')}finally{setBusy(false)}
 }
 return <div className="panel" id="crm-workbench"><div className="panel-head"><div><span className="eyebrow">CLIENTE 360</span><b>{client.legal_name}</b><span>{client.codempr} · {client.client_type||'SIN TIPO'} · {client.region||'—'} / {client.province||'—'} / {client.municipality||'—'}</span></div><span className="badge">{client.manager_employee_id?'Gestor asignado':'Sin gestor'}</span></div><div className="context-grid"><div><span>Última llamada</span><b>{lastCall?new Date(lastCall.occurred_at).toLocaleString('es-DO'):'Nunca'}</b></div><div><span>Última visita</span><b>{lastVisit?new Date(lastVisit.ended_at||lastVisit.started_at).toLocaleString('es-DO'):'Nunca'}</b></div><div><span>Showroom</span><b>{lastAppointment?String(lastAppointment.status).replaceAll('_',' '):'Sin cita'}</b></div></div><div className="form-grid"><label>Dirección<select value={direction} onChange={e=>setDirection(e.target.value)}><option value="SALIENTE">Saliente · gestor llama</option><option value="ENTRANTE">Entrante · cliente llama</option></select></label><label>Resultado / gestión<select value={result} onChange={e=>{setResult(e.target.value);if(e.target.value!=='INTERESADO_SHOWROOM'){setShowroomDate('');setShowroomConfirmed(false)}}}>{CALL_RESULTS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label>Persona contactada<input value={contact} onChange={e=>setContact(e.target.value)}/></label><label>Duración aproximada (min)<input type="number" min="0" value={duration} onChange={e=>setDuration(e.target.value)}/></label>{result==='COMPRO'&&<label className="span-2">Monto de compra RD$<input type="number" min="0" step="0.01" value={purchaseAmount} onChange={e=>setPurchaseAmount(e.target.value)} placeholder="0.00"/><small>Este monto alimentará Ventas registradas hoy.</small></label>}<label>Próxima acción<select value={nextAction} onChange={e=>setNextAction(e.target.value)} disabled={showroom}>{NEXT_ACTIONS.map(([v,l])=><option value={v} key={v||'none'}>{l}</option>)}</select></label><label>Fecha seguimiento<input type="date" value={followUp} onChange={e=>setFollowUp(e.target.value)}/></label>{showroom&&<label className="span-2">Fecha/hora tentativa showroom<div style={{display:'flex',gap:8,alignItems:'center'}}><input type="datetime-local" value={showroomDate} onChange={e=>{setShowroomDate(e.target.value);setShowroomConfirmed(false)}}/><button type="button" className="secondary compact" disabled={!showroomDate} onClick={()=>{setShowroomConfirmed(true);(document.activeElement as HTMLElement|null)?.blur()}}><Check size={15}/> Confirmar fecha/hora</button></div><small>{showroomConfirmed&&showroomDate?`✓ Confirmada: ${new Date(showroomDate).toLocaleString('es-DO')}`:'La solicitud llegará al Gestor del cliente como pendiente de validación.'}</small></label>}<label className="span-2">Observación<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Necesidad, objeción, compromiso, información solicitada..."/></label></div><div className="modal-actions"><button className="primary" disabled={busy} onClick={()=>void save()}>{busy?'Guardando...':'Guardar gestión CRM'}</button></div></div>
}

function labelResult(value?:string){return CALL_RESULTS.find(([v])=>v===value)?.[1]||value||''}
function labelNextAction(value?:string){return NEXT_ACTIONS.find(([v])=>v===value)?.[1]||value||''}
