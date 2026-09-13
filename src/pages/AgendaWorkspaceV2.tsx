import { useEffect,useState } from 'react'
import { AlertTriangle,UserRoundPlus } from 'lucide-react'
import { AgendaV2 } from './AgendaV2'
import { useAuth } from '../context/AuthContext'
import { profileForEmployee } from '../lib/access'
import { supabase } from '../lib/supabase'

export function AgendaWorkspaceV2(){
 const {employee}=useAuth()
 const executive=['Administrador','Supervisor'].includes(profileForEmployee(employee))
 const [pending,setPending]=useState<any[]>([]),[managers,setManagers]=useState<any[]>([]),[busyId,setBusyId]=useState('')
 const load=async()=>{
  if(!executive){setPending([]);return}
  const [a,m]=await Promise.all([
   supabase.from('appointments').select('id,client_id,prospect_id,source_type,requested_at,requested_appointment_at,clients(legal_name,codempr),prospects(legal_name,prospect_code),requester:employees!appointments_requested_by_employee_id_fkey(full_name)').eq('status','PENDIENTE_VALIDACION').is('assigned_manager_id',null).order('created_at',{ascending:false}).limit(50),
   supabase.from('employees').select('id,full_name').eq('active',true).eq('employee_type','Gestor').order('full_name'),
  ])
  setPending(a.data||[]);setManagers(m.data||[])
 }
 useEffect(()=>{void load()},[executive])
 const assign=async(row:any,managerId:string)=>{
  if(!managerId)return;setBusyId(row.id)
  try{
   const {error}=await supabase.from('appointments').update({assigned_manager_id:managerId,employee_id:managerId}).eq('id',row.id).eq('status','PENDIENTE_VALIDACION')
   if(error)throw error
   await load()
  }catch(e){alert(e instanceof Error?e.message:'No se pudo asignar el Gestor')}finally{setBusyId('')}
 }
 return <div className="page-stack">
  {executive&&pending.length>0&&<section className="panel"><div className="panel-head"><div><b>Solicitudes de showroom sin Gestor</b><span>Asigna responsable para que la solicitud entre inmediatamente a su cola de validación.</span></div><span className="badge warn">{pending.length}</span></div><div className="cards-list">{pending.map(row=><div className="activity-card" key={row.id}><div className="activity-icon"><AlertTriangle/></div><div className="activity-main"><b>{row.clients?.legal_name||row.prospects?.legal_name||'Cliente'}</b><span>{row.source_type||'MANUAL'} · solicitado por {row.requester?.full_name||'—'}</span><small>{row.requested_appointment_at?`Tentativa: ${new Date(row.requested_appointment_at).toLocaleString('es-DO')}`:'Fecha por acordar'}</small></div><div className="button-row"><select aria-label="Asignar Gestor" defaultValue="" disabled={busyId===row.id} onChange={e=>void assign(row,e.target.value)}><option value="">Asignar Gestor...</option>{managers.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select><UserRoundPlus size={18}/></div></div>)}</div></section>}
  <AgendaV2/>
 </div>
}
