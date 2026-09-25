import { useState } from 'react'
import { BadgeInfo,Check,KeyRound,Palette,Save,ShieldCheck,Smartphone } from 'lucide-react'
import { useTheme,type ThemeName } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import '../styles/operational-v059.css'
import { APP_VERSION } from '../lib/appVersion'

export function Settings(){
  const {theme,setTheme,accent,setAccent}=useTheme();const {employee}=useAuth();
  const [pass,setPass]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false)
  const change=async()=>{if(pass.length<8)return alert('Usa al menos 8 caracteres');if(pass!==confirm)return alert('Las contraseñas no coinciden');setBusy(true);const{error}=await supabase.auth.updateUser({password:pass});setBusy(false);if(error)alert(error.message);else{setPass('');setConfirm('');alert('Contraseña actualizada')}}
  const themes:[ThemeName,string][]=[['karaka','Karaka'],['light','Claro'],['dark','Oscuro'],['executive','Ejecutivo']]
  return <div className="page-stack"><div className="page-head"><div><span className="eyebrow">PERSONALIZACIÓN</span><h2>Configuración</h2><p>Apariencia, cuenta y preferencias del sistema.</p></div></div><div className="settings-grid">
    <div className="panel"><div className="settings-title"><Palette/><div><b>Apariencia</b><span>Elige cómo quieres ver el sistema.</span></div></div><div className="theme-grid">{themes.map(([id,label])=><button className={`theme-option ${theme===id?'selected':''}`} key={id} onClick={()=>setTheme(id)}><div className={`theme-preview ${id}`}><i/><i/><i/></div><span>{label}</span>{theme===id&&<Check/>}</button>)}</div><label>Color principal<div className="color-line"><input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/><input value={accent} onChange={e=>setAccent(e.target.value)}/></div></label></div>
    <div className="panel"><div className="settings-title"><KeyRound/><div><b>Seguridad</b><span>Cambiar tu contraseña de acceso.</span></div></div><label>Nueva contraseña<input type="password" value={pass} onChange={e=>setPass(e.target.value)}/></label><label>Confirmar contraseña<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button className="primary full" disabled={busy||!pass} onClick={()=>void change()}><Save size={17}/>{busy?'Guardando...':'Cambiar contraseña'}</button><div className="recovery-disabled-note"><ShieldCheck size={18}/><div><b>Recuperación administrada</b>La recuperación automática por WhatsApp todavía no está habilitada. Si un usuario olvida su clave, un Administrador puede asignarle una nueva desde Administración → Usuarios.</div></div></div>
    <div className="panel"><div className="settings-title"><Smartphone/><div><b>Mi cuenta</b><span>Perfil autenticado.</span></div></div><div className="profile-summary"><div className="avatar big">{employee?.full_name?.[0]}</div><b>{employee?.full_name}</b><span>@{employee?.username}</span><small>{employee?.job_title} · {employee?.access_profile||employee?.app_role}</small><small>{employee?.phone_display}</small></div></div>
    <div className="panel system-about-panel"><div className="settings-title"><BadgeInfo/><div><b>Acerca del sistema</b><span>Versión visible y trazabilidad técnica.</span></div></div><div className="system-about-grid"><div><span>Versión</span><strong>{APP_VERSION.display}</strong></div><div><span>Build</span><strong>{APP_VERSION.buildDisplay}</strong></div><div><span>Canal</span><strong>{APP_VERSION.channelLabel||'Estable'}</strong></div><div><span>Entorno</span><strong className={APP_VERSION.isTest?'test':'production'}>{APP_VERSION.isTest?'Prueba':'Producción'}</strong></div></div><small className="system-about-technical" title={APP_VERSION.technical}>Técnica: {APP_VERSION.technical}</small></div>
  </div></div>
}
