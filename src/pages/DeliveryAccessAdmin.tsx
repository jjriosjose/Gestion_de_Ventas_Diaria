import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Copy, KeyRound, Link2, LoaderCircle, RefreshCw, ShieldCheck, Truck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { currency, type DeliveryDriver, type DeliveryTrip } from '../lib/logistics'
import '../styles/delivery-driver.css'

type ActiveLink = { id: string; trip_id: string; driver_id?: string | null; status: string; expires_at: string; first_used_at?: string | null; last_used_at?: string | null; created_at: string }
type Generated = { tripCode: string; url: string; pin: string; expiresAt: string } | null

const encoder = new TextEncoder()
const hex = (bytes: Uint8Array) => Array.from(bytes).map(value => value.toString(16).padStart(2, '0')).join('')
async function sha256(value: string) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))) }
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let binary = ''
  bytes.forEach(value => { binary += String.fromCharCode(value) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
function randomPin() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 900000
  return String(100000 + value)
}

export function DeliveryAccessAdmin() {
  const { employee } = useAuth()
  const [trips, setTrips] = useState<DeliveryTrip[]>([])
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([])
  const [links, setLinks] = useState<ActiveLink[]>([])
  const [tripId, setTripId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [generated, setGenerated] = useState<Generated>(null)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const [tripRes, driverRes, linkRes] = await Promise.all([
      supabase.from('delivery_trips').select('*').not('status', 'in', '(COMPLETED,CANCELLED)').order('trip_date', { ascending: false }).limit(100),
      supabase.from('delivery_drivers').select('*').order('full_name'),
      supabase.from('delivery_access_links').select('id,trip_id,driver_id,status,expires_at,first_used_at,last_used_at,created_at').order('created_at', { ascending: false }).limit(100),
    ])
    if (tripRes.error || driverRes.error || linkRes.error) setMessage(tripRes.error?.message || driverRes.error?.message || linkRes.error?.message || 'No fue posible cargar accesos')
    setTrips((tripRes.data || []) as DeliveryTrip[])
    setDrivers((driverRes.data || []) as DeliveryDriver[])
    setLinks((linkRes.data || []) as ActiveLink[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])
  const selected = trips.find(trip => trip.id === tripId) || null
  const driver = selected?.driver_id ? drivers.find(item => item.id === selected.driver_id) || null : null
  const activeForTrip = useMemo(() => links.find(link => link.trip_id === tripId && link.status === 'ACTIVE' && new Date(link.expires_at).getTime() > Date.now()) || null, [links, tripId])

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setMessage('Copiado al portapapeles.') }
    catch { setMessage('No fue posible copiar automáticamente. Selecciona el texto manualmente.') }
  }

  const generate = async () => {
    if (!selected) return setMessage('Selecciona un viaje.')
    if (!selected.driver_id) return setMessage('El viaje no tiene chofer asignado.')
    setBusy(true); setMessage(''); setGenerated(null)
    try {
      const token = randomToken(); const pin = randomPin()
      const tokenHash = await sha256(token); const pinHash = await sha256(`${token}:${pin}`)
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      await supabase.from('delivery_access_links').update({ status: 'REVOKED', revoked_at: new Date().toISOString() }).eq('trip_id', selected.id).eq('status', 'ACTIVE')
      const { error } = await supabase.from('delivery_access_links').insert({ trip_id: selected.id, driver_id: selected.driver_id, token_hash: tokenHash, pin_hash: pinHash, status: 'ACTIVE', expires_at: expiresAt, created_by: employee?.id || null })
      if (error) throw error
      const url = `${window.location.origin}/entrega/${token}`
      setGenerated({ tripCode: selected.trip_code, url, pin, expiresAt })
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible generar el acceso.') }
    finally { setBusy(false) }
  }

  const revoke = async (linkId: string) => {
    setBusy(true)
    const { error } = await supabase.from('delivery_access_links').update({ status: 'REVOKED', revoked_at: new Date().toISOString() }).eq('id', linkId)
    setBusy(false)
    if (error) return setMessage(error.message)
    setGenerated(null); await load(); setMessage('Acceso revocado.')
  }

  if (loading) return <div className="page-stack"><div className="panel empty-state"><LoaderCircle className="spin"/><b>Cargando accesos temporales…</b></div></div>

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">LOGÍSTICA · SEGURIDAD</span><h2>Acceso temporal de chofer</h2><p>Genera un enlace + PIN para ejecutar un viaje sin crear un usuario permanente.</p></div><button className="secondary" onClick={() => void load()}><RefreshCw size={16}/>Actualizar</button></div>
    {message && <div className="logistics-notice warning"><div><ShieldCheck/><span>{message}</span></div></div>}
    <div className="delivery-access-grid">
      <div className="panel"><div className="panel-head"><div><b>Generar acceso</b><span>El token se guarda solo como hash. El enlace visible se muestra una única vez.</span></div></div>
        <label>Viaje<select value={tripId} onChange={event => { setTripId(event.target.value); setGenerated(null) }}><option value="">Seleccionar viaje</option>{trips.map(trip => <option value={trip.id} key={trip.id}>{trip.trip_code} · {trip.driver_name_snapshot || 'Sin chofer'} · {trip.trip_date}</option>)}</select></label>
        {selected && <div className="delivery-access-trip"><div className="delivery-access-icon"><Truck/></div><div><b>{selected.trip_code}</b><span>{driver?.full_name || selected.driver_name_snapshot} · {selected.vehicle_plate_snapshot || 'Sin placa'}</span><small>{selected.total_stops} paradas · {selected.total_packages} bultos · {currency(selected.total_amount)}</small></div></div>}
        {activeForTrip && <div className="delivery-access-existing"><CheckCircle2/><div><b>Ya existe un acceso activo</b><span>Expira {new Date(activeForTrip.expires_at).toLocaleString('es-DO')}</span></div><button className="secondary compact" disabled={busy} onClick={() => void revoke(activeForTrip.id)}>Revocar</button></div>}
        <button className="primary full" disabled={!selected || busy} onClick={() => void generate()}>{busy ? <LoaderCircle className="spin"/> : <KeyRound/>}{activeForTrip ? 'Regenerar enlace y PIN' : 'Generar enlace y PIN'}</button>
      </div>
      <div className="panel"><div className="panel-head"><div><b>Entrega al chofer</b><span>Envía ambos datos por un canal confiable. No existe contraseña de usuario.</span></div></div>
        {generated ? <div className="delivery-access-result"><div className="delivery-access-success"><CheckCircle2/><div><b>Acceso creado para {generated.tripCode}</b><span>Válido hasta {new Date(generated.expiresAt).toLocaleString('es-DO')}</span></div></div><label>Enlace temporal<div className="copy-field"><input readOnly value={generated.url}/><button onClick={() => void copy(generated.url)}><Copy/></button></div></label><label>PIN de seguridad<div className="copy-field pin"><input readOnly value={generated.pin}/><button onClick={() => void copy(generated.pin)}><Copy/></button></div></label><button className="secondary full" onClick={() => void copy(`Ruta ${generated.tripCode}\n${generated.url}\nPIN: ${generated.pin}`)}><Link2 size={16}/>Copiar mensaje completo</button><p className="delivery-access-warning">Si sales de esta pantalla, el enlace crudo y el PIN no pueden recuperarse. Puedes revocarlo y generar uno nuevo.</p></div> : <div className="empty-state"><Link2/><b>Sin enlace recién generado</b><p>Selecciona un viaje y genera el acceso temporal.</p></div>}
      </div>
    </div>
    <div className="panel table-panel"><div className="table-meta"><span>{links.length} accesos recientes</span><span>Auditoría de uso</span></div><div className="responsive-table"><table><thead><tr><th>Viaje</th><th>Chofer</th><th>Estado</th><th>Expira</th><th>Primer uso</th><th>Último uso</th></tr></thead><tbody>{links.map(link => { const trip = trips.find(item => item.id === link.trip_id); const linkDriver = drivers.find(item => item.id === link.driver_id); return <tr key={link.id}><td><b>{trip?.trip_code || link.trip_id.slice(0, 8)}</b></td><td>{linkDriver?.full_name || trip?.driver_name_snapshot || '—'}</td><td><span className={`badge ${link.status === 'ACTIVE' ? 'success' : ''}`}>{link.status}</span></td><td>{new Date(link.expires_at).toLocaleString('es-DO')}</td><td>{link.first_used_at ? new Date(link.first_used_at).toLocaleString('es-DO') : '—'}</td><td>{link.last_used_at ? new Date(link.last_used_at).toLocaleString('es-DO') : '—'}</td></tr> })}</tbody></table></div></div>
  </div>
}
