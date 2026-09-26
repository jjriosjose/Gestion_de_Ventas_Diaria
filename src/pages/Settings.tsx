import { useMemo,useState } from 'react'
import {
  Accessibility,BadgeInfo,Building2,Check,KeyRound,Monitor,Palette,RotateCcw,Save,ShieldCheck,Smartphone,Sun,Moon,UploadCloud
} from 'lucide-react'
import { useTheme,type ThemeName } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import '../styles/operational-v059.css'
import '../styles/settings-v2.css'
import { APP_VERSION } from '../lib/appVersion'

const BRANDING_KEY='gvd_branding_v2_test'
const ACCESSIBILITY_KEY='gvd_accessibility_v2_test'

type BrandingDraft={
  companyName:string
  productName:string
  primary:string
  secondary:string
  accent:string
  logoDataUrl:string
}
type AccessibilityDraft={reduceMotion:boolean;highContrast:boolean}

const defaultBranding:BrandingDraft={
  companyName:'Almacenes Karaka',
  productName:'Gestión de Ventas',
  primary:'#c71f2d',
  secondary:'#9f1723',
  accent:'#1f3a5f',
  logoDataUrl:'/logo-karaka.png',
}

function loadJson<T>(key:string,fallback:T):T{
  try{
    const raw=localStorage.getItem(key)
    return raw?{...fallback,...JSON.parse(raw)}:fallback
  }catch{return fallback}
}
function isHex(value:string){return /^#[0-9a-fA-F]{6}$/.test(value)}
function contrastLabel(hex:string){
  if(!isHex(hex))return 'Color pendiente de validar'
  const n=parseInt(hex.slice(1),16)
  const r=(n>>16)&255,g=(n>>8)&255,b=n&255
  const luminance=(0.2126*r+0.7152*g+0.0722*b)/255
  return luminance<.5?'Texto claro recomendado':'Texto oscuro recomendado'
}

export function Settings(){
  const {theme,setTheme,accent,setAccent}=useTheme()
  const {employee}=useAuth()
  const [pass,setPass]=useState('')
  const [confirm,setConfirm]=useState('')
  const [busy,setBusy]=useState(false)
  const [branding,setBranding]=useState<BrandingDraft>(()=>loadJson(BRANDING_KEY,defaultBranding))
  const [brandingSaved,setBrandingSaved]=useState(false)
  const [accessibility,setAccessibility]=useState<AccessibilityDraft>(()=>loadJson(ACCESSIBILITY_KEY,{reduceMotion:false,highContrast:false}))

  const admin=['Administrador','Supervisor'].includes(employee?.app_role||'')
  const themes:[ThemeName,string,typeof Monitor][]=[
    ['system','Sistema',Monitor],
    ['light','Claro',Sun],
    ['dark','Oscuro',Moon],
    ['executive','Ejecutivo',Building2],
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

  const updateBrand=(key:keyof BrandingDraft,value:string)=>{
    setBranding(current=>({...current,[key]:value}))
    setBrandingSaved(false)
  }
  const saveBranding=()=>{
    localStorage.setItem(BRANDING_KEY,JSON.stringify(branding))
    setBrandingSaved(true)
  }
  const resetBranding=()=>{
    setBranding(defaultBranding)
    localStorage.removeItem(BRANDING_KEY)
    setBrandingSaved(false)
  }
  const updateAccessibility=(key:keyof AccessibilityDraft,value:boolean)=>{
    const next={...accessibility,[key]:value}
    setAccessibility(next)
    localStorage.setItem(ACCESSIBILITY_KEY,JSON.stringify(next))
    document.documentElement.dataset.reduceMotion=next.reduceMotion?'true':'false'
    document.documentElement.dataset.highContrast=next.highContrast?'true':'false'
  }
  const uploadLogo=(file?:File)=>{
    if(!file)return
    if(file.size>600_000){alert('Para esta prueba usa una imagen menor de 600 KB.');return}
    const reader=new FileReader()
    reader.onload=()=>updateBrand('logoDataUrl',String(reader.result||''))
    reader.readAsDataURL(file)
  }

  const previewStyle=useMemo(()=>({
    '--preview-primary':isHex(branding.primary)?branding.primary:'#c71f2d',
    '--preview-secondary':isHex(branding.secondary)?branding.secondary:'#9f1723',
    '--preview-accent':isHex(branding.accent)?branding.accent:'#1f3a5f',
  }) as React.CSSProperties,[branding.primary,branding.secondary,branding.accent])

  return <div className="page-stack settings-v2-page">
    <div className="page-head settings-v2-head">
      <div><span className="eyebrow">PERSONALIZACIÓN</span><h2>Configuración</h2><p>Preferencias personales, marca empresarial y seguridad del sistema.</p></div>
      <span className="settings-v2-test-badge">VISTA DE PRUEBA · sin cambios de tenant</span>
    </div>

    <section className="settings-v2-layout">
      <div className="settings-v2-main">
        <div className="panel settings-v2-section">
          <div className="settings-title"><Palette/><div><b>Apariencia personal</b><span>Define cómo prefieres ver la interfaz.</span></div></div>
          <div className="settings-v2-block">
            <div className="settings-v2-block-head"><b>Modo de interfaz</b><span>La preferencia se aplica a tu usuario.</span></div>
            <div className="appearance-mode-grid">
              {themes.map(([id,label,Icon])=><button className={'appearance-mode '+(theme===id?'selected':'')} key={id} onClick={()=>setTheme(id)}>
                <span className={'appearance-mode-icon '+id}><Icon size={18}/></span>
                <span><b>{label}</b><small>{id==='system'?'Sigue el modo del dispositivo':id==='executive'?'Contraste y tono corporativo':'Interfaz '+label.toLowerCase()}</small></span>
                {theme===id&&<Check size={16}/>}
              </button>)}
            </div>
          </div>
          <div className="settings-v2-block">
            <div className="settings-v2-block-head"><b>Color personal de acento</b><span>Se aplica a botones, estados activos y elementos destacados.</span></div>
            <div className="accent-editor">
              <input aria-label="Seleccionar color" type="color" value={accent} onChange={e=>setAccent(e.target.value)}/>
              <input aria-label="Código hexadecimal" value={accent} onChange={e=>setAccent(e.target.value)}/>
              <span>{contrastLabel(accent)}</span>
            </div>
          </div>
        </div>

        <div className="panel settings-v2-section">
          <div className="settings-title"><Building2/><div><b>Marca empresarial</b><span>Cómo se identificaría una empresa dentro del producto SaaS.</span></div></div>
          {!admin&&<div className="settings-v2-readonly"><ShieldCheck size={18}/><div><b>Administrado por la empresa</b><span>Solo un Administrador o Supervisor puede modificar la identidad corporativa.</span></div></div>}
          <div className={'branding-editor '+(!admin?'disabled':'')}>
            <div className="branding-fields">
              <label>Nombre de empresa<input disabled={!admin} value={branding.companyName} onChange={e=>updateBrand('companyName',e.target.value)}/></label>
              <label>Nombre del producto<input disabled={!admin} value={branding.productName} onChange={e=>updateBrand('productName',e.target.value)}/></label>
              <div className="branding-color-grid">
                <label>Principal<div className="branding-color-line"><input disabled={!admin} type="color" value={branding.primary} onChange={e=>updateBrand('primary',e.target.value)}/><input disabled={!admin} value={branding.primary} onChange={e=>updateBrand('primary',e.target.value)}/></div></label>
                <label>Secundario<div className="branding-color-line"><input disabled={!admin} type="color" value={branding.secondary} onChange={e=>updateBrand('secondary',e.target.value)}/><input disabled={!admin} value={branding.secondary} onChange={e=>updateBrand('secondary',e.target.value)}/></div></label>
                <label>Acento<div className="branding-color-line"><input disabled={!admin} type="color" value={branding.accent} onChange={e=>updateBrand('accent',e.target.value)}/><input disabled={!admin} value={branding.accent} onChange={e=>updateBrand('accent',e.target.value)}/></div></label>
              </div>
              <label className="branding-logo-field">Logo de empresa
                <div className="branding-logo-picker">
                  <img src={branding.logoDataUrl||'/logo-karaka.png'} alt="Vista previa del logo"/>
                  <label className={'secondary compact '+(!admin?'disabled':'')}><UploadCloud size={15}/> Cargar logo<input disabled={!admin} hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>uploadLogo(e.target.files?.[0])}/></label>
                </div>
              </label>
              {admin&&<div className="button-row">
                <button className="primary" onClick={saveBranding}><Save size={16}/> Guardar prueba local</button>
                <button className="secondary" onClick={resetBranding}><RotateCcw size={16}/> Restablecer</button>
                {brandingSaved&&<span className="settings-saved">Guardado localmente</span>}
              </div>}
              <small className="branding-test-note">Esta versión no escribe branding en Supabase. Sirve para aprobar diseño, campos y experiencia antes de crear configuración multiempresa.</small>
            </div>

            <div className="branding-preview" style={previewStyle}>
              <div className="branding-preview-label">Vista previa en vivo</div>
              <div className="branding-preview-shell">
                <aside>
                  <div className="branding-preview-brand"><img src={branding.logoDataUrl||'/logo-karaka.png'} alt=""/><div><b>{branding.productName||'Gestión de Ventas'}</b><span>{branding.companyName||'Empresa'}</span></div></div>
                  <i className="active"/><i/><i/><i/>
                </aside>
                <main>
                  <header><span>{branding.companyName||'Empresa'}</span><b>Panel ejecutivo</b></header>
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

        <div className="panel settings-v2-section">
          <div className="settings-title"><Accessibility/><div><b>Accesibilidad</b><span>Preferencias visuales que facilitan el uso diario.</span></div></div>
          <div className="accessibility-grid">
            <label className="settings-toggle"><input type="checkbox" checked={accessibility.reduceMotion} onChange={e=>updateAccessibility('reduceMotion',e.target.checked)}/><span><b>Reducir animaciones</b><small>Minimiza transiciones y movimientos no esenciales.</small></span></label>
            <label className="settings-toggle"><input type="checkbox" checked={accessibility.highContrast} onChange={e=>updateAccessibility('highContrast',e.target.checked)}/><span><b>Contraste reforzado</b><small>Aumenta contraste de bordes, texto secundario y controles.</small></span></label>
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
          <div className="system-about-grid settings-v2-about"><div><span>Versión</span><strong>{APP_VERSION.display}</strong></div><div><span>Build</span><strong>{APP_VERSION.buildDisplay}</strong></div><div><span>Canal</span><strong>{APP_VERSION.channelLabel||'Estable'}</strong></div><div><span>Entorno</span><strong className={APP_VERSION.isTest?'test':'production'}>{APP_VERSION.isTest?'Prueba':'Producción'}</strong></div></div>
          <small className="system-about-technical" title={APP_VERSION.technical}>Técnica: {APP_VERSION.technical}</small>
        </div>
      </aside>
    </section>
  </div>
}
