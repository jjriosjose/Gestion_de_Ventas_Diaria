from pathlib import Path
import json

p = Path('src/pages/AgendaV2.tsx')
s = p.read_text()

old_invocation = "{finish&&<FinishShowroom data={finish} employeeId={employee?.id||''} managers={managers} canEditAmount={amountAdmin} onClose={()=>setFinish(null)} onSaved={async()=>{setFinish(null);await load()}}/>}"
new_invocation = "{finish&&<FinishShowroom data={finish} employeeId={employee?.id||''} managers={managers} onClose={()=>setFinish(null)} onSaved={async()=>{setFinish(null);await load()}}/>}"
if old_invocation not in s:
    raise SystemExit('FinishShowroom invocation pattern not found')
s = s.replace(old_invocation, new_invocation, 1)

start = s.index('function FinishShowroom(')
end = s.index('\nfunction EditShowroomAmount(', start)
new_function = r'''function FinishShowroom({data,employeeId,managers,onClose,onSaved}:{data:any;employeeId:string;managers:any[];onClose:()=>void;onSaved:()=>Promise<void>|void}){
 const {entry,session}=data
 const [outcome,setOutcome]=useState(''),[amountMode,setAmountMode]=useState<'NOW'|'PENDING'|''>(''),[amount,setAmount]=useState(''),[attendedByEmployeeId,setAttendedByEmployeeId]=useState(session.attended_by_employee_id||entry.assigned_manager_id||employeeId),[nextAction,setNextAction]=useState(''),[followUp,setFollowUp]=useState(''),[notes,setNotes]=useState(''),[busy,setBusy]=useState(false)
 const purchased=outcome==='COMPRA',selectedAttendant=managers.find(manager=>manager.id===attendedByEmployeeId)
 const save=async()=>{
  if(!outcome)return alert('Selecciona el resultado comercial de la atención en showroom.')
  if(!attendedByEmployeeId||!selectedAttendant)return alert('Selecciona el Gestor que atendió al cliente.')
  if(purchased&&!amountMode)return alert('Indica si registrarás el monto ahora o si quedará pendiente de registro.')
  if(purchased&&amountMode==='NOW'&&!(Number(amount)>0))return alert('Ingresa un monto de venta mayor que cero.')
  setBusy(true)
  try{
   const endedAt=new Date().toISOString(),purchaseAmount=purchased&&amountMode==='NOW'?Number(amount):null
   const {error}=await supabase.from('showroom_sessions').update({ended_at:endedAt,outcome,purchased,purchase_amount:purchaseAmount,attended_by_name:selectedAttendant.full_name,attended_by_employee_id:attendedByEmployeeId,next_action:nextAction||null,follow_up_date:followUp||null,notes:notes||null}).eq('id',session.id).is('ended_at',null)
   if(error)throw error
   const {error:rError}=await supabase.from('reception_entries').update({status:'ATENCION_FINALIZADA',service_ended_at:endedAt,service_ended_by:employeeId}).eq('id',entry.id).eq('status','EN_ATENCION')
   if(rError)throw rError
   if(entry.appointment_id){const {error:aError}=await supabase.from('appointments').update({status:'FINALIZADA',purchased}).eq('id',entry.appointment_id);if(aError)throw aError}
   await onSaved()
  }catch(e){alert(e instanceof Error?e.message:'No se pudo finalizar la atención')}finally{setBusy(false)}
 }
 const disabled=busy||!outcome||!attendedByEmployeeId||(purchased&&!amountMode)||(purchased&&amountMode==='NOW'&&!(Number(amount)>0))
 return <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Resultado comercial showroom"><button className="modal-backdrop" onClick={onClose}/><div className="modal large"><div className="modal-head"><div><span className="eyebrow">RESULTADO COMERCIAL SHOWROOM</span><h3>{entry.clients?.legal_name||entry.company_name||entry.visitor_name}</h3><p>{entry.appointment_id?'Atención con cita':'Llegada sin cita'} · registra el resultado comercial antes de finalizar. Recepción registrará posteriormente la salida física.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="form-grid"><label>Resultado comercial *<select value={outcome} onChange={e=>{setOutcome(e.target.value);if(e.target.value!=='COMPRA'){setAmountMode('');setAmount('')}}}><option value="">Selecciona resultado...</option>{SHOWROOM_OUTCOMES.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><small>La atención no puede cerrarse sin un resultado explícito.</small></label><label>Quién atendió *<select value={attendedByEmployeeId} onChange={e=>setAttendedByEmployeeId(e.target.value)}><option value="">Selecciona Gestor</option>{managers.map(manager=><option value={manager.id} key={manager.id}>{manager.full_name}</option>)}</select><small>Se registra por separado del Gestor responsable de la cita.</small></label>{purchased&&<label className="span-2">Registro del monto *<select value={amountMode} onChange={e=>{const mode=e.target.value as 'NOW'|'PENDING'|'';setAmountMode(mode);if(mode!=='NOW')setAmount('')}}><option value="">Selecciona cómo registrar el monto...</option><option value="NOW">Registrar monto ahora</option><option value="PENDING">Pendiente de registro</option></select><small>Si conoces el importe, regístralo ahora. Si la orden aún no está digitada, déjalo pendiente para Administración.</small></label>}{purchased&&amountMode==='NOW'&&<label className="span-2">Monto de venta RD$ *<input autoFocus type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Ej.: 25000.00"/><small>El monto quedará registrado con el cierre de esta atención.</small></label>}{purchased&&amountMode==='PENDING'&&<div className="span-2 report-scope-note"><b>Monto pendiente de registro.</b> La compra se contabilizará hoy; el importe será completado posteriormente por Administración.</div>}<label>Próxima acción<select value={nextAction} onChange={e=>setNextAction(e.target.value)}>{SHOWROOM_NEXT_ACTIONS.map(([value,label])=><option value={value} key={value||'none'}>{label}</option>)}</select></label><label>Fecha seguimiento<input type="date" value={followUp} onChange={e=>setFollowUp(e.target.value)}/></label><label className="span-2">Observación<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Resultado de la atención, necesidad, cotización, compromiso, pedido o cualquier detalle relevante..."/></label></div><div className="modal-actions"><button className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={disabled} onClick={()=>void save()}>{busy?'Guardando...':purchased&&amountMode==='NOW'&&Number(amount)>0?`Guardar resultado · ${money(amount)}`:'Guardar resultado y finalizar atención'}</button></div></div></div>
}'''
s = s[:start] + new_function + s[end:]
p.write_text(s)

pkg = Path('package.json')
data = json.loads(pkg.read_text())
data['version'] = '0.6.5-beta.16.3.7'
pkg.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

lock = Path('package-lock.json')
if lock.exists():
    data = json.loads(lock.read_text())
    data['version'] = '0.6.5-beta.16.3.7'
    if '' in data.get('packages', {}):
        data['packages']['']['version'] = '0.6.5-beta.16.3.7'
    lock.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
