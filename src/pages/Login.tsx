import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  Funnel,
  Loader2,
  LockKeyhole,
  MapPinned,
  Phone,
  Route,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import packageInfo from '../../package.json'
import '../styles/operational-v059.css'
import '../styles/login-v065.css'

const REMEMBERED_USER_KEY = 'karaka-login-username'

const loginFeatures = [
  { icon: UsersRound, title: 'Clientes', text: 'Consulta y segmenta tu base de clientes.' },
  { icon: Route, title: 'Rutas', text: 'Planifica y optimiza tus rutas de visita.' },
  { icon: Funnel, title: 'Captación', text: 'Registra oportunidades y nuevos clientes.' },
  { icon: Phone, title: 'Llamadas', text: 'Da seguimiento a tus llamadas comerciales.' },
  { icon: ClipboardCheck, title: 'Visitas', text: 'Registra visitas y acuerdos en campo.' },
  { icon: MapPinned, title: 'Mapas', text: 'Visualiza tu cobertura en mapas interactivos.' },
]

export function Login() {
  const { login } = useAuth()
  const [user, setUser] = useState(() => typeof window === 'undefined' ? '' : window.localStorage.getItem(REMEMBERED_USER_KEY) || '')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [rememberUser, setRememberUser] = useState(() => typeof window !== 'undefined' && Boolean(window.localStorage.getItem(REMEMBERED_USER_KEY)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(user, pass)
      if (typeof window !== 'undefined') {
        if (rememberUser) window.localStorage.setItem(REMEMBERED_USER_KEY, user.trim())
        else window.localStorage.removeItem(REMEMBERED_USER_KEY)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión')
    } finally {
      setBusy(false)
    }
  }

  const focusRecoveryHelp = () => {
    const help = document.getElementById('login-recovery-help')
    help?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    help?.focus({ preventScroll: true })
  }

  return <main className="login-v065-page">
    <section className="login-v065-story" aria-label="Presentación de Gestión de Ventas Diaria">
      <div className="login-v065-decor login-v065-decor-top" />
      <div className="login-v065-dots login-v065-dots-left" />

      <div className="login-v065-story-copy">
        <span className="login-v065-eyebrow">GESTIÓN DE VENTAS DIARIA</span>
        <h1>Impulsa tu operación<br/>comercial, todos los días.</h1>
        <p>Gestiona clientes, rutas y actividades en campo desde una sola plataforma diseñada para tu equipo.</p>
      </div>

      <div className="login-v065-features">
        {loginFeatures.map(({ icon: Icon, title, text }) => <div className="login-v065-feature" key={title}>
          <span className="login-v065-feature-icon"><Icon size={24} strokeWidth={1.8}/></span>
          <b>{title}</b>
          <small>{text}</small>
        </div>)}
      </div>

      <div className="login-v065-device-scene" aria-hidden="true">
        <div className="login-v065-city">
          <i/><i/><i/><i/><i/><i/><i/>
        </div>
        <div className="login-v065-storefront"><span>Karaka</span></div>
        <div className="login-v065-laptop">
          <div className="login-v065-laptop-screen">
            <aside><img src="/logo-karaka.png" alt=""/><i/><i/><i/><i/><i/></aside>
            <div className="login-v065-mini-dashboard">
              <strong>Resumen del día</strong>
              <div className="login-v065-mini-kpis"><span><b>32</b>Visitas</span><span><b>12</b>Clientes</span><span><b>8</b>Llamadas</span><span><b>5</b>Pendientes</span></div>
              <div className="login-v065-mini-content"><div className="login-v065-mini-list"><b>Actividad reciente</b><i/><i/><i/></div><div className="login-v065-mini-map"><b>Mapa de rutas</b><svg viewBox="0 0 180 96" role="presentation"><path d="M14 77 C 36 63, 44 70, 62 50 S 100 29, 116 43 S 145 59, 166 19"/><circle cx="14" cy="77" r="4"/><circle cx="62" cy="50" r="4"/><circle cx="116" cy="43" r="4"/><circle cx="166" cy="19" r="4"/></svg></div></div>
            </div>
          </div>
          <div className="login-v065-laptop-base" />
        </div>
        <div className="login-v065-phone">
          <div className="login-v065-phone-notch" />
          <b>Ruta del día</b>
          <div className="login-v065-phone-map"><svg viewBox="0 0 90 125" role="presentation"><path d="M15 98 C 25 76, 34 88, 43 61 S 61 45, 72 22"/><circle cx="15" cy="98" r="4"/><circle cx="43" cy="61" r="4"/><circle cx="72" cy="22" r="4"/></svg></div>
          <small>Próxima visita</small>
        </div>
      </div>
    </section>

    <section className="login-v065-access">
      <div className="login-v065-dots login-v065-dots-right" />
      <div className="login-v065-decor login-v065-decor-bottom" />

      <form className="login-v065-card" onSubmit={submit}>
        <img src="/logo-karaka.png" className="login-v065-logo" alt="Almacenes Karaka" />
        <span className="login-v065-kicker">GESTIÓN DE VENTAS DIARIA</span>
        <h2>Bienvenido</h2>
        <p>Ingresa con tu usuario Karaka.</p>

        <div className="login-v065-form-fields">
          <label>Usuario
            <div className="login-v065-field"><UserRound size={18}/><input value={user} onChange={e => setUser(e.target.value)} autoComplete="username" placeholder="Ingresa tu usuario" required /></div>
          </label>
          <label>Contraseña
            <div className="login-v065-field"><LockKeyhole size={18}/><input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" placeholder="Ingresa tu contraseña" required /><button type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
          </label>
        </div>

        <div className="login-v065-options">
          <label className="login-v065-remember"><input type="checkbox" checked={rememberUser} onChange={e => setRememberUser(e.target.checked)}/><span>Recordar usuario</span></label>
          <button type="button" className="login-v065-recovery-link" onClick={focusRecoveryHelp}>¿Olvidaste tu contraseña?</button>
        </div>

        {error && <div className="error-box login-v065-error" role="alert">{error}</div>}

        <button className="primary login-v065-submit" disabled={busy}>{busy ? <><Loader2 className="spin" size={18}/>Ingresando...</> : <>Entrar al sistema <ArrowRight size={19}/></>}</button>

        <div id="login-recovery-help" tabIndex={-1} className="login-v065-help">
          <span><ShieldCheck size={21}/></span>
          <div><b>¿Necesitas ayuda?</b><p>Solicita a un administrador que te asigne una nueva clave. La recuperación automática por WhatsApp todavía no está habilitada.</p></div>
        </div>

        <small className="login-v065-version">Versión {packageInfo.version}</small>
      </form>
    </section>
  </main>
}
