import { useEffect,useRef,useState } from 'react'
import { Camera,CheckCircle2,Clock3,MapPin,Target,Upload,X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { currentPosition } from '../lib/geo'
import { useAuth } from '../context/AuthContext'
import '../styles/capture-operational-v2.css'

const RESULTS=[
  ['CAPTADO','Prospecto creado'],
  ['VOLVER','Volver / seguimiento'],
  ['NO_INTERESADO','No interesado'],
  ['ENCARGADO_AUSENTE','Encargado ausente'],
  ['CERRADO','Negocio cerrado'],
  ['YA_CLIENTE','Ya es cliente'],
  ['NO_CUMPLE_PERFIL','No cumple perfil'],
  ['NO_LOCALIZADO','No localizado'],
  ['OTRO','Otro']
] as const

const duration=(start?:string|null)=>{
  if(!start)return'0 min'
  const seconds=Math.max(0,Math.floor((Date.now()-new Date(start).getTime())/1000))
  const minutes=Math.floor(seconds/60)
  return minutes<60?`${minutes} min`:`${Math.floor(minutes/60)} h ${minutes%60} min`
}

type Props={
  sessionId:string
  activeInteraction?:any|null
  onClose:()=>void
  onChanged:(interaction?:any|null)=>void|Promise<void>
}

export function RouteCaptureModal({sessionId,activeInteraction,onClose,onChanged}:Props){
  const{employee}=useAuth()
  const[interaction,setInteraction]=useState<any|null>(activeInteraction||null)
  const[subject,setSubject]=useState(activeInteraction?.subject_name||'')
  const[result,setResult]=useState('CAPTADO')
  const[contact,setContact]=useState('')
  const[phone,setPhone]=useState('')
  const[type,setType]=useState('')
  const[interest,setInterest]=useState('')
  const[notes,setNotes]=useState('')
  const[files,setFiles]=useState<File[]>([])
  const[busy,setBusy]=useState(false)
  const[,setTick]=useState(0)
  const input=useRef<HTMLInputElement|null>(null)

  useEffect(()=>{
    if(!interaction?.started_at)return
    const id=window.setInterval(()=>setTick(v=>v+1),30000)
    return()=>window.clearInterval(id)
  },[interaction?.started_at])

  const start=async()=>{
    if(!subject.trim())return alert('Indica el nombre del negocio o una referencia para identificar la captación.')
    setBusy(true)
    try{
      const p=await currentPosition()
      const{data,error}=await supabase.rpc('start_route_capture_interaction',{
        p_route_session_id:sessionId,
        p_subject_name:subject.trim(),
        p_start_latitude:p.latitude,
        p_start_longitude:p.longitude,
        p_start_accuracy_m:p.accuracy
      })
      if(error)throw error
      onClose()
      await onChanged(data)
    }catch(e){alert(e instanceof Error?e.message:'No se pudo iniciar la captación')}
    finally{setBusy(false)}
  }

  const uploadPhotos=async(prospectId:string)=>{
    if(!files.length||!employee?.id)return
    for(const f of files){
      const ext=f.name.split('.').pop()?.toLowerCase()||'jpg'
      const path=`prospects/${prospectId}/${crypto.randomUUID()}.${ext}`
      const{error:up}=await supabase.storage.from('karaka-photos').upload(path,f,{contentType:f.type||'image/jpeg'})
      if(up)throw up
      const{error:photoError}=await supabase.from('photos').insert({
        prospect_id:prospectId,
        employee_id:employee.id,
        bucket_id:'karaka-photos',
        object_path:path,
        photo_type:'FACHADA',
        mime_type:f.type||null,
        size_bytes:f.size,
        taken_at:new Date().toISOString()
      })
      if(photoError)throw photoError
    }
  }

  const finish=async()=>{
    if(!interaction?.id)return
    if(result==='CAPTADO'&&!subject.trim())return alert('El nombre del prospecto es obligatorio.')
    setBusy(true)
    try{
      const p=await currentPosition()
      const{data,error}=await supabase.rpc('finish_route_capture_interaction',{
        p_interaction_id:interaction.id,
        p_result_code:result,
        p_subject_name:subject.trim()||null,
        p_contact_name:contact.trim()||null,
        p_phone:phone.trim()||null,
        p_client_type:type.trim()||null,
        p_business_interest:interest.trim()||null,
        p_notes:notes.trim()||null,
        p_end_latitude:p.latitude,
        p_end_longitude:p.longitude,
        p_end_accuracy_m:p.accuracy
      })
      if(error)throw error
      if(data?.prospect_id)await uploadPhotos(data.prospect_id)
      await onChanged(null)
      alert(data?.prospect_id?'Captación finalizada y prospecto creado correctamente.':'Gestión de captación finalizada correctamente.')
      onClose()
    }catch(e){alert(e instanceof Error?e.message:'No se pudo finalizar la captación')}
    finally{setBusy(false)}
  }

  const cancel=async()=>{
    if(!interaction?.id||!window.confirm('¿Cancelar esta captación en curso? Quedará registrada como cancelada para auditoría.'))return
    setBusy(true)
    try{
      const{error}=await supabase.rpc('cancel_route_capture_interaction',{p_interaction_id:interaction.id,p_notes:'Cancelada por el vendedor durante prueba Captación Operativa V2'})
      if(error)throw error
      await onChanged(null)
      onClose()
    }catch(e){alert(e instanceof Error?e.message:'No se pudo cancelar la captación')}
    finally{setBusy(false)}
  }

  return <div className="modal-wrap"><button className="modal-backdrop" disabled={busy} onClick={busy?undefined:onClose}/><div className="modal large route-capture-modal">
    <div className="modal-head"><div><span className="eyebrow">CAPTACIÓN DENTRO DE JORNADA</span><h3>{interaction?'Captación en curso':'Captar prospecto'}</h3><p>{interaction?'Completa el resultado y finaliza la labor. El tiempo se mide desde la llegada registrada.':'Registra la llegada al negocio. Desde ese momento comienza a medirse el tiempo de captación dentro de esta misma jornada.'}</p></div><button className="icon-btn" disabled={busy} onClick={onClose}><X/></button></div>

    {!interaction?<div className="route-capture-start">
      <div className="capture-v2-info"><MapPin/><div><b>Una sola jornada operativa</b><span>Esta captación quedará asociada a la Ruta Planificada o Jornada Libre actualmente activa y aparecerá como evento independiente en Tracking.</span></div></div>
      <label>Nombre del negocio / referencia *<input autoFocus value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Ej.: Colmado La Esperanza"/></label>
      <div className="modal-actions"><button className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={busy||!subject.trim()} onClick={()=>void start()}><Target size={17}/>{busy?'Capturando GPS...':'Llegué / iniciar captación'}</button></div>
    </div>:<>
      <div className="capture-v2-live"><div className="capture-v2-pulse"><i/></div><div><span>CAPTACIÓN ACTIVA</span><b>{interaction.subject_name||subject}</b><small>Inicio {new Date(interaction.started_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})} · {duration(interaction.started_at)}</small></div><Clock3/></div>
      <div className="form-grid">
        <label className="span-2">Resultado *<select value={result} onChange={e=>setResult(e.target.value)}>{RESULTS.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        <label>Negocio / prospecto<input value={subject} onChange={e=>setSubject(e.target.value)}/></label>
        <label>Persona contactada<input value={contact} onChange={e=>setContact(e.target.value)}/></label>
        <label>Teléfono / WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)}/></label>
        <label>Tipo de negocio<input value={type} onChange={e=>setType(e.target.value)}/></label>
        <label className="span-2">Interés comercial<input value={interest} onChange={e=>setInterest(e.target.value)}/></label>
        <label className="span-2">Observación<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder={result==='CAPTADO'?'Información relevante del prospecto...':'Indica brevemente lo ocurrido durante la gestión...'}/></label>
      </div>
      {result==='CAPTADO'&&<div className="capture-tools"><input ref={input} hidden type="file" accept="image/*" capture="environment" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/><button className="secondary" disabled={busy} onClick={()=>input.current?.click()}><Camera size={18}/> Tomar / cargar fotos</button><span>{files.length} foto(s)</span></div>}
      <div className="capture-v2-finish-note"><CheckCircle2/><span>Al finalizar se capturará nuevamente el GPS. Si el resultado es <b>Prospecto creado</b>, se generará el prospecto y quedará vinculado explícitamente a esta jornada.</span></div>
      <div className="modal-actions"><button className="danger" disabled={busy} onClick={()=>void cancel()}>Cancelar captación</button><button className="primary" disabled={busy||(result==='CAPTADO'&&!subject.trim())} onClick={()=>void finish()}><Upload size={17}/>{busy?'Finalizando...':'Finalizar labor'}</button></div>
    </>}
  </div></div>
}
