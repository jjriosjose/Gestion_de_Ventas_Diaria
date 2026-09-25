import { useEffect,useRef,useState } from 'react'
import { Camera,ExternalLink,MapPin,Target } from 'lucide-react'
import { supabase } from '../lib/supabase'

type SnapshotRef={route_session_id?:string|null;full_name:string;route_mode?:string|null}
type Evidence={url:string;mimeType?:string|null;name:string}

const time=(value?:string|null)=>value?new Date(value).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—'
const duration=(start?:string|null,end?:string|null)=>{
 if(!start)return'—'
 const finish=end?new Date(end).getTime():Date.now(),seconds=Math.max(0,Math.round((finish-new Date(start).getTime())/1000)),minutes=Math.floor(seconds/60)
 if(minutes<60)return seconds<60?String(seconds)+' s':String(minutes)+' min'
 return String(Math.floor(minutes/60))+' h '+String(minutes%60)+' min'
}
const coords=(lat?:number|null,lon?:number|null)=>lat!=null&&lon!=null?Number(lat).toFixed(5)+', '+Number(lon).toFixed(5):'Sin coordenadas'
const accuracy=(value?:number|string|null)=>value==null?'sin precisión':'±'+Math.round(Number(value))+' m'
const resultLabel=(value?:string|null)=>({
 CAPTADO:'Prospecto creado',NO_INTERESADO:'No interesado',CERRADO:'Negocio cerrado',
 ENCARGADO_AUSENTE:'Encargado ausente',YA_CLIENTE:'Ya es cliente',NO_CUMPLE_PERFIL:'No cumple perfil',
 NO_LOCALIZADO:'No localizado',VOLVER:'Volver / seguimiento',OTRO:'Otro'
} as Record<string,string>)[value||'']||value?.replaceAll('_',' ')||'En curso'
const sourceLabel=(value?:string|null)=>value==='TASK'?'Captación programada':'Captación dentro de ruta'

export function TrackingCaptureManagement({snapshot,selectedCaptureId}:{snapshot:SnapshotRef|null;selectedCaptureId?:string|null}){
 const[rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[evidence,setEvidence]=useState<Evidence|null>(null)
 const itemRefs=useRef<Record<string,HTMLDetailsElement|null>>({})

 useEffect(()=>{
  let cancelled=false
  setEvidence(null);setError('')
  const sessionId=snapshot?.route_session_id
  if(!sessionId){setRows([]);setLoading(false);return()=>{cancelled=true}}
  const load=async()=>{
   setLoading(true)
   try{
    const interactions=await supabase.from('capture_interactions').select(
      'id,route_session_id,route_plan_id,capture_assignment_id,source_context,status,result_code,subject_name,contact_name,phone,client_type,business_interest,started_at,start_latitude,start_longitude,start_accuracy_m,ended_at,end_latitude,end_longitude,end_accuracy_m,prospect_id,notes,prospects(id,prospect_code,legal_name,contact_name,phone,mobile,client_type,business_interest,status,captured_at,notes,region,province,municipality,district_municipality,latitude,longitude,gps_accuracy_m,capture_mode,capture_assignment_id)'
    ).eq('route_session_id',sessionId).order('started_at',{ascending:true})
    if(cancelled)return
    if(interactions.error)throw interactions.error
    const base=interactions.data||[],prospectIds=base.map((r:any)=>r.prospect_id).filter(Boolean)
    let photos:any[]=[]
    if(prospectIds.length){
      const p=await supabase.from('photos').select('id,prospect_id,object_path,mime_type,taken_at,latitude,longitude').in('prospect_id',prospectIds).order('taken_at',{ascending:true})
      if(!p.error)photos=p.data||[]
    }
    if(cancelled)return
    setRows(base.map((r:any)=>({...r,photos:photos.filter(p=>p.prospect_id===r.prospect_id)})))
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'No fue posible cargar el detalle de captaciones.')}
   finally{if(!cancelled)setLoading(false)}
  }
  void load()
  return()=>{cancelled=true}
 },[snapshot?.route_session_id])

 useEffect(()=>{
  if(!selectedCaptureId)return
  const node=itemRefs.current[selectedCaptureId]
  if(node){node.open=true;window.setTimeout(()=>node.scrollIntoView({behavior:'smooth',block:'nearest'}),80)}
 },[selectedCaptureId,rows.length])

 const openEvidence=async(photo:any)=>{
  const{data,error}=await supabase.storage.from('karaka-photos').createSignedUrl(photo.object_path,180)
  if(error||!data?.signedUrl){alert(error?.message||'No fue posible abrir la evidencia.');return}
  setEvidence({url:data.signedUrl,mimeType:photo.mime_type,name:'Evidencia de captación · '+(photo.taken_at?new Date(photo.taken_at).toLocaleString('es-DO'):'foto')})
 }

 if(!snapshot?.route_session_id)return null
 return <section className="panel tracking-capture-management">
  <div className="tracking-visit-management-head"><div><span className="eyebrow">CAPTACIÓN COMERCIAL</span><b>Detalle de captaciones · {snapshot.full_name}</b><small>{rows.length} gestión(es) de captación vinculada(s) a esta jornada</small></div><span className={'tracking-route-mode-chip '+(snapshot.route_mode==='LIBRE'?'free':'planned')}>{snapshot.route_mode==='LIBRE'?'L · LIBRE':'P · PLAN'}</span></div>
  {loading?<div className="tracking-visit-loading">Cargando formularios de captación...</div>:error?<div className="tracking-visit-error">{error}</div>:rows.length?<div className="tracking-visit-accordion">{rows.map((r:any,index:number)=>{
   const prospect=r.prospects||null,photos=r.photos||[],focused=selectedCaptureId===r.id
   return <details ref={node=>{itemRefs.current[r.id]=node}} key={r.id} className={'tracking-visit-item tracking-capture-item '+(focused?'focused':'')}>
    <summary><div className="tracking-visit-summary-main"><span className="tracking-visit-index">{String(index+1).padStart(2,'0')}</span><div><b>{r.subject_name||prospect?.legal_name||'Captación'}</b><small>{time(r.started_at)} → {r.ended_at?time(r.ended_at):'en curso'} · {duration(r.started_at,r.ended_at)} · {sourceLabel(r.source_context)}</small></div></div><div className="tracking-visit-summary-result"><span className={'tracking-capture-result '+String(r.result_code||r.status).toLowerCase()}>{resultLabel(r.result_code)}</span>{photos.length>0&&<span className="tracking-photo-count"><Camera size={13}/>{photos.length}</span>}</div></summary>
    <div className="tracking-visit-body">
      <div className="tracking-capture-highlight"><Target size={18}/><div><span>{r.status==='ACTIVA'?'CAPTACIÓN EN CURSO':r.result_code==='CAPTADO'?'PROSPECTO CREADO':'GESTIÓN FINALIZADA'}</span><b>{prospect?.legal_name||r.subject_name}</b><small>{prospect?.prospect_code||'Sin código de prospecto'} · {sourceLabel(r.source_context)}</small></div></div>
      <div className="tracking-visit-grid">
       <Info label="Resultado" value={resultLabel(r.result_code)}/><Info label="Estado" value={r.status||'—'}/>
       <Info label="Código prospecto" value={prospect?.prospect_code||'No generado'}/><Info label="Persona contactada" value={r.contact_name||prospect?.contact_name||'—'}/>
       <Info label="Teléfono / WhatsApp" value={r.phone||prospect?.phone||prospect?.mobile||'—'}/><Info label="Tipo de negocio" value={r.client_type||prospect?.client_type||'—'}/>
       <Info label="Interés comercial" value={r.business_interest||prospect?.business_interest||'—'}/><Info label="Duración" value={duration(r.started_at,r.ended_at)}/>
       <Info label="Hora llegada" value={time(r.started_at)}/><Info label="Hora salida" value={r.ended_at?time(r.ended_at):'En curso'}/>
       <Info label="Origen" value={sourceLabel(r.source_context)}/><Info label="Territorio" value={[prospect?.region,prospect?.province,prospect?.municipality].filter(Boolean).join(' · ')||'Determinado por GPS'}/>
      </div>
      {(r.notes||prospect?.notes)&&<TextBlock label="Observaciones" value={r.notes||prospect?.notes}/>}
      <div className="tracking-visit-gps"><div><MapPin size={15}/><span>Llegada / inicio captación</span><b>{coords(r.start_latitude,r.start_longitude)}</b><small>{accuracy(r.start_accuracy_m)}</small></div><div><MapPin size={15}/><span>Salida / fin captación</span><b>{coords(r.end_latitude,r.end_longitude)}</b><small>{accuracy(r.end_accuracy_m)}</small></div></div>
      <div className="tracking-evidence-row"><div><Camera size={16}/><b>Evidencias</b><span>{photos.length?String(photos.length)+' foto(s) asociada(s)':'Sin fotografías asociadas'}</span></div>{photos.length>0&&<div className="tracking-evidence-actions">{photos.map((p:any,i:number)=><button key={p.id} className="secondary compact" onClick={()=>void openEvidence(p)}><Camera size={14}/> Ver {i+1}</button>)}</div>}</div>
    </div>
   </details>
  })}</div>:<div className="tracking-visit-empty">Todavía no hay captaciones registradas en esta jornada.</div>}
  {evidence&&<div className="tracking-evidence-modal"><button className="tracking-evidence-backdrop" onClick={()=>setEvidence(null)} aria-label="Cerrar evidencia"/><div className="tracking-evidence-dialog"><div><b>{evidence.name}</b><button className="secondary compact" onClick={()=>setEvidence(null)}>Cerrar</button></div>{evidence.mimeType?.includes('heic')||evidence.mimeType?.includes('heif')?<div className="tracking-evidence-fallback"><span>Este formato puede no visualizarse directamente en el navegador.</span><a className="primary compact" href={evidence.url} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Abrir original</a></div>:<img src={evidence.url} alt={evidence.name}/>}<a href={evidence.url} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Abrir evidencia en otra pestaña</a></div></div>}
 </section>
}

function Info({label,value}:{label:string;value:string}){return <div className="tracking-visit-info"><span>{label}</span><b>{value}</b></div>}
function TextBlock({label,value}:{label:string;value:string}){return <div className="tracking-visit-text"><span>{label}</span><p>{value}</p></div>}
