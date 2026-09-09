import L from 'leaflet'
import type { DeliveryStop, DeliveryTrip } from './logistics'

export type LogisticsBaseMap = 'STANDARD' | 'SATELLITE'

export const LOGISTICS_DR_CENTER: [number, number] = [18.7357, -70.1627]
export const LOGISTICS_DR_CONTEXT_BOUNDS = L.latLngBounds([16.85, -72.85], [20.55, -67.45])

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const OFFICIAL_BOUNDARY_WMS = 'https://geoportal.iderd.gob.do/geoserver/gwc/service/wms'

export function createLogisticsMap(host: HTMLElement, options?: { initialZoom?: number; minZoom?: number; withScale?: boolean }) {
  const map = L.map(host, {
    zoomControl: false,
    preferCanvas: true,
    minZoom: options?.minZoom ?? 7,
    maxBounds: LOGISTICS_DR_CONTEXT_BOUNDS,
    maxBoundsViscosity: 0.65,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
  }).setView(LOGISTICS_DR_CENTER, options?.initialZoom ?? 8.5)

  L.control.zoom({ position: 'bottomright' }).addTo(map)
  if (options?.withScale) L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map)
  return map
}

export function createLogisticsBaseLayer(kind: LogisticsBaseMap = 'STANDARD') {
  if (kind === 'SATELLITE') {
    return L.tileLayer(ESRI_SATELLITE, {
      maxZoom: 19,
      maxNativeZoom: 19,
      updateWhenIdle: true,
      keepBuffer: 2,
      detectRetina: false,
      attribution: 'Tiles © Esri',
    })
  }

  return L.tileLayer(OSM_TILES, {
    maxZoom: 20,
    maxNativeZoom: 19,
    updateWhenIdle: true,
    keepBuffer: 2,
    detectRetina: false,
    attribution: '© OpenStreetMap contributors',
  })
}

export function replaceLogisticsBaseLayer(map: L.Map, current: L.TileLayer | null, kind: LogisticsBaseMap) {
  if (current && map.hasLayer(current)) map.removeLayer(current)
  const next = createLogisticsBaseLayer(kind)
  next.addTo(map)
  return next
}

export function fitLogisticsPoints(
  map: L.Map,
  points: L.LatLngExpression[],
  options?: { pad?: number; maxZoom?: number; animate?: boolean; fallbackZoom?: number },
) {
  if (!points.length) {
    map.setView(LOGISTICS_DR_CENTER, options?.fallbackZoom ?? 8.5, { animate: options?.animate ?? false })
    return null
  }
  const bounds = L.latLngBounds(points)
  if (!bounds.isValid()) return null
  map.fitBounds(bounds.pad(options?.pad ?? 0.16), {
    animate: options?.animate ?? false,
    maxZoom: options?.maxZoom ?? 15,
  })
  return bounds
}

export function logisticsOperationalBounds(trips: DeliveryTrip[], stops: DeliveryStop[]) {
  const tripIds = new Set(trips.map((trip) => trip.id))
  const points = stops
    .filter((stop) => tripIds.has(stop.trip_id) && stop.planned_latitude != null && stop.planned_longitude != null)
    .map((stop) => [stop.planned_latitude!, stop.planned_longitude!] as [number, number])
  return points.length ? L.latLngBounds(points) : null
}

export function logisticsRouteColor(index: number) {
  const colors = ['#c71f2d', '#1f5fa8', '#17865c', '#8b5cf6', '#d97706', '#0891b2']
  return colors[index % colors.length]
}

export function escapeMapHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character))
}

export function normalizeMapGeoJson(value: unknown): any | null {
  if (!value) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  return typeof value === 'object' ? value : null
}

export function ensureOfficialBoundaryPane(map: L.Map) {
  if (!map.getPane('delivery-official-boundaries')) map.createPane('delivery-official-boundaries')
  const pane = map.getPane('delivery-official-boundaries')
  if (pane) {
    pane.style.zIndex = '240'
    pane.style.pointerEvents = 'none'
  }
}

export function createOfficialBoundaryLayer() {
  return L.tileLayer.wms(OFFICIAL_BOUNDARY_WMS, {
    layers: 'ign:Provincias',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    opacity: 0.30,
    pane: 'delivery-official-boundaries',
    attribution: 'Límites oficiales: IDERD / IGN-JJHM',
  })
}
