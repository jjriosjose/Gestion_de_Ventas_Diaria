import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CircleDot, Layers3, MapPinned, Pentagon, RotateCcw, Undo2, X } from 'lucide-react'
import type { Client } from '../types'
import type { GeoAssessment } from '../lib/geoQuality'
import { assessmentDetectedTerritory, geoQualityLabel, isGeoMismatch } from '../lib/geoQuality'
import { haversineKm, pointInPolygon } from '../lib/spatial'
import '../styles/territorial-v2.css'
import '../styles/map-views.css'

export type TerritorialArea =
  | { kind: 'POLYGON'; points: Array<[number, number]> }
  | { kind: 'RADIUS'; center: [number, number]; radiusKm: number }

export type MapZone = { id: string; name: string; territory_type?: string | null; geometry?: any }

type Props = {
  clients: Client[]
  geoAssessments?: Map<string, GeoAssessment>
  selectedIds?: string[]
  selectable?: boolean
  areaTools?: boolean
  zones?: MapZone[]
  showZones?: boolean
  focusPoint?: [number, number] | null
  height?: number
  onToggleClient?: (clientId: string) => void
  onAreaSelect?: (clientIds: string[], area: TerritorialArea) => void
}

type DrawMode = 'NONE' | 'POLYGON' | 'RADIUS'
type BasemapMode = 'STREETS' | 'LIGHT' | 'DARK' | 'CONTRAST'

const MAP_STYLE_KEY = 'karaka-map-style'
const basemapModes: BasemapMode[] = ['STREETS', 'LIGHT', 'DARK', 'CONTRAST']
const isGeocoded = (client: Client) => client.latitude != null && client.longitude != null
const EMPTY_GEO_ASSESSMENTS = new Map<string, GeoAssessment>()

const initialBasemap = (): BasemapMode => {
  if (typeof window === 'undefined') return 'STREETS'
  const saved = window.localStorage.getItem(MAP_STYLE_KEY) as BasemapMode | null
  return saved && basemapModes.includes(saved) ? saved : 'STREETS'
}

export function TerritoryClientMap({ clients, geoAssessments = EMPTY_GEO_ASSESSMENTS, selectedIds = [], selectable = false, areaTools = false, zones = [], showZones = true, focusPoint = null, height = 520, onToggleClient, onAreaSelect }: Props) {
  const host = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clientLayerRef = useRef<L.LayerGroup | null>(null)
  const zoneLayerRef = useRef<L.LayerGroup | null>(null)
  const draftLayerRef = useRef<L.LayerGroup | null>(null)
  const officialBoundaryLayerRef = useRef<L.TileLayer.WMS | null>(null)
  const [zoom, setZoom] = useState(8)
  const [mode, setMode] = useState<DrawMode>('NONE')
  const [basemap, setBasemap] = useState<BasemapMode>(initialBasemap)
  const [showOfficialBoundaries, setShowOfficialBoundaries] = useState(false)
  const [polygon, setPolygon] = useState<Array<[number, number]>>([])
  const [radiusCenter, setRadiusCenter] = useState<[number, number] | null>(null)
  const [radiusKm, setRadiusKm] = useState(5)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const geocoded = useMemo(() => clients.filter(isGeocoded), [clients])

  useEffect(() => {
    if (!areaTools) {
      setMode('NONE')
      setPolygon([])
      setRadiusCenter(null)
    }
  }, [areaTools])

  useEffect(() => {
    if (!host.current || mapRef.current) return
    const map = L.map(host.current, { zoomControl: false, preferCanvas: true }).setView([18.7357, -70.1627], 8)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      maxNativeZoom: 19,
      updateWhenIdle: true,
      keepBuffer: 2,
      detectRetina: false,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    map.createPane('official-boundaries')
    const officialPane = map.getPane('official-boundaries')
    if (officialPane) {
      officialPane.style.zIndex = '240'
      officialPane.style.pointerEvents = 'none'
    }
    mapRef.current = map
    clientLayerRef.current = L.layerGroup().addTo(map)
    zoneLayerRef.current = L.layerGroup().addTo(map)
    draftLayerRef.current = L.layerGroup().addTo(map)
    const syncZoom = () => setZoom(map.getZoom())
    map.on('zoomend', syncZoom)
    return () => {
      map.off('zoomend', syncZoom)
      map.remove()
      mapRef.current = null
      officialBoundaryLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(MAP_STYLE_KEY, basemap)
  }, [basemap])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (officialBoundaryLayerRef.current) {
      map.removeLayer(officialBoundaryLayerRef.current)
      officialBoundaryLayerRef.current = null
    }
    if (!showOfficialBoundaries) return

    const layer = L.tileLayer.wms('https://geoportal.iderd.gob.do/geoserver/gwc/service/wms', {
      layers: 'ign:Provincias',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      opacity: 0.9,
      pane: 'official-boundaries',
      attribution: 'Límites oficiales: IDERD / IGN-JJHM',
    })
    layer.addTo(map)
    officialBoundaryLayerRef.current = layer
    return () => {
      if (map.hasLayer(layer)) map.removeLayer(layer)
      if (officialBoundaryLayerRef.current === layer) officialBoundaryLayerRef.current = null
    }
  }, [showOfficialBoundaries])

  useEffect(() => {
    const map = mapRef.current
    if (!map || geocoded.length === 0) return
    const bounds = L.latLngBounds(geocoded.map((client) => [client.latitude!, client.longitude!] as [number, number]))
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 })
  }, [geocoded])

  useEffect(() => { if (focusPoint && mapRef.current) mapRef.current.flyTo(focusPoint, 15) }, [focusPoint])

  useEffect(() => {
    const map = mapRef.current
    const layer = clientLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    const createIndividual = (client: Client) => {
      const selected = selectedSet.has(client.id)
      const assessment = geoAssessments.get(client.id)
      const status = assessment?.assessment_status
      const mismatch = isGeoMismatch(status)
      const outsideDivision = status === 'FUERA_DIVISION'
      const fillColor = selected ? '#17865c' : mismatch ? '#d97706' : outsideDivision ? '#7c3aed' : '#c71f2d'
      const marker = L.circleMarker([client.latitude!, client.longitude!], { radius: selected ? 8 : 6, weight: selected ? 3 : 2, color: '#ffffff', fillColor, fillOpacity: 0.92 })
      const navigation = `https://www.google.com/maps/dir/?api=1&destination=${client.latitude},${client.longitude}&travelmode=driving&dir_action=navigate`
      const masterTerritory = [client.region, client.province, client.municipality].filter(Boolean).join(' · ') || 'Sin territorio maestro'
      const detectedTerritory = assessmentDetectedTerritory(assessment)
      const quality = geoQualityLabel(status)
      const qualityFlag = mismatch ? '<strong>⚠ Maestro ≠ coordenada</strong>' : outsideDivision ? '<strong>⚠ Fuera de división</strong>' : ''

      marker.bindTooltip(`<div class="territorial-tooltip"><b>${escapeHtml(client.legal_name)}</b><span>${escapeHtml(client.codempr)}</span><span>${escapeHtml(client.municipality || client.province || 'Sin localidad')}</span>${qualityFlag}${selected ? '<strong>✓ Seleccionado</strong>' : selectable ? '<strong>Pulse para seleccionar</strong>' : ''}</div>`, { direction: 'top', offset: [0, -6], opacity: 0.96 })
      marker.bindPopup(`<div class="map-popup"><b>${escapeHtml(client.legal_name)}</b><small>${escapeHtml(client.codempr)}</small><span><b>Maestro:</b> ${escapeHtml(masterTerritory)}</span><span><b>Coordenada:</b> ${escapeHtml(detectedTerritory)}</span><span><b>Calidad:</b> ${escapeHtml(quality)}</span><span>V: ${escapeHtml(client.v_cartera || '—')}</span><span>G: ${escapeHtml(client.g_cartera || '—')}</span><a target="_blank" rel="noreferrer" href="${navigation}">Navegar con Google Maps</a></div>`)
      if (selectable && mode === 'NONE') marker.on('click', () => onToggleClient?.(client.id))
      marker.addTo(layer)
    }

    if (geocoded.length > 90 && zoom <= 12) {
      const cellPx = zoom <= 8 ? 95 : zoom <= 10 ? 78 : 62
      const buckets = new Map<string, Client[]>()
      geocoded.forEach((client) => {
        const projected = map.project([client.latitude!, client.longitude!], zoom)
        const key = `${Math.floor(projected.x / cellPx)}:${Math.floor(projected.y / cellPx)}`
        const list = buckets.get(key) || []
        list.push(client)
        buckets.set(key, list)
      })
      buckets.forEach((bucket) => {
        if (bucket.length === 1) return createIndividual(bucket[0])
        const latitude = bucket.reduce((sum, client) => sum + client.latitude!, 0) / bucket.length
        const longitude = bucket.reduce((sum, client) => sum + client.longitude!, 0) / bucket.length
        const selectedCount = bucket.filter((client) => selectedSet.has(client.id)).length
        const mismatchCount = bucket.filter((client) => isGeoMismatch(geoAssessments.get(client.id)?.assessment_status)).length
        const clusterFill = selectedCount ? '#17865c' : mismatchCount ? '#d97706' : '#c71f2d'
        const cluster = L.circleMarker([latitude, longitude], { radius: Math.min(24, 11 + Math.log2(bucket.length) * 2.4), weight: 3, color: '#ffffff', fillColor: clusterFill, fillOpacity: 0.94 })
        cluster.bindTooltip(`<div class="territorial-tooltip cluster"><b>${bucket.length} clientes</b>${selectedCount ? `<span>${selectedCount} seleccionados</span>` : '<span>Pulse para acercar</span>'}${mismatchCount ? `<strong>⚠ ${mismatchCount} con diferencia territorial</strong>` : ''}</div>`, { direction: 'top', opacity: 0.96 })
        cluster.on('click', () => map.flyTo([latitude, longitude], Math.min(18, zoom + 2)))
        cluster.addTo(layer)
        L.marker([latitude, longitude], { interactive: false, icon: L.divIcon({ className: 'cluster-count-marker', html: `<span>${bucket.length}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] }) }).addTo(layer)
      })
    } else geocoded.forEach(createIndividual)
  }, [geocoded, geoAssessments, mode, onToggleClient, selectable, selectedSet, zoom])

  useEffect(() => {
    const layer = zoneLayerRef.current
    if (!layer) return
    layer.clearLayers()
    if (!showZones) return
    zones.forEach((zone) => {
      if (!zone.geometry) return
      try {
        const feature = L.geoJSON(zone.geometry as any, { style: { color: '#7c3aed', weight: 2, fillColor: '#7c3aed', fillOpacity: 0.08, dashArray: '6 5' } })
        feature.bindTooltip(`<b>${escapeHtml(zone.name)}</b><br><span>${escapeHtml(zone.territory_type || 'Zona')}</span>`)
        feature.addTo(layer)
      } catch { /* Una geometría inválida no impide cargar el mapa. */ }
    })
  }, [showZones, zones])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const click = (event: L.LeafletMouseEvent) => {
      if (mode === 'POLYGON') setPolygon((points) => [...points, [event.latlng.lat, event.latlng.lng]])
      if (mode === 'RADIUS') setRadiusCenter([event.latlng.lat, event.latlng.lng])
    }
    map.on('click', click)
    return () => { map.off('click', click) }
  }, [mode])

  useEffect(() => {
    const layer = draftLayerRef.current
    if (!layer) return
    layer.clearLayers()
    if (mode === 'POLYGON' && polygon.length) {
      polygon.forEach((point) => L.circleMarker(point, { radius: 4, color: '#c71f2d', fillOpacity: 1 }).addTo(layer))
      if (polygon.length >= 2) L.polyline(polygon, { color: '#c71f2d', weight: 3 }).addTo(layer)
      if (polygon.length >= 3) L.polygon(polygon, { color: '#c71f2d', weight: 3, fillColor: '#c71f2d', fillOpacity: 0.1 }).addTo(layer)
    }
    if (mode === 'RADIUS' && radiusCenter) {
      const circle = L.circle(radiusCenter, { radius: radiusKm * 1000, color: '#c71f2d', weight: 3, fillColor: '#c71f2d', fillOpacity: 0.1 }).addTo(layer)
      const centerIcon = L.divIcon({ className: 'radius-center-handle', html: '<span title="Arrastra para mover el radio"></span>', iconSize: [28, 28], iconAnchor: [14, 14] })
      const resizeIcon = L.divIcon({ className: 'radius-resize-handle', html: '<span title="Arrastra para ampliar o reducir"></span>', iconSize: [24, 24], iconAnchor: [12, 12] })
      const centerMarker = L.marker(radiusCenter, { draggable: true, icon: centerIcon, zIndexOffset: 1000 }).addTo(layer)
      const resizeMarker = L.marker(radiusHandlePoint(radiusCenter, radiusKm), { draggable: true, icon: resizeIcon, zIndexOffset: 1000 }).addTo(layer)

      centerMarker.on('drag', (event: L.LeafletEvent) => {
        const pos = (event.target as L.Marker).getLatLng()
        const nextCenter: [number, number] = [pos.lat, pos.lng]
        circle.setLatLng(nextCenter)
        resizeMarker.setLatLng(radiusHandlePoint(nextCenter, radiusKm))
      })
      centerMarker.on('dragend', (event: L.LeafletEvent) => {
        const pos = (event.target as L.Marker).getLatLng()
        setRadiusCenter([pos.lat, pos.lng])
      })
      resizeMarker.on('drag', (event: L.LeafletEvent) => {
        const pos = (event.target as L.Marker).getLatLng()
        const km = Math.max(0.5, Math.min(50, haversineKm({ latitude: radiusCenter[0], longitude: radiusCenter[1] }, { latitude: pos.lat, longitude: pos.lng })))
        circle.setRadius(km * 1000)
      })
      resizeMarker.on('dragend', (event: L.LeafletEvent) => {
        const pos = (event.target as L.Marker).getLatLng()
        const km = Math.max(0.5, Math.min(50, haversineKm({ latitude: radiusCenter[0], longitude: radiusCenter[1] }, { latitude: pos.lat, longitude: pos.lng })))
        setRadiusKm(Math.round(km * 10) / 10)
      })
    }
  }, [mode, polygon, radiusCenter, radiusKm])

  const clearDraft = () => { setPolygon([]); setRadiusCenter(null) }
  const stopDrawing = () => { clearDraft(); setMode('NONE') }
  const applyPolygon = () => { if (polygon.length < 3) return; const ids = geocoded.filter((client) => pointInPolygon(client.latitude!, client.longitude!, polygon)).map((client) => client.id); onAreaSelect?.(ids, { kind: 'POLYGON', points: polygon }) }
  const applyRadius = () => { if (!radiusCenter) return; const center = { latitude: radiusCenter[0], longitude: radiusCenter[1] }; const ids = geocoded.filter((client) => haversineKm(center, client) <= radiusKm).map((client) => client.id); onAreaSelect?.(ids, { kind: 'RADIUS', center: radiusCenter, radiusKm }) }
  const updateRadius = (value: number) => setRadiusKm(Math.max(0.5, Math.min(50, Number.isFinite(value) ? value : 5)))

  return <div className="territorial-map-shell" style={{ minHeight: height }}>
    <div ref={host} className={`territorial-map basemap-${basemap.toLowerCase()}`} style={{ minHeight: height }} />
    <div className="territorial-map-view-control">
      <label className="map-view-select"><Layers3 size={15}/><span>Vista</span><select value={basemap} onChange={(event) => setBasemap(event.target.value as BasemapMode)} aria-label="Vista del mapa"><option value="STREETS">Calles</option><option value="LIGHT">Claro</option><option value="DARK">Oscuro</option><option value="CONTRAST">Alto contraste</option></select></label>
      <label className="official-boundary-toggle" title="Mostrar límites provinciales oficiales publicados por IDERD / IGN-JJHM"><input type="checkbox" checked={showOfficialBoundaries} onChange={(event) => setShowOfficialBoundaries(event.target.checked)}/><MapPinned size={14}/><span>Límites</span></label>
    </div>
    <div className="territorial-map-summary"><b>{geocoded.length.toLocaleString()} en mapa</b><span>{selectedIds.length.toLocaleString()} seleccionados</span></div>
    {areaTools && <div className="territorial-map-tools"><button className={mode === 'POLYGON' ? 'active' : ''} onClick={() => { setMode(mode === 'POLYGON' ? 'NONE' : 'POLYGON'); clearDraft() }} title="Seleccionar por polígono"><Pentagon size={16} /> Polígono</button><button className={mode === 'RADIUS' ? 'active' : ''} onClick={() => { setMode(mode === 'RADIUS' ? 'NONE' : 'RADIUS'); clearDraft() }} title="Seleccionar por radio"><CircleDot size={16} /> Radio</button>{mode === 'POLYGON' && <><span className="tool-hint">{polygon.length < 3 ? 'Marca al menos 3 puntos' : `${polygon.length} puntos`}</span><button disabled={!polygon.length} onClick={() => setPolygon((points) => points.slice(0, -1))}><Undo2 size={15} /></button><button disabled={polygon.length < 3} className="apply" onClick={applyPolygon}>Seleccionar área</button><button onClick={stopDrawing}><X size={15} /></button></>}{mode === 'RADIUS' && <><label className="radius-size-control"><input type="number" min="0.5" max="50" step="0.5" value={radiusKm} onChange={(event) => updateRadius(Number(event.target.value))}/><span>km</span></label><input className="radius-range" type="range" min="0.5" max="30" step="0.5" value={Math.min(30, radiusKm)} onChange={(event) => updateRadius(Number(event.target.value))}/><span className="tool-hint">{radiusCenter ? 'Arrastra el centro o el borde' : 'Pulsa el centro en el mapa'}</span><button disabled={!radiusCenter} className="apply" onClick={applyRadius}>Seleccionar radio</button><button onClick={stopDrawing}><X size={15} /></button></>}{mode === 'NONE' && <button onClick={clearDraft} title="Limpiar herramienta"><RotateCcw size={15} /></button>}</div>}
  </div>
}

function radiusHandlePoint(center: [number, number], radiusKm: number): [number, number] {
  const latitude = center[0]
  const longitude = center[1]
  const cos = Math.max(0.1, Math.cos(latitude * Math.PI / 180))
  return [latitude, longitude + radiusKm / (111.32 * cos)]
}

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character)) }
