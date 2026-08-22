import { createClient } from 'npm:@supabase/supabase-js@2'
const corsHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:corsHeaders})
const text=(v:unknown)=>String(v??'').trim()
const internalEmail=(username:string)=>`${username.toLowerCase().replace(/[^a-z0-9._-]/g,'')}@usuarios.karaka.internal`
function normalizePhone(v:unknown){ let digits=String(v??'').replace(/\D/g,''); if(digits.length===10)digits=`1${digits}`; if(!/^1\d{10}$/.test(digits))return null; return `+${digits}` }
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST')return json({error:'Método no permitido'},405)
  try{
    const authorization=req.headers.get('Authorization')||''; const token=authorization.replace(/^Bearer\s+/i,''); if(!token)return json({error:'Sesión requerida'},401)
    const url=Deno.env.get('SUPABASE_URL')!; const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}'); const secretKey=secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if(!secretKey)return json({error:'Configuración incompleta'},500)
    const admin=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false}}); const {data:userData,error:userError}=await admin.auth.getUser(token); if(userError||!userData.user)return json({error:'Sesión inválida'},401)
    const {data:actor}=await admin.from('employees').select('id,app_role,active').eq('auth_user_id',userData.user.id).maybeSingle(); if(!actor?.active||!['Administrador','Supervisor'].includes(actor.app_role))return json({error:'No autorizado'},403)
    const body=await req.json(); const action=text(body?.action).toLowerCase()
    if(action==='list'){ const {data,error}=await admin.from('employees').select('id,auth_user_id,full_name,username,job_title,app_role,employee_type,phone_display,phone_e164,active,created_at,updated_at').order('full_name'); if(error)throw error; return json({users:data}) }
    if(action==='create'){
      const fullName=text(body?.full_name), username=text(body?.username), jobTitle=text(body?.job_title), appRole=text(body?.app_role)||'Usuario', employeeType=text(body?.employee_type)||'Otro', phoneDisplay=text(body?.phone_display), phoneE164=normalizePhone(body?.phone_e164||phoneDisplay), initialPassword=text(body?.initial_password)
      if(!fullName||!username||!phoneE164||initialPassword.length<6)return json({error:'Nombre, usuario, teléfono válido y clave inicial de al menos 6 caracteres son obligatorios'},400)
      const email=internalEmail(username); const {data:created,error:createError}=await admin.auth.admin.createUser({email,phone:phoneE164,password:initialPassword,email_confirm:true,phone_confirm:true,user_metadata:{full_name:fullName,username},app_metadata:{role:appRole,employee_type:employeeType}}); if(createError||!created.user)return json({error:createError?.message||'No fue posible crear el usuario'},400)
      const {data:employee,error:employeeError}=await admin.from('employees').insert({auth_user_id:created.user.id,full_name:fullName,username,job_title:jobTitle||null,app_role:appRole,employee_type:employeeType,phone_display:phoneDisplay||phoneE164,phone_e164:phoneE164,active:true,created_by:userData.user.id,updated_by:userData.user.id}).select().single(); if(employeeError){await admin.auth.admin.deleteUser(created.user.id);return json({error:employeeError.message},400)}
      await admin.auth.admin.updateUserById(created.user.id,{app_metadata:{role:appRole,employee_type:employeeType,employee_id:employee.id}}); return json({user:employee},201)
    }
    if(action==='update'){
      const id=text(body?.id); if(!id)return json({error:'ID requerido'},400); const {data:current,error:currentError}=await admin.from('employees').select('*').eq('id',id).maybeSingle(); if(currentError||!current)return json({error:'Usuario no encontrado'},404)
      const patch:Record<string,unknown>={updated_by:userData.user.id}; for(const key of ['full_name','username','job_title','app_role','employee_type','phone_display','active'])if(body[key]!==undefined)patch[key]=body[key]
      if(body.phone_e164!==undefined||body.phone_display!==undefined){const normalized=normalizePhone(body.phone_e164||body.phone_display);if(!normalized)return json({error:'Número telefónico inválido'},400);patch.phone_e164=normalized}
      if(current.auth_user_id){ const authPatch:Record<string,unknown>={}; if(patch.phone_e164&&patch.phone_e164!==current.phone_e164){authPatch.phone=patch.phone_e164;authPatch.phone_confirm=true}; if(body.new_password)authPatch.password=text(body.new_password); const nextUsername=String(patch.username??current.username); if(patch.username&&patch.username!==current.username){authPatch.email=internalEmail(nextUsername);authPatch.email_confirm=true}; if(patch.full_name||patch.username)authPatch.user_metadata={full_name:patch.full_name??current.full_name,username:nextUsername}; if(patch.app_role||patch.employee_type)authPatch.app_metadata={role:patch.app_role??current.app_role,employee_type:patch.employee_type??current.employee_type,employee_id:current.id}; if(body.active===false)authPatch.ban_duration='876000h'; if(body.active===true&&current.active===false)authPatch.ban_duration='none'; if(Object.keys(authPatch).length){const {error}=await admin.auth.admin.updateUserById(current.auth_user_id,authPatch as any);if(error)return json({error:error.message},400)} }
      const {data:updated,error:updateError}=await admin.from('employees').update(patch).eq('id',id).select().single(); if(updateError)return json({error:updateError.message},400); return json({user:updated})
    }
    return json({error:'Acción no reconocida'},400)
  }catch(error){console.error('admin-users failed',error instanceof Error?error.message:'unknown');return json({error:'No fue posible completar la operación'},500)}
})
