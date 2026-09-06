import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { DeliveryStop, DeliveryTrip } from '../lib/logistics'

type Props = {
  trips: DeliveryTrip[]
  stops: DeliveryStop[]
  selectedTripId?: string | null
  height?: number
}

const DR_CENTER: [number, number] = [18.7357, -70.1627]

function routeColor(index: number) {
  const colors = ['#c71f2d', '#1f5fa8', '#17865c', '#8b5cf6', '#d97706', '#0891b2']
  return colors[index % colors.length]
}

export function DeliveryControlMap({ trips, stops, selectedTripId = null, height = 470 }: Props) {
  const host = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const visibleTrips = useMemo(() => selectedTripId ? trips.filter(trip => trip.id === selectedTripId) : trips, [trips, selectedTripId])

  useEffect(() => {
    if (!host.current || mapRef.current) return
    const map = L.map(host.current, { zoomControl: false, preferCanvas: true }).setView(DR_CENTER, 8)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      maxNativeZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    const frame = window.requestAnimationFrame(() => map.invalidateSize({ animate: false }))
    return () => {
      window.cancelAnimationFrame(frame)
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
    const bounds: L.LatLngExpression[] = []
    visibleTrips.forEach((trip, tripIndex) => {
      const tripStops = stops
        .filter(stop => stop.trip_id === trip.id && stop.planned_latitude != null && stop.planned_longitude != null)
        .sort((a, b) => a.stop_order - b.stop_order)
      const points = tripStops.map(stop => [stop.planned_latitude!, stop.planned_longitude!] as [number, number])
      if (points.length > 1) L.polyline(points, { color: routeColor(tripIndex), weight: 3, opacity: .65, dashArray: trip.status === 'COMPLETED' ? undefined : '8 7' }).addTo(layer)
      tripStops.forEach(stop => {
        const point: [number, number] = [stop.planned_latitude!, stop.planned_longitude!]
        bounds.push(point)
        const statusClass = stop.status === 'DELIVERED' ? 'done' : stop.geo_status === 'PENDING' ? 'pending' : stop.status === 'AT_CLIENT' || stop.status === 'UNLOADING' ? 'active' : ''
        const icon = L.divIcon({
          className: 'delivery-map-marker-wrap',
          html: `<div class="delivery-map-marker ${statusClass}" style="--delivery-marker:${routeColor(tripIndex)}"><b>${String(stop.stop_order).padStart(2, '0')}</b></div>`,
          iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18],
        })
        const marker = L.marker(point, { icon }).addTo(layer)
        marker.bindPopup(`<div class="map-popup"><b>${stop.destination_name_snapshot}</b><span>${trip.trip_code}</span><small>Parada ${stop.stop_order} · ${stop.status}</small><small>${stop.packages_loaded || 0} bultos</small></div>`)
      })
    })
    if (bounds.length) {
      const latLngBounds = L.latLngBounds(bounds)
      map.fitBounds(latLngBounds.pad(.16), { animate: false, maxZoom: 15 })
    } else map.setView(DR_CENTER, 8, { animate: false })
    window.setTimeout(() => map.invalidateSize({ animate: false }), 0)
  }, [visibleTrips, stops])

  return <div className="delivery-map-shell" style={{ height }} ref={host}/>
}
