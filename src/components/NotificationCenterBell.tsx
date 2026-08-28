import { useEffect,useMemo,useState } from 'react'
import { AlertTriangle,BellRing,CalendarCheck2,CheckCircle2,ChevronRight,Clock3,Info,MapPinned,PhoneCall,ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { hasPermission,profileForEmployee } from '../lib/access'
import '../styles/notification-center.css'

type Category='JORNADAS'|'RUTAS'|'CRM'|'AGENDA'|'CALIDAD'|'SISTEMA'
type Severity='CRITICAL'|'ACTION'|'INFO'|'SUCCESS'
type AlertItem={id:string;title:string;message:string;created_at:string;category:Category;severity:Severity;synthetic:boolean;href:string;storedId?:string}
const categoryLabel:Record<Category,string>={JORNADAS:'Jornadas',RUTAS:'Rutas / Visitas',CRM:'CRM / Seguimientos',AGENDA:'Agenda / Showroom',CALIDAD:'Calidad de datos',SISTEMA:'Sistema'}
const severityLabel:Record<Severity,string>={CRITICAL:'Crítica',ACTION:'Acción requerida',INFO:'Información',SUCCESS:'Completado'}
const categoryOrder:Category[]=['JORNADAS','RUTAS','CRM','AGENDA','CALIDAD','SISTEMA']

function inferStored(item:any):Pick<AlertItem,'category'|'severity'|'href'>{
 const type=String(item.type||'').toUpperCase(),entity=String(item.entity_type||'').toUpperCase()
 if(entity.includes('ROUTE')||entity.includes('JOURNEY')||type.includes('JORNADA'))return{category:'JORNADAS',severity:type.includes('ERROR')?'CRITICAL':'INFO',href:item.entity_id?`/jornadas?tab=street&journey=${item.entity_id}`:'/jornadas?tab=street'}
 if(entity.includes('APPOINT')||type.includes('SHOWROOM')||type.includes('CITA'))return{category:'AGENDA',severity:'ACTION',href:item.entity_id?`/agenda?appointment=${item.entity_id}`:'/agenda'}
 if(entity.includes('CALL')||entity.includes('FOLLOW')||type.includes('CRM'))return{category:'CRM',severity:'ACTION',href:'/jornadas?tab=crm'}
 if(type.includes('GEO')||type.includes('CALIDAD'))return{category:'CALIDAD',severity:'INFO',href:'/calidad-datos'}
 return{category:'SISTEMA',severity:'INFO',href:'/'}
}
function iconFor(item:AlertItem){if(item.severity==='CRITICAL')return <ShieldAlert/>;if(item.category==='JORNADAS')return <MapPinned/>;if(item.category==='CRM')return <PhoneCall/>;if(item.category==='AGENDA')return <CalendarCheck2/>;if(item.severity==='SUCCESS')return <CheckCircle2/>;if(item.severity==='ACTION')return <AlertTriangle/>;return <Info/>}
function relative(value:string){const diff=Date.now()-new Date(value).getTime(),min=Math.round(Math.abs(diff)/60000);if(min<60)return diff>=0?`hace ${Math.max(1,min)} min`:`en ${Math.max(1,min)} min`;const h=Math.round(min/60);if(h<24)return diff>=0?`hace ${h} h`:`en ${h} h`;const d=Math.round(h/24);return diff>=0?`hace ${d} d`:`en ${d} d`}

export function NotificationCenterBell({onOpen}:{onOpen?:()=>void}){
 const {employee}=useAuth();const navigate=useNavigate();const [open,setOpen]=useState(false),[alerts,setAlerts]=useState<AlertItem[]>([]),[filter,setFilter]=useState<'ALL'|'ACTION'>('ALL'),[loading,setLoading]=useState(false)
 const executive=['Administrador','Supervisor'].includes(profileForEmployee(employee))
 const load=async()=>{
  if(!employee?.id)return setAlerts([]);setLoading(true);const now=new Date(),soon=new Date(now);soon.setDate(soon.getDate()+3)
  let journey:any=hasPermission(employee,'journeys.view')?supabase.from('executive_route_journeys_v2').select('route_plan_id,employee_id,full_name,route_date,derived_status,planned_clients,visited_clients,coverage_pct').eq('derived_status','PENDIENTE_CIERRE').order('route_date').limit(12):null
  if(journey&&!executive)journey=journey.eq('employee_id',employee.id)
  let appointment:any=supabase.from('appointments').select('id,employee_id,status,appointment_at,requested_appointment_at,clients(legal_name),prospects(legal_name)').in('status',['PENDIENTE_VALIDACION','CONFIRMADA','REPROGRAMADA']).or(`appointment_at.lte.${soon.toISOString()},requested_appointment_at.lte.${soon.toISOString()}`).order('created_at',{ascending:false}).limit(20)
  if(!executive)appointment=appointment.eq('employee_id',employee.id)
  let follow:any=hasPermission(employee,'journeys.view')?supabase.from('executive_crm_followups_v1').select('id,employee_id,full_name,due_at,derived_status,subject_name,source_type').in('derived_status',['VENCIDO','HOY','PROXIMO']).order('due_at').limit(20):null
  const[stored,a,j,f]=await Promise.all([supabase.from('notifications').select('*').eq('employee_id',employee.id).eq('status','UNREAD').order('created_at',{ascending:false}).limit(30),appointment,journey||Promise.resolve({data:[],error:null}),follow||Promise.resolve({data:[],error:null})])
  const items:AlertItem[]=[]
  ;(stored.data||[]).forEach((n:any)=>{const inferred=inferStored(n);items.push({id:`stored-${n.id}`,storedId:n.id,title:n.title,message:n.message||'',created_at:n.created_at,synthetic:false,...inferred})})
  ;(j.data||[]).forEach((x:any)=>items.push({id:`journey-${x.route_plan_id}`,title:executive?`Jornada pendiente · ${x.full_name}`:'Jornada pendiente de cierre',message:`${new Date(`${x.route_date}T12:00:00`).toLocaleDateString('es-DO')} · ${x.visited_clients||0}/${x.planned_clients||0} visitados · ${Number(x.coverage_pct||0)}% cobertura`,created_at:`${x.route_date}T23:59:59-04:00`,synthetic:true,category:'JORNADAS',severity:'CRITICAL',href:`/jornadas?tab=street&journey=${x.route_plan_id}` }))
  ;(f.data||[]).forEach((x:any)=>items.push({id:`follow-${x.id}`,title:x.derived_status==='VENCIDO'?'Seguimiento vencido':x.derived_status==='HOY'?'Seguimiento para hoy':'Próximo seguimiento',message:`${x.subject_name} · ${x.full_name||'Sin responsable'} · ${x.source_type||'CRM'}`,created_at:x.due_at,synthetic:true,category:'CRM',severity:x.derived_status==='PROXIMO'?'INFO':'ACTION',href:`/jornadas?tab=crm&followup=${x.id}`}))
  ;(a.data||[]).forEach((x:any)=>{const name=x.clients?.legal_name||x.prospects?.legal_name||'Cliente',when=x.appointment_at||x.requested_appointment_at||now.toISOString();items.push({id:`appointment-${x.id}`,title:x.status==='PENDIENTE_VALIDACION'?'Showroom pendiente de validar':'Cita showroom próxima',message:`${name} · ${new Date(when).toLocaleString('es-DO')}`,created_at:when,synthetic:true,category:'AGENDA',severity:x.status==='PENDIENTE_VALIDACION'?'ACTION':'INFO',href:`/agenda?appointment=${x.id}`})})
  const unique=new Map<string,AlertItem>();items.forEach(i=>unique.set(i.id,i));setAlerts([...unique.values()].sort((a,b)=>{const rank=(s:Severity)=>s==='CRITICAL'?0:s==='ACTION'?1:s==='INFO'?2:3;return rank(a.severity)-rank(b.severity)||new Date(a.created_at).getTime()-new Date(b.created_at).getTime()}));setLoading(false)
 }
 useEffect(()=>{void load()},[employee?.id])
 const visible=useMemo(()=>filter==='ALL'?alerts:alerts.filter(a=>a.severity==='CRITICAL'||a.severity==='ACTION'),[alerts,filter]);const grouped=useMemo(()=>categoryOrder.map(category=>({category,items:visible.filter(i=>i.category===category)})).filter(g=>g.items.length),[visible])
 const toggle=()=>{const next=!open;setOpen(next);if(next){onOpen?.();void load()}}
 const openAlert=async(item:AlertItem)=>{if(item.storedId)await supabase.from('notifications').update({status:'READ',read_at:new Date().toISOString()}).eq('id',item.storedId);setOpen(false);navigate(item.href);void load()}
 const markAll=async()=>{if(!employee?.id)return;await supabase.from('notifications').update({status:'READ',read_at:new Date().toISOString()}).eq('employee_id',employee.id).eq('status','UNREAD');await load()}
 const actionCount=alerts.filter(a=>a.severity==='CRITICAL'||a.severity==='ACTION').length
 return <div className="notification-center-root">
  <button className={`icon-btn ${open?'active':''}`} title="Centro de alertas" aria-label="Centro de alertas" aria-expanded={open} onClick={toggle}><BellRing size={19}/>{alerts.length>0&&<span className={`notification-count ${actionCount?'has-action':''}`}>{alerts.length}</span>}</button>
  {open&&<div className="panel notification-center"><div className="notification-center-head"><div><b>Centro de alertas</b><span>{actionCount?`${actionCount} requieren atención`:'Sin acciones críticas pendientes'}</span></div><button className="secondary compact" onClick={()=>void markAll()}>Marcar leídas</button></div><div className="notification-tabs"><button className={filter==='ALL'?'active':''} onClick={()=>setFilter('ALL')}>Todas <span>{alerts.length}</span></button><button className={filter==='ACTION'?'active':''} onClick={()=>setFilter('ACTION')}>Acción <span>{actionCount}</span></button></div>{loading?<div className="notification-empty"><Clock3/><span>Actualizando alertas...</span></div>:grouped.length?<div className="notification-groups">{grouped.map(group=><section key={group.category} className="notification-group"><div className="notification-group-title"><b>{categoryLabel[group.category]}</b><span>{group.items.length}</span></div>{group.items.map(item=><button key={item.id} className={`notification-item severity-${item.severity.toLowerCase()}`} onClick={()=>void openAlert(item)}><div className="notification-item-icon">{iconFor(item)}</div><div className="notification-item-copy"><div><b>{item.title}</b><span className="severity-badge">{severityLabel[item.severity]}</span></div><p>{item.message}</p><small>{relative(item.created_at)}</small></div><ChevronRight className="notification-chevron"/></button>)}</section>)}</div>:<div className="notification-empty"><CheckCircle2/><b>Todo al día</b><span>No hay alertas para este filtro.</span></div>}</div>}
 </div>
}
