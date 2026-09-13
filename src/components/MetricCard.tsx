import { useEffect,useState,type KeyboardEvent,type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

type MetricTone='neutral'|'brand'|'success'|'warning'|'danger'|'info'

type Props={
  icon?:ReactNode
  label:string
  value:ReactNode
  note?:ReactNode
  tone?:MetricTone
  selected?:boolean
  actionLabel?:string
  onClick?:()=>void
  className?:string
}

type StaleVendor={
  employee_id:string
  full_name:string
  tracking_status:string
  last_event_at?:string|null
  last_event_label?:string|null
  last_event_age_minutes?:number|null
  started_at?:string|null
}

const ACTIVE=['EN_VISITA','EN_TRASLADO','EVENTUALIDAD','PENDIENTE_CIERRE']
const rdDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const minutesSince=(value?:string|null)=>value?Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000)):null
const staleMinutes=(row:StaleVendor)=>row.last_event_age_minutes??minutesSince(row.last_event_at)??minutesSince(row.started_at)??0
const statusLabel=(value:string)=>({EN_VISITA:'En visita',EN_TRASLADO:'En traslado',EVENTUALIDAD:'Eventualidad',PENDIENTE_CIERRE:'Pendiente cierre'} as Record<string,string>)[value]||value.replaceAll('_',' ')

export function MetricCard({icon,label,value,note,tone='neutral',selected=false,actionLabel,onClick,className=''}:Props){
  const isTrackingFreshness=label==='Sin señal reciente'&&String(note||'').includes('último registro')
  const[staleVendors,setStaleVendors]=useState<StaleVendor[]>([])
  const[staleOpen,setStaleOpen]=useState(false)
  const[staleLoading,setStaleLoading]=useState(false)

  const loadStale=async()=>{
    if(!isTrackingFreshness)return
    setStaleLoading(true)
    try{
      const{data,error}=await supabase.from('executive_tracking_snapshot_v1').select('employee_id,full_name,tracking_status,last_event_at,last_event_label,last_event_age_minutes,started_at').eq('route_date',rdDate())
      if(error)throw error
      const byEmployee=new Map<string,StaleVendor>()
      ;((data||[]) as StaleVendor[]).filter(r=>ACTIVE.includes(r.tracking_status)&&staleMinutes(r)>=45).forEach(row=>{
        const current=byEmployee.get(row.employee_id)
        if(!current||staleMinutes(row)>staleMinutes(current))byEmployee.set(row.employee_id,row)
      })
      setStaleVendors(Array.from(byEmployee.values()).sort((a,b)=>staleMinutes(b)-staleMinutes(a)))
    }catch(e){console.warn('Tracking stale alert:',e)}
    finally{setStaleLoading(false)}
  }

  useEffect(()=>{if(isTrackingFreshness)void loadStale()},[isTrackingFreshness])

  const internalClick=isTrackingFreshness?()=>{void loadStale();setStaleOpen(true)}:onClick
  const actionable=Boolean(internalClick)
  const displayLabel=isTrackingFreshness?'Sin registro >45 min':label
  const displayValue=isTrackingFreshness?staleVendors.length:value
  const displayNote=isTrackingFreshness?(staleVendors.length?`${staleVendors.length} vendedor${staleVendors.length===1?'':'es'} requiere${staleVendors.length===1?'':'n'} revisión`:'Todos los vendedores activos tienen registros recientes'):note
  const displayTone:isTrackingFreshness extends true?MetricTone:MetricTone = isTrackingFreshness?(staleVendors.length?'warning':'neutral'):tone

  const onKeyDown=(event:KeyboardEvent<HTMLDivElement>)=>{
    if(!internalClick)return
    if(event.key==='Enter'||event.key===' '){event.preventDefault();internalClick()}
  }
  return <>
    <div
      className={`panel metric-card metric-tone-${displayTone} ${selected?'is-selected':''} ${actionable?'is-actionable':''} ${className}`}
      role={actionable?'button':undefined}
      tabIndex={actionable?0:undefined}
      aria-pressed={actionable?selected:undefined}
      aria-label={actionable?(actionLabel||`${displayLabel}: ${String(displayValue)}`):undefined}
      onClick={internalClick}
      onKeyDown={onKeyDown}
    >
      {icon&&<div className="metric-card-icon">{icon}</div>}
      <div className="metric-card-copy"><span>{displayLabel}</span><strong>{displayValue}</strong>{displayNote!==undefined&&<small>{displayNote}</small>}</div>
    </div>
    {staleOpen&&<div className="modal-wrap"><button className="modal-backdrop" onClick={()=>setStaleOpen(false)}/><div className="modal large"><div className="modal-head"><div><span className="eyebrow">ALERTA OPERATIVA</span><h3>Vendedores sin registro por 45 minutos o más</h3><p>Solo se incluyen vendedores con jornada activa. El conteo es por vendedor, no por ruta.</p></div><button className="icon-btn" onClick={()=>setStaleOpen(false)}>×</button></div>
      {staleLoading?<div className="empty-state"><b>Actualizando alerta...</b></div>:staleVendors.length?<div className="cards-list">{staleVendors.map(v=><div className="activity-card" key={v.employee_id}><div className="activity-main"><b>{v.full_name}</b><span>{statusLabel(v.tracking_status)} · {staleMinutes(v)} min sin nuevo registro</span><small>{v.last_event_label||'Sin evento posterior al inicio'}{v.last_event_at?` · último registro ${new Date(v.last_event_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}`:''}</small></div></div>)}</div>:<div className="empty-state"><b>Sin alertas</b><span>Todos los vendedores con jornada activa tienen actividad registrada dentro de los últimos 45 minutos.</span></div>}
      <div className="modal-actions"><button className="secondary" onClick={()=>setStaleOpen(false)}>Cerrar</button></div>
    </div></div>}
  </>
}
