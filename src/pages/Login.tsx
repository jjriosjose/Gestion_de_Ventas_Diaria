import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, LockKeyhole, MessageCircle, ShieldCheck, UserRound, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requestPasswordReset, verifyPasswordReset } from '../lib/api'

type RecoveryStep = 'request' | 'verify' | 'done'

export function Login() {
  const { login } = useAuth()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('request')
  const [recoveryUser, setRecoveryUser] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')

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

  const openRecovery = () => {
    setRecoveryUser(user)
    setRecoveryStep('request')
    setRecoveryError('')
    setRecoveryMessage('')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setRecoveryOpen(true)
  }

  const closeRecovery = () => {
    if (recoveryBusy) return
    setRecoveryOpen(false)
  }

  const sendCode = async (e: FormEvent) => {
    e.preventDefault()
    setRecoveryBusy(true)
    setRecoveryError('')
    setRecoveryMessage('')
    try {
      const data = await requestPasswordReset(recoveryUser)
      setRecoveryMessage(data.message || 'Si la cuenta está habilitada, recibirás un código por WhatsApp.')
      setRecoveryStep('verify')
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'No fue posible solicitar el código')
    } finally {
      setRecoveryBusy(false)
    }
  }

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault()
    setRecoveryError('')
    if (newPassword.length < 8) {
      setRecoveryError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('Las contraseñas no coinciden.')
      return
    }
    if (!/^\d{6}$/.test(otp)) {
      setRecoveryError('Introduce el código de 6 dígitos recibido por WhatsApp.')
      return
    }
    setRecoveryBusy(true)
    try {
      await verifyPasswordReset(recoveryUser, otp, newPassword)
      setRecoveryStep('done')
      setRecoveryMessage('Contraseña actualizada correctamente. Ya puedes ingresar con tu usuario.')
      setPass('')
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'No fue posible validar el código')
    } finally {
      setRecoveryBusy(false)
    }
  }

  return <>
    <div className="login-page">
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
          <button type="button" className="link-btn" onClick={openRecovery}>¿Olvidaste tu contraseña?</button>
        </form>
      </div>
    </div>

    {recoveryOpen && <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Recuperar contraseña">
      <button className="modal-backdrop" onClick={closeRecovery} aria-label="Cerrar" />
      <div className="modal recovery-modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">SEGURIDAD</span>
            <h3>Recuperar contraseña</h3>
            <p>Usaremos el WhatsApp registrado por administración.</p>
          </div>
          <button type="button" className="icon-btn" onClick={closeRecovery}><X size={18} /></button>
        </div>

        {recoveryStep === 'request' && <form onSubmit={sendCode} className="form-grid one">
          <div className="recovery-callout"><MessageCircle size={20} /><div><b>Recuperación por WhatsApp</b><span>No necesitas un correo electrónico personal.</span></div></div>
          <label>Usuario
            <div className="field"><UserRound size={18} /><input value={recoveryUser} onChange={e => setRecoveryUser(e.target.value)} autoComplete="username" placeholder="Ej. Jrios" required /></div>
          </label>
          {recoveryError && <div className="error-box">{recoveryError}</div>}
          <div className="modal-actions"><button type="button" className="secondary" onClick={closeRecovery}>Cancelar</button><button className="primary" disabled={recoveryBusy}>{recoveryBusy ? <><Loader2 className="spin" size={18} />Enviando...</> : 'Enviar código'}</button></div>
        </form>}

        {recoveryStep === 'verify' && <form onSubmit={verifyCode} className="form-grid one">
          {recoveryMessage && <div className="success-box"><ShieldCheck size={20} /><span>{recoveryMessage}</span></div>}
          <label>Código de 6 dígitos
            <div className="field"><KeyRound size={18} /><input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" required /></div>
          </label>
          <label>Nueva contraseña
            <div className="field"><LockKeyhole size={18} /><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" required /></div>
          </label>
          <label>Confirmar nueva contraseña
            <div className="field"><LockKeyhole size={18} /><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required /></div>
          </label>
          {recoveryError && <div className="error-box">{recoveryError}</div>}
          <div className="modal-actions"><button type="button" className="secondary" onClick={() => setRecoveryStep('request')}>Volver</button><button className="primary" disabled={recoveryBusy}>{recoveryBusy ? <><Loader2 className="spin" size={18} />Validando...</> : 'Cambiar contraseña'}</button></div>
        </form>}

        {recoveryStep === 'done' && <div className="form-grid one">
          <div className="success-box prominent"><ShieldCheck size={24} /><div><b>Acceso recuperado</b><span>{recoveryMessage}</span></div></div>
          <div className="modal-actions"><button type="button" className="primary" onClick={closeRecovery}>Volver al inicio de sesión</button></div>
        </div>}
      </div>
    </div>}
  </>
}
