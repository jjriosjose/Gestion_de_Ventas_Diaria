import { useEffect,useState } from 'react'
import { Camera,ExternalLink,MapPin,ShoppingBag } from 'lucide-react'
import { supabase } from '../lib/supabase'

type SnapshotRef={route_session_id?:string|null;full_name:string;route_mode?:string|null;total_completed_visits?:number;capture_count?:number;commercial_activity_count?:number}
type Evidence={url:string;mimeType?:string|null;name:string}

const time=(value?:string|null)=>value?new Date(value).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—'
const date=(value?:string|null)=>value?new Date(value).toLocaleDateString('es-DO'):'—'
const duration=(start?:string|null,end?:string|null)=>{
 if(!start)return'—'
 const finish=end?new Date(end).getTime():Date.now(),minutes=Math.max(0,Math.round((finish-new Date(start).getTime())/60000))
 return minutes<60?`${minutes} min`:`${Math.floor(minutes/60)} h ${minutes%60} min`
}
const money=(value:any)=>value==null||value===''?'—':`RD$${Number(value).toLocaleString('es-DO',{maximumFractionDigits:2})}`
const purchaseLabel=(value?:string|null)=>({COMPRO:'Compró',NO_COMPRO:'No compró',PENDIENTE:'Pendiente',NO_GESTIONADO:'No gestionado'} as Record<string,string>)[value||'']||value||'Sin resultado'
const resultLabel=(value?:string|null)=>value?value.replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase()):'—'
const nextActionLabel=(value?:string|null)=>value?value.replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase()):'Sin seguimiento'
const coords=(lat?:number|null,lon?:number|null)=>lat!=null&&lon!=null?`${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`:'Sin coordenadas'
const accuracy=(value?:number|string|null)=>value==null?'sin precisión':`±${Math.round(Number(value))} m`

export function TrackingVisitManagement({snapshot}:{snapshot:SnapshotRef|null}){
 const[rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[evidence,setEvidence]=useState<Evidence|null>(null)

 useEffect(()=>{
  let cancelled=false
  setEvidence(null);setError('')
  const sessionId=snapshot?.route_session_id
  if(!sessionId){setRows([]);setLoading(false);return()=>{cancelled=true}}
  const load=async()=>{
   setLoading(true)
   try{
    const visits=await supabase.from('visits').select('id,route_session_id,route_stop_id,client_id,prospect_id,planned,started_at,ended_at,received,purchase_result,purchase_amount,result,contact_name,no_purchase_reason,merchandise_comment,competitor_comment,notes,next_action,follow_up_date,start_latitude,start_longitude,start_accuracy_m,end_latitude,end_longitude,end_accuracy_m,clients(codempr,legal_name,client_type,latitude,longitude),prospects(prospect_code,legal_name)').eq('route_session_id',sessionId).order('started_at',{ascending:true})
    if(cancelled)return
    if(visits.error)throw visits.error
    const base=visits.data||[],ids=base.map((v:any)=>v.id)
    let photos:any[]=[];let appointments:any[]=[]
    if(ids.length){
     const[p,a]=await Promise.all([
      supabase.from('photos').select('id,visit_id,object_path,mime_type,taken_at,latitude,longitude').in('visit_id',ids).order('taken_at',{ascending:true}),
      supabase.from('appointments').select('id,source_visit_id,status,requested_appointment_at,appointment_at').in('source_visit_id',ids)
     ])
     if(!p.error)photos=p.data||[]
     if(!a.error)appointments=a.data||[]
    }
    if(cancelled)return
    setRows(base.map((v:any)=>({...v,photos:photos.filter(p=>p.visit_id===v.id),appointment:appointments.find(a=>a.source_visit_id===v.id)||null})))
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'No fue posible cargar el detalle de visitas.')}
   finally{if(!cancelled)setLoading(false)}
  }
  void load()
  return()=>{cancelled=true}
 },[snapshot?.route_session_id])

 const openEvidence=async(photo:any)=>{
  const{data,error}=await supabase.storage.from('karaka-photos').createSignedUrl(photo.object_path,180)
  if(error||!data?.signedUrl){alert(error?.message||'No fue posible abrir la evidencia.');return}
  setEvidence({url:data.signedUrl,mimeType:photo.mime_type,name:`Evidencia · ${photo.taken_at?new Date(photo.taken_at).toLocaleString('es-DO'):'visita'}`})
 }

 if(!snapshot?.route_session_id)return null
 return <section className="panel tracking-visit-management">
  <div className="tracking-visit-management-head"><div><span className="eyebrow">GESTIÓN COMERCIAL</span><b>Detalle de visitas · {snapshot.full_name}</b><small>{rows.length} visita(s){Number(snapshot.capture_count||0)>0?` · ${snapshot.capture_count} captación(es) · ${snapshot.commercial_activity_count||rows.length} actividades`:''}</small></div><span className={`tracking-route-mode-chip ${snapshot.route_mode==='LIBRE'?'free':'planned'}`}>{snapshot.route_mode==='LIBRE'?'L · LIBRE':'P · PLAN'}</span></div>
  {loading?<div className="tracking-visit-loading">Cargando formularios de visita...</div>:error?<div className="tracking-visit-error">{error}</div>:rows.length?<div className="tracking-visit-accordion">{rows.map((v:any,index:number)=>{
   const name=v.clients?.legal_name||v.prospects?.legal_name||'Visita',photos=v.photos||[]
   return <details key={v.id} className="tracking-visit-item"><summary><div className="tracking-visit-summary-main"><span className="tracking-visit-index">{String(index+1).padStart(2,'0')}</span><div><b>{name}</b><small>{time(v.started_at)} → {v.ended_at?time(v.ended_at):'en curso'} · {duration(v.started_at,v.ended_at)} · {v.planned?'Planificada':'Adicional'}</small></div></div><div className="tracking-visit-summary-result"><span className={`tracking-purchase ${String(v.purchase_result||'').toLowerCase()}`}>{purchaseLabel(v.purchase_result)}</span>{photos.length>0&&<span className="tracking-photo-count"><Camera size={13}/>{photos.length}</span>}</div></summary><div className="tracking-visit-body">
    <div className="tracking-visit-grid"><Info label="Recibido" value={v.received==null?'—':v.received?'Sí':'No'}/><Info label="Quién atendió" value={v.contact_name||'—'}/><Info label="Resultado comercial" value={purchaseLabel(v.purchase_result)}/><Info label="Resultado visita" value={resultLabel(v.result)}/>{v.purchase_result==='COMPRO'&&<Info label="Monto de compra" value={money(v.purchase_amount)}/>}<Info label="Próxima acción" value={nextActionLabel(v.next_action)}/>{v.follow_up_date&&<Info label="Fecha seguimiento" value={date(v.follow_up_date)}/>}<Info label="Tipo" value={v.planned?'Visita del plan':'Visita adicional'}/></div>
    {v.no_purchase_reason&&<TextBlock label="Motivo / contexto" value={v.no_purchase_reason}/>} {v.merchandise_comment&&<TextBlock label="Comentario mercancía Karaka" value={v.merchandise_comment}/>} {v.competitor_comment&&<TextBlock label="Comentario competencia" value={v.competitor_comment}/>} {v.notes&&<TextBlock label="Observaciones" value={v.notes}/>} 
    {v.appointment&&<div className="tracking-showroom-link"><ShoppingBag size={16}/><div><b>Solicitud de showroom</b><span>{resultLabel(v.appointment.status)} · {v.appointment.requested_appointment_at?new Date(v.appointment.requested_appointment_at).toLocaleString('es-DO'):'sin fecha tentativa'}</span></div></div>}
    <div className="tracking-visit-gps"><div><MapPin size={15}/><span>Entrada</span><b>{coords(v.start_latitude,v.start_longitude)}</b><small>{accuracy(v.start_accuracy_m)}</small></div><div><MapPin size={15}/><span>Salida</span><b>{coords(v.end_latitude,v.end_longitude)}</b><small>{accuracy(v.end_accuracy_m)}</small></div></div>
    <div className="tracking-evidence-row"><div><Camera size={16}/><b>Evidencias</b><span>{photos.length?`${photos.length} foto(s) asociada(s)`:'Sin fotografías asociadas'}</span></div>{photos.length>0&&<div className="tracking-evidence-actions">{photos.map((p:any,i:number)=><button key={p.id} className="secondary compact" onClick={()=>void openEvidence(p)}><Camera size={14}/> Ver {i+1}</button>)}</div>}</div>
   </div></details>
  })}</div>:<div className="tracking-visit-empty">Todavía no hay visitas registradas en esta jornada.</div>}
  {evidence&&<div className="tracking-evidence-modal"><button className="tracking-evidence-backdrop" onClick={()=>setEvidence(null)} aria-label="Cerrar evidencia"/><div className="tracking-evidence-dialog"><div><b>{evidence.name}</b><button className="secondary compact" onClick={()=>setEvidence(null)}>Cerrar</button></div>{evidence.mimeType?.includes('heic')||evidence.mimeType?.includes('heif')?<div className="tracking-evidence-fallback"><span>Este formato puede no visualizarse directamente en el navegador.</span><a className="primary compact" href={evidence.url} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Abrir original</a></div>:<img src={evidence.url} alt={evidence.name}/>}<a href={evidence.url} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Abrir evidencia en otra pestaña</a></div></div>}
 </section>
}

function Info({label,value}:{label:string;value:string}){return <div className="tracking-visit-info"><span>{label}</span><b>{value}</b></div>}
function TextBlock({label,value}:{label:string;value:string}){return <div className="tracking-visit-text"><span>{label}</span><p>{value}</p></div>}
