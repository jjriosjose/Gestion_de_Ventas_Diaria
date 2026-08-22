import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const encoder = new TextEncoder()
const internalEmail = (username: string) => `${username.replace(/[^a-z0-9._-]/g, '')}@usuarios.karaka.internal`
function b64ToBytes(input: string): Uint8Array { const bin=atob(input); const out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out }
function timingSafeEqual(a: Uint8Array,b: Uint8Array){ if(a.length!==b.length)return false; let diff=0; for(let i=0;i<a.length;i++)diff|=a[i]^b[i]; return diff===0 }
async function verifyBootstrapPassword(password:string,saltB64:string,hashB64:string,iterations:number){ const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']); const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:b64ToBytes(saltB64),iterations},key,256); return timingSafeEqual(new Uint8Array(bits),b64ToBytes(hashB64)) }
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:corsHeaders})

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST') return json({error:'Método no permitido'},405)
  try{
    const {username,password}=await req.json()
    const normalizedUsername=String(username??'').trim().toLowerCase()
    const rawPassword=String(password??'')
    if(!normalizedUsername||!rawPassword) return json({error:'Usuario o contraseña inválidos'},400)

    const url=Deno.env.get('SUPABASE_URL')!
    const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}')
    const publishableKeys=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}')
    const secretKey=secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const publishableKey=publishableKeys.default||Deno.env.get('SUPABASE_ANON_KEY')
    if(!secretKey||!publishableKey) return json({error:'Configuración de autenticación incompleta'},500)
    const admin=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const authClient=createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})

    const {data:employee,error:employeeError}=await admin.from('employees').select('id,auth_user_id,full_name,username,job_title,app_role,employee_type,phone_e164,active').ilike('username',normalizedUsername).maybeSingle()
    if(employeeError||!employee||!employee.active) return json({error:'Usuario o contraseña inválidos'},401)
    const email=internalEmail(normalizedUsername)

    if(!employee.auth_user_id){
      const {data:bootstrap,error:bootstrapError}=await admin.from('bootstrap_credentials').select('username,salt_b64,hash_b64,iterations,failed_attempts,locked_until,used_at').eq('username',normalizedUsername).maybeSingle()
      if(bootstrapError||!bootstrap||bootstrap.used_at) return json({error:'Usuario o contraseña inválidos'},401)
      if(bootstrap.locked_until&&new Date(bootstrap.locked_until).getTime()>Date.now()) return json({error:'Acceso temporalmente bloqueado. Intenta nuevamente más tarde.'},429)
      const valid=await verifyBootstrapPassword(rawPassword,bootstrap.salt_b64,bootstrap.hash_b64,bootstrap.iterations)
      if(!valid){
        const attempts=Number(bootstrap.failed_attempts||0)+1
        const lock=attempts>=5?new Date(Date.now()+15*60*1000).toISOString():null
        await admin.from('bootstrap_credentials').update({failed_attempts:attempts,locked_until:lock}).eq('username',normalizedUsername)
        return json({error:'Usuario o contraseña inválidos'},401)
      }
      const createPayload:any={email,password:rawPassword,email_confirm:true,user_metadata:{full_name:employee.full_name,username:employee.username},app_metadata:{employee_id:employee.id,role:employee.app_role,employee_type:employee.employee_type}}
      if(employee.phone_e164){ createPayload.phone=employee.phone_e164; createPayload.phone_confirm=true }
      const {data:created,error:createError}=await admin.auth.admin.createUser(createPayload)
      if(createError||!created.user) return json({error:'No fue posible activar la cuenta'},500)
      const {error:linkError}=await admin.from('employees').update({auth_user_id:created.user.id}).eq('id',employee.id)
      if(linkError){ await admin.auth.admin.deleteUser(created.user.id); return json({error:'No fue posible activar la cuenta'},500) }
      await admin.from('bootstrap_credentials').update({failed_attempts:0,locked_until:null,used_at:new Date().toISOString()}).eq('username',normalizedUsername)
    }

    const {data:signed,error:signError}=await authClient.auth.signInWithPassword({email,password:rawPassword})
    if(signError||!signed.session||!signed.user) return json({error:'Usuario o contraseña inválidos'},401)
    return json({session:{access_token:signed.session.access_token,refresh_token:signed.session.refresh_token,expires_at:signed.session.expires_at,expires_in:signed.session.expires_in,token_type:signed.session.token_type},employee:{id:employee.id,full_name:employee.full_name,username:employee.username,job_title:employee.job_title,app_role:employee.app_role,employee_type:employee.employee_type}})
  }catch(_error){ return json({error:'No fue posible iniciar sesión'},500) }
})
