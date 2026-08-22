import type { LucideIcon } from 'lucide-react'
export function KpiCard({label,value,sub,Icon}:{label:string;value:string|number;sub?:string;Icon:LucideIcon}){return <div className="kpi-card"><div className="kpi-icon"><Icon size={20}/></div><div><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div></div>}
