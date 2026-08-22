import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { loginByUsername } from '../lib/api'
import type { Employee } from '../types'

type AuthValue={session:Session|null;employee:Employee|null;loading:boolean;login:(u:string,p:string)=>Promise<void>;logout:()=>Promise<void>;refreshEmployee:()=>Promise<void>}
const C=createContext<AuthValue|null>(null)
export function AuthProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<Session|null>(null); const [employee,setEmployee]=useState<Employee|null>(null); const [loading,setLoading]=useState(true)
 const loadEmployee=async(s:Session|null)=>{if(!s){setEmployee(null);return}; const {data}=await supabase.from('employees').select('*').eq('auth_user_id',s.user.id).maybeSingle(); setEmployee(data as Employee|null)}
 useEffect(()=>{supabase.auth.getSession().then(async({data})=>{setSession(data.session);await loadEmployee(data.session);setLoading(false)}); const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_e,s)=>{setSession(s);await loadEmployee(s)});return()=>subscription.unsubscribe()},[])
 const value=useMemo<AuthValue>(()=>({session,employee,loading,login:async(u,p)=>{await loginByUsername(u,p);const {data}=await supabase.auth.getSession();setSession(data.session);await loadEmployee(data.session)},logout:async()=>{await supabase.auth.signOut();setSession(null);setEmployee(null)},refreshEmployee:async()=>loadEmployee(session)}),[session,employee,loading])
 return <C.Provider value={value}>{children}</C.Provider>
}
export function useAuth(){const v=useContext(C);if(!v)throw new Error('AuthProvider missing');return v}
