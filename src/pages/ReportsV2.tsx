import { useEffect,useMemo,useState } from 'react'
import { AlertTriangle,CalendarCheck2,CalendarDays,Captions,CheckCircle2,Clock3,Download,FileSpreadsheet,FilterX,MapPinCheck,PhoneCall,Route,ShoppingBag,TimerReset,Users } from 'lucide-react'
import { Bar,BarChart,CartesianGrid,Legend,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { profileForEmployee } from '../lib/access'
import { exportRoleReportXlsx } from '../lib/roleReportXlsx'
import { exportScreenPdf } from '../lib/screenPdf'
import { MetricCard } from '../components/MetricCard'
import { aggregateOperationalCoverage } from '../lib/operationalCoverage'
import '../styles/executive-v060.css'
import '../styles/journeys-reporting.css'
import '../styles/product-system.css'
import '../styles/report-beta11.css'

type PeriodMode='DAY'|'WEEK'|'MONTH'|'RANGE'
type CommercialRole=''|'Vendedor'|'Gestor'

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const dayAfter=(value:string)=>{const[y,m,d]=value.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+1)).toISOString().slice(0,10)}
const ymd=(d:Date)=>d.toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'})
const currentMonth=()=>today().slice(0,7)
const duration=(value?:number|null)=>{const total=Math.max(0,Math.round(Number(value||0)));const h=Math.floor(total/3600);const m=Math.round((total%3600)/60);return h?`${h} h ${m} min`:`${m} min`}
const money=(value?:number|string|null)=>new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP',maximumFractionDigits:0}).format(Number(value||0))
const compactNumber=(value?:number|string|null)=>new Intl.NumberFormat('es-DO',{notation:'compact',maximumFractionDigits:1}).format(Number(value||0))
const pct=(a:number,b:number)=>b?Math.round((a/b)*1000)/10:0
const km=(m?:number|null)=>`${(Number(m||0)/1000).toLocaleString('es-DO',{minimumFractionDigits:1,maximumFractionDigits:1})} km`
const dayLabel=(d:string)=>new Date(`${d}T12:00:00`).toLocaleDateString('es-DO',{day:'2-digit',month:'short'})
const monthLabel=(value:string)=>{const[y,m]=value.split('-').map(Number);return new Date(y,m-1,1,12).toLocaleDateString('es-DO',{month:'long',year:'numeric'})}
const inclusiveDays=(from:string,to:string)=>Math.max(1,Math.floor((Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86400000)+1)
const unique=(values:string[])=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'))
const sum=(rows:any[],key:string)=>rows.reduce((acc,row)=>acc+Number(row[key]||0),0)
const operationalRole=(value?:string)=>value==='Vendedor'||value==='Gestor'
const isoLocal=(value?:string|null)=>value?new Date(value).toLocaleString('es-DO',{timeZone:'America/Santo_Domingo'}):''
async function fetchAllPages(fetchPage:(from:number,to:number)=>PromiseLike<{data:any[]|null;error:any}>){
 const pageSize=1000,all:any[]=[]
 for(let from=0;;from+=pageSize){
  const {data,error}=await fetchPage(from,from+pageSize-1)
  if(error)throw error
  const rows=data||[]
  all.push(...rows)
  if(rows.length<pageSize)break
 }
 return all
}
const statusLabel:Record<string,string>={NO_INICIADA:'No ejecutada',PLANIFICADA:'Planificada',PROGRAMADA:'Programada',FINALIZADA_PARCIAL:'Finalizada parcial',FINALIZADA:'Finalizada',PENDIENTE_CIERRE:'Pendiente de cierre',ACTIVA:'Activa hoy'}

function periodBounds(mode:PeriodMode,date:string,month:string,from:string,to:string){
 let result:{from:string;to:string}
 if(mode==='DAY')result={from:date,to:date}
 else if(mode==='WEEK'){
  const base=new Date(`${date}T12:00:00`);const day=base.getDay()||7,start=new Date(base);start.setDate(base.getDate()-day+1);const end=new Date(start);end.setDate(start.getDate()+6);result={from:ymd(start),to:ymd(end)}
 }else if(mode==='MONTH'){
  const[y,m]=month.split('-').map(Number);result={from:ymd(new Date(y,m-1,1,12)),to:ymd(new Date(y,m,0,12))}
 }else result={from:from||date,to:to||from||date}
 const now=today();return{...result,to:result.to>now?now:result.to}
}

export function ReportsV2(){
 const {employee}=useAuth()
 const profile=profileForEmployee(employee)
 const executive=['Administrador','Supervisor','Gestor'].includes(profile)
 const ownRole:CommercialRole=employee?.employee_type==='Vendedor'||employee?.employee_type==='Gestor'?employee.employee_type:''
 const [mode,setMode]=useState<PeriodMode>(executive?'MONTH':'DAY'),[date,setDate]=useState(today()),[month,setMonth]=useState(currentMonth()),[from,setFrom]=useState(today()),[to,setTo]=useState(today())
 const [commercialRows,setCommercialRows]=useState<any[]>([]),[journeys,setJourneys]=useState<any[]>([]),[crmRows,setCrmRows]=useState<any[]>([]),[showroomSessions,setShowroomSessions]=useState<any[]>([]),[visitPurchases,setVisitPurchases]=useState<any[]>([]),[employees,setEmployees]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[pdfBusy,setPdfBusy]=useState(false),[excelBusy,setExcelBusy]=useState(false)
 const [employeeType,setEmployeeType]=useState<CommercialRole>(''),[employeeFilter,setEmployeeFilter]=useState(''),[selectedEmployee,setSelectedEmployee]=useState(''),[detailMonth,setDetailMonth]=useState(''),[journeyStatus,setJourneyStatus]=useState(''),[clientType,setClientType]=useState(''),[region,setRegion]=useState(''),[province,setProvince]=useState(''),[municipality,setMunicipality]=useState('')
 const range=useMemo(()=>periodBounds(mode,date,month,from,to),[mode,date,month,from,to])
 const effectiveType:CommercialRole=executive?employeeType:ownRole
 const showStreet=!effectiveType||effectiveType==='Vendedor'
 const showCrm=!effectiveType||effectiveType==='Gestor'

 const load=async()=>{
  setLoading(true);setError('')
  let eQ=supabase.from('executive_daily_employee_summary_v2').select('*').gte('day',range.from).lte('day',range.to).order('day')
  let jQ=supabase.from('executive_route_journeys_v4').select('*').gte('route_date',range.from).lte('route_date',range.to)
  let cQ=supabase.from('executive_crm_daily_v1').select('*').gte('day',range.from).lte('day',range.to).order('day')
  let sQ=showCrm?supabase.from('showroom_sessions').select('id,manager_employee_id,attended_by_employee_id,started_at,ended_at,purchased,purchase_amount,outcome').gte('started_at',`${range.from}T00:00:00-04:00`).lt('started_at',`${dayAfter(range.to)}T00:00:00-04:00`):Promise.resolve({data:[],error:null}) as any
  let vQ=supabase.from('visits').select('id,employee_id,started_at,ended_at,purchase_result,purchase_amount').gte('started_at',`${range.from}T00:00:00-04:00`).lt('started_at',`${dayAfter(range.to)}T00:00:00-04:00`)
  if(!executive&&employee?.id){eQ=eQ.eq('employee_id',employee.id);jQ=jQ.eq('employee_id',employee.id);cQ=cQ.eq('employee_id',employee.id);vQ=vQ.eq('employee_id',employee.id);if(showCrm)sQ=sQ.or(`attended_by_employee_id.eq.${employee.id},and(attended_by_employee_id.is.null,manager_employee_id.eq.${employee.id})`)}
  const[e,j,c,showroom,visits,emps]=await Promise.all([eQ,jQ,cQ,sQ,vQ,executive?supabase.from('employees').select('id,full_name,job_title,employee_type').eq('active',true).in('employee_type',['Vendedor','Gestor']).order('full_name'):Promise.resolve({data:[],error:null}) as any])
  const err=e.error||j.error||c.error||showroom.error||visits.error||emps.error
  if(err)setError(err.message)
  setCommercialRows(e.data||[]);setJourneys(j.data||[]);setCrmRows(c.data||[]);setShowroomSessions(showroom.data||[]);setVisitPurchases(visits.data||[]);setEmployees(emps.data||[])
  const candidates=(e.data||[]).filter((r:any)=>operationalRole(r.employee_type)&&(!effectiveType||r.employee_type===effectiveType))
  setSelectedEmployee(current=>!executive?(employee?.id&&candidates.some((x:any)=>x.employee_id===employee.id)?employee.id:(candidates[0]?.employee_id||'')):(current&&candidates.some((x:any)=>x.employee_id===current)?current:''))
  setLoading(false)
 }
 useEffect(()=>{void load()},[range.from,range.to,employee?.id,executive,effectiveType])
 useEffect(()=>{if(!executive){if(employee?.id)setSelectedEmployee(employee.id);return}setSelectedEmployee(employeeFilter||'')},[employeeFilter,executive,employee?.id])
 useEffect(()=>setDetailMonth(''),[range.from,range.to,selectedEmployee])
 useEffect(()=>{setProvince('');setMunicipality('')},[region])
 useEffect(()=>setMunicipality(''),[province])
 useEffect(()=>{if(!showStreet){setJourneyStatus('');setClientType('');setRegion('');setProvince('');setMunicipality('')}},[showStreet])

 const employeeOptions=useMemo(()=>employees.filter(e=>!employeeType||e.employee_type===employeeType),[employees,employeeType])
 const journeyBase=useMemo(()=>journeys.filter(j=>showStreet&&(!employeeFilter||j.employee_id===employeeFilter)&&(!journeyStatus||j.derived_status===journeyStatus)&&(!clientType||j.client_types?.includes(clientType))),[journeys,showStreet,employeeFilter,journeyStatus,clientType])
 const regionOptions=useMemo(()=>unique(journeyBase.flatMap(j=>j.official_regions||[])),[journeyBase])
 const provinceOptions=useMemo(()=>unique(journeyBase.filter(j=>!region||j.official_regions?.includes(region)).flatMap(j=>j.official_provinces||[])),[journeyBase,region])
 const municipalityOptions=useMemo(()=>unique(journeyBase.filter(j=>(!region||j.official_regions?.includes(region))&&(!province||j.official_provinces?.includes(province))).flatMap(j=>j.official_municipalities||[])),[journeyBase,region,province])
 const clientTypeOptions=useMemo(()=>unique(journeys.flatMap(j=>j.client_types||[])),[journeys])
 const filteredJourneys=useMemo(()=>journeyBase.filter(j=>(!region||j.official_regions?.includes(region))&&(!province||j.official_provinces?.includes(province))&&(!municipality||j.official_municipalities?.includes(municipality))),[journeyBase,region,province,municipality])
 const filteredCrm=useMemo(()=>crmRows.filter(r=>showCrm&&(!employeeFilter||r.employee_id===employeeFilter)),[crmRows,showCrm,employeeFilter])
 const filteredCommercial=useMemo(()=>commercialRows.filter(r=>operationalRole(r.employee_type)&&(!effectiveType||r.employee_type===effectiveType)&&(!employeeFilter||r.employee_id===employeeFilter)),[commercialRows,effectiveType,employeeFilter])
 const filteredShowroomSessions=useMemo(()=>showroomSessions.filter(row=>{if(effectiveType==='Vendedor')return false;const credited=row.attended_by_employee_id||row.manager_employee_id;return !employeeFilter||credited===employeeFilter}),[showroomSessions,effectiveType,employeeFilter])
 const commercialEmployeeIds=useMemo(()=>new Set(filteredCommercial.map(row=>row.employee_id)),[filteredCommercial])
 const filteredVisitPurchases=useMemo(()=>visitPurchases.filter(row=>commercialEmployeeIds.has(row.employee_id)),[visitPurchases,commercialEmployeeIds])
 const pendingVisitPurchases=useMemo(()=>filteredVisitPurchases.filter(row=>{const result=String(row.purchase_result||'').toLowerCase();return Boolean(row.ended_at)&&['compro','compró','compra','si','sí','yes'].includes(result)&&!(Number(row.purchase_amount)>0)}),[filteredVisitPurchases])
 const managerCommercial=useMemo(()=>filteredCommercial.filter(r=>r.employee_type==='Gestor'),[filteredCommercial])
 const routeScoped=showStreet&&Boolean(journeyStatus||clientType||region||province||municipality)

 const street=useMemo(()=>{
  const planned=sum(filteredJourneys,'planned_clients'),visited=sum(filteredJourneys,'visited_clients'),resolved=sum(filteredJourneys,'resolved_clients'),attention=sum(filteredJourneys,'visit_seconds'),totalVisits=sum(filteredJourneys,'total_completed_visits'),additional=sum(filteredJourneys,'additional_visits'),captures=sum(filteredJourneys,'capture_count'),activities=sum(filteredJourneys,'commercial_activity_count'),coverage=aggregateOperationalCoverage(filteredJourneys)
  return{journeys:filteredJourneys.length,finished:filteredJourneys.filter(j=>['FINALIZADA','FINALIZADA_PARCIAL'].includes(j.derived_status)).length,expired:filteredJourneys.filter(j=>j.derived_status==='PENDIENTE_CIERRE').length,planned,visited,resolved,additional,totalVisits,captures,activities,planCoverage:coverage.planPct,freeCoverage:coverage.freePct,operationalCoverage:coverage.operationalPct,planDone:coverage.planDone,planTarget:coverage.planTarget,freeDone:coverage.freeDone,freeTarget:coverage.freeTarget,resolution:pct(resolved,planned),distance:sum(filteredJourneys,'estimated_distance_m'),streetSeconds:sum(filteredJourneys,'route_window_seconds'),attention,avgVisit:totalVisits?attention/totalVisits:0,transit:sum(filteredJourneys,'transit_wait_estimated_seconds'),incidents:sum(filteredJourneys,'incident_count')}
 },[filteredJourneys])
 const crm=useMemo(()=>{
  const calls=sum(filteredCrm,'calls'),contacted=sum(filteredCrm,'calls_contacted'),callSeconds=sum(filteredCrm,'call_seconds'),completedShowroom=filteredShowroomSessions.filter(row=>row.ended_at),showroom=completedShowroom.length,showroomSeconds=completedShowroom.reduce((acc,row)=>acc+Math.max(0,(new Date(row.ended_at).getTime()-new Date(row.started_at).getTime())/1000),0)
  return{calls,contacted,contact:pct(contacted,calls),callSeconds,avgCall:calls?callSeconds/calls:0,appointments:sum(filteredCrm,'appointments_total'),confirmed:sum(filteredCrm,'appointments_confirmed'),attended:sum(filteredCrm,'appointments_attended'),pendingValidation:sum(filteredCrm,'appointments_pending_validation'),showroom,showroomSeconds,avgShowroom:showroom?showroomSeconds/showroom:0,followups:sum(filteredCrm,'followups_total'),followupsPending:sum(filteredCrm,'followups_pending'),followupsOverdue:sum(filteredCrm,'followups_overdue'),followupsCompleted:sum(filteredCrm,'followups_completed'),inbound:sum(managerCommercial,'inbound_calls'),outbound:sum(managerCommercial,'outbound_calls')}
 },[filteredCrm,filteredShowroomSessions,managerCommercial])
 const commercial=useMemo(()=>({
  purchase:filteredCommercial.reduce((a,r)=>a+Number(r.purchase_clients_all??r.purchase_clients??0),0),
  sales:filteredCommercial.reduce((a,r)=>a+Number(r.sales_amount_all??r.sales_amount??0),0),
  prospects:sum(filteredCommercial,'prospects_captured'),
  visitPurchase:sum(filteredCommercial,'visit_purchase_clients'),callPurchase:sum(filteredCommercial,'call_purchase_clients'),showroomPurchase:sum(filteredCommercial,'showroom_purchase_clients'),
  visitSales:sum(filteredCommercial,'visit_sales_amount'),callSales:sum(filteredCommercial,'call_sales_amount'),showroomSales:sum(filteredCommercial,'showroom_sales_amount'),
  pendingShowroom:filteredShowroomSessions.filter(row=>row.ended_at&&(row.purchased===true||row.outcome==='COMPRA')&&!(Number(row.purchase_amount)>0)).length,
  pendingStreet:pendingVisitPurchases.length,
  pendingTotal:pendingVisitPurchases.length+filteredShowroomSessions.filter(row=>row.ended_at&&(row.purchased===true||row.outcome==='COMPRA')&&!(Number(row.purchase_amount)>0)).length,
 }),[filteredCommercial,filteredShowroomSessions,pendingVisitPurchases])

 const journeyByEmployee=useMemo(()=>{const map=new Map<string,any>();filteredJourneys.forEach(j=>{const x=map.get(j.employee_id)||{planned:0,visited:0,resolved:0,distance:0,journeys:0,streetSeconds:0,attention:0,transit:0,additional:0,totalVisits:0,captures:0,activities:0,rows:[]};x.planned+=Number(j.planned_clients||0);x.visited+=Number(j.visited_clients||0);x.resolved+=Number(j.resolved_clients||0);x.distance+=Number(j.estimated_distance_m||0);x.journeys+=1;x.streetSeconds+=Number(j.route_window_seconds||0);x.attention+=Number(j.visit_seconds||0);x.transit+=Number(j.transit_wait_estimated_seconds||0);x.additional+=Number(j.additional_visits||0);x.totalVisits+=Number(j.total_completed_visits||0);x.captures+=Number(j.capture_count||0);x.activities+=Number(j.commercial_activity_count||0);x.rows.push(j);map.set(j.employee_id,x)});return map},[filteredJourneys])
 const crmByEmployee=useMemo(()=>{const map=new Map<string,any>();filteredCrm.forEach(r=>{const x=map.get(r.employee_id)||{calls:0,contacted:0,callSeconds:0,followups:0,appointments:0,confirmed:0};x.calls+=Number(r.calls||0);x.contacted+=Number(r.calls_contacted||0);x.callSeconds+=Number(r.call_seconds||0);x.followups+=Number(r.followups_total||0);x.appointments+=Number(r.appointments_total||0);x.confirmed+=Number(r.appointments_confirmed||0);map.set(r.employee_id,x)});return map},[filteredCrm])
 const showroomByEmployee=useMemo(()=>{const map=new Map<string,any>();filteredShowroomSessions.forEach(row=>{const id=row.attended_by_employee_id||row.manager_employee_id;if(!id)return;const x=map.get(id)||{completed:0,seconds:0,purchases:0,pending:0,sales:0};if(row.ended_at){x.completed+=1;x.seconds+=Math.max(0,(new Date(row.ended_at).getTime()-new Date(row.started_at).getTime())/1000)}if(row.ended_at&&(row.purchased===true||row.outcome==='COMPRA')){x.purchases+=1;if(Number(row.purchase_amount)>0)x.sales+=Number(row.purchase_amount);else x.pending+=1}map.set(id,x)});return map},[filteredShowroomSessions])
 const pendingVisitsByEmployee=useMemo(()=>{const map=new Map<string,number>();pendingVisitPurchases.forEach(row=>map.set(row.employee_id,(map.get(row.employee_id)||0)+1));return map},[pendingVisitPurchases])
 const commercialByEmployee=useMemo(()=>{const map=new Map<string,any>();filteredCommercial.forEach(r=>{const x=map.get(r.employee_id)||{employee_id:r.employee_id,full_name:r.full_name,job_title:r.job_title,employee_type:r.employee_type,days:new Set<string>(),purchase:0,sales:0,prospects:0,visitPurchase:0,callPurchase:0,showroomPurchase:0,visitSales:0,callSales:0,showroomSales:0,inbound:0,outbound:0};if(Number(r.operational_seconds||0)>0)x.days.add(r.day);x.purchase+=Number(r.purchase_clients_all??r.purchase_clients??0);x.sales+=Number(r.sales_amount_all??r.sales_amount??0);x.prospects+=Number(r.prospects_captured||0);x.visitPurchase+=Number(r.visit_purchase_clients||0);x.callPurchase+=Number(r.call_purchase_clients||0);x.showroomPurchase+=Number(r.showroom_purchase_clients||0);x.visitSales+=Number(r.visit_sales_amount||0);x.callSales+=Number(r.call_sales_amount||0);x.showroomSales+=Number(r.showroom_sales_amount||0);x.inbound+=Number(r.inbound_calls||0);x.outbound+=Number(r.outbound_calls||0);map.set(r.employee_id,x)});return map},[filteredCommercial])

 const vendorRows=useMemo(()=>{const ids=new Set([...commercialByEmployee.keys(),...journeyByEmployee.keys()]);return[...ids].map(id=>{const base=commercialByEmployee.get(id)||employees.find(e=>e.id===id);if(!base||base.employee_type!=='Vendedor')return null;const j=journeyByEmployee.get(id)||{},coverage=aggregateOperationalCoverage(j.rows||[]);const captures=Number(j.captures||0);const totalVisits=Number(j.totalVisits||0);return{employee_id:id,full_name:base.full_name,job_title:base.job_title,active_days:base.days?.size||0,journeys:j.journeys||0,planned_clients:j.planned||0,visited_clients:j.visited||0,additional_visits:j.additional||0,total_visits:totalVisits,captures,activities:Number(j.activities||totalVisits+captures),plan_coverage_pct:coverage.planPct,free_coverage_pct:coverage.freePct,coverage_pct:coverage.operationalPct,resolution_pct:pct(j.resolved||0,j.planned||0),street_seconds:j.streetSeconds||0,attention_seconds:j.attention||0,avg_visit_seconds:totalVisits?Number(j.attention||0)/totalVisits:0,transit_seconds:j.transit||0,distance:j.distance||0,pending_amounts:pendingVisitsByEmployee.get(id)||0,purchase_clients:base.purchase||0,sales_amount:base.sales||0}}).filter(Boolean).sort((a:any,b:any)=>b.activities-a.activities||b.sales_amount-a.sales_amount) as any[]},[commercialByEmployee,journeyByEmployee,pendingVisitsByEmployee,employees])
 const managerRows=useMemo(()=>{const ids=new Set([...commercialByEmployee.keys(),...crmByEmployee.keys(),...showroomByEmployee.keys()]);return[...ids].map(id=>{const base=commercialByEmployee.get(id)||employees.find(e=>e.id===id);if(!base||base.employee_type!=='Gestor')return null;const c=crmByEmployee.get(id)||{},show=showroomByEmployee.get(id)||{};return{employee_id:id,full_name:base.full_name,job_title:base.job_title,active_days:base.days?.size||0,calls:c.calls||0,contacted:c.contacted||0,contact_pct:pct(c.contacted||0,c.calls||0),call_seconds:c.callSeconds||0,avg_call_seconds:c.calls?Number(c.callSeconds||0)/Number(c.calls):0,inbound:base.inbound||0,outbound:base.outbound||0,appointments:c.appointments||0,confirmed:c.confirmed||0,showroom:show.completed||0,showroom_seconds:show.seconds||0,followups:c.followups||0,call_purchase_clients:base.callPurchase||0,showroom_purchase_clients:show.purchases||0,pending_showroom_amounts:show.pending||0,showroom_sales_amount:show.sales||0,purchase_clients:base.purchase||0,sales_amount:base.sales||0}}).filter(Boolean).sort((a:any,b:any)=>(b.contacted+b.showroom)-(a.contacted+a.showroom)||b.sales_amount-a.sales_amount) as any[]},[commercialByEmployee,crmByEmployee,showroomByEmployee,employees])

 const journeyByDay=useMemo(()=>{const map=new Map<string,any>();filteredJourneys.forEach(j=>{const x=map.get(j.route_date)||{day:j.route_date,Visitas:0,Captaciones:0,Actividades:0,rows:[]};x.Visitas+=Number(j.total_completed_visits||0);x.Captaciones+=Number(j.capture_count||0);x.Actividades+=Number(j.commercial_activity_count||0);x.rows.push(j);map.set(j.route_date,x)});return map},[filteredJourneys])
 const trend=useMemo(()=>[...journeyByDay.values()].sort((a,b)=>a.day.localeCompare(b.day)).map(x=>({...x,label:dayLabel(x.day),Cobertura:aggregateOperationalCoverage(x.rows).operationalPct})),[journeyByDay])
 const crmByDay=useMemo(()=>{const map=new Map<string,any>();filteredCrm.forEach(r=>{const x=map.get(r.day)||{day:r.day,Llamadas:0,Contactados:0,Showroom:0};x.Llamadas+=Number(r.calls||0);x.Contactados+=Number(r.calls_contacted||0);map.set(r.day,x)});filteredShowroomSessions.filter(row=>row.ended_at).forEach(row=>{const day=new Date(row.started_at).toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'}),x=map.get(day)||{day,Llamadas:0,Contactados:0,Showroom:0};x.Showroom+=1;map.set(day,x)});return map},[filteredCrm,filteredShowroomSessions])
 const crmTrend=useMemo(()=>[...crmByDay.values()].sort((a,b)=>a.day.localeCompare(b.day)).map(x=>({...x,label:dayLabel(x.day),Contacto:pct(x.Contactados,x.Llamadas)})),[crmByDay])
 const commercialByDay=useMemo(()=>{const map=new Map<string,any>();filteredCommercial.forEach(r=>{const x=map.get(r.day)||{day:r.day,Compras:0,ComprasCalle:0,ComprasLlamadas:0,ComprasShowroom:0,Ventas:0,Calle:0,Llamadas:0,Showroom:0,Prospectos:0,LlamadasGestion:0};x.Compras+=Number(r.purchase_clients_all??r.purchase_clients??0);x.ComprasCalle+=Number(r.visit_purchase_clients||0);x.ComprasLlamadas+=Number(r.call_purchase_clients||0);x.ComprasShowroom+=Number(r.showroom_purchase_clients||0);x.Ventas+=Number(r.sales_amount_all??r.sales_amount??0);x.Calle+=Number(r.visit_sales_amount||0);x.Llamadas+=Number(r.call_sales_amount||0);x.Showroom+=Number(r.showroom_sales_amount||0);x.Prospectos+=Number(r.prospects_captured||0);x.LlamadasGestion+=Number(r.calls||0);map.set(r.day,x)});return map},[filteredCommercial])
 const commercialTrend=useMemo(()=>[...commercialByDay.values()].sort((a,b)=>a.day.localeCompare(b.day)).map(x=>({...x,label:dayLabel(x.day)})),[commercialByDay])

 const pendingShowroomByDay=useMemo(()=>{const byDay=new Map<string,number>(),byEmployeeDay=new Map<string,number>();filteredShowroomSessions.filter(row=>row.ended_at&&(row.purchased===true||row.outcome==='COMPRA')&&!(Number(row.purchase_amount)>0)).forEach(row=>{const day=new Date(row.started_at).toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'}),employeeId=row.attended_by_employee_id||row.manager_employee_id;byDay.set(day,(byDay.get(day)||0)+1);if(employeeId)byEmployeeDay.set(`${employeeId}|${day}`,(byEmployeeDay.get(`${employeeId}|${day}`)||0)+1)});return{byDay,byEmployeeDay}},[filteredShowroomSessions])
 const pendingVisitsByDay=useMemo(()=>{const byDay=new Map<string,number>(),byEmployeeDay=new Map<string,number>();pendingVisitPurchases.forEach(row=>{const day=new Date(row.started_at).toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'});byDay.set(day,(byDay.get(day)||0)+1);byEmployeeDay.set(`${row.employee_id}|${day}`,(byEmployeeDay.get(`${row.employee_id}|${day}`)||0)+1)});return{byDay,byEmployeeDay}},[pendingVisitPurchases])
 const selectedDaily=useMemo(()=>{
  if(selectedEmployee){
   return filteredCommercial
    .filter(r=>r.employee_id===selectedEmployee)
    .map(r=>({
     ...r,
     purchase_clients:Number(r.purchase_clients_all??r.purchase_clients??0),
     sales_amount:Number(r.sales_amount_all??r.sales_amount??0),
     pending_showroom_amounts:pendingShowroomByDay.byEmployeeDay.get(`${r.employee_id}|${r.day}`)||0,
     pending_street_amounts:pendingVisitsByDay.byEmployeeDay.get(`${r.employee_id}|${r.day}`)||0,
     pending_amounts:(pendingShowroomByDay.byEmployeeDay.get(`${r.employee_id}|${r.day}`)||0)+(pendingVisitsByDay.byEmployeeDay.get(`${r.employee_id}|${r.day}`)||0),
    }))
    .sort((a,b)=>a.day.localeCompare(b.day))
  }
  return [...commercialByDay.values()]
   .map(r=>({
    employee_id:'ALL',
    day:r.day,
    full_name:'Todos los colaboradores',
    employee_type:'General',
    purchase_clients:r.Compras,
    sales_amount:r.Ventas,
    prospects_captured:r.Prospectos,
    calls:r.LlamadasGestion,
    call_purchase_clients:r.ComprasLlamadas,
    pending_showroom_amounts:pendingShowroomByDay.byDay.get(r.day)||0,
    pending_street_amounts:pendingVisitsByDay.byDay.get(r.day)||0,
    pending_amounts:(pendingShowroomByDay.byDay.get(r.day)||0)+(pendingVisitsByDay.byDay.get(r.day)||0),
   }))
   .sort((a,b)=>a.day.localeCompare(b.day))
 },[filteredCommercial,selectedEmployee,commercialByDay,pendingShowroomByDay,pendingVisitsByDay])
 const detailRangeDays=useMemo(()=>inclusiveDays(range.from,range.to),[range.from,range.to])
 const monthlyDetail=useMemo(()=>{
  const map=new Map<string,any>()
  selectedDaily.forEach(row=>{
   const month=String(row.day).slice(0,7)
   const x=map.get(month)||{month,active_days:0,sales_amount:0,purchase_clients:0,prospects_captured:0,calls:0,call_purchase_clients:0,pending_amounts:0,pending_street_amounts:0,pending_showroom_amounts:0}
   x.active_days+=1
   x.sales_amount+=Number(row.sales_amount||0)
   x.purchase_clients+=Number(row.purchase_clients||0)
   x.prospects_captured+=Number(row.prospects_captured||0)
   x.calls+=Number(row.calls||0)
   x.call_purchase_clients+=Number(row.call_purchase_clients||0)
   x.pending_amounts+=Number(row.pending_amounts||0)
   x.pending_street_amounts+=Number(row.pending_street_amounts||0)
   x.pending_showroom_amounts+=Number(row.pending_showroom_amounts||0)
   map.set(month,x)
  })
  return[...map.values()].sort((a,b)=>a.month.localeCompare(b.month))
 },[selectedDaily])
 const monthlyDetailMode=detailRangeDays>45&&!detailMonth
 const visibleDailyDetail=useMemo(()=>detailMonth?selectedDaily.filter(row=>String(row.day).startsWith(detailMonth)):selectedDaily,[selectedDaily,detailMonth])
 const clear=()=>{setEmployeeType('');setEmployeeFilter('');setSelectedEmployee('');setDetailMonth('');setJourneyStatus('');setClientType('');setRegion('');setProvince('');setMunicipality('')}
 const vendorExport=vendorRows.map(r=>({Vendedor:r.full_name,Jornadas:r.journeys,Planificados:r.planned_clients,'Visitados plan':r.visited_clients,'Visitas adicionales':r.additional_visits,'Total visitas':r.total_visits,Captaciones:r.captures,'Actividades comerciales':r.activities,'Cobertura plan %':r.plan_coverage_pct,'Cobertura libre %':r.free_coverage_pct,'Cobertura operativa %':r.coverage_pct,'Cierre op. %':r.resolution_pct,'Tiempo calle':duration(r.street_seconds),'Atención clientes':duration(r.attention_seconds),'Promedio visita':duration(r.avg_visit_seconds),'Traslado/espera':duration(r.transit_seconds),'Distancia GPS':km(r.distance),'Monto pendiente':r.pending_amounts,Compras:r.purchase_clients,Ventas:r.sales_amount}))
 const managerExport=managerRows.map(r=>({Gestor:r.full_name,'Días activos':r.active_days,Llamadas:r.calls,Entrantes:r.inbound,Salientes:r.outbound,Contactados:r.contacted,'Contacto %':r.contact_pct,'Tiempo llamadas':duration(r.call_seconds),'Promedio llamada':duration(r.avg_call_seconds),Citas:r.appointments,Confirmadas:r.confirmed,'Showroom atendidos':r.showroom,'Tiempo showroom':duration(r.showroom_seconds),Seguimientos:r.followups,'Compras llamada':r.call_purchase_clients,'Compras showroom':r.showroom_purchase_clients,'Monto showroom pendiente':r.pending_showroom_amounts,'Ventas showroom':r.showroom_sales_amount,'Compras total':r.purchase_clients,Ventas:r.sales_amount}))
 const hasReport=vendorRows.length>0||managerRows.length>0
 const downloadExcel=async()=>{
  setExcelBusy(true)
  try{
   const periodStart=`${range.from}T00:00:00-04:00`,periodEnd=`${dayAfter(range.to)}T00:00:00-04:00`
   const employeeMatches=(id?:string|null,type?:string|null)=>{
    if(!id)return false
    if(!executive&&employee?.id&&id!==employee.id)return false
    if(employeeFilter&&id!==employeeFilter)return false
    if(effectiveType&&type&&type!==effectiveType)return false
    if(effectiveType&&!type){
     const local=employees.find(e=>e.id===id)
     if(local?.employee_type&&local.employee_type!==effectiveType)return false
    }
    return true
   }
   const [rawVisits,rawCalls,rawShowroom]=await Promise.all([
    showStreet?fetchAllPages((fromRow,toRow)=>supabase.from('visits').select(`id,route_session_id,client_id,employee_id,visit_kind,planned,started_at,ended_at,received,purchase_result,purchase_amount,result,no_purchase_reason,contact_name,next_action,follow_up_date,notes,start_latitude,start_longitude,start_accuracy_m,distance_to_target_start_m,end_latitude,end_longitude,end_accuracy_m,distance_to_target_end_m,employee:employees!visits_employee_id_fkey(full_name,job_title,employee_type),client:clients!visits_client_id_fkey(company_code,legal_name,client_type,region,province,municipality)`).gte('started_at',periodStart).lt('started_at',periodEnd).order('started_at').range(fromRow,toRow)):Promise.resolve([]),
    showCrm?fetchAllPages((fromRow,toRow)=>supabase.from('calls').select(`id,client_id,employee_id,occurred_at,result,duration_seconds,contact_name,phone_used,appointment_created,notes,next_action,follow_up_date,call_direction,purchase_amount,employee:employees!calls_employee_id_fkey(full_name,job_title,employee_type),client:clients!calls_client_id_fkey(company_code,legal_name,client_type,region,province,municipality)`).gte('occurred_at',periodStart).lt('occurred_at',periodEnd).order('occurred_at').range(fromRow,toRow)):Promise.resolve([]),
    showCrm?fetchAllPages((fromRow,toRow)=>supabase.from('showroom_sessions').select(`id,client_id,manager_employee_id,attended_by_employee_id,started_at,ended_at,outcome,purchased,purchase_amount,attended_by_name,notes,next_action,follow_up_date,responsible:employees!showroom_sessions_manager_employee_id_fkey(full_name,job_title,employee_type),attended:employees!showroom_sessions_attended_by_employee_id_fkey(full_name,job_title,employee_type),client:clients!showroom_sessions_client_id_fkey(company_code,legal_name,client_type,region,province,municipality)`).gte('started_at',periodStart).lt('started_at',periodEnd).order('started_at').range(fromRow,toRow)):Promise.resolve([]),
   ])

   const allowedSessions=new Set(filteredJourneys.map(j=>j.route_session_id).filter(Boolean))
   const streetFilterActive=Boolean(journeyStatus||clientType||region||province||municipality)
   const visits=rawVisits.filter((row:any)=>{
    const emp=Array.isArray(row.employee)?row.employee[0]:row.employee
    const cli=Array.isArray(row.client)?row.client[0]:row.client
    if(!employeeMatches(row.employee_id,emp?.employee_type))return false
    if(journeyStatus&&row.route_session_id&&!allowedSessions.has(row.route_session_id))return false
    if(streetFilterActive&&row.route_session_id&&!allowedSessions.has(row.route_session_id))return false
    if(clientType&&cli?.client_type!==clientType)return false
    if(region&&cli?.region!==region)return false
    if(province&&cli?.province!==province)return false
    if(municipality&&cli?.municipality!==municipality)return false
    return true
   })
   const calls=rawCalls.filter((row:any)=>{const emp=Array.isArray(row.employee)?row.employee[0]:row.employee;return employeeMatches(row.employee_id,emp?.employee_type)})
   const showroom=rawShowroom.filter((row:any)=>{
    const attended=Array.isArray(row.attended)?row.attended[0]:row.attended
    const responsible=Array.isArray(row.responsible)?row.responsible[0]:row.responsible
    const credited=row.attended_by_employee_id||row.manager_employee_id
    return employeeMatches(credited,attended?.employee_type||responsible?.employee_type)
   })

   const commercialDailyExport=filteredCommercial.map(r=>({
    Fecha:r.day,'ID colaborador':r.employee_id,Colaborador:r.full_name,'Tipo colaborador':r.employee_type,Puesto:r.job_title||'',
    'Clientes planificados':Number(r.planned_clients||0),'Clientes visitados':Number(r.visited_clients||0),'Clientes recibidos':Number(r.received_clients||0),
    'Compras calle':Number(r.visit_purchase_clients||0),'Compras llamadas':Number(r.call_purchase_clients||0),'Compras showroom':Number(r.showroom_purchase_clients||0),'Compras total':Number(r.purchase_clients_all??r.purchase_clients??0),
    'Venta calle':Number(r.visit_sales_amount||0),'Venta llamadas':Number(r.call_sales_amount||0),'Venta showroom':Number(r.showroom_sales_amount||0),'Venta total':Number(r.sales_amount_all??r.sales_amount??0),
    Llamadas:Number(r.calls||0),Contactados:Number(r.calls_contacted||0),Entrantes:Number(r.inbound_calls||0),Salientes:Number(r.outbound_calls||0),Citas:Number(r.appointments||0),'Showroom atendidos':Number(r.showroom_attended||0),
    Captaciones:Number(r.prospects_captured||0),'Rutas iniciadas':Number(r.routes_started||0),'Rutas completadas':Number(r.routes_completed||0),'Segundos visitas':Number(r.visit_seconds||0),'Segundos showroom':Number(r.showroom_seconds||0),'Segundos jornada':Number(r.operational_seconds||0),
   }))
   const journeyExport=filteredJourneys.map(j=>({
    Fecha:j.route_date,'ID colaborador':j.employee_id,Colaborador:j.full_name,'Tipo colaborador':j.employee_type,Puesto:j.job_title||'','Tipo jornada':j.plan_type||j.route_mode||'',Título:j.title||'',Estado:j.derived_status,
    'Clientes planificados':Number(j.planned_clients||0),'Clientes visitados':Number(j.visited_clients||0),'Visitas adicionales':Number(j.additional_visits||0),'Visitas completadas':Number(j.total_completed_visits||0),Captaciones:Number(j.capture_count||0),'Actividades comerciales':Number(j.commercial_activity_count||0),
    'Cobertura %':Number(j.coverage_pct||0),'Resolución %':Number(j.resolution_pct||0),'Segundos calle':Number(j.route_window_seconds||0),'Segundos atención':Number(j.visit_seconds||0),'Segundos traslado/espera':Number(j.transit_wait_estimated_seconds||0),'Distancia metros':Number(j.estimated_distance_m||0),
    Región:(j.official_regions||[]).join(' | '),Provincia:(j.official_provinces||[]).join(' | '),Municipio:(j.official_municipalities||[]).join(' | '),'Tipos cliente':(j.client_types||[]).join(' | '),'ID sesión':j.route_session_id||'',
   }))
   const crmDailyExport=filteredCrm.map(r=>({
    Fecha:r.day,'ID colaborador':r.employee_id,Colaborador:r.full_name,'Tipo colaborador':r.employee_type,Puesto:r.job_title||'',Llamadas:Number(r.calls||0),Contactados:Number(r.calls_contacted||0),'Sin respuesta':Number(r.calls_no_answer||0),Ocupado:Number(r.calls_busy||0),'Teléfono inválido':Number(r.calls_invalid_phone||0),'Llamar luego':Number(r.calls_later||0),
    'Segundos llamadas':Number(r.call_seconds||0),'Citas total':Number(r.appointments_total||0),'Citas confirmadas':Number(r.appointments_confirmed||0),'Citas atendidas':Number(r.appointments_attended||0),'Citas no show':Number(r.appointments_no_show||0),'Citas reprogramadas':Number(r.appointments_reprogrammed||0),
    Seguimientos:Number(r.followups_total||0),'Seguimientos completados':Number(r.followups_completed||0),'Seguimientos pendientes':Number(r.followups_pending||0),'Seguimientos vencidos':Number(r.followups_overdue||0),'Segundos gestión':Number(r.management_seconds||0),
   }))

   const visitExport=visits.map((r:any)=>{const emp=Array.isArray(r.employee)?r.employee[0]:r.employee,cli=Array.isArray(r.client)?r.client[0]:r.client;return{
    'ID visita':r.id,Fecha:isoLocal(r.started_at),'Fin':isoLocal(r.ended_at),'ID colaborador':r.employee_id,Colaborador:emp?.full_name||'',Puesto:emp?.job_title||'','Tipo colaborador':emp?.employee_type||'',
    'Código cliente':cli?.company_code||'','Cliente':cli?.legal_name||'','Tipo cliente':cli?.client_type||'',Región:cli?.region||'',Provincia:cli?.province||'',Municipio:cli?.municipality||'','Tipo visita':r.visit_kind||'',Planificada:Boolean(r.planned),Recibido:Boolean(r.received),
    'Resultado compra':r.purchase_result||'','Monto compra':Number(r.purchase_amount||0),Resultado:r.result||'','Razón no compra':r.no_purchase_reason||'','Contacto':r.contact_name||'','Próxima acción':r.next_action||'','Fecha seguimiento':r.follow_up_date||'',Notas:r.notes||'',
    'Latitud inicio':r.start_latitude??null,'Longitud inicio':r.start_longitude??null,'Precisión inicio metros':Number(r.start_accuracy_m||0),'Distancia objetivo inicio metros':Number(r.distance_to_target_start_m||0),
    'Latitud fin':r.end_latitude??null,'Longitud fin':r.end_longitude??null,'Precisión fin metros':Number(r.end_accuracy_m||0),'Distancia objetivo fin metros':Number(r.distance_to_target_end_m||0),'ID sesión ruta':r.route_session_id||'',
   }})
   const callExport=calls.map((r:any)=>{const emp=Array.isArray(r.employee)?r.employee[0]:r.employee,cli=Array.isArray(r.client)?r.client[0]:r.client;return{
    'ID llamada':r.id,Fecha:isoLocal(r.occurred_at),'ID colaborador':r.employee_id,Colaborador:emp?.full_name||'',Puesto:emp?.job_title||'','Tipo colaborador':emp?.employee_type||'','Código cliente':cli?.company_code||'',Cliente:cli?.legal_name||'','Tipo cliente':cli?.client_type||'',Región:cli?.region||'',Provincia:cli?.province||'',Municipio:cli?.municipality||'',
    Dirección:r.call_direction||'',Resultado:r.result||'','Duración segundos':Number(r.duration_seconds||0),'Contacto':r.contact_name||'','Teléfono usado':r.phone_used||'','Generó cita':Boolean(r.appointment_created),'Monto compra':Number(r.purchase_amount||0),'Próxima acción':r.next_action||'','Fecha seguimiento':r.follow_up_date||'',Notas:r.notes||'',
   }})
   const showroomExport=showroom.map((r:any)=>{const attended=Array.isArray(r.attended)?r.attended[0]:r.attended,responsible=Array.isArray(r.responsible)?r.responsible[0]:r.responsible,cli=Array.isArray(r.client)?r.client[0]:r.client;return{
    'ID showroom':r.id,Inicio:isoLocal(r.started_at),Fin:isoLocal(r.ended_at),'Gestor responsable':responsible?.full_name||'','Atendido por':attended?.full_name||r.attended_by_name||'','ID responsable':r.manager_employee_id||'','ID atendió':r.attended_by_employee_id||'','Código cliente':cli?.company_code||'',Cliente:cli?.legal_name||'','Tipo cliente':cli?.client_type||'',Región:cli?.region||'',Provincia:cli?.province||'',Municipio:cli?.municipality||'',
    Resultado:r.outcome||'',Compró:Boolean(r.purchased),'Monto compra':Number(r.purchase_amount||0),'Monto pendiente':Boolean((r.purchased===true||r.outcome==='COMPRA')&&!(Number(r.purchase_amount)>0)),'Próxima acción':r.next_action||'','Fecha seguimiento':r.follow_up_date||'',Notas:r.notes||'',
   }})

   const parameters=[
    {Campo:'Tipo exportación',Valor:'Analítica detallada'},
    {Campo:'Desde',Valor:range.from},{Campo:'Hasta',Valor:range.to},{Campo:'Período UI',Valor:mode},
    {Campo:'Tipo colaborador',Valor:effectiveType||'Todos'},{Campo:'Colaborador',Valor:employeeFilter?(employees.find(e=>e.id===employeeFilter)?.full_name||employeeFilter):'Todos los colaboradores'},
    {Campo:'Estado jornada',Valor:journeyStatus||'Todos'},{Campo:'Tipo cliente ruta',Valor:clientType||'Todos'},{Campo:'Región oficial',Valor:region||'Todas'},{Campo:'Provincia oficial',Valor:province||'Todas'},{Campo:'Municipio oficial',Valor:municipality||'Todos'},
    {Campo:'Generado',Valor:new Date().toLocaleString('es-DO',{timeZone:'America/Santo_Domingo'})},
   ]

   await exportRoleReportXlsx(`Reporte_Analitico_${range.from}_${range.to}`,{
    parameters,vendors:vendorExport,managers:managerExport,commercialDaily:commercialDailyExport,journeys:journeyExport,crmDaily:crmDailyExport,showroom:showroomExport,visits:visitExport,calls:callExport,
   })
  }catch(e){alert(e instanceof Error?e.message:'No se pudo generar el Excel analítico.')}finally{setExcelBusy(false)}
 }
 const downloadPdf=async()=>{setPdfBusy(true);try{await exportScreenPdf('reports-pdf-root',`Reporte_Ejecutivo_${range.from}_${range.to}.pdf`,`Reporte ejecutivo ${range.from} - ${range.to}`)}catch(e){alert(e instanceof Error?e.message:'No se pudo generar el PDF.')}finally{setPdfBusy(false)}}

 return <div id="reports-pdf-root" className="page-stack executive-report period-report beta11-report">
  <div data-pdf-section="true" className="page-head"><div><span className="eyebrow">{executive?'INTELIGENCIA COMERCIAL · MULTIPERÍODO':'MI DESEMPEÑO'}</span><h2>{executive?'Reporte ejecutivo':'Mi reporte'}</h2><p>Indicadores separados por función: Calle para Vendedores y CRM/Showroom para Gestores, con resultado comercial unificado.</p></div><div data-pdf-exclude="true" className="button-row"><button className="secondary" disabled={!hasReport||excelBusy} onClick={()=>void downloadExcel()}><FileSpreadsheet size={17}/> {excelBusy?'Generando...':'Excel'}</button><button className="secondary" disabled={!hasReport||pdfBusy} onClick={()=>void downloadPdf()}><Download size={17}/> {pdfBusy?'Generando...':'PDF'}</button></div></div>
  <section data-pdf-section="true" className="panel report-filter-panel filter-stack"><div className="filter-row"><label>Período<select value={mode} onChange={e=>setMode(e.target.value as PeriodMode)}><option value="DAY">Día</option><option value="WEEK">Semana</option><option value="MONTH">Mes</option><option value="RANGE">Rango</option></select></label>{mode==='DAY'&&<label>Fecha<input type="date" max={today()} value={date} onChange={e=>setDate(e.target.value)}/></label>}{mode==='WEEK'&&<label>Semana de<input type="date" max={today()} value={date} onChange={e=>setDate(e.target.value)}/></label>}{mode==='MONTH'&&<label>Mes<input type="month" max={currentMonth()} value={month} onChange={e=>setMonth(e.target.value)}/></label>}{mode==='RANGE'&&<><label>Desde<input type="date" max={today()} value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" min={from} max={today()} value={to} onChange={e=>setTo(e.target.value)}/></label></>}{executive&&<><label>Tipo colaborador<select value={employeeType} onChange={e=>{setEmployeeType(e.target.value as CommercialRole);setEmployeeFilter('')}}><option value="">Todos</option><option value="Vendedor">Vendedores</option><option value="Gestor">Gestores</option></select></label><label>Colaborador<select value={employeeFilter} onChange={e=>setEmployeeFilter(e.target.value)}><option value="">Todos los colaboradores</option>{employeeOptions.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></label></>}</div>{showStreet&&<div className="filter-row secondary-row"><label>Estado jornada<select value={journeyStatus} onChange={e=>setJourneyStatus(e.target.value)}><option value="">Todos</option>{Object.entries(statusLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Tipo cliente ruta<select value={clientType} onChange={e=>setClientType(e.target.value)}><option value="">Todos</option>{clientTypeOptions.map(v=><option key={v}>{v}</option>)}</select></label><label>Región oficial<select value={region} onChange={e=>setRegion(e.target.value)}><option value="">Todas</option>{regionOptions.map(v=><option key={v}>{v}</option>)}</select></label><label>Provincia oficial<select value={province} onChange={e=>setProvince(e.target.value)}><option value="">Todas</option>{provinceOptions.map(v=><option key={v}>{v}</option>)}</select></label><label>Municipio oficial<select value={municipality} onChange={e=>setMunicipality(e.target.value)}><option value="">Todos</option>{municipalityOptions.map(v=><option key={v}>{v}</option>)}</select></label></div>}<div className="journey-filter-foot"><span>{range.from} → {range.to}{showStreet?` · ${filteredJourneys.length} jornada(s)`:''}{showCrm?` · ${filteredCrm.length} registro(s) CRM`:''}</span>{executive&&<button data-pdf-exclude="true" className="secondary compact" onClick={clear}><FilterX size={15}/> Limpiar filtros</button>}</div>{routeScoped&&<div className="report-scope-note"><b>Alcance territorial:</b> los filtros de región/provincia/municipio afectan exclusivamente la operación de Calle. CRM/Showroom y el resultado comercial permanecen por colaborador y período para no atribuir ventas a un territorio sin evidencia transaccional suficiente.</div>}</section>
  {error&&<div data-pdf-section="true" className="panel journey-alert danger"><AlertTriangle/><div><b>No fue posible cargar el reporte</b><span>{error}</span></div></div>}
  {loading?<div className="panel empty-state"><b>Calculando indicadores...</b></div>:<>
   {showStreet&&<section data-pdf-section="true" className="metric-section report-domain street-domain"><div className="metric-section-head"><div><span className="eyebrow">EJECUCIÓN CALLE</span><b>Ruta, cobertura y atención</b></div></div><div className="metric-grid"><MetricCard icon={<CalendarDays/>} label="Jornadas" value={street.journeys} note={`${street.finished} finalizadas · ${street.expired} pendientes`}/><MetricCard icon={<MapPinCheck/>} label="Cobertura plan" value={street.planTarget?`${street.planCoverage}%`:'N/A'} note={street.planTarget?`${street.planDone}/${street.planTarget} visitados`:'sin rutas planificadas'} tone="brand"/><MetricCard icon={<MapPinCheck/>} label="Cobertura libre" value={street.freeTarget?`${street.freeCoverage}%`:'N/A'} note={street.freeTarget?`${street.freeDone}/${street.freeTarget} objetivo mínimo`:'sin jornadas libres'} tone="success"/><MetricCard icon={<Route/>} label="Cobertura operativa" value={(street.planTarget+street.freeTarget)?`${street.operationalCoverage}%`:'N/A'} note={`${street.planTarget?`Plan ${street.planDone}/${street.planTarget}`:'Plan N/A'} · ${street.freeTarget?`Libre ${street.freeDone}/${street.freeTarget}`:'Libre N/A'}`} tone="brand"/></div><div className="metric-grid"><MetricCard icon={<CheckCircle2/>} label="Cierre operativo" value={`${street.resolution}%`} note={`${street.resolved}/${street.planned} con resultado`} tone="success"/><MetricCard icon={<Route/>} label="Distancia GPS" value={km(street.distance)} note="estimada por jornadas"/><MetricCard icon={<Clock3/>} label="Tiempo en calle" value={duration(street.streetSeconds)} note="fuente: jornadas operativas" tone="brand"/><MetricCard icon={<Users/>} label="Atención clientes" value={duration(street.attention)} note={`${street.totalVisits} visita(s) · ${street.additional} adicionales`}/></div><div className="metric-grid"><MetricCard icon={<TimerReset/>} label="Promedio por visita" value={duration(street.avgVisit)} note="usa todas las visitas completadas"/><MetricCard icon={<Route/>} label="Traslado / espera" value={duration(street.transit)} note="estimado residual"/><MetricCard icon={<Captions/>} label="Captaciones" value={street.captures} note="prospectos vinculados a jornadas"/><MetricCard icon={<Route/>} label="Actividades comerciales" value={street.activities} note={`${street.totalVisits} visitas · ${street.captures} captaciones`} tone="brand"/></div></section>}
   {showCrm&&<section data-pdf-section="true" className="metric-section report-domain crm-domain"><div className="metric-section-head"><div><span className="eyebrow">CRM / SHOWROOM</span><b>Contacto, seguimiento y atención</b></div></div><div className="metric-grid"><MetricCard icon={<PhoneCall/>} label="Llamadas" value={crm.calls} note={`${crm.inbound} entrantes · ${crm.outbound} salientes`}/><MetricCard icon={<Users/>} label="Contactabilidad" value={`${crm.contact}%`} note={`${crm.contacted}/${crm.calls} llamadas`} tone="brand"/><MetricCard icon={<Clock3/>} label="Tiempo llamadas" value={duration(crm.callSeconds)} note={`promedio ${duration(crm.avgCall)}`}/><MetricCard icon={<CalendarCheck2/>} label="Citas" value={crm.appointments} note={`${crm.confirmed} confirmadas`}/></div><div className="metric-grid"><MetricCard icon={<CalendarCheck2/>} label="Atendidos showroom" value={crm.showroom} note="atribuidos a quien realizó la atención"/><MetricCard icon={<TimerReset/>} label="Tiempo showroom" value={duration(crm.showroomSeconds)} note={`promedio ${duration(crm.avgShowroom)}`}/><MetricCard icon={<CheckCircle2/>} label="Seguimientos" value={crm.followups} note={`${crm.followupsOverdue} vencidos · ${crm.followupsCompleted} completados`} tone={crm.followupsOverdue?'warning':'neutral'}/><MetricCard icon={<AlertTriangle/>} label="Citas por validar" value={crm.pendingValidation} note="requieren acción" tone={crm.pendingValidation?'warning':'neutral'}/></div></section>}
   <section data-pdf-section="true" className="metric-section report-domain commercial-domain"><div className="metric-section-head"><div><span className="eyebrow">RESULTADO COMERCIAL</span><b>Conversión y ventas registradas por canal</b></div></div><div className="metric-grid"><MetricCard icon={<ShoppingBag/>} label="Clientes con compra" value={commercial.purchase} note={`${commercial.visitPurchase} calle · ${commercial.callPurchase} llamada · ${commercial.showroomPurchase} showroom`}/><MetricCard icon={<ShoppingBag/>} label="Monto vendido" value={money(commercial.sales)} note={commercial.pendingTotal?`${commercial.pendingTotal} monto(s) pendiente(s): ${commercial.pendingStreet} calle · ${commercial.pendingShowroom} showroom`:`${commercial.prospects} captaciones`} tone="brand" className="metric-money"/><MetricCard icon={<ShoppingBag/>} label="Venta calle" value={money(commercial.visitSales)} note="monto registrado en visitas" className="metric-money"/><MetricCard icon={<PhoneCall/>} label="Venta llamadas" value={money(commercial.callSales)} note="monto confirmado por llamada" tone="success" className="metric-money"/></div><div className="metric-grid cols-3"><MetricCard icon={<CalendarCheck2/>} label="Venta showroom" value={money(commercial.showroomSales)} note="solo montos ya registrados" tone="success" className="metric-money"/><MetricCard icon={<AlertTriangle/>} label="Montos pendientes" value={commercial.pendingTotal} note={`${commercial.pendingStreet} calle · ${commercial.pendingShowroom} showroom`} tone={commercial.pendingTotal?'warning':'neutral'}/></div></section>
   <div data-pdf-section="true" className="executive-chart-grid"><Chart title="Ventas por día" subtitle={`Monto acumulado: ${money(commercial.sales)}`} empty={!commercialTrend.some(x=>Number(x.Ventas)>0)}><ResponsiveContainer width="100%" height={290}><BarChart data={commercialTrend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis tickFormatter={value=>compactNumber(value)}/><Tooltip formatter={(value:any,name:any)=>[money(Number(value)),String(name)]}/><Legend/><Bar dataKey="Calle" name="Calle" fill="var(--brand)" radius={[4,4,0,0]}/><Bar dataKey="Llamadas" name="Llamadas" fill="var(--success)" radius={[4,4,0,0]}/><Bar dataKey="Showroom" name="Showroom" fill="var(--warning)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Chart><Chart title="Compras por día" subtitle={`Compras acumuladas: ${commercial.purchase}`} empty={!commercialTrend.some(x=>Number(x.Compras)>0)}><ResponsiveContainer width="100%" height={290}><BarChart data={commercialTrend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="ComprasCalle" name="Calle" fill="var(--brand)" radius={[4,4,0,0]}/><Bar dataKey="ComprasLlamadas" name="Llamadas" fill="var(--success)" radius={[4,4,0,0]}/><Bar dataKey="ComprasShowroom" name="Showroom" fill="var(--warning)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Chart></div>
   {street.expired>0&&showStreet&&<div data-pdf-section="true" className="panel journey-alert warning"><AlertTriangle/><div><b>{street.expired} jornada(s) pendientes de cierre.</b><span>Los tiempos de Calle se limitan a la ventana operativa correcta.</span></div></div>}
   {showStreet&&<div data-pdf-section="true" className="executive-chart-grid"><Chart title="Actividad de calle por día" subtitle="Visitas reales, captaciones y actividades comerciales" empty={!trend.length}><ResponsiveContainer width="100%" height={290}><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="Visitas" fill="var(--brand)" radius={[4,4,0,0]}/><Bar dataKey="Captaciones" fill="var(--warning)" radius={[4,4,0,0]}/><Bar dataKey="Actividades" fill="var(--chart-muted)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Chart><Chart title="Cobertura diaria" subtitle={`Cobertura operativa acumulada: ${street.operationalCoverage}%`} empty={!trend.length}><ResponsiveContainer width="100%" height={290}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis domain={[0,100]} unit="%"/><Tooltip/><Line type="monotone" dataKey="Cobertura" stroke="var(--brand)" strokeWidth={3} dot={{r:3}}/></LineChart></ResponsiveContainer></Chart></div>}
   {showCrm&&<div data-pdf-section="true" className="executive-chart-grid"><Chart title="Actividad CRM por día" subtitle="Llamadas, contactos y atenciones showroom" empty={!crmTrend.length}><ResponsiveContainer width="100%" height={290}><BarChart data={crmTrend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="Llamadas" fill="var(--chart-muted)" radius={[4,4,0,0]}/><Bar dataKey="Contactados" fill="var(--brand)" radius={[4,4,0,0]}/><Bar dataKey="Showroom" fill="var(--warning)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Chart><Chart title="Contactabilidad diaria" subtitle={`Contactabilidad acumulada: ${crm.contact}%`} empty={!crmTrend.length}><ResponsiveContainer width="100%" height={290}><LineChart data={crmTrend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis domain={[0,100]} unit="%"/><Tooltip/><Line type="monotone" dataKey="Contacto" stroke="var(--brand)" strokeWidth={3} dot={{r:3}}/></LineChart></ResponsiveContainer></Chart></div>}
   {showStreet&&<section data-pdf-section="true" className="panel period-team-panel report-role-section"><div className="panel-head"><div><span className="eyebrow">VENDEDORES</span><b>{executive?'Desempeño de Calle':'Resumen de Calle'}</b><span>Rutas, visitas, captaciones, coberturas y resultado comercial.</span></div><span>{vendorRows.length}</span></div><div className="journey-table-wrap"><table className="journey-table report-vendor-table"><thead><tr><th>Vendedor</th><th>Jornadas</th><th>Plan</th><th>Visitados plan</th><th>Adicionales</th><th>Captaciones</th><th>Actividades</th><th>Cob. plan</th><th>Cob. libre</th><th>Cob. operativa</th><th>Cierre op.</th><th>Tiempo calle</th><th>Atención</th><th>Prom./visita</th><th>GPS</th><th>Monto pend.</th><th>Compras</th><th>Ventas</th><th></th></tr></thead><tbody>{vendorRows.map(r=><tr key={r.employee_id} className={selectedEmployee===r.employee_id?'selected-report-row':''} onClick={()=>setSelectedEmployee(r.employee_id)}><td><b>{r.full_name}</b><small>{r.job_title||'Vendedor'}</small></td><td>{r.journeys}</td><td>{r.planned_clients}</td><td>{r.visited_clients}</td><td>{r.additional_visits}</td><td><b>{r.captures}</b></td><td><b>{r.activities}</b></td><td><b>{r.plan_coverage_pct||0}%</b></td><td><b>{r.free_coverage_pct||0}%</b></td><td><b>{r.coverage_pct}%</b></td><td>{r.resolution_pct}%</td><td>{duration(r.street_seconds)}</td><td>{duration(r.attention_seconds)}</td><td>{duration(r.avg_visit_seconds)}</td><td>{km(r.distance)}</td><td>{r.pending_amounts||0}</td><td>{r.purchase_clients}</td><td>{money(r.sales_amount)}</td><td>›</td></tr>)}</tbody></table>{!vendorRows.length&&<div className="empty-state"><Users/><b>Sin actividad de vendedores para el período seleccionado.</b></div>}</div></section>}
   {showCrm&&<section data-pdf-section="true" className="panel period-team-panel report-role-section"><div className="panel-head"><div><span className="eyebrow">GESTORES</span><b>{executive?'Desempeño CRM / Showroom':'Resumen CRM / Showroom'}</b><span>Citas por responsabilidad; atención, tiempo, compras y ventas Showroom por quien realizó la atención.</span></div><span>{managerRows.length}</span></div><div className="journey-table-wrap"><table className="journey-table report-manager-table"><thead><tr><th>Gestor</th><th>Días</th><th>Llamadas</th><th>Entrantes</th><th>Salientes</th><th>Contactados</th><th>Contacto</th><th>T. llamadas</th><th>Prom./llamada</th><th>Citas</th><th>Showroom atend.</th><th>T. showroom</th><th>Seguimientos</th><th>Compras llamada</th><th>Compras showroom</th><th>Monto pend.</th><th>Compras total</th><th>Ventas</th><th></th></tr></thead><tbody>{managerRows.map(r=><tr key={r.employee_id} className={selectedEmployee===r.employee_id?'selected-report-row':''} onClick={()=>setSelectedEmployee(r.employee_id)}><td><b>{r.full_name}</b><small>{r.job_title||'Gestor'}</small></td><td>{r.active_days}</td><td>{r.calls}</td><td>{r.inbound}</td><td>{r.outbound}</td><td>{r.contacted}</td><td><b>{r.contact_pct}%</b></td><td>{duration(r.call_seconds)}</td><td>{duration(r.avg_call_seconds)}</td><td>{r.appointments}</td><td>{r.showroom}</td><td>{duration(r.showroom_seconds)}</td><td>{r.followups}</td><td>{r.call_purchase_clients}</td><td>{r.showroom_purchase_clients}</td><td>{r.pending_showroom_amounts||0}</td><td><b>{r.purchase_clients}</b></td><td>{money(r.sales_amount)}</td><td>›</td></tr>)}</tbody></table>{!managerRows.length&&<div className="empty-state"><Users/><b>Sin actividad de gestores para el período seleccionado.</b></div>}</div></section>}
   {selectedDaily.length>0&&<section data-pdf-section="true" className="panel period-daily-panel"><div className="panel-head period-detail-head"><div><span className="eyebrow">{monthlyDetailMode?(selectedEmployee?'RESUMEN MENSUAL DEL COLABORADOR':'RESUMEN MENSUAL GENERAL'):(selectedEmployee?'DETALLE DEL COLABORADOR':'DETALLE DIARIO GENERAL')}</span><b>{selectedEmployee?selectedDaily[0].full_name:'Todos los colaboradores'}</b><span>{monthlyDetailMode?`${monthlyDetail.length} mes(es) con actividad en ${detailRangeDays} días de período.`:detailMonth?`${visibleDailyDetail.length} día(s) con registro comercial en ${monthLabel(detailMonth)}.`:`${selectedDaily.length} día(s) con registro comercial.`}{!selectedEmployee?' Totales según los filtros visibles.':''}</span></div><div data-pdf-exclude="true" className="period-detail-actions">{detailMonth&&<button className="secondary compact" onClick={()=>setDetailMonth('')}>← Volver al resumen mensual</button>}{selectedEmployee&&<button className="secondary compact" onClick={()=>{setEmployeeFilter('');setSelectedEmployee('');setDetailMonth('')}}>Volver al resumen general</button>}</div></div>{monthlyDetailMode?<div className="monthly-detail-grid">{monthlyDetail.map(r=><button type="button" className="monthly-detail-card" key={r.month} onClick={()=>setDetailMonth(r.month)}><div><b>{monthLabel(r.month)}</b><span>{r.active_days} día(s) con actividad</span></div><strong>{Number(r.sales_amount)>0?money(r.sales_amount):(r.pending_amounts>0?'Monto pendiente':money(0))}</strong><small>{r.purchase_clients||0} compra(s) · {r.prospects_captured||0} captación(es) · {r.calls||0} llamada(s){r.pending_amounts?` · ${r.pending_amounts} pendiente(s) (${r.pending_street_amounts||0} calle · ${r.pending_showroom_amounts||0} showroom)`:''}</small><em>Ver detalle diario →</em></button>)}</div>:<div className="daily-detail-grid">{visibleDailyDetail.map(r=><div className="daily-detail-card" key={`${r.employee_id}-${r.day}`}><div><b>{new Date(`${r.day}T12:00:00`).toLocaleDateString('es-DO',{weekday:'short',day:'2-digit',month:'short'})}</b><span>{selectedEmployee?r.employee_type:'General'}</span></div><strong>{Number(r.sales_amount)>0?money(r.sales_amount):(r.pending_amounts>0?'Monto pendiente':money(0))}</strong><small>{r.purchase_clients||0} compra(s) · {r.prospects_captured||0} captación(es) · {r.calls||0} llamada(s){r.call_purchase_clients?` · ${r.call_purchase_clients} compra(s) por llamada`:''}{r.pending_amounts?` · ${r.pending_amounts} monto(s) pendiente(s) (${r.pending_street_amounts||0} calle · ${r.pending_showroom_amounts||0} showroom)`:''}</small></div>)}</div>}</section>}
  </>}
 </div>
}

function Chart({title,subtitle,empty,children}:{title:string;subtitle:string;empty:boolean;children:React.ReactNode}){
 return <section className="panel executive-chart-card"><div className="panel-head"><div><b>{title}</b><span>{subtitle}</span></div></div>{empty?<div className="empty-state"><b>Sin datos para graficar.</b></div>:children}</section>
}
