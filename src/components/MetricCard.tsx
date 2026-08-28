import type { KeyboardEvent,ReactNode } from 'react'

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

export function MetricCard({icon,label,value,note,tone='neutral',selected=false,actionLabel,onClick,className=''}:Props){
  const actionable=Boolean(onClick)
  const onKeyDown=(event:KeyboardEvent<HTMLDivElement>)=>{
    if(!onClick)return
    if(event.key==='Enter'||event.key===' '){event.preventDefault();onClick()}
  }
  return <div
    className={`panel metric-card metric-tone-${tone} ${selected?'is-selected':''} ${actionable?'is-actionable':''} ${className}`}
    role={actionable?'button':undefined}
    tabIndex={actionable?0:undefined}
    aria-pressed={actionable?selected:undefined}
    aria-label={actionable?(actionLabel||`${label}: ${String(value)}`):undefined}
    onClick={onClick}
    onKeyDown={onKeyDown}
  >
    {icon&&<div className="metric-card-icon">{icon}</div>}
    <div className="metric-card-copy"><span>{label}</span><strong>{value}</strong>{note!==undefined&&<small>{note}</small>}</div>
  </div>
}
