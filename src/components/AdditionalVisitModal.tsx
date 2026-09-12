import { useEffect,useMemo,useState } from 'react'
import { LoaderCircle,MapPin,Navigation,Search,UserPlus,X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { currentPosition,googleMapsNavigation } from '../lib/geo'
import { useAuth } from '../context/AuthContext'

const SEARCH_DELAY_MS=280

type ClientRow={
  id:string
  codempr?:string|null
  legal_name:string
  client_type?:string|null
  municipality?:string|null
  vendor_employee_id?:string|null
  manager_employee_id?:string|null
  latitude?:number|null
  longitude?:number|null
}

type Props={
  sessionId:string
  plannedClientIds?:string[]
  journeyMode?:'PLANIFICADA'|'LIBRE'|string
  onClose:()=>void
  onStarted:(result:any)=>void
}

export function AdditionalVisitModal({sessionId,plannedClientIds=[],journeyMode='PLANIFICADA',onClose,onStarted}:Props){
  const{employee}=useAuth()
  const[q,setQ]=useState('')
  const[rows,setRows]=useState<ClientRow[]>([])
  const[loading,setLoading]=useState(false)
  const[busyId,setBusyId]=useState('')
  const plannedSet=useMemo(()=>new Set(plannedClientIds),[plannedClientIds])
  const free=journeyMode==='LIBRE'

  useEffect(()=>{
    if(!employee?.id)return
    let cancelled=false
    const timer=window.setTimeout(async()=>{
      setLoading(true)
      try{
        const term=q.trim().replace(/[,%()]/g,' ').replace(/\s+/g,' ')
        let query=supabase.from('clients').select('id,codempr,legal_name,client_type,municipality,vendor_employee_id,manager_employee_id,latitude,longitude').order('legal_name').limit(35)
        if(term.length>=2)query=query.or(`legal_name.ilike.%${term}%,codempr.ilike.%${term}%`)
        else query=query.eq('vendor_employee_id',employee.id)
        const{data,error}=await query
        if(error)throw error
        if(!cancelled)setRows((data||[]) as ClientRow[])
      }catch(e){
        if(!cancelled){setRows([]);alert(e instanceof Error?e.message:'No fue posible buscar clientes')}
      }finally{if(!cancelled)setLoading(false)}
    },SEARCH_DELAY_MS)
    return()=>{cancelled=true;window.clearTimeout(timer)}
  },[q,employee?.id])

  const start=async(client:ClientRow)=>{
    if(!employee?.id||plannedSet.has(client.id)||busyId)return
    setBusyId(client.id)
    try{
      const p=await currentPosition()
      const{data,error}=await supabase.rpc('start_additional_visit',{
        p_route_session_id:sessionId,
        p_client_id:client.id,
        p_start_latitude:p.latitude,
        p_start_longitude:p.longitude,
        p_start_accuracy_m:p.accuracy
      })
      if(error)throw error
      onStarted({...data,client})
    }catch(e){alert(e instanceof Error?e.message:free?'No se pudo registrar la llegada':'No se pudo iniciar la visita adicional')}
    finally{setBusyId('')}
  }

  return <div className="modal-wrap"><button className="modal-backdrop" onClick={busyId?undefined:onClose}/><div className="modal large additional-visit-modal">
    <div className="modal-head"><div><span className="eyebrow">{free?'JORNADA LIBRE':'VISITA FUERA DEL PLAN'}</span><h3>{free?'Visitar cliente':'Visita adicional'}</h3><p>{free?'Busca un cliente y registra la llegada. Desde ese momento comienza a medirse el tiempo de atención hasta que finalices la visita y salgas.':'Busca cualquier cliente y registra la llegada dentro de la jornada activa. No modifica la cobertura de la ruta planificada.'}</p></div><button className="icon-btn" disabled={!!busyId} onClick={onClose}><X/></button></div>
    <div className="additional-visit-search"><Search size={18}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre o código de cliente..."/>{loading&&<LoaderCircle className="spin" size={18}/>}</div>
    <div className="additional-visit-help"><b>{q.trim().length>=2?'Resultados de búsqueda':'Tu cartera'}</b><span>{q.trim().length>=2?'La búsqueda puede incluir clientes fuera de tu cartera.':'Escribe al menos 2 caracteres para buscar en toda la base de clientes.'}</span></div>
    <div className="additional-client-list">{rows.length?rows.map(client=>{const planned=plannedSet.has(client.id);const mine=client.vendor_employee_id===employee?.id;const nav=googleMapsNavigation(client.latitude,client.longitude);return <div className={`additional-client-card ${planned?'blocked':''}`} key={client.id}>
      <div className="additional-client-main"><div className="additional-client-icon"><MapPin size={18}/></div><div><b>{client.legal_name}</b><span>{client.codempr||'Sin código'} · {client.client_type||'SIN TIPO'} · {client.municipality||'Municipio pendiente'}</span><small>{planned?'Ya forma parte de la ruta planificada':mine?'Tu cartera':'Fuera de tu cartera'}</small></div></div>
      <div className="button-row">{nav&&<a className="icon-btn compact" target="_blank" rel="noreferrer" href={nav} title="Navegar al cliente"><Navigation size={15}/></a>}<button className="primary compact" disabled={planned||!!busyId} onClick={()=>void start(client)}><UserPlus size={15}/>{busyId===client.id?'Registrando...':planned?'Usa su parada':'Registrar llegada'}</button></div>
    </div>}):<div className="empty-state"><Search/><b>{loading?'Buscando clientes...':'No se encontraron clientes'}</b><span>Prueba con otra parte del nombre o código.</span></div>}</div>
    <div className="modal-actions"><button className="secondary" disabled={!!busyId} onClick={onClose}>Cancelar</button></div>
  </div></div>
}
