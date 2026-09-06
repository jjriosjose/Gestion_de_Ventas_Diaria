import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { Layers3, LoaderCircle, MapPinned, Maximize2, Minimize2, RotateCcw } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import type { DeliveryStop, DeliveryTrip } from '../lib/logistics'
import { OfficialTerritoryFilters } from './OfficialTerritoryFilters'
import {
  EMPTY_OFFICIAL_SELECTION,
  loadOfficialAreaDirectory,
  loadOfficialAreaGeometry,
  selectedOfficialAreaId,
  type OfficialArea,
  type OfficialSelection,
} from '../lib/officialTerritory'

type Props = {
  trips: DeliveryTrip[]
  stops: DeliveryStop[]
  selectedTripId?: string | null
  height?: number
}

type TerritoryViewMode = 'NATIONAL' | 'OFFICIAL'
type MapLayout = 'STANDARD' | 'EXPANDED' | 'CONTROL_TOWER'

const DR_CENTER: [number, number] = [18.7357, -70.1627]
const DR_CONTEXT_BOUNDS = L.latLngBounds([16.85, -72.85], [20.55, -67.45])
const MAP_LAYOUT_KEY = 'logistics.controlMapLayout'

function readMapLayout(): MapLayout {
  try {
    const value = window.localStorage.getItem(MAP_LAYOUT_KEY)
    return value === 'EXPANDED' || value === 'CONTROL_TOWER' ? value : 'STANDARD'
  } catch {
    return 'STANDARD'
  }
}

function routeColor(index: number) {
  const colors = ['#c71f2d', '#1f5fa8', '#17865c', '#8b5cf6', '#d97706', '#0891b2']
  return colors[index % colors.length]
}

function normalizeGeoJson(value: unknown): any | null {
  if (!value) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  return typeof value === 'object' ? value : null
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character))
}

function operationalBounds(trips: DeliveryTrip[], stops: DeliveryStop[]) {
  const tripIds = new Set(trips.map((trip) => trip.id))
  const points = stops
    .filter((stop) => tripIds.has(stop.trip_id) && stop.planned_latitude != null && stop.planned_longitude != null)
    .map((stop) => [stop.planned_latitude!, stop.planned_longitude!] as [number, number])
  return points.length ? L.latLngBounds(points) : null
}

export function DeliveryControlMap({ trips, stops, selectedTripId = null, height = 470 }: Props) {
  const host = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const officialAreaLayerRef = useRef<L.LayerGroup | null>(null)
  const officialBoundaryLayerRef = useRef<L.TileLayer.WMS | null>(null)
  const [territoryView, setTerritoryView] = useState<TerritoryViewMode>('NATIONAL')
  const [mapLayout, setMapLayout] = useState<MapLayout>(() => readMapLayout())
  const [officialAreas, setOfficialAreas] = useState<OfficialArea[]>([])
  const [officialSelection, setOfficialSelection] = useState<OfficialSelection>(EMPTY_OFFICIAL_SELECTION)
  const [officialArea, setOfficialArea] = useState<OfficialArea | null>(null)
  const [territoryLoading, setTerritoryLoading] = useState(false)
  const [territoryError, setTerritoryError] = useState('')
  const [showOfficialBoundaries, setShowOfficialBoundaries] = useState(false)
  const [boundaryLoading, setBoundaryLoading] = useState(false)
  const visibleTrips = useMemo(() => selectedTripId ? trips.filter(trip => trip.id === selectedTripId) : trips, [trips, selectedTripId])
  const selectedAreaId = selectedOfficialAreaId(officialSelection)
  const visibleTripIds = useMemo(() => new Set(visibleTrips.map((trip) => trip.id)), [visibleTrips])
  const visibleStops = useMemo(() => stops.filter((stop) => visibleTripIds.has(stop.trip_id)), [stops, visibleTripIds])
  const mappedStops = useMemo(() => visibleStops.filter((stop) => stop.planned_latitude != null && stop.planned_longitude != null), [visibleStops])
  const pendingStops = useMemo(() => visibleStops.filter((stop) => stop.geo_status === 'PENDING'), [visibleStops])
  const activeVehicleCount = useMemo(() => new Set(visibleTrips.map((trip) => trip.vehicle_id || trip.vehicle_plate_snapshot).filter(Boolean)).size, [visibleTrips])

  useEffect(() => {
    if (!host.current || mapRef.current) return
    const map = L.map(host.current, {
      zoomControl: false,
      preferCanvas: true,
      minZoom: 7,
      maxBounds: DR_CONTEXT_BOUNDS,
      maxBoundsViscosity: 0.65,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
    }).setView(DR_CENTER, 8.5)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      maxNativeZoom: 19,
      updateWhenIdle: true,
      keepBuffer: 2,
      detectRetina: false,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    map.createPane('delivery-official-boundaries')
    const boundaryPane = map.getPane('delivery-official-boundaries')
    if (boundaryPane) {
      boundaryPane.style.zIndex = '240'
      boundaryPane.style.pointerEvents = 'none'
    }
    mapRef.current = map
    routeLayerRef.current = L.layerGroup().addTo(map)
    officialAreaLayerRef.current = L.layerGroup().addTo(map)
    const frame = window.requestAnimationFrame(() => map.invalidateSize({ animate: false }))
    return () => {
      window.cancelAnimationFrame(frame)
      map.remove()
      mapRef.current = null
      routeLayerRef.current = null
      officialAreaLayerRef.current = null
      officialBoundaryLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    try { window.localStorage.setItem(MAP_LAYOUT_KEY, mapLayout) } catch {}
    document.body.classList.toggle('logistics-map-expanded', mapLayout === 'EXPANDED')
    document.body.classList.toggle('logistics-control-tower-open', mapLayout === 'CONTROL_TOWER')
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
      mapRef.current?.invalidateSize({ animate: false })
    }, 100)
    return () => {
      window.clearTimeout(id)
      document.body.classList.remove('logistics-map-expanded')
      document.body.classList.remove('logistics-control-tower-open')
    }
  }, [mapLayout])

  useEffect(() => {
    if (territoryView !== 'OFFICIAL' || officialAreas.length) return
    let cancelled = false
    setTerritoryLoading(true)
    setTerritoryError('')
    void loadOfficialAreaDirectory()
      .then((areas) => { if (!cancelled) setOfficialAreas(areas) })
      .catch((error) => { if (!cancelled) setTerritoryError(error instanceof Error ? error.message : 'No fue posible cargar la división territorial oficial.') })
      .finally(() => { if (!cancelled) setTerritoryLoading(false) })
    return () => { cancelled = true }
  }, [territoryView, officialAreas.length])

  useEffect(() => {
    if (territoryView !== 'OFFICIAL' || !selectedAreaId) {
      setOfficialArea(null)
      return
    }
    let cancelled = false
    setTerritoryLoading(true)
    setTerritoryError('')
    void loadOfficialAreaGeometry(selectedAreaId)
      .then((area) => { if (!cancelled) setOfficialArea(area) })
      .catch((error) => { if (!cancelled) { setOfficialArea(null); setTerritoryError(error instanceof Error ? error.message : 'No fue posible cargar el polígono oficial.') } })
      .finally(() => { if (!cancelled) setTerritoryLoading(false) })
    return () => { cancelled = true }
  }, [territoryView, selectedAreaId])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (officialBoundaryLayerRef.current) {
      map.removeLayer(officialBoundaryLayerRef.current)
      officialBoundaryLayerRef.current = null
    }
    if (!showOfficialBoundaries) {
      setBoundaryLoading(false)
      return
    }
    setBoundaryLoading(true)
    const layer = L.tileLayer.wms('https://geoportal.iderd.gob.do/geoserver/gwc/service/wms', {
      layers: 'ign:Provincias',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      opacity: 0.30,
      pane: 'delivery-official-boundaries',
      attribution: 'Límites oficiales: IDERD / IGN-JJHM',
    })
    const finish = () => setBoundaryLoading(false)
    layer.on('load', finish)
    layer.on('tileerror', finish)
    layer.addTo(map)
    officialBoundaryLayerRef.current = layer
    return () => {
      layer.off('load', finish)
      layer.off('tileerror', finish)
      if (map.hasLayer(layer)) map.removeLayer(layer)
      if (officialBoundaryLayerRef.current === layer) officialBoundaryLayerRef.current = null
    }
  }, [showOfficialBoundaries])

  useEffect(() => {
    const map = mapRef.current
    const layer = routeLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    const bounds: L.LatLngExpression[] = []
    visibleTrips.forEach((trip, tripIndex) => {
      const tripStops = stops
        .filter(stop => stop.trip_id === trip.id && stop.planned_latitude != null && stop.planned_longitude != null)
        .sort((a, b) => a.stop_order - b.stop_order)
      const points = tripStops.map(stop => [stop.planned_latitude!, stop.planned_longitude!] as [number, number])
      if (points.length > 1) L.polyline(points, { color: routeColor(tripIndex), weight: 3, opacity: .72, dashArray: trip.status === 'COMPLETED' ? undefined : '8 7' }).addTo(layer)
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
        marker.bindPopup(`<div class="map-popup"><b>${escapeHtml(stop.destination_name_snapshot)}</b><span>${escapeHtml(trip.trip_code)}</span><small>Parada ${stop.stop_order} · ${escapeHtml(stop.status)}</small><small>${stop.packages_loaded || 0} bultos</small></div>`)
      })
    })
    if (territoryView === 'OFFICIAL' && officialArea?.geometry) {
      window.setTimeout(() => map.invalidateSize({ animate: false }), 0)
      return
    }
    if (bounds.length) {
      const latLngBounds = L.latLngBounds(bounds)
      map.fitBounds(latLngBounds.pad(.16), { animate: false, maxZoom: 15 })
    } else map.setView(DR_CENTER, 8.5, { animate: false })
    window.setTimeout(() => map.invalidateSize({ animate: false }), 0)
  }, [visibleTrips, stops, territoryView, officialArea?.id, officialArea?.geometry])

  useEffect(() => {
    const map = mapRef.current
    const layer = officialAreaLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (territoryView !== 'OFFICIAL') {
      const bounds = operationalBounds(visibleTrips, stops)
      if (bounds?.isValid()) map.fitBounds(bounds.pad(.16), { animate: false, maxZoom: 15 })
      else map.setView(DR_CENTER, 8.5, { animate: false })
      return
    }
    const geometry = normalizeGeoJson(officialArea?.geometry)
    if (!officialArea || !geometry) return
    try {
      const feature = L.geoJSON(geometry as any, {
        style: { color: '#c71f2d', weight: 2.5, fillColor: '#c71f2d', fillOpacity: 0.035, opacity: 0.82 },
      })
      feature.bindTooltip(`<b>${escapeHtml(officialArea.name)}</b><br><span>División oficial · ${escapeHtml(officialArea.area_level)}</span>`, { sticky: true })
      feature.addTo(layer)
      feature.bringToFront()
      const frame = window.requestAnimationFrame(() => {
        map.invalidateSize({ animate: false })
        const bounds = feature.getBounds()
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [34, 34], maxZoom: 13, animate: true })
      })
      return () => window.cancelAnimationFrame(frame)
    } catch (error) {
      console.error('No fue posible dibujar la división territorial oficial en Torre de Control.', error)
    }
  }, [territoryView, officialArea?.id, officialArea?.geometry, visibleTrips, stops])

  const selectTerritoryView = (next: TerritoryViewMode) => {
    setTerritoryView(next)
    setTerritoryError('')
    if (next === 'NATIONAL') {
      setOfficialSelection(EMPTY_OFFICIAL_SELECTION)
      setOfficialArea(null)
    }
  }

  const changeMapLayout = (next: MapLayout) => setMapLayout(next)

  const clearTerritory = () => {
    setOfficialSelection(EMPTY_OFFICIAL_SELECTION)
    setOfficialArea(null)
    const map = mapRef.current
    if (!map) return
    const bounds = operationalBounds(visibleTrips, stops)
    if (bounds?.isValid()) map.fitBounds(bounds.pad(.16), { animate: false, maxZoom: 15 })
    else map.setView(DR_CENTER, 8.5, { animate: false })
  }

  const mapHeight = mapLayout === 'EXPANDED' ? Math.max(height, 680) : height

  return <div className={`delivery-control-map-stack delivery-map-layout-${mapLayout.toLowerCase().replace('_', '-')}`}>
    <div className="delivery-map-layout-bar">
      <div className="delivery-map-layout-summary">
        <div><b>{visibleTrips.length}</b><span>viajes visibles</span></div>
        <div><b>{activeVehicleCount}</b><span>vehículos</span></div>
        <div><b>{mappedStops.length}</b><span>paradas en mapa</span></div>
        <div className={pendingStops.length ? 'warn' : ''}><b>{pendingStops.length}</b><span>sin ubicación</span></div>
      </div>
      <div className="delivery-map-layout-switch" aria-label="Tamaño del mapa logístico">
        <button className={mapLayout === 'STANDARD' ? 'active' : ''} onClick={() => changeMapLayout('STANDARD')} title="Vista estándar"><Layers3 size={15}/> Estándar</button>
        <button className={mapLayout === 'EXPANDED' ? 'active' : ''} onClick={() => changeMapLayout('EXPANDED')} title="Mapa grande"><Maximize2 size={15}/> Mapa grande</button>
        <button className={mapLayout === 'CONTROL_TOWER' ? 'active' : ''} onClick={() => changeMapLayout('CONTROL_TOWER')} title="Control Tower"><Maximize2 size={15}/> Control Tower</button>
        {mapLayout === 'CONTROL_TOWER' && <button className="exit" onClick={() => changeMapLayout('STANDARD')} title="Salir de Control Tower"><Minimize2 size={15}/> Salir</button>}
      </div>
    </div>

    <div className="delivery-territory-toolbar">
      <div className="delivery-territory-heading">
        <MapPinned size={16}/>
        <div><b>Vista territorial</b><span>Solo cambia el encuadre visual; no modifica ni oculta entregas.</span></div>
      </div>
      <div className="segmented compact-segmented delivery-territory-mode">
        <button className={territoryView === 'NATIONAL' ? 'active' : ''} onClick={() => selectTerritoryView('NATIONAL')}>Vista nacional</button>
        <button className={territoryView === 'OFFICIAL' ? 'active' : ''} onClick={() => selectTerritoryView('OFFICIAL')}>División territorial oficial</button>
      </div>
      <label className="delivery-boundary-toggle" title="Carga límites provinciales oficiales solo cuando lo solicites.">
        <input type="checkbox" checked={showOfficialBoundaries} onChange={(event) => setShowOfficialBoundaries(event.target.checked)}/>
        <span>{boundaryLoading ? 'Cargando límites…' : 'Límites oficiales'}</span>
      </label>
    </div>
    {territoryView === 'OFFICIAL' && <div className="delivery-territory-filter-panel">
      <div className="delivery-territory-filter-grid">
        <OfficialTerritoryFilters areas={officialAreas} value={officialSelection} onChange={setOfficialSelection} disabled={territoryLoading && officialAreas.length === 0} compact/>
      </div>
      <div className="delivery-territory-filter-meta">
        <span>{territoryLoading ? <><LoaderCircle className="spin" size={14}/> Cargando división…</> : selectedAreaId ? `Área enfocada: ${officialArea?.name || 'cargando…'}` : 'Selecciona región, provincia, municipio o distrito para enfocar el mapa.'}</span>
        {selectedAreaId && <button className="secondary compact" onClick={clearTerritory}><RotateCcw size={14}/> Limpiar división</button>}
      </div>
      {territoryError && <div className="delivery-territory-error">{territoryError}</div>}
    </div>}
    <div className="delivery-map-shell" style={{ height: mapHeight }} ref={host}/>
  </div>
}
