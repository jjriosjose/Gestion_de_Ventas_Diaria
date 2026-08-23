import { useEffect,useMemo,useRef,useState } from 'react'
import { CalendarRange,Camera,FilterX,ImagePlus,MapPin,Navigation,Plus,Target,Upload,X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { currentPosition,googleMapsNavigation } from '../lib/geo'
import { useAuth } from '../context/AuthContext'
import { exportPdf,exportXlsx } from '../lib/export'
import { TerritoryClientMap } from '../components/TerritoryClientMap'
import type { MapZone } from '../components/TerritoryClientMap'
import { OfficialTerritoryFilters } from '../components/OfficialTerritoryFilters'
import { EMPTY_OFFICIAL_SELECTION, loadOfficialAreaDirectory, loadOfficialAreaGeometry, matchesOfficialSelection, officialSelectionForArea, selectedOfficialAreaId } from '../lib/officialTerritory'
import type { OfficialArea, OfficialSelection } from '../lib/officialTerritory'
import { loadGeoAssessmentMap, matchesGeoQualityFilter } from '../lib/geoQuality'
import type { GeoAssessment, GeoQualityFilter } from '../lib/geoQuality'
import { loadClientsPaged } from '../lib/clientLoader'
import { hasPermission } from '../lib/access'
import type { Client, Employee } from '../types'
import '../styles/operational-v059.css'
import '../styles/operational-v0510.css'

const CAPTURE_CLIENT_COLUMNS='id,company_code,codempr,legal_name,v_cartera,g_cartera,vendor_employee_id,manager_employee_id,region,province,municipality,latitude,longitude,geo_status'
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const addDays=(iso:string,days:number)=>{const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()+days);return d.toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})}
const humanDate=(iso?:string|null)=>iso?new Date(`${iso}T12:00:00`).toLocaleDateString('es-DO',{day:'2-digit',month:'2-digit',year:'numeric'}):'—'

type CaptureTask={id:string;employee_id:string;route_date:string;period_end_date?:string|null;official_area_id?:string|null;official_area_name?:string|null;official_area_level?:string|null;target_prospects?:number|null;status?:string|null;include_saturday?:boolean|null;title?:string|null}

const isTaskActiveToday=(task:CaptureTask,iso=today())=>{
  if(task.status==='FINALIZADA'||task.status==='CANCELADA')return false
  if(iso<task.route_date||iso>(task.period_end_date||task.route_date))return false
  const day=new Date(`${iso}T12:00:00`).getDay()
  if(day===0)return false
  if(day===6&&!task.include_saturday)return false
  return true
}

const geometryCenter=(geometry:unknown):[number,number]|null=>{
  const points:Array<[number,number]>=[]
  const walk=(value:any)=>{
    if(Array.isArray(value)){
      if(value.length>=2&&typeof value[0]==='number'&&typeof value[1]==='number')points.push([value[1],value[0]])
      else value.forEach(walk)
      return
    }
    if(value&&typeof value==='object'&&'coordinates' in value)walk(value.coordinates)
  }
  walk(geometry)
  if(!points.length)return null
  let minLat=points[0][0],maxLat=points[0][0],minLng=points[0][1],maxLng=points[0][1]
  points.forEach(([lat,lng])=>{minLat=Math.min(minLat,lat);maxLat=Math.max(maxLat,lat);minLng=Math.min(minLng,lng);maxLng=Math.max(maxLng,lng)})
  return[(minLat+maxLat)/2,(minLng+maxLng)/2]
}

const officialAreaSearchLabel=(area:OfficialArea|null,selection:OfficialSelection,areas:OfficialArea[])=>{
  if(!area)return''
  const province=selection.provinceId?areas.find(item=>item.id===selection.provinceId)?.name:''
  const municipality=selection.municipalityId?areas.find(item=>item.id===selection.municipalityId)?.name:''
  const parts=[area.name]
  if(area.area_level==='DISTRITO_MUNICIPAL'&&municipality&&municipality!==area.name)parts.push(municipality)
  if(province&&province!==area.name)parts.push(province)
  parts.push('República Dominicana')
  return parts.filter(Boolean).join(', ')
}
const googleMapsAreaSearch=(label:string)=>label?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`:null

export function Capture(){
  const {employee}=useAuth();const canCreate=hasPermission(employee,'capture.create');const canAssign=hasPermission(employee,'planning.manage')
  const [rows,setRows]=useState<any[]>([]);const [tasks,setTasks]=useState<CaptureTask[]>([]);const [open,setOpen]=useState(false);const [clients,setClients]=useState<Client[]>([]);const [employees,setEmployees]=useState<Employee[]>([]);const [geoAssessments,setGeoAssessments]=useState<Map<string,GeoAssessment>>(new Map());const [officialAreas,setOfficialAreas]=useState<OfficialArea[]>([]);const [officialSelection,setOfficialSelection]=useState<OfficialSelection>(EMPTY_OFFICIAL_SELECTION);const [officialArea,setOfficialArea]=useState<OfficialArea|null>(null);const [vendor,setVendor]=useState(employee?.employee_type==='Vendedor'?employee.id:'');const [quality,setQuality]=useState<GeoQualityFilter>('ALL')
  const [taskStart,setTaskStart]=useState(today());const [taskEnd,setTaskEnd]=useState(addDays(today(),3));const [target,setTarget]=useState(10);const [includeSaturday,setIncludeSaturday]=useState(false);const [savingTask,setSavingTask]=useState(false);const [selectedTaskId,setSelectedTaskId]=useState('')

  const load=async()=>{const [prospects,clientRows,employeeResponse,assessmentMap,areaRows,taskResponse]=await Promise.all([
    supabase.from('prospects').select('*,employees!prospects_captured_by_employee_id_fkey(full_name)').order('captured_at',{ascending:false}).limit(500),
    loadClientsPaged(CAPTURE_CLIENT_COLUMNS),
    supabase.from('employees').select('*').eq('active',true).eq('employee_type','Vendedor').order('full_name'),
    loadGeoAssessmentMap(),
    loadOfficialAreaDirectory(),
    supabase.from('route_plans').select('id,employee_id,route_date,period_end_date,official_area_id,official_area_name,official_area_level,target_prospects,status,include_saturday,title').eq('plan_type','CAPTACION').neq('status','CANCELADA').order('route_date',{ascending:false}).limit(200)
  ]);if(prospects.error)throw prospects.error;if(employeeResponse.error)throw employeeResponse.error;if(taskResponse.error)throw taskResponse.error;setRows(prospects.data||[]);setClients(clientRows);setEmployees((employeeResponse.data||[]) as Employee[]);setGeoAssessments(assessmentMap);setOfficialAreas(areaRows);setTasks((taskResponse.data||[]) as CaptureTask[])}
  useEffect(()=>{void load().catch(error=>alert(error instanceof Error?error.message:'No fue posible cargar Captación'))},[])
  useEffect(()=>{const id=selectedOfficialAreaId(officialSelection);if(!id)return setOfficialArea(null);void loadOfficialAreaGeometry(id).then(setOfficialArea).catch(()=>setOfficialArea(null))},[officialSelection])

  useEffect(()=>{
    if(canAssign||selectedTaskId||!employee?.id||!officialAreas.length||!tasks.length)return
    const own=tasks.filter(task=>task.employee_id===employee.id&&task.status!=='CANCELADA')
    const preferred=own.find(task=>isTaskActiveToday(task))||own.find(task=>(task.period_end_date||task.route_date)>=today())||own[0]
    if(!preferred)return
    setSelectedTaskId(preferred.id)
    setVendor(employee.id)
    if(preferred.official_area_id)setOfficialSelection(officialSelectionForArea(officialAreas,preferred.official_area_id))
  },[canAssign,employee?.id,officialAreas,tasks,selectedTaskId])

  const filteredClients=useMemo(()=>clients.filter(client=>{if(vendor&&client.vendor_employee_id!==vendor)return false;if(!matchesOfficialSelection(geoAssessments.get(client.id),officialAreas,officialSelection))return false;if(!matchesGeoQualityFilter(geoAssessments.get(client.id),quality))return false;return true}),[clients,vendor,geoAssessments,officialAreas,officialSelection,quality])
  const mappedCount=filteredClients.filter(c=>c.latitude!=null&&c.longitude!=null).length
  const officialZone:MapZone|null=officialArea?.geometry?{id:`official-${officialArea.id}`,name:officialArea.name,territory_type:`CAPTACIÓN · ${officialArea.area_level}`,geometry:officialArea.geometry}:null
  const taskCounts=useMemo(()=>{const map=new Map<string,number>();rows.forEach(r=>{if(r.capture_assignment_id)map.set(r.capture_assignment_id,(map.get(r.capture_assignment_id)||0)+1)});return map},[rows])
  const visibleTasks=useMemo(()=>tasks.filter(task=>{if(!canAssign&&employee?.id&&task.employee_id!==employee.id)return false;if(vendor&&task.employee_id!==vendor)return false;return true}),[tasks,canAssign,employee?.id,vendor])
  const activeOwnTasks=useMemo(()=>tasks.filter(task=>task.employee_id===employee?.id&&isTaskActiveToday(task)),[tasks,employee?.id])
  const visibleProspects=useMemo(()=>canAssign?rows:rows.filter(row=>row.captured_by_employee_id===employee?.id),[rows,canAssign,employee?.id])
  const report=visibleProspects.map(r=>({Codigo:r.prospect_code||'',Prospecto:r.legal_name,Contacto:r.contact_name||'',Telefono:r.phone||r.mobile||'',Estado:r.status,Region:r.region||'',Provincia:r.province||'',Municipio:r.municipality||'',Captado:r.employees?.full_name||'',Fecha:new Date(r.captured_at).toLocaleString('es-DO')}))
  const employeeName=(id:string)=>employees.find(item=>item.id===id)?.full_name||'—'
  const selectedTask=tasks.find(task=>task.id===selectedTaskId)||null
  const selectedZoneCenter=useMemo(()=>geometryCenter(officialArea?.geometry),[officialArea?.geometry])
  const selectedZoneNavigation=selectedZoneCenter?googleMapsNavigation(selectedZoneCenter[0],selectedZoneCenter[1]):null
  const selectedZoneSearchLabel=useMemo(()=>officialAreaSearchLabel(officialArea,officialSelection,officialAreas),[officialArea,officialSelection,officialAreas])
  const selectedZoneSearch=googleMapsAreaSearch(selectedZoneSearchLabel)

  const focusTask=(task:CaptureTask,startCapture=false)=>{
    setSelectedTaskId(task.id)
    setVendor(task.employee_id)
    setQuality('ALL')
    if(task.official_area_id)setOfficialSelection(officialSelectionForArea(officialAreas,task.official_area_id))
    if(startCapture&&canCreate&&isTaskActiveToday(task))setOpen(true)
    window.setTimeout(()=>document.getElementById('capture-task-map')?.scrollIntoView({behavior:'smooth',block:'start'}),60)
  }

  const createTask=async()=>{if(!canAssign)return;if(!vendor)return alert('Selecciona el vendedor.');if(!officialArea)return alert('Selecciona una división territorial oficial.');if(!taskStart||!taskEnd||taskEnd<taskStart)return alert('Revisa el rango de fechas.');if(target<1)return alert('El objetivo debe ser mayor que cero.');setSavingTask(true);try{const{data,error}=await supabase.from('route_plans').insert({employee_id:vendor,route_date:taskStart,period_end_date:taskEnd,plan_type:'CAPTACION',territory_id:null,official_area_id:officialArea.id,official_area_name:officialArea.name,official_area_level:officialArea.area_level,title:`Captación · ${officialArea.name}`,target_prospects:target,status:'PLANIFICADA',include_saturday:includeSaturday,notes:`División territorial oficial · ${officialArea.area_level}: ${officialArea.name}`}).select('id').single();if(error)throw error;setSelectedTaskId(data.id);await load();alert(`Tarea asignada: ${employeeName(vendor)} · ${officialArea.name} · ${humanDate(taskStart)} al ${humanDate(taskEnd)} · objetivo ${target}.`)}catch(error){alert(error instanceof Error?error.message:'No se pudo crear la tarea de captación')}finally{setSavingTask(false)}}

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">DESARROLLO DE CLIENTES</span><h2>{canAssign?'Captación':'Mi captación'}</h2><p>{canAssign?'Analiza presencia comercial, asigna objetivos territoriales y registra prospectos con GPS y fotografías.':'Consulta tus zonas asignadas, revisa el objetivo de la jornada y registra nuevos prospectos desde el terreno.'}</p></div><div className="button-row">{canAssign&&<><button className="secondary" onClick={()=>void exportXlsx('Prospectos_Captados',report)}>Excel</button><button className="secondary" onClick={()=>exportPdf('Prospectos Captados',report)}>PDF</button></>}{canCreate&&<button className="primary" onClick={()=>setOpen(true)}><Plus size={18}/> Nuevo prospecto</button>}</div></div>

    {canAssign?<section className="panel planner-filter-panel"><div className="panel-head"><div><b>Oportunidad territorial</b><span>La división oficial no depende de la cartera. Los clientes muestran la presencia actual del vendedor en la zona.</span></div></div><div className="planner-filter-grid capture-filter-grid"><select value={vendor} onChange={e=>{setVendor(e.target.value);setSelectedTaskId('')}}><option value="">Todos los vendedores</option>{employees.map(item=><option value={item.id} key={item.id}>{item.full_name}</option>)}</select><OfficialTerritoryFilters areas={officialAreas} value={officialSelection} onChange={value=>{setOfficialSelection(value);setSelectedTaskId('')}}/><select value={quality} onChange={e=>setQuality(e.target.value as GeoQualityFilter)}><option value="ALL">Cualquier coherencia</option><option value="COHERENTE">Maestro = ubicación</option><option value="DIFERENCIA">Maestro ≠ ubicación</option><option value="VERIFICADO_VISITA">Verificado por visita</option><option value="SIN_GEO">Sin GPS</option><option value="FUERA_DIVISION">Fuera de división</option></select></div><div className="planner-filter-actions"><div className="meta"><span>{filteredClients.length.toLocaleString()} clientes en selección</span><span>{mappedCount.toLocaleString()} visibles en mapa</span>{officialArea&&<span>Zona oficial: {officialArea.name}</span>}<span>{visibleProspects.length.toLocaleString()} prospectos recientes</span></div><button className="secondary compact" onClick={()=>{setVendor('');setOfficialSelection(EMPTY_OFFICIAL_SELECTION);setQuality('ALL');setSelectedTaskId('')}}><FilterX size={15}/> Limpiar filtros</button></div></section>:<section className="panel seller-capture-summary"><div><span className="eyebrow">OPERACIÓN DE CALLE</span><h3>Mis tareas de captación</h3><p>Abre una tarea para cargar automáticamente su división oficial, centrar el mapa y ver los clientes existentes como referencia.</p></div><div className="seller-capture-user"><MapPin size={18}/><div><b>{employee?.full_name}</b><span>{activeOwnTasks.length} tarea(s) activa(s) hoy</span></div></div></section>}

    {canAssign&&<section className="panel capture-assignment-panel"><div className="panel-head"><div><b>Asignar tarea de captación</b><span>Usa el vendedor y la división oficial seleccionados arriba. El domingo no se considera día habitual; sábado es opcional.</span></div></div><div className="capture-assignment-toolbar"><div className="assignment-callout"><MapPin size={18}/><div><b>{officialArea?officialArea.name:'Selecciona una división oficial'}</b><span>{vendor?employeeName(vendor):'Selecciona un vendedor'} · {filteredClients.length} clientes actuales como referencia</span></div></div><label>Desde<input type="date" value={taskStart} onChange={e=>setTaskStart(e.target.value)}/></label><label>Hasta<input type="date" value={taskEnd} min={taskStart} onChange={e=>setTaskEnd(e.target.value)}/></label><label>Objetivo<input type="number" min={1} value={target} onChange={e=>setTarget(Math.max(1,Number(e.target.value)||1))}/></label><button className="primary" disabled={savingTask||!vendor||!officialArea} onClick={()=>void createTask()}><Target size={17}/>{savingTask?'Asignando...':'Asignar tarea'}</button></div><label className="checkbox"><input type="checkbox" checked={includeSaturday} onChange={e=>setIncludeSaturday(e.target.checked)}/> Incluir sábados dentro del período</label></section>}

    {visibleTasks.length>0?<section className="panel"><div className="panel-head"><div><b>{canAssign?'Tareas de captación':'Mis asignaciones'}</b><span>{canAssign?'Objetivo y avance registrados contra cada tarea asignada.':'Selecciona la tarea que vas a ejecutar. Solo las tareas activas permiten registrar captaciones contra el objetivo.'}</span></div></div><div className="capture-task-list">{visibleTasks.slice(0,24).map(task=>{const done=taskCounts.get(task.id)||0;const goal=Math.max(1,task.target_prospects||1);const pct=Math.min(100,Math.round(done/goal*100));const current=isTaskActiveToday(task);return <div className={`capture-task-card ${current?'active':''} ${selectedTaskId===task.id?'selected-task':''}`} key={task.id}><div className="task-head"><div><b>{task.official_area_name||task.title||'Captación territorial'}</b><span>{canAssign?`${employeeName(task.employee_id)} · `:''}{task.official_area_level||'Zona'}</span></div><span className="badge">{current?'ACTIVA':task.status||'PLANIFICADA'}</span></div><span><CalendarRange size={12}/> {humanDate(task.route_date)} → {humanDate(task.period_end_date||task.route_date)} · Lun–Vie{task.include_saturday?' + sábados':''}</span><div className="task-progress-line"><i style={{width:`${pct}%`}}/></div><div className="task-metrics"><div><span>Captados</span><strong>{done}</strong></div><div><span>Objetivo</span><strong>{goal}</strong></div><div><span>Avance</span><strong>{pct}%</strong></div></div><div className="task-actions"><button className="secondary compact" onClick={()=>focusTask(task,false)}><MapPin size={14}/> {canAssign?'Ver zona':'Abrir zona'}</button>{!canAssign&&canCreate&&current&&<button className="primary compact" onClick={()=>focusTask(task,true)}><Plus size={14}/> Registrar prospecto</button>}</div></div>})}</div></section>:!canAssign&&<section className="panel"><div className="empty-state"><Target/><b>No tienes tareas de captación asignadas.</b><span>Cuando administración te asigne una zona y período, aparecerá aquí.</span></div></section>}

    {selectedTask&&<section className="panel selected-capture-task"><div className="selected-task-copy"><span className="eyebrow">{isTaskActiveToday(selectedTask)?'TAREA ACTIVA':'TAREA SELECCIONADA'}</span><h3>{selectedTask.official_area_name||selectedTask.title}</h3><p>{humanDate(selectedTask.route_date)} → {humanDate(selectedTask.period_end_date||selectedTask.route_date)} · Objetivo {selectedTask.target_prospects||0} prospectos · {taskCounts.get(selectedTask.id)||0} registrados.</p></div><div className="button-row"><select value={quality} onChange={e=>setQuality(e.target.value as GeoQualityFilter)}><option value="ALL">Todos los clientes de referencia</option><option value="COHERENTE">Solo ubicación coherente</option><option value="DIFERENCIA">Maestro ≠ ubicación</option><option value="VERIFICADO_VISITA">Verificados por visita</option></select>{selectedZoneSearch&&<a className="secondary" target="_blank" rel="noreferrer" href={selectedZoneSearch}><MapPin size={17}/> Ver {selectedTask.official_area_name||'zona'} en Google Maps</a>}{selectedZoneNavigation&&<a className="secondary compact" target="_blank" rel="noreferrer" href={selectedZoneNavigation}><Navigation size={16}/> Navegar al centro</a>}{!canAssign&&canCreate&&isTaskActiveToday(selectedTask)&&<button className="primary" onClick={()=>setOpen(true)}><Plus size={17}/> Registrar prospecto</button>}</div></section>}

    <div id="capture-task-map"><TerritoryClientMap clients={filteredClients} geoAssessments={geoAssessments} zones={officialZone?[officialZone]:[]} showZones={true} focusPoint={selectedTask?selectedZoneCenter:null} height={620}/></div>
    <div className="panel"><div className="panel-head"><div><b>{canAssign?'Prospectos captados':'Mis prospectos captados'}</b><span>Historial reciente de captación en calle.</span></div></div><div className="cards-list">{visibleProspects.map(r=><div className="activity-card" key={r.id}><div className="activity-icon"><MapPin/></div><div className="activity-main"><b>{r.legal_name}</b><span>{r.prospect_code||'Prospecto'} · {r.municipality||r.province||'Sin zona'}</span><small>{r.status} · Captado por {r.employees?.full_name||'—'}{r.capture_assignment_id?' · tarea asignada':''}</small></div><span className="badge">{new Date(r.captured_at).toLocaleDateString('es-DO')}</span></div>)}</div></div>
    {open&&<NewProspect employeeId={employee?.id||''} tasks={activeOwnTasks} preferredTaskId={selectedTask&&isTaskActiveToday(selectedTask)?selectedTask.id:''} onClose={()=>setOpen(false)} onSaved={()=>{setOpen(false);void load()}}/>}
  </div>}

function NewProspect({employeeId,tasks,preferredTaskId,onClose,onSaved}:{employeeId:string;tasks:CaptureTask[];preferredTaskId?:string;onClose:()=>void;onSaved:()=>void}){
  const initialTask=preferredTaskId&&tasks.some(task=>task.id===preferredTaskId)?preferredTaskId:tasks.length===1?tasks[0].id:''
  const [name,setName]=useState('');const [contact,setContact]=useState('');const [phone,setPhone]=useState('');const [type,setType]=useState('');const [interest,setInterest]=useState('');const [notes,setNotes]=useState('');const [assignmentId,setAssignmentId]=useState(initialTask);const [geo,setGeo]=useState<any>(null);const [files,setFiles]=useState<File[]>([]);const [busy,setBusy]=useState(false);const input=useRef<HTMLInputElement|null>(null)
  const getGps=async()=>{try{setGeo(await currentPosition())}catch(e){alert(e instanceof Error?e.message:'Error')}}
  const save=async()=>{if(!name.trim()||!employeeId)return alert('Nombre obligatorio');setBusy(true);try{const p=geo||await currentPosition();const code=`PRO-${Date.now().toString().slice(-8)}`;const{data:prospect,error}=await supabase.from('prospects').insert({prospect_code:code,legal_name:name.trim(),contact_name:contact||null,phone:phone||null,mobile:phone||null,client_type:type||null,business_interest:interest||null,latitude:p.latitude,longitude:p.longitude,gps_accuracy_m:p.accuracy,status:'NUEVO',captured_by_employee_id:employeeId,capture_assignment_id:assignmentId||null,notes:notes||null}).select().single();if(error)throw error;for(const f of files){const ext=f.name.split('.').pop()?.toLowerCase()||'jpg';const path=`prospects/${prospect.id}/${crypto.randomUUID()}.${ext}`;const{error:up}=await supabase.storage.from('karaka-photos').upload(path,f,{contentType:f.type||'image/jpeg'});if(up)throw up;await supabase.from('photos').insert({prospect_id:prospect.id,employee_id:employeeId,bucket_id:'karaka-photos',object_path:path,photo_type:'FACHADA',mime_type:f.type,size_bytes:f.size,latitude:p.latitude,longitude:p.longitude,taken_at:new Date().toISOString()})}onSaved()}catch(e){alert(e instanceof Error?e.message:'Error guardando prospecto')}finally{setBusy(false)}}
  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal large"><div className="modal-head"><div><span className="eyebrow">CAPTACIÓN EN CALLE</span><h3>Nuevo prospecto</h3></div><button className="icon-btn" onClick={onClose}><X/></button></div>{tasks.length>0&&<div className="assignment-callout"><Target size={18}/><div><b>Tarea de captación activa</b><span>Asocia el prospecto para que sume al objetivo asignado.</span></div></div>}<div className="form-grid">{tasks.length>0&&<label className="span-2">Tarea<select value={assignmentId} onChange={e=>setAssignmentId(e.target.value)}><option value="">Sin asociar</option>{tasks.map(task=><option key={task.id} value={task.id}>{task.official_area_name||task.title} · {humanDate(task.route_date)}–{humanDate(task.period_end_date||task.route_date)}</option>)}</select></label>}<label>Razón social / nombre *<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Contacto<input value={contact} onChange={e=>setContact(e.target.value)}/></label><label>Teléfono / WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Tipo de negocio<input value={type} onChange={e=>setType(e.target.value)}/></label><label className="span-2">Interés comercial<input value={interest} onChange={e=>setInterest(e.target.value)}/></label><label className="span-2">Observación<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label></div><div className="capture-tools"><button className={geo?'success-btn':'secondary'} onClick={()=>void getGps()}><MapPin size={18}/>{geo?`GPS ±${Math.round(geo.accuracy)} m`:'Capturar ubicación'}</button><input ref={input} hidden type="file" accept="image/*" capture="environment" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/><button className="secondary" onClick={()=>input.current?.click()}><Camera size={18}/> Tomar / cargar fotos</button><span>{files.length} foto(s)</span></div>{files.length>0&&<div className="file-strip">{files.map((f,i)=><div key={i}><ImagePlus/><span>{f.name}</span></div>)}</div>}<div className="modal-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={()=>void save()}><Upload size={18}/>{busy?'Guardando...':'Guardar prospecto'}</button></div></div></div>
}