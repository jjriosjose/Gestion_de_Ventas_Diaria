import { createContext,useContext,useEffect,useMemo,useState,type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
export type ThemeName='karaka'|'light'|'dark'|'executive'
type TV={theme:ThemeName;setTheme:(t:ThemeName)=>void;accent:string;setAccent:(v:string)=>void}
const C=createContext<TV|null>(null)
export function ThemeProvider({children}:{children:ReactNode}){const {employee}=useAuth();const [theme,setThemeState]=useState<ThemeName>(()=>(localStorage.getItem('gvd_theme') as ThemeName)||'karaka');const [accent,setAccentState]=useState(()=>localStorage.getItem('gvd_accent')||'#c71f2d')
 const apply=(t:ThemeName,a:string)=>{document.documentElement.dataset.theme=t;document.documentElement.style.setProperty('--brand',a)}
 useEffect(()=>apply(theme,accent),[theme,accent])
 const persist=async(t:ThemeName,a:string)=>{localStorage.setItem('gvd_theme',t);localStorage.setItem('gvd_accent',a);if(employee?.auth_user_id)await supabase.from('employees').update({theme_preferences:{theme:t,accent:a}}).eq('id',employee.id)}
 const v=useMemo(()=>({theme,setTheme:(t:ThemeName)=>{setThemeState(t);void persist(t,accent)},accent,setAccent:(a:string)=>{setAccentState(a);void persist(theme,a)}}),[theme,accent,employee?.id])
 return <C.Provider value={v}>{children}</C.Provider>}
export function useTheme(){const v=useContext(C);if(!v)throw new Error('ThemeProvider missing');return v}
