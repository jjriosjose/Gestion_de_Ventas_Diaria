import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CircleDot, Pentagon, RotateCcw, Undo2, X } from 'lucide-react'
import type { Client } from '../types'
import { haversineKm, pointInPolygon } from '../lib/spatial'
import '../styles/territorial-v2.css'

export type TerritorialArea =
  | { kind: 'POLYGON'; points: Array<[number, number]> }
  | { kind: 'RADIUS'; center: [number, number]; radiusKm: number }

export type MapZone = { id: string; name: string; territory_type?: string | null; geometry?: any }

type Props = {
  clients: Client[]
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
const isGeocoded = (client: Client) => client.latitude != null && client.longitude != null

export function TerritoryClientMap({ clients, selectedIds = [], selectable = false, areaTools = false, zones = [], showZones = true, focusPoint = null, height = 520, onToggleClient, onAreaSelect }: Props) {
  const host = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clientLayerRef = useRef<L.LayerGroup | null>(null)
  const zoneLayerRef = useRef<L.LayerGroup | null>(null)
  const draftLayerRef = useRef<L.LayerGroup | null>(null)
  const [zoom, setZoom] = useState(8)
  const [mode, setMode] = useState<DrawMode>('NONE')
  const [polygon, setPolygon] = useState<Array<[number, number]>>([])
  const [radiusCenter, setRadiusCenter] = useState<[number, number] | null>(null)
  const [radiusKm, setRadiusKm] = useState(5)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const geocoded = useMemo(() => clients.filter(isGeocoded), [clients])

  useEffect(() => {
    if (!host.current || mapRef.current) return
    const map = L.map(host.current, { zoomControl: false }).setView([18.7357, -70.1627], 8)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '© OpenStreetMap' }).addTo(map)
    mapRef.current = map
    clientLayerRef.current = L.layerGroup().addTo(map)
    zoneLayerRef.current = L.layerGroup().addTo(map)
    draftLayerRef.current = L.layerGroup().addTo(map)
    const syncZoom = () => setZoom(map.getZoom())
    map.on('zoomend', syncZoom)
    return () => { map.off('zoomend', syncZoom); map.remove(); mapRef.current = null }
  }, [])

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
      const marker = L.circleMarker([client.latitude!, client.longitude!], { radius: selected ? 8 : 6, weight: selected ? 3 : 2, color: '#ffffff', fillColor: selected ? '#17865c' : '#c71f2d', fillOpacity: 0.92 })
      const navigation = `https://www.google.com/maps/dir/?api=1&destination=${client.latitude},${client.longitude}&travelmode=driving&dir_action=navigate`
      marker.bindTooltip(`<div class="territorial-tooltip"><b>${escapeHtml(client.legal_name)}</b><span>${escapeHtml(client.codempr)}</span><span>${escapeHtml(client.municipality || client.province || 'Sin localidad')}</span>${selected ? '<strong>✓ Seleccionado</strong>' : selectable ? '<strong>Pulse para seleccionar</strong>' : ''}</div>`, { direction: 'top', offset: [0, -6], opacity: 0.96 })
      marker.bindPopup(`<div class="map-popup"><b>${escapeHtml(client.legal_name)}</b><small>${escapeHtml(client.codempr)}</small><span>V: ${escapeHtml(client.v_cartera || '—')}</span><span>G: ${escapeHtml(client.g_cartera || '—')}</span><a target="_blank" rel="noreferrer" href="${navigation}">Navegar con Google Maps</a></div>`)
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
        const cluster = L.circleMarker([latitude, longitude], { radius: Math.min(24, 11 + Math.log2(bucket.length) * 2.4), weight: 3, color: '#ffffff', fillColor: selectedCount ? '#17865c' : '#c71f2d', fillOpacity: 0.94 })
        cluster.bindTooltip(`<div class="territorial-tooltip cluster"><b>${bucket.length} clientes</b>${selectedCount ? `<span>${selectedCount} seleccionados</span>` : '<span>Pulse para acercar</span>'}</div>`, { direction: 'top', opacity: 0.96 })
        cluster.on('click', () => map.flyTo([latitude, longitude], Math.min(18, zoom + 2)))
        cluster.addTo(layer)
        L.marker([latitude, longitude], { interactive: false, icon: L.divIcon({ className: 'cluster-count-marker', html: `<span>${bucket.length}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] }) }).addTo(layer)
      })
    } else geocoded.forEach(createIndividual)
  }, [geocoded, mode, onToggleClient, selectable, selectedSet, zoom])

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
    const click = (event: L.LeafletMouseEvent) => { if (mode === 'POLYGON') setPolygon((points) => [...points, [event.latlng.lat, event.latlng.lng]]); if (mode === 'RADIUS') setRadiusCenter([event.latlng.lat, event.latlng.lng]) }
    map.on('click', click)
    return () => map.off('click', click)
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
      L.circle(radiusCenter, { radius: radiusKm * 1000, color: '#c71f2d', weight: 3, fillColor: '#c71f2d', fillOpacity: 0.1 }).addTo(layer)
      L.circleMarker(radiusCenter, { radius: 5, color: '#c71f2d', fillOpacity: 1 }).addTo(layer)
    }
  }, [mode, polygon, radiusCenter, radiusKm])

  const clearDraft = () => { setPolygon([]); setRadiusCenter(null) }
  const stopDrawing = () => { clearDraft(); setMode('NONE') }
  const applyPolygon = () => { if (polygon.length < 3) return; const ids = geocoded.filter((client) => pointInPolygon(client.latitude!, client.longitude!, polygon)).map((client) => client.id); onAreaSelect?.(ids, { kind: 'POLYGON', points: polygon }) }
  const applyRadius = () => { if (!radiusCenter) return; const center = { latitude: radiusCenter[0], longitude: radiusCenter[1] }; const ids = geocoded.filter((client) => haversineKm(center, client) <= radiusKm).map((client) => client.id); onAreaSelect?.(ids, { kind: 'RADIUS', center: radiusCenter, radiusKm }) }

  return <div className="territorial-map-shell" style={{ minHeight: height }}><div ref={host} className="territorial-map" style={{ minHeight: height }} /><div className="territorial-map-summary"><b>{geocoded.length.toLocaleString()} en mapa</b><span>{selectedIds.length.toLocaleString()} seleccionados</span></div>{areaTools && <div className="territorial-map-tools"><button className={mode === 'POLYGON' ? 'active' : ''} onClick={() => { setMode(mode === 'POLYGON' ? 'NONE' : 'POLYGON'); clearDraft() }} title="Seleccionar por polígono"><Pentagon size={16} /> Polígono</button><button className={mode === 'RADIUS' ? 'active' : ''} onClick={() => { setMode(mode === 'RADIUS' ? 'NONE' : 'RADIUS'); clearDraft() }} title="Seleccionar por radio"><CircleDot size={16} /> Radio</button>{mode === 'POLYGON' && <><span className="tool-hint">{polygon.length < 3 ? 'Marca al menos 3 puntos' : `${polygon.length} puntos`}</span><button disabled={!polygon.length} onClick={() => setPolygon((points) => points.slice(0, -1))}><Undo2 size={15} /></button><button disabled={polygon.length < 3} className="apply" onClick={applyPolygon}>Seleccionar área</button><button onClick={stopDrawing}><X size={15} /></button></>}{mode === 'RADIUS' && <><select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>{[2, 3, 5, 8, 10, 15, 20].map((km) => <option value={km} key={km}>{km} km</option>)}</select><span className="tool-hint">{radiusCenter ? 'Centro definido' : 'Pulsa el centro en el mapa'}</span><button disabled={!radiusCenter} className="apply" onClick={applyRadius}>Seleccionar radio</button><button onClick={stopDrawing}><X size={15} /></button></>}{mode === 'NONE' && <button onClick={clearDraft} title="Limpiar herramienta"><RotateCcw size={15} /></button>}</div>}</div>
}

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character)) }
