import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../styles/operational-v059.css'

type RouteStop = {
  id: string
  stop_order?: number | null
  status?: string | null
  clients?: {
    legal_name?: string | null
    codempr?: string | null
    latitude?: number | null
    longitude?: number | null
    municipality?: string | null
  } | null
}

type Props = {
  stops: RouteStop[]
  activeStopId?: string | null
  selectedStopId?: string | null
  onSelectStop?: (stopId: string) => void
  height?: number
}

function markerClass(status?: string | null, active = false) {
  if (active) return 'active'
  if (status === 'VISITADO') return 'done'
  if (status === 'NO_VISITADO') return 'skipped'
  if (status === 'EN_VISITA') return 'active'
  return 'pending'
}

export function RouteSequenceMap({ stops, activeStopId = null, selectedStopId = null, onSelectStop, height = 520 }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const validStops = useMemo(() => stops.filter((stop) => stop.clients?.latitude != null && stop.clients?.longitude != null), [stops])

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return
    const map = L.map(hostRef.current, { zoomControl: false, preferCanvas: true }).setView([18.7357, -70.1627], 8)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      maxNativeZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (!validStops.length) return

    const points: Array<[number, number]> = []
    validStops.forEach((stop) => {
      const lat = stop.clients!.latitude!
      const lng = stop.clients!.longitude!
      points.push([lat, lng])
      const active = stop.id === activeStopId
      const selected = stop.id === selectedStopId
      const cls = markerClass(stop.status, active)
      const icon = L.divIcon({
        className: 'route-sequence-marker-host',
        html: `<span class="route-sequence-marker ${cls}${selected ? ' selected' : ''}">${Number(stop.stop_order || 0)}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      })
      const marker = L.marker([lat, lng], { icon, zIndexOffset: active || selected ? 1000 : 0 })
      const tooltip = document.createElement('div')
      tooltip.className = 'route-sequence-tooltip'
      const title = document.createElement('b')
      title.textContent = `${stop.stop_order || '—'}. ${stop.clients?.legal_name || 'Parada'}`
      const detail = document.createElement('span')
      detail.textContent = `${stop.clients?.codempr || ''}${stop.clients?.municipality ? ` · ${stop.clients.municipality}` : ''}`
      const status = document.createElement('small')
      status.textContent = stop.status || 'PENDIENTE'
      tooltip.append(title, detail, status)
      marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -15] })
      marker.on('click', () => onSelectStop?.(stop.id))
      marker.addTo(layer)
    })

    if (points.length >= 2) {
      L.polyline(points, { color: '#c71f2d', weight: 4, opacity: 0.75, dashArray: '9 7' }).addTo(layer)
    }

    const bounds = L.latLngBounds(points)
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [34, 34], maxZoom: 14 })
  }, [validStops, activeStopId, selectedStopId, onSelectStop])

  useEffect(() => {
    const stop = validStops.find((item) => item.id === selectedStopId)
    if (stop?.clients?.latitude != null && stop.clients.longitude != null && mapRef.current) {
      mapRef.current.flyTo([stop.clients.latitude, stop.clients.longitude], Math.max(mapRef.current.getZoom(), 14), { duration: 0.5 })
    }
  }, [selectedStopId, validStops])

  return <div className="route-sequence-map" ref={hostRef} style={{ height }} />
}
