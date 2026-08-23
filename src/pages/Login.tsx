import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import '../styles/operational-v059.css'

export function Login() {
  const { login } = useAuth()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(user, pass)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión')
    } finally {
      setBusy(false)
    }
  }

  return <div className="login-page">
    <div className="login-visual">
      <div className="visual-orb orb-a" />
      <div className="visual-orb orb-b" />
      <div className="visual-copy">
        <span>PLATAFORMA COMERCIAL</span>
        <h2>La operación de calle y showroom, en un solo lugar.</h2>
        <p>Clientes, rutas, captación, llamadas, visitas, mapas y análisis centralizados.</p>
      </div>
    </div>
    <div className="login-panel">
      <form className="login-card" onSubmit={submit}>
        <img src="/logo-karaka.png" className="login-logo" alt="Almacenes Karaka" />
        <span className="login-kicker">GESTION DE VENTAS DIARIA</span>
        <h1>Bienvenido</h1>
        <p>Ingresa con tu usuario Karaka.</p>
        <label>Usuario
          <div className="field"><UserRound size={18} /><input value={user} onChange={e => setUser(e.target.value)} autoComplete="username" placeholder="Ej. Jrios" /></div>
        </label>
        <label>Contraseña
          <div className="field"><LockKeyhole size={18} /><input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" /><button type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="primary login-button" disabled={busy}>{busy ? <><Loader2 className="spin" size={18} />Ingresando...</> : 'Entrar al sistema'}</button>
        <div className="recovery-disabled-note"><ShieldCheck size={17}/><div><b>¿Olvidaste tu contraseña?</b>Solicita a un administrador que te asigne una nueva clave. La recuperación automática por WhatsApp todavía no está habilitada.</div></div>
      </form>
    </div>
  </div>
}
