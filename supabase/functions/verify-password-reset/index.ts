import { createClient } from 'npm:@supabase/supabase-js@2'
const corsHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:corsHeaders})
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders}); if(req.method!=='POST')return json({error:'Método no permitido'},405)
  try{
    const body=await req.json(); const username=String(body?.username??'').trim().toLowerCase(); const token=String(body?.token??'').replace(/\D/g,''); const newPassword=String(body?.new_password??'')
    if(!username||token.length!==6||newPassword.length<8)return json({error:'Usuario, código de 6 dígitos y nueva contraseña de al menos 8 caracteres son obligatorios'},400)
    const url=Deno.env.get('SUPABASE_URL')!; const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}'); const publishableKeys=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}'); const secretKey=secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const publishableKey=publishableKeys.default||Deno.env.get('SUPABASE_ANON_KEY'); if(!secretKey||!publishableKey)return json({error:'Configuración incompleta'},500)
    const admin=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false}}); const authClient=createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:enabled}=await admin.from('app_settings').select('value').eq('key','auth.recovery_enabled').maybeSingle(); if(enabled?.value!==true)return json({error:'La recuperación por WhatsApp todavía no está habilitada.'},503)
    const {data:employee,error:employeeError}=await admin.from('employees').select('id,auth_user_id,phone_e164,active').ilike('username',username).maybeSingle(); if(employeeError||!employee?.active||!employee.auth_user_id||!employee.phone_e164)return json({error:'Código inválido o vencido'},400)
    const {data:verified,error:verifyError}=await authClient.auth.verifyOtp({phone:employee.phone_e164,token,type:'sms'}); if(verifyError||!verified.user||verified.user.id!==employee.auth_user_id)return json({error:'Código inválido o vencido'},400)
    const {error:passwordError}=await admin.auth.admin.updateUserById(employee.auth_user_id,{password:newPassword}); if(passwordError)return json({error:'No fue posible actualizar la contraseña'},500)
    return json({ok:true,message:'Contraseña actualizada correctamente.',session:verified.session?{access_token:verified.session.access_token,refresh_token:verified.session.refresh_token,expires_at:verified.session.expires_at,expires_in:verified.session.expires_in,token_type:verified.session.token_type}:null})
  }catch(_error){return json({error:'No fue posible validar la recuperación'},500)}
})
