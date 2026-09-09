import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { Crosshair, Layers3, Map, Maximize2, Minimize2, Route, Satellite } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import type { DeliveryStop, DeliveryTrip } from '../lib/logistics'

type JourneyEvent = {
  id: string
  trip_id: string
  stop_id?: string | null
  event_type: string
  latitude?: number | null
  longitude?: number | null
  accuracy_m?: number | null
  source?: string | null
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
  reported_at: string
}

type Props = {
  trip: DeliveryTrip
  stops: DeliveryStop[]
  events: JourneyEvent[]
  incidents: JourneyIncident[]
  selectedStopId?: string | null
  onSelectStop?: (stopId: string) => void
}

type BaseMap = 'STREETS' | 'LIGHT' | 'SATELLITE'

const DR_CENTER: [number, number] = [18.7357, -70.1627]

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character))
}

function statusClass(status: string) {
  if (status === 'DELIVERED') return 'delivered'
  if (status === 'PARTIAL') return 'partial'
  if (status === 'NOT_DELIVERED' || status === 'CANCELLED') return 'failed'
  if (status === 'RESCHEDULED') return 'rescheduled'
  if (status === 'AT_CLIENT' || status === 'UNLOADING' || status === 'WAITING_UNLOAD') return 'active'
  return 'pending'
}

function eventLabel(value: string) {
  const labels: Record<string, string> = {
    DEPARTED_ORIGIN: 'Salida del centro de carga',
    ARRIVED: 'Llegada al cliente',
    UNLOAD_STARTED: 'Inicio de descarga',
    UNLOAD_FINISHED: 'Fin de descarga',
    DELIVERY_CONFIRMED: 'Entrega confirmada',
    DELIVERY_PARTIAL: 'Entrega parcial',
    DELIVERY_NOT_DELIVERED: 'No entregada',
    DELIVERY_RESCHEDULED: 'Reprogramada',
    INCIDENT_REPORTED: 'Incidencia reportada',
    INCIDENT_RESOLVED: 'Incidencia resuelta',
    RETURN_STARTED: 'Inicio de retorno',
    RETURNED_ORIGIN: 'Retorno a base',
    TRIP_COMPLETED: 'Viaje cerrado',
  }
  return labels[value] || value.replace(/_/g, ' ')
}

function tileDefinition(base: BaseMap) {
  if (base === 'LIGHT') return {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 20,
  }
  if (base === 'SATELLITE') return {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 19,
  }
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 20,
  }
}

export function DeliveryTripJourneyMap({ trip, stops, events, incidents, selectedStopId = null, onSelectStop }: Props) {
  const host = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)
  const [baseMap, setBaseMap] = useState<BaseMap>('LIGHT')
  const [showPlanned, setShowPlanned] = useState(true)
  const [showGps, setShowGps] = useState(true)
  const [showDeviation, setShowDeviation] = useState(true)
  const [showIncidents, setShowIncidents] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const orderedStops = useMemo(() => [...stops].sort((a, b) => a.stop_order - b.stop_order), [stops])
  const gpsEvents = useMemo(() => events
    .filter(event => event.latitude != null && event.longitude != null)
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()), [events])

  useEffect(() => {
    if (!host.current || mapRef.current) return
    const map = L.map(host.current, {
      zoomControl: false,
      preferCanvas: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      minZoom: 6,
    }).setView(DR_CENTER, 8)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map)
    mapRef.current = map
    layersRef.current = L.layerGroup().addTo(map)
    const frame = window.requestAnimationFrame(() => map.invalidateSize({ animate: false }))
    return () => {
      window.cancelAnimationFrame(frame)
      map.remove()
      mapRef.current = null
      tileRef.current = null
      layersRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (tileRef.current) map.removeLayer(tileRef.current)
    const definition = tileDefinition(baseMap)
    tileRef.current = L.tileLayer(definition.url, {
      maxZoom: definition.maxZoom,
      maxNativeZoom: definition.maxZoom === 20 ? 19 : definition.maxZoom,
      attribution: definition.attribution,
      updateWhenIdle: true,
      keepBuffer: 2,
    }).addTo(map)
  }, [baseMap])

  useEffect(() => {
    const map = mapRef.current
    const layer = layersRef.current
    if (!map || !layer) return
    layer.clearLayers()
    const fitPoints: [number, number][] = []

    const plannedPoints = orderedStops
      .filter(stop => stop.planned_latitude != null && stop.planned_longitude != null)
      .map(stop => [stop.planned_latitude!, stop.planned_longitude!] as [number, number])

    if (showPlanned && plannedPoints.length > 1) {
      L.polyline(plannedPoints, { color: '#64748b', weight: 3, opacity: .68, dashArray: '8 8' })
        .bindTooltip('Secuencia planificada · unión visual entre destinos, no ruta vial calculada')
        .addTo(layer)
    }

    if (showGps && gpsEvents.length > 1) {
      const gpsPoints = gpsEvents.map(event => [event.latitude!, event.longitude!] as [number, number])
      L.polyline(gpsPoints, { color: '#2563eb', weight: 5, opacity: .86, lineCap: 'round', lineJoin: 'round' })
        .bindTooltip('Trayectoria estimada entre eventos GPS registrados')
        .addTo(layer)
    }

    orderedStops.forEach(stop => {
      if (stop.planned_latitude == null || stop.planned_longitude == null) return
      const planned: [number, number] = [stop.planned_latitude, stop.planned_longitude]
      fitPoints.push(planned)
      const selected = stop.id === selectedStopId
      const icon = L.divIcon({
        className: 'journey-stop-marker-wrap',
        html: `<div class="journey-stop-marker ${statusClass(stop.status)} ${selected ? 'selected' : ''}"><span>${String(stop.stop_order).padStart(2, '0')}</span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      })
      const marker = L.marker(planned, { icon, keyboard: true }).addTo(layer)
      marker.bindPopup(`<div class="journey-map-popup"><span class="journey-map-popup-kicker">PARADA ${String(stop.stop_order).padStart(2, '0')}</span><b>${escapeHtml(stop.destination_name_snapshot)}</b><small>${escapeHtml(stop.status.replace(/_/g, ' '))}</small><small>${Number(stop.packages_delivered || 0)} / ${Number(stop.packages_loaded || 0)} bultos entregados</small></div>`)
      marker.on('click', () => onSelectStop?.(stop.id))

      if (showDeviation && stop.actual_delivery_latitude != null && stop.actual_delivery_longitude != null) {
        const actual: [number, number] = [stop.actual_delivery_latitude, stop.actual_delivery_longitude]
        fitPoints.push(actual)
        L.polyline([planned, actual], { color: '#f59e0b', weight: 2, opacity: .72, dashArray: '4 5' })
          .bindTooltip('Diferencia entre ubicación esperada y ubicación registrada')
          .addTo(layer)
        L.circleMarker(actual, { radius: 7, color: '#ffffff', weight: 3, fillColor: '#f59e0b', fillOpacity: .95 })
          .bindPopup(`<div class="journey-map-popup"><span class="journey-map-popup-kicker">GPS DE ENTREGA</span><b>${escapeHtml(stop.destination_name_snapshot)}</b><small>Ubicación capturada durante la operación</small></div>`)
          .addTo(layer)
      }
    })

    if (showGps) gpsEvents.forEach((event, index) => {
      const point: [number, number] = [event.latitude!, event.longitude!]
      fitPoints.push(point)
      const radius = event.event_type === 'DEPARTED_ORIGIN' || event.event_type === 'RETURNED_ORIGIN' || event.event_type === 'TRIP_COMPLETED' ? 6 : 4
      L.circleMarker(point, { radius, color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: .92 })
        .bindPopup(`<div class="journey-map-popup"><span class="journey-map-popup-kicker">GPS ${String(index + 1).padStart(2, '0')}</span><b>${escapeHtml(eventLabel(event.event_type))}</b><small>${new Date(event.occurred_at).toLocaleString('es-DO')}</small><small>Precisión: ${event.accuracy_m != null ? `${Math.round(event.accuracy_m)} m` : 'no disponible'}</small></div>`)
        .addTo(layer)
    })

    if (showIncidents) incidents.forEach(incident => {
      if (incident.latitude == null || incident.longitude == null) return
      const point: [number, number] = [incident.latitude, incident.longitude]
      fitPoints.push(point)
      const icon = L.divIcon({
        className: 'journey-incident-marker-wrap',
        html: '<div class="journey-incident-marker">!</div>',
        iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18],
      })
      L.marker(point, { icon })
        .bindPopup(`<div class="journey-map-popup"><span class="journey-map-popup-kicker">INCIDENCIA</span><b>${escapeHtml(incident.incident_type.replace(/_/g, ' '))}</b><small>${escapeHtml(incident.description || 'Sin descripción')}</small><small>${new Date(incident.reported_at).toLocaleString('es-DO')}</small></div>`)
        .addTo(layer)
    })

    if (trip.origin_latitude != null && trip.origin_longitude != null) {
      const origin: [number, number] = [trip.origin_latitude, trip.origin_longitude]
      fitPoints.push(origin)
      const icon = L.divIcon({ className: 'journey-origin-marker-wrap', html: '<div class="journey-origin-marker">S</div>', iconSize: [36, 36], iconAnchor: [18, 18] })
      L.marker(origin, { icon }).bindTooltip(escapeHtml(trip.origin_name || 'Centro de carga')).addTo(layer)
    }

    if (fitPoints.length) {
      const bounds = L.latLngBounds(fitPoints)
      if (bounds.isValid()) map.fitBounds(bounds.pad(.12), { animate: false, maxZoom: 16 })
    } else map.setView(DR_CENTER, 8, { animate: false })
    window.setTimeout(() => map.invalidateSize({ animate: false }), 0)
  }, [trip, orderedStops, gpsEvents, incidents, selectedStopId, showPlanned, showGps, showDeviation, showIncidents, onSelectStop])

  useEffect(() => {
    const map = mapRef.current
    const stop = orderedStops.find(item => item.id === selectedStopId)
    if (!map || !stop || stop.planned_latitude == null || stop.planned_longitude == null) return
    map.flyTo([stop.planned_latitude, stop.planned_longitude], Math.max(map.getZoom(), 15), { duration: .45 })
  }, [selectedStopId, orderedStops])

  useEffect(() => {
    const id = window.setTimeout(() => mapRef.current?.invalidateSize({ animate: false }), 80)
    document.body.classList.toggle('journey-map-expanded-open', expanded)
    return () => {
      window.clearTimeout(id)
      document.body.classList.remove('journey-map-expanded-open')
    }
  }, [expanded])

  const fitAll = () => {
    const points: [number, number][] = []
    orderedStops.forEach(stop => {
      if (stop.planned_latitude != null && stop.planned_longitude != null) points.push([stop.planned_latitude, stop.planned_longitude])
    })
    gpsEvents.forEach(event => points.push([event.latitude!, event.longitude!]))
    if (points.length) mapRef.current?.fitBounds(L.latLngBounds(points).pad(.12), { maxZoom: 16 })
  }

  return <section className={`journey-map-shell ${expanded ? 'expanded' : ''}`}>
    <div className="journey-map-toolbar">
      <div className="journey-map-title"><div className="journey-map-title-icon"><Route size={18}/></div><div><b>Recorrido operativo</b><span>Trayectoria estimada entre eventos GPS · no tracking continuo</span></div></div>
      <div className="journey-map-actions">
        <button className="secondary compact" onClick={fitAll}><Crosshair size={14}/>Encajar</button>
        <button className="secondary compact" onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize2 size={14}/> : <Maximize2 size={14}/>} {expanded ? 'Restaurar' : 'Mapa grande'}</button>
      </div>
    </div>
    <div className="journey-map-control-row">
      <div className="journey-layer-group">
        <span>Capas</span>
        <button className={showPlanned ? 'active' : ''} onClick={() => setShowPlanned(value => !value)}><Layers3 size={13}/>Planificada</button>
        <button className={showGps ? 'active blue' : ''} onClick={() => setShowGps(value => !value)}><Route size={13}/>GPS</button>
        <button className={showDeviation ? 'active amber' : ''} onClick={() => setShowDeviation(value => !value)}>Desviación</button>
        <button className={showIncidents ? 'active red' : ''} onClick={() => setShowIncidents(value => !value)}>Incidencias</button>
      </div>
      <div className="journey-basemap-switch" aria-label="Mapa base">
        <button className={baseMap === 'LIGHT' ? 'active' : ''} onClick={() => setBaseMap('LIGHT')}><Map size={13}/>Claro</button>
        <button className={baseMap === 'STREETS' ? 'active' : ''} onClick={() => setBaseMap('STREETS')}><Layers3 size={13}/>Calles</button>
        <button className={baseMap === 'SATELLITE' ? 'active' : ''} onClick={() => setBaseMap('SATELLITE')}><Satellite size={13}/>Satélite</button>
      </div>
    </div>
    <div ref={host} className="journey-map-canvas"/>
    <div className="journey-map-legend">
      <span><i className="line planned"/>Secuencia planificada</span>
      <span><i className="line gps"/>Trayectoria GPS estimada</span>
      <span><i className="dot stop"/>Destino</span>
      <span><i className="dot actual"/>GPS entrega</span>
      <span><i className="dot incident"/>Incidencia</span>
    </div>
  </section>
}
