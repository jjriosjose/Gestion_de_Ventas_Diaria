import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, MapPin, RefreshCw, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { DeliveryStop, DeliveryTrip } from '../lib/logistics'
import '../styles/logistics.css'

type Incident = {
  id: string
  trip_id: string
  stop_id?: string | null
  incident_type: string
  severity: 'INFO' | 'DELAY' | 'CRITICAL'
  description?: string | null
  latitude?: number | null
  longitude?: number | null
  status: 'OPEN' | 'RESOLVED' | 'CANCELLED'
  stopped_trip: boolean
  reported_at: string
  resolved_at?: string | null
  resolution_notes?: string | null
}

function incidentLabel(value: string) { return value.replace(/_/g, ' ').toLocaleLowerCase('es').replace(/^./, letter => letter.toUpperCase()) }

export function DeliveryIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [trips, setTrips] = useState<DeliveryTrip[]>([])
  const [stops, setStops] = useState<DeliveryStop[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'OPEN' | 'ALL'>('OPEN')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true); setMessage('')
    const [incidentRes, tripRes] = await Promise.all([
      supabase.from('delivery_incidents').select('*').order('reported_at', { ascending: false }).limit(300),
      supabase.from('delivery_trips').select('*').order('trip_date', { ascending: false }).limit(160),
    ])
    if (incidentRes.error || tripRes.error) {
      setMessage(incidentRes.error?.message || tripRes.error?.message || 'No fue posible cargar incidencias.')
      setLoading(false); return
    }
    const loadedTrips = (tripRes.data || []) as DeliveryTrip[]
    setIncidents((incidentRes.data || []) as Incident[]); setTrips(loadedTrips)
    const tripIds = loadedTrips.map(trip => trip.id)
    if (tripIds.length) {
      const { data, error } = await supabase.from('delivery_stops').select('*').in('trip_id', tripIds).order('stop_order')
      if (error) setMessage(error.message)
      setStops((data || []) as DeliveryStop[])
    } else setStops([])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])
  const visible = useMemo(() => filter === 'OPEN' ? incidents.filter(item => item.status === 'OPEN') : incidents, [incidents, filter])
  const openCount = incidents.filter(item => item.status === 'OPEN').length
  const criticalCount = incidents.filter(item => item.status === 'OPEN' && item.severity === 'CRITICAL').length
  const stoppedCount = incidents.filter(item => item.status === 'OPEN' && item.stopped_trip).length

  const openMap = (incident: Incident) => {
    if (incident.latitude == null || incident.longitude == null) return
    window.open(`https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`, '_blank', 'noopener,noreferrer')
  }

  if (loading) return <div className="page-stack"><div className="panel empty-state"><LoaderCircle className="spin"/><b>Cargando incidencias logísticas…</b></div></div>

  return <div className="page-stack logistics-page">
    <div className="page-head"><div><span className="eyebrow">LOGÍSTICA · TORRE DE CONTROL</span><h2>Incidencias de viaje</h2><p>Averías, neumáticos, retrasos, rechazos, ubicación y cualquier eventualidad reportada en ruta. Torre de Control monitorea; el chofer confirma la resolución desde su ruta.</p></div><button className="secondary" onClick={() => void load()}><RefreshCw size={16}/>Actualizar</button></div>
    {message && <div className="logistics-notice warning"><div><ShieldAlert/><span>{message}</span></div></div>}
    <div className="kpi-grid logistics-kpis">
      <div className="kpi-card"><div className="kpi-icon"><AlertTriangle/></div><div><span>Abiertas</span><strong>{openCount}</strong><small>Pendientes del chofer</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><ShieldAlert/></div><div><span>Críticas</span><strong>{criticalCount}</strong><small>Prioridad alta</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><Clock3/></div><div><span>Viaje detenido</span><strong>{stoppedCount}</strong><small>Impactan continuidad</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><CheckCircle2/></div><div><span>Resueltas</span><strong>{incidents.filter(item => item.status === 'RESOLVED').length}</strong><small>Confirmadas desde ruta</small></div></div>
    </div>
    <div className="panel"><div className="button-row"><button className={filter === 'OPEN' ? 'primary compact' : 'secondary compact'} onClick={() => setFilter('OPEN')}>Abiertas</button><button className={filter === 'ALL' ? 'primary compact' : 'secondary compact'} onClick={() => setFilter('ALL')}>Todas</button></div></div>
    <div className="panel table-panel"><div className="table-meta"><span>{visible.length} incidencias</span><span>Torre de Control · seguimiento</span></div><div className="responsive-table"><table><thead><tr><th>Fecha / viaje</th><th>Incidencia</th><th>Parada</th><th>Severidad</th><th>Estado</th><th>Ubicación</th><th>Seguimiento</th></tr></thead><tbody>{visible.map(incident => {
      const trip = trips.find(item => item.id === incident.trip_id)
      const stop = stops.find(item => item.id === incident.stop_id)
      return <tr key={incident.id}><td><b>{new Date(incident.reported_at).toLocaleString('es-DO')}</b><small>{trip?.trip_code || incident.trip_id.slice(0,8)} · {trip?.driver_name_snapshot || 'Chofer'}</small></td><td><b>{incidentLabel(incident.incident_type)}</b><small>{incident.description || 'Sin descripción adicional'}</small></td><td>{stop ? <><b>{String(stop.stop_order).padStart(2,'0')} · {stop.destination_name_snapshot}</b><small>{stop.status}</small></> : 'General del viaje'}</td><td><span className={`badge incident-severity ${incident.severity.toLowerCase()}`}>{incident.severity === 'INFO' ? 'Informativa' : incident.severity === 'DELAY' ? 'Demora' : 'Crítica'}</span>{incident.stopped_trip && <small>Viaje detenido</small>}</td><td><span className={`badge ${incident.status === 'RESOLVED' ? 'success' : ''}`}>{incident.status === 'OPEN' ? 'Abierta' : incident.status === 'RESOLVED' ? 'Resuelta' : 'Cancelada'}</span>{incident.resolved_at && <small>{new Date(incident.resolved_at).toLocaleString('es-DO')}</small>}</td><td>{incident.latitude != null && incident.longitude != null ? <button className="secondary compact" onClick={() => openMap(incident)}><MapPin size={13}/>Ver mapa</button> : <span className="badge">Sin GPS</span>}</td><td>{incident.status === 'OPEN' ? <><span className="badge">Pendiente del chofer</span><small>Se cierra desde la ruta asignada.</small></> : <small>{incident.resolution_notes || 'Cerrada'}</small>}</td></tr>
    })}</tbody></table></div></div>
  </div>
}