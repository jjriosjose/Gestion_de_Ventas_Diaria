import { createContext,useContext,useEffect,useMemo,useState,type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export type ThemeName='karaka'|'light'|'dark'|'executive'|'system'
type TV={theme:ThemeName;setTheme:(t:ThemeName)=>void;accent:string;setAccent:(v:string)=>void}
const C=createContext<TV|null>(null)

const PRESET_ACCENTS:Record<ThemeName,string>={
  karaka:'#c71f2d',
  light:'#c71f2d',
  dark:'#d92b3b',
  executive:'#1f3a5f',
  system:'#c71f2d',
}

function resolveTheme(theme:ThemeName){
  if(theme!=='system')return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'
}

export function ThemeProvider({children}:{children:ReactNode}){
  const {employee}=useAuth()
  const [theme,setThemeState]=useState<ThemeName>(()=>{
    const saved=localStorage.getItem('gvd_theme') as ThemeName|null
    return saved||'karaka'
  })
  const [accent,setAccentState]=useState(()=>PRESET_ACCENTS[(localStorage.getItem('gvd_theme') as ThemeName)||'karaka'])

  const apply=(t:ThemeName,a:string)=>{
    document.documentElement.dataset.theme=resolveTheme(t)
    document.documentElement.dataset.themePreference=t
    document.documentElement.style.setProperty('--brand',a)
  }

  useEffect(()=>{
    apply(theme,accent)
    if(theme!=='system')return
    const media=window.matchMedia('(prefers-color-scheme: dark)')
    const sync=()=>apply(theme,accent)
    media.addEventListener('change',sync)
    return()=>media.removeEventListener('change',sync)
  },[theme,accent])

  const persist=async(t:ThemeName,a:string)=>{
    localStorage.setItem('gvd_theme',t)
    localStorage.setItem('gvd_accent',a)
    if(employee?.auth_user_id)await supabase.from('employees').update({theme_preferences:{theme:t,accent:a}}).eq('id',employee.id)
  }

  const selectTheme=(t:ThemeName)=>{
    const nextAccent=PRESET_ACCENTS[t]
    setThemeState(t)
    setAccentState(nextAccent)
    void persist(t,nextAccent)
  }

  const v=useMemo(()=>({
    theme,
    setTheme:selectTheme,
    accent,
    setAccent:(a:string)=>{setAccentState(a);void persist(theme,a)},
  }),[theme,accent,employee?.id])

  return <C.Provider value={v}>{children}</C.Provider>
}
export function useTheme(){const v=useContext(C);if(!v)throw new Error('ThemeProvider missing');return v}
