import { useEffect,useState } from 'react'
import { BadgeInfo,Building2,Check,KeyRound,Monitor,Moon,Palette,Save,ShieldCheck,Smartphone,Sun } from 'lucide-react'
import { useTheme,type ThemeName } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import '../styles/operational-v059.css'
import '../styles/settings-v2.css'
import { APP_VERSION } from '../lib/appVersion'
import { TENANT_IDENTITY } from '../config/productIdentity'

export function Settings(){
  const {theme,setTheme}=useTheme()
  const {employee}=useAuth()
  const [pass,setPass]=useState('')
  const [confirm,setConfirm]=useState('')
  const [busy,setBusy]=useState(false)
  const [systemDark,setSystemDark]=useState(()=>window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(()=>{
    const media=window.matchMedia('(prefers-color-scheme: dark)')
    const sync=()=>setSystemDark(media.matches)
    media.addEventListener('change',sync)
    return()=>media.removeEventListener('change',sync)
  },[])

  const previewTheme=theme==='system'?(systemDark?'dark':'light'):theme==='karaka'?'light':theme

  const themes:[ThemeName,string,typeof Monitor,string][]=[
    ['system','Sistema',Monitor,'Sigue automáticamente el modo del dispositivo'],
    ['light','Claro',Sun,'Interfaz luminosa y limpia para uso diario'],
    ['dark','Oscuro',Moon,'Reduce brillo en ambientes con poca luz'],
    ['executive','Ejecutivo',Building2,'Apariencia corporativa de mayor contraste'],
  ]

  const change=async()=>{
    if(pass.length<8)return alert('Usa al menos 8 caracteres')
    if(pass!==confirm)return alert('Las contraseñas no coinciden')
    setBusy(true)
    const{error}=await supabase.auth.updateUser({password:pass})
    setBusy(false)
    if(error)alert(error.message)
    else{setPass('');setConfirm('');alert('Contraseña actualizada')}
  }

  return <div className="page-stack settings-v2-page">
    <div className="page-head settings-v2-head">
      <div>
        <span className="eyebrow">PREFERENCIAS</span>
        <h2>Configuración</h2>
        <p>Selecciona cómo deseas visualizar el sistema y administra tu cuenta.</p>
      </div>
      <span className="settings-v2-test-badge">VISTA DE PRUEBA · configuración controlada</span>
    </div>

    <section className="settings-v2-layout">
      <div className="settings-v2-main">
        <div className="panel settings-v2-section settings-v2-primary-card">
          <div className="settings-title">
            <Palette/>
            <div><b>Modo de interfaz</b><span>Elige una apariencia preestablecida. Los colores y la identidad corporativa permanecen protegidos.</span></div>
          </div>

          <div className="appearance-mode-grid appearance-mode-grid-large">
            {themes.map(([id,label,Icon,description])=><button
              className={'appearance-mode appearance-mode-large '+(theme===id?'selected':'')}
              key={id}
              onClick={()=>setTheme(id)}
            >
              <span className={'appearance-mode-icon '+id}><Icon size={20}/></span>
              <span className="appearance-mode-copy">
                <b>{label}</b>
                <small>{description}</small>
              </span>
              {theme===id&&<span className="appearance-selected"><Check size={15}/> Activo</span>}
            </button>)}
          </div>

          <div className="settings-managed-note">
            <ShieldCheck size={18}/>
            <div>
              <b>Diseño administrado</b>
              <span>Los usuarios pueden cambiar únicamente entre modos aprobados. Logo, colores corporativos y estilo de marca son administrados a nivel del sistema.</span>
            </div>
          </div>
        </div>

        <div className="panel settings-v2-section">
          <div className="settings-title">
            <Building2/>
            <div><b>Identidad de la organización</b><span>Referencia visual de la marca aplicada al sistema.</span></div>
          </div>

          <div className="organization-brand-card">
            <div className="organization-brand-main">
              <div className="organization-logo"><img src={TENANT_IDENTITY.logoUrl} alt={TENANT_IDENTITY.companyName}/></div>
              <div className="organization-brand-copy">
                <span>ORGANIZACIÓN</span>
                <strong>{TENANT_IDENTITY.companyName}</strong>
                <small>{TENANT_IDENTITY.productName}</small>
              </div>
            </div>
            <div className="organization-brand-colors" aria-label="Paleta corporativa">
              <span style={{background:TENANT_IDENTITY.colors.primary}} title="Color principal"/>
              <span style={{background:TENANT_IDENTITY.colors.secondary}} title="Color secundario"/>
              <span style={{background:TENANT_IDENTITY.colors.support}} title="Color de apoyo"/>
            </div>
            <div className="organization-brand-status"><ShieldCheck size={15}/><span>Administrado por la plataforma</span></div>
          </div>

          <div className="branding-preview branding-preview-readonly">
            <div className="branding-preview-label">Vista de referencia · {previewTheme==='dark'?'Oscuro':previewTheme==='executive'?'Ejecutivo':'Claro'}</div>
            <div className={'branding-preview-shell preview-'+previewTheme}>
              <aside>
                <div className="branding-preview-brand"><img src={TENANT_IDENTITY.logoUrl} alt=""/><div><b>{TENANT_IDENTITY.productName}</b><span>{TENANT_IDENTITY.companyName}</span></div></div>
                <i className="active"/><i/><i/><i/>
              </aside>
              <main>
                <header><span>{TENANT_IDENTITY.companyName.toUpperCase()}</span><b>Panel ejecutivo</b></header>
                <div className="branding-preview-content">
                  <div className="branding-preview-kpi"><span>Ventas del mes</span><strong>RD$ 1.28M</strong><small>+12.4% vs. período anterior</small></div>
                  <div className="branding-preview-kpi"><span>Cobertura</span><strong>84%</strong><small>156 clientes gestionados</small></div>
                  <button>Acción principal</button>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>

      <aside className="settings-v2-side">
        <div className="panel settings-v2-section">
          <div className="settings-title"><KeyRound/><div><b>Seguridad</b><span>Cambiar tu contraseña de acceso.</span></div></div>
          <label>Nueva contraseña<input type="password" value={pass} onChange={e=>setPass(e.target.value)}/></label>
          <label>Confirmar contraseña<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
          <button className="primary full" disabled={busy||!pass} onClick={()=>void change()}><Save size={17}/>{busy?'Guardando...':'Cambiar contraseña'}</button>
          <div className="recovery-disabled-note"><ShieldCheck size={18}/><div><b>Recuperación administrada</b>Un Administrador puede asignar una nueva contraseña desde Administración → Usuarios.</div></div>
        </div>

        <div className="panel settings-v2-section">
          <div className="settings-title"><Smartphone/><div><b>Mi cuenta</b><span>Perfil autenticado.</span></div></div>
          <div className="profile-summary"><div className="avatar big">{employee?.full_name?.[0]}</div><b>{employee?.full_name}</b><span>@{employee?.username}</span><small>{employee?.job_title} · {employee?.access_profile||employee?.app_role}</small><small>{employee?.phone_display}</small></div>
        </div>

        <div className="panel settings-v2-section">
          <div className="settings-title"><BadgeInfo/><div><b>Acerca del sistema</b><span>Versión y trazabilidad técnica.</span></div></div>
          <div className="system-about-grid settings-v2-about">
            <div><span>Versión</span><strong>{APP_VERSION.display}</strong></div>
            <div><span>Build</span><strong>{APP_VERSION.buildDisplay}</strong></div>
            <div><span>Canal</span><strong>{APP_VERSION.channelLabel||'Estable'}</strong></div>
            <div><span>Entorno</span><strong className={APP_VERSION.isTest?'test':'production'}>{APP_VERSION.isTest?'Prueba':'Producción'}</strong></div>
          </div>
          <small className="system-about-technical" title={APP_VERSION.technical}>Técnica: {APP_VERSION.technical}</small>
        </div>
      </aside>
    </section>
  </div>
}
