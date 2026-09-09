import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, Download, FileText, LoaderCircle, MapPin, Navigation, PackageCheck, Route, Search, Truck, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { currency, type DeliveryDocument, type DeliveryStop, type DeliveryTrip } from '../lib/logistics'
import { exportTripHistoryExcel } from '../lib/logisticsHistoryExport'
import { estimateOperationalDistance, formatOperationalDistance, operationalDistanceDescription } from '../lib/logisticsTripDistance'
import { DeliveryTripJourneyMap } from './DeliveryTripJourneyMap'

type JourneyTrip = DeliveryTrip & {
  origin_latitude?: number | null
  origin_longitude?: number | null
  returned_at?: string | null
}

type JourneyStop = DeliveryStop & {
  arrived_at?: string | null
  unload_started_at?: string | null
  unload_finished_at?: string | null
  delivered_at?: string | null
  departed_at?: string | null
}

type JourneyEvent = {
  id: string
  trip_id: string
  stop_id?: string | null
  event_type: string
  latitude?: number | null
  longitude?: number | null
  accuracy_m?: number | null
  source?: string | null
  payload?: Record<string, unknown> | null
  occurred_at: string
}

type JourneyIncident = {
  id: string
  trip_id: string
  stop_id?: string | null
  incident_type: string
  severity?: string | null
  description?: string | null
  latitude?: number | null
  longitude?: number | null
  status?: string | null
  stopped_trip?: boolean | null
  reported_at: string
  resolved_at?: string | null
  resolution_notes?: string | null
}

type Bundle = { events: JourneyEvent[]; incidents: JourneyIncident[] }

type Props = {
  trips: DeliveryTrip[]
  stops: DeliveryStop[]
  documents: DeliveryDocument[]
  fromDate?: string
  toDate?: string
}

const TRIP_STATUS: Record<string, string> = {
  DRAFT: 'Borrador', PREPARING: 'Preparando', LOADED: 'Cargado', READY: 'Listo', IN_ROUTE: 'En ruta', WITH_INCIDENT: 'Con incidencia', RETURNING: 'Retornando', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado',
}

const STOP_STATUS: Record<string, string> = {
  PENDING: 'Pendiente', EN_ROUTE: 'En camino', AT_CLIENT: 'En cliente', WAITING_UNLOAD: 'Espera descarga', UNLOADING: 'Descargando', DELIVERED: 'Entregada', PARTIAL: 'Parcial', NOT_DELIVERED: 'No entregada', RESCHEDULED: 'Reprogramada', CANCELLED: 'Cancelada',
}

const EVENT_LABELS: Record<string, string> = {
  DEPARTED_ORIGIN: 'Salida del centro de carga', ARRIVED: 'Llegada al cliente', UNLOAD_STARTED: 'Inicio de descarga', UNLOAD_FINISHED: 'Fin de descarga', DELIVERY_CONFIRMED: 'Entrega confirmada', DELIVERY_PARTIAL: 'Entrega parcial', DELIVERY_NOT_DELIVERED: 'No entregada', DELIVERY_RESCHEDULED: 'Entrega reprogramada', INCIDENT_REPORTED: 'Incidencia reportada', INCIDENT_RESOLVED: 'Incidencia resuelta', RETURN_STARTED: 'Inicio de retorno', RETURNED_ORIGIN: 'Retorno a base', TRIP_COMPLETED: 'Cierre del viaje',
}

const FILTER_LABELS = { ALL: 'Todos', COMPLETED: 'Finalizados', ACTIVE: 'En curso', EXCEPTION: 'Excepciones' } as const

function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return null
  const value = (new Date(end).getTime() - new Date(start).getTime()) / 60000
  return Number.isFinite(value) && value >= 0 ? value : null
}

function formatDuration(minutes: number | null) {
  if (minutes == null) return '—'
  if (minutes < 1) return '< 1 min'
  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return hours ? `${hours} h ${rest} min` : `${rest} min`
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value)
  return date.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371000
  const toRad = (value: number) => value * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function statusTone(status: string) {
  if (status === 'COMPLETED' || status === 'DELIVERED') return 'success'
  if (status === 'PARTIAL' || status === 'RETURNING' || status === 'RESCHEDULED') return 'warning'
  if (status === 'WITH_INCIDENT' || status === 'NOT_DELIVERED' || status === 'CANCELLED') return 'danger'
  if (status === 'IN_ROUTE' || status === 'AT_CLIENT' || status === 'UNLOADING') return 'info'
  return ''
}

export function DeliveryTripHistoryView({ trips, stops, documents, fromDate, toDate }: Props) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'ACTIVE' | 'EXCEPTION'>('ALL')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(() => trips[0]?.id || null)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [bundles, setBundles] = useState<Record<string, Bundle>>({})
  const [loadingTrip, setLoadingTrip] = useState('')
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')

  const journeyTrips = trips as JourneyTrip[]
  const journeyStops = stops as JourneyStop[]

  const visibleTrips = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es')
    return journeyTrips.filter(trip => {
      const matchesTerm = !term || [trip.trip_code, trip.title, trip.driver_name_snapshot, trip.vehicle_plate_snapshot, trip.carrier_name_snapshot, trip.trip_date]
        .filter(Boolean).join(' ').toLocaleLowerCase('es').includes(term)
      if (!matchesTerm) return false
      if (statusFilter === 'COMPLETED') return trip.status === 'COMPLETED'
      if (statusFilter === 'ACTIVE') return ['READY', 'IN_ROUTE', 'RETURNING'].includes(trip.status)
      if (statusFilter === 'EXCEPTION') return ['WITH_INCIDENT', 'CANCELLED'].includes(trip.status) || journeyStops.some(stop => stop.trip_id === trip.id && ['PARTIAL', 'NOT_DELIVERED', 'RESCHEDULED', 'CANCELLED'].includes(stop.status))
      return true
    })
  }, [journeyTrips, journeyStops, query, statusFilter])

  useEffect(() => {
    if (!visibleTrips.length) { setSelectedTripId(null); return }
    if (!selectedTripId || !visibleTrips.some(trip => trip.id === selectedTripId)) setSelectedTripId(visibleTrips[0].id)
  }, [visibleTrips, selectedTripId])

  const selectedTrip = journeyTrips.find(trip => trip.id === selectedTripId) || null
  const selectedStops = useMemo(() => journeyStops.filter(stop => stop.trip_id === selectedTripId).sort((a, b) => a.stop_order - b.stop_order), [journeyStops, selectedTripId])
  const selectedDocuments = useMemo(() => documents.filter(document => document.trip_id === selectedTripId), [documents, selectedTripId])
  const bundle = selectedTripId ? bundles[selectedTripId] : undefined
  const events = bundle?.events || []
  const incidents = bundle?.incidents || []

  useEffect(() => {
    setSelectedStopId(null)
    if (!selectedTripId || bundles[selectedTripId]) return
    let cancelled = false
    setLoadingTrip(selectedTripId)
    setMessage('')
    void Promise.all([
      supabase.from('delivery_events').select('*').eq('trip_id', selectedTripId).order('occurred_at', { ascending: true }),
      supabase.from('delivery_incidents').select('*').eq('trip_id', selectedTripId).order('reported_at', { ascending: true }),
    ]).then(([eventRes, incidentRes]) => {
      if (cancelled) return
      const error = eventRes.error || incidentRes.error
      if (error) { setMessage(error.message); return }
      setBundles(current => ({ ...current, [selectedTripId]: { events: (eventRes.data || []) as JourneyEvent[], incidents: (incidentRes.data || []) as JourneyIncident[] } }))
    }).finally(() => { if (!cancelled) setLoadingTrip('') })
    return () => { cancelled = true }
  }, [selectedTripId, bundles])

  const exportVisibleTrips = async () => {
    if (!visibleTrips.length) return
    setExporting(true); setMessage('')
    try {
      await exportTripHistoryExcel({
        trips: visibleTrips,
        stops: journeyStops,
        documents,
        filters: { fromDate, toDate, search: query.trim(), statusLabel: FILTER_LABELS[statusFilter] },
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible generar el Excel del historial.')
    } finally { setExporting(false) }
  }

  const metrics = useMemo(() => {
    if (!selectedTrip) return null
    const gpsEvents = events.filter(event => event.latitude != null && event.longitude != null)
    const gpsCoverage = events.length ? gpsEvents.length / events.length * 100 : 0
    const operationalDistance = estimateOperationalDistance(selectedTrip, selectedStops, events)
    const serviceMinutes = selectedStops.map(stop => minutesBetween(stop.arrived_at, stop.delivered_at || stop.unload_finished_at)).filter((value): value is number => value != null)
    const avgService = serviceMinutes.length ? serviceMinutes.reduce((sum, value) => sum + value, 0) / serviceMinutes.length : null
    const deliveredStops = selectedStops.filter(stop => stop.status === 'DELIVERED').length
    const partialStops = selectedStops.filter(stop => stop.status === 'PARTIAL').length
    const failedStops = selectedStops.filter(stop => ['NOT_DELIVERED', 'CANCELLED', 'RESCHEDULED'].includes(stop.status)).length
    const packagesLoaded = selectedDocuments.reduce((sum, document) => sum + Number(document.packages_loaded || 0), 0)
    const packagesDelivered = selectedDocuments.reduce((sum, document) => sum + Number(document.packages_delivered || 0), 0)
    const packagesReturned = selectedDocuments.reduce((sum, document) => sum + Number(document.packages_returned || 0), 0)
    const plannedIds = selectedStops.map(stop => stop.id)
    const arrivalIds = events.filter(event => event.event_type === 'ARRIVED' && event.stop_id).map(event => event.stop_id!).filter((id, index, array) => array.indexOf(id) === index)
    const sequenceMatches = arrivalIds.filter((id, index) => plannedIds[index] === id).length
    const sequenceCompliance = arrivalIds.length ? sequenceMatches / arrivalIds.length * 100 : null
    const deviations = selectedStops
      .filter(stop => stop.planned_latitude != null && stop.planned_longitude != null && stop.actual_delivery_latitude != null && stop.actual_delivery_longitude != null)
      .map(stop => haversineMeters(stop.planned_latitude!, stop.planned_longitude!, stop.actual_delivery_latitude!, stop.actual_delivery_longitude!))
    const maxDeviation = deviations.length ? Math.max(...deviations) : null
    const totalDuration = minutesBetween(selectedTrip.departed_at, selectedTrip.completed_at || selectedTrip.returned_at)
    const orderedGps = [...gpsEvents].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
    let maxGapMinutes = 0
    for (let index = 1; index < orderedGps.length; index += 1) {
      const gap = minutesBetween(orderedGps[index - 1].occurred_at, orderedGps[index].occurred_at) || 0
      maxGapMinutes = Math.max(maxGapMinutes, gap)
    }
    return { gpsCoverage, operationalDistance, avgService, deliveredStops, partialStops, failedStops, packagesLoaded, packagesDelivered, packagesReturned, sequenceCompliance, maxDeviation, totalDuration, maxGapMinutes }
  }, [selectedTrip, selectedStops, selectedDocuments, events])

  const insights = useMemo(() => {
    if (!metrics) return [] as Array<{ tone: string; title: string; text: string }>
    const items: Array<{ tone: string; title: string; text: string }> = []
    if (metrics.gpsCoverage >= 80) items.push({ tone: 'success', title: 'Trazabilidad GPS alta', text: `${Math.round(metrics.gpsCoverage)}% de los eventos del viaje tienen coordenadas.` })
    else if (metrics.gpsCoverage >= 50) items.push({ tone: 'warning', title: 'Trazabilidad GPS parcial', text: `${Math.round(metrics.gpsCoverage)}% de cobertura. Interpreta los segmentos sin GPS como estimados.` })
    else items.push({ tone: 'danger', title: 'Trazabilidad GPS limitada', text: `${Math.round(metrics.gpsCoverage)}% de cobertura. El mapa no representa todas las transiciones del viaje.` })
    if (metrics.operationalDistance.plannedStopPoints) items.push({ tone: 'neutral', title: 'Distancia parcialmente estimada', text: `${metrics.operationalDistance.plannedStopPoints} parada(s) usan ubicación planificada porque no hubo GPS operativo disponible.` })
    if (incidents.length) items.push({ tone: 'danger', title: `${incidents.length} incidencia(s) registrada(s)`, text: 'Revisa el punto, severidad, hora y resolución dentro del timeline.' })
    if (metrics.partialStops || metrics.failedStops) items.push({ tone: 'warning', title: 'Resultado operativo con excepciones', text: `${metrics.partialStops} parcial(es) y ${metrics.failedStops} no entregada(s), reprogramada(s) o cancelada(s).` })
    if (metrics.sequenceCompliance != null && metrics.sequenceCompliance < 100) items.push({ tone: 'warning', title: 'Secuencia ejecutada diferente', text: `${Math.round(metrics.sequenceCompliance)}% de coincidencia posicional entre llegadas registradas y orden planificado.` })
    if (metrics.maxDeviation != null && metrics.maxDeviation > 500) items.push({ tone: 'warning', title: 'Ubicación registrada distante', text: `Se detectó al menos una atención a más de ${Math.round(metrics.maxDeviation)} m de la ubicación planificada. Puede ser comportamiento operativo o calidad del maestro GPS.` })
    if (metrics.maxGapMinutes > 30) items.push({ tone: 'neutral', title: 'Segmento amplio sin GPS', text: `El mayor intervalo entre puntos GPS fue de ${Math.round(metrics.maxGapMinutes)} min; la línea entre esos puntos es solo una trayectoria estimada.` })
    if (!items.length) items.push({ tone: 'success', title: 'Sin alertas de lectura', text: 'Los indicadores disponibles no muestran excepciones relevantes para este viaje.' })
    return items
  }, [metrics, incidents])

  if (!journeyTrips.length) return <div className="panel empty-state"><Route/><b>Sin viajes en el período</b><p>Ajusta Desde/Hasta para consultar otro rango del historial.</p></div>

  return <div className="journey-history-layout">
    <aside className="panel journey-trip-browser">
      <div className="journey-browser-head"><div><span className="eyebrow">EXPLORADOR</span><b>Viajes</b></div><span>{visibleTrips.length}</span></div>
      <div className="search-field journey-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Viaje, chofer, placa…"/></div>
      <div className="journey-filter-chips">
        <button className={statusFilter === 'ALL' ? 'active' : ''} onClick={() => setStatusFilter('ALL')}>Todos</button>
        <button className={statusFilter === 'COMPLETED' ? 'active' : ''} onClick={() => setStatusFilter('COMPLETED')}>Finalizados</button>
        <button className={statusFilter === 'ACTIVE' ? 'active' : ''} onClick={() => setStatusFilter('ACTIVE')}>En curso</button>
        <button className={statusFilter === 'EXCEPTION' ? 'active' : ''} onClick={() => setStatusFilter('EXCEPTION')}>Excepciones</button>
      </div>
      <div className="journey-export-wrap"><button className="journey-export-button" disabled={exporting || !visibleTrips.length} onClick={() => void exportVisibleTrips()}>{exporting ? <LoaderCircle className="spin" size={15}/> : <Download size={15}/>}<span><b>{exporting ? 'Generando Excel…' : 'Exportar Excel'}</b><small>{visibleTrips.length} viaje(s) visibles</small></span></button></div>
      <div className="journey-trip-list">{visibleTrips.map(trip => {
        const tripStops = journeyStops.filter(stop => stop.trip_id === trip.id)
        const terminal = tripStops.filter(stop => ['DELIVERED', 'PARTIAL', 'NOT_DELIVERED', 'RESCHEDULED', 'CANCELLED'].includes(stop.status)).length
        return <button key={trip.id} className={`journey-trip-card ${selectedTripId === trip.id ? 'selected' : ''}`} onClick={() => setSelectedTripId(trip.id)}>
          <div className="journey-trip-card-top"><b>{trip.trip_code}</b><span className={`journey-status ${statusTone(trip.status)}`}>{TRIP_STATUS[trip.status] || trip.status}</span></div>
          <span className="journey-trip-title">{trip.title || 'Viaje logístico'}</span>
          <div className="journey-trip-meta"><span><UserRound size={12}/>{trip.driver_name_snapshot || 'Sin chofer'}</span><span><Truck size={12}/>{trip.vehicle_plate_snapshot || 'Sin placa'}</span></div>
          <div className="journey-trip-foot"><span>{formatDate(trip.trip_date)}</span><b>{terminal}/{tripStops.length || trip.total_stops} paradas</b></div>
        </button>
      })}</div>
    </aside>

    <main className="journey-trip-workspace">
      {!selectedTrip ? <div className="panel empty-state"><Search/><b>Selecciona un viaje</b><p>Verás mapa, timeline, paradas y comportamiento.</p></div> : <>
        <section className="panel journey-trip-hero">
          <div className="journey-trip-identity"><div className="journey-trip-icon"><Truck size={22}/></div><div><span className="eyebrow">VIAJE · {formatDate(selectedTrip.trip_date)}</span><h3>{selectedTrip.title || selectedTrip.trip_code}</h3><p>{selectedTrip.trip_code} · {selectedTrip.driver_name_snapshot || 'Sin chofer'} · {selectedTrip.vehicle_plate_snapshot || 'Sin placa'} · {selectedTrip.carrier_name_snapshot || 'Operación propia'}</p></div></div>
          <span className={`journey-status large ${statusTone(selectedTrip.status)}`}>{TRIP_STATUS[selectedTrip.status] || selectedTrip.status}</span>
        </section>
        {message && <div className="logistics-notice warning"><div><AlertTriangle/><span>{message}</span></div></div>}

        <section className="journey-kpi-grid">
          <div className="journey-kpi"><Clock3/><span>Duración total</span><b>{formatDuration(metrics?.totalDuration ?? null)}</b><small>{formatTime(selectedTrip.departed_at)} → {formatTime(selectedTrip.completed_at || selectedTrip.returned_at)}</small></div>
          <div className="journey-kpi"><PackageCheck/><span>Entrega de bultos</span><b>{metrics ? `${metrics.packagesDelivered}/${metrics.packagesLoaded}` : '—'}</b><small>{metrics?.packagesReturned || 0} retorno</small></div>
          <div className="journey-kpi"><MapPin/><span>Cobertura GPS</span><b>{metrics ? `${Math.round(metrics.gpsCoverage)}%` : '—'}</b><small>{events.filter(event => event.latitude != null && event.longitude != null).length}/{events.length} eventos con GPS</small></div>
          <div className="journey-kpi"><Navigation/><span>Distancia operativa estimada</span><b>{metrics ? formatOperationalDistance(metrics.operationalDistance.totalMeters) : '—'}</b><small>{metrics ? operationalDistanceDescription(metrics.operationalDistance) : 'Suma recta entre puntos disponibles'}</small></div>
          <div className="journey-kpi"><Clock3/><span>Permanencia media</span><b>{formatDuration(metrics?.avgService ?? null)}</b><small>Llegada → entrega/fin descarga</small></div>
          <div className="journey-kpi"><CheckCircle2/><span>Resultado paradas</span><b>{metrics ? `${metrics.deliveredStops} completas` : '—'}</b><small>{metrics?.partialStops || 0} parciales · {metrics?.failedStops || 0} excepciones</small></div>
        </section>

        {loadingTrip === selectedTrip.id && !bundle ? <div className="panel journey-loading"><LoaderCircle className="spin"/><b>Cargando recorrido y eventos…</b></div> : <>
          <DeliveryTripJourneyMap trip={selectedTrip} stops={selectedStops} events={events} incidents={incidents} selectedStopId={selectedStopId} onSelectStop={setSelectedStopId}/>

          <section className="journey-analysis-grid">
            <div className="panel journey-insights"><div className="journey-section-head"><div><span className="eyebrow">LECTURA GERENCIAL</span><h3>Comportamiento observado</h3></div><span>{insights.length} hallazgo(s)</span></div>
              <div className="journey-insight-list">{insights.map((insight, index) => <div key={`${insight.title}-${index}`} className={`journey-insight ${insight.tone}`}><div className="journey-insight-icon">{insight.tone === 'success' ? <CheckCircle2/> : insight.tone === 'danger' || insight.tone === 'warning' ? <AlertTriangle/> : <FileText/>}</div><div><b>{insight.title}</b><p>{insight.text}</p></div></div>)}</div>
            </div>
            <div className="panel journey-operation-summary"><div className="journey-section-head"><div><span className="eyebrow">CONTROL</span><h3>Indicadores de ejecución</h3></div></div>
              <dl>
                <div><dt>Secuencia observada</dt><dd>{metrics?.sequenceCompliance == null ? 'Sin llegadas suficientes' : `${Math.round(metrics.sequenceCompliance)}%`}</dd></div>
                <div><dt>Mayor intervalo sin punto GPS</dt><dd>{metrics ? formatDuration(metrics.maxGapMinutes) : '—'}</dd></div>
                <div><dt>Máxima desviación plan/real</dt><dd>{metrics?.maxDeviation == null ? 'Sin comparación' : `${Math.round(metrics.maxDeviation)} m`}</dd></div>
                <div><dt>Monto del viaje</dt><dd>{currency(selectedTrip.total_amount)}</dd></div>
                <div><dt>Documentos</dt><dd>{selectedDocuments.length}</dd></div>
                <div><dt>Incidencias</dt><dd>{incidents.length}</dd></div>
              </dl>
            </div>
          </section>

          <section className="journey-detail-grid">
            <div className="panel journey-stops-panel"><div className="journey-section-head"><div><span className="eyebrow">PARADAS</span><h3>Secuencia y permanencia</h3></div><span>{selectedStops.length} destinos</span></div>
              <div className="journey-stop-list">{selectedStops.map(stop => {
                const service = minutesBetween(stop.arrived_at, stop.delivered_at || stop.unload_finished_at)
                return <button key={stop.id} className={`journey-stop-row ${selectedStopId === stop.id ? 'selected' : ''}`} onClick={() => setSelectedStopId(stop.id)}>
                  <span className={`journey-stop-order ${statusTone(stop.status)}`}>{String(stop.stop_order).padStart(2, '0')}</span>
                  <div className="journey-stop-main"><b>{stop.destination_name_snapshot}</b><span>{STOP_STATUS[stop.status] || stop.status}</span><small>{stop.destination_address_snapshot || (stop.geo_status === 'PENDING' ? 'Ubicación pendiente' : 'Destino georreferenciado')}</small></div>
                  <div className="journey-stop-times"><span><b>{formatTime(stop.arrived_at)}</b> llegada</span><span><b>{formatDuration(service)}</b> permanencia</span></div>
                  <div className="journey-stop-packages"><b>{Number(stop.packages_delivered || 0)}/{Number(stop.packages_loaded || 0)}</b><span>bultos</span></div>
                </button>
              })}</div>
            </div>

            <div className="panel journey-timeline-panel"><div className="journey-section-head"><div><span className="eyebrow">TIMELINE</span><h3>Cronología operativa</h3></div><span>{events.length} eventos</span></div>
              <div className="journey-timeline">{events.length ? events.map((event, index) => {
                const stop = selectedStops.find(item => item.id === event.stop_id)
                const hasGps = event.latitude != null && event.longitude != null
                return <div key={event.id} className="journey-timeline-item"><div className="journey-timeline-rail"><i className={index === events.length - 1 ? 'last' : ''}/></div><div className="journey-timeline-time"><b>{formatTime(event.occurred_at)}</b><span>{new Date(event.occurred_at).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit' })}</span></div><div className="journey-timeline-content"><b>{EVENT_LABELS[event.event_type] || event.event_type.replace(/_/g, ' ')}</b><span>{stop ? `Parada ${stop.stop_order} · ${stop.destination_name_snapshot}` : selectedTrip.trip_code}</span><small className={hasGps ? 'gps-ok' : 'gps-missing'}>{hasGps ? `GPS · precisión ${event.accuracy_m != null ? `${Math.round(event.accuracy_m)} m` : 'N/D'}` : 'Sin coordenadas en este evento'}</small></div></div>
              }) : <div className="empty-state journey-empty"><Route/><b>Sin eventos operativos</b><p>El viaje no tiene timeline disponible.</p></div>}</div>
            </div>
          </section>
        </>}
      </>}
    </main>
  </div>
}
