import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ChevronRight, MapPinned, RotateCcw, X } from 'lucide-react'
import type { Client } from '../types'
import type { GeoAssessment } from '../lib/geoQuality'
import { officialSelectionNames, selectedOfficialAreaId } from '../lib/officialTerritory'
import type { OfficialArea, OfficialAreaLevel, OfficialSelection } from '../lib/officialTerritory'
import '../styles/map-territorial-analytics-v065.css'

type AnalyticsLevel = OfficialAreaLevel

type Props = {
  clients: Client[]
  geoAssessments: Map<string, GeoAssessment>
  officialAreas: OfficialArea[]
  activeSelection: OfficialSelection
  onSelectArea: (areaId: string) => void
  onResetTerritory: () => void
}

type AnalyticsRow = {
  id: string
  name: string
  count: number
  percentage: number
}

const LEVELS: Array<{ value: AnalyticsLevel; label: string; shortLabel: string }> = [
  { value: 'REGION', label: 'Regiones', shortLabel: 'Región' },
  { value: 'PROVINCIA', label: 'Provincias', shortLabel: 'Provincia' },
  { value: 'MUNICIPIO', label: 'Municipios', shortLabel: 'Municipio' },
  { value: 'DISTRITO_MUNICIPAL', label: 'Distritos', shortLabel: 'Distrito' },
]

const norm = (value?: string | null) => (value || '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleUpperCase('es')

function nextLevel(level: AnalyticsLevel): AnalyticsLevel {
  if (level === 'REGION') return 'PROVINCIA'
  if (level === 'PROVINCIA') return 'MUNICIPIO'
  return 'DISTRITO_MUNICIPAL'
}

function defaultLevel(selection: OfficialSelection): AnalyticsLevel {
  if (selection.municipalityId || selection.districtId) return 'DISTRITO_MUNICIPAL'
  if (selection.provinceId) return 'MUNICIPIO'
  if (selection.regionId) return 'PROVINCIA'
  return 'REGION'
}

export function MapTerritorialAnalytics({ clients, geoAssessments, officialAreas, activeSelection, onSelectArea, onResetTerritory }: Props) {
  const [open, setOpen] = useState(false)
  const [level, setLevel] = useState<AnalyticsLevel>(() => defaultLevel(activeSelection))

  const activeAreaId = selectedOfficialAreaId(activeSelection)
  const activeNames = useMemo(() => officialSelectionNames(officialAreas, activeSelection), [officialAreas, activeSelection])
  const activeTerritoryName = activeNames.district || activeNames.municipality || activeNames.province || activeNames.region || 'República Dominicana'

  useEffect(() => {
    setLevel(defaultLevel(activeSelection))
  }, [activeSelection.regionId, activeSelection.provinceId, activeSelection.municipalityId, activeSelection.districtId])

  const analytics = useMemo(() => {
    const byId = new Map(officialAreas.map((area) => [area.id, area]))
    const levelNameIndex = new Map<string, OfficialArea[]>()
    const childNameIndex = new Map<string, OfficialArea>()

    officialAreas.forEach((area) => {
      const nameKey = `${area.area_level}|${norm(area.name)}`
      const list = levelNameIndex.get(nameKey) || []
      list.push(area)
      levelNameIndex.set(nameKey, list)
      if (area.parent_id) childNameIndex.set(`${area.area_level}|${area.parent_id}|${norm(area.name)}`, area)
    })

    const findArea = (areaLevel: AnalyticsLevel, name?: string | null, parentId?: string | null) => {
      const normalizedName = norm(name)
      if (!normalizedName) return null
      if (parentId) {
        const direct = childNameIndex.get(`${areaLevel}|${parentId}|${normalizedName}`)
        if (direct) return direct
      }
      const matches = levelNameIndex.get(`${areaLevel}|${normalizedName}`) || []
      return matches.length === 1 ? matches[0] : matches[0] || null
    }

    const resolvePath = (assessment?: GeoAssessment) => {
      const region = findArea('REGION', assessment?.detected_region)
      const province = findArea('PROVINCIA', assessment?.detected_province, region?.id)
      const municipality = findArea('MUNICIPIO', assessment?.detected_municipality, province?.id)
      const district = findArea('DISTRITO_MUNICIPAL', assessment?.detected_locality, municipality?.id)
      return { region, province, municipality, district }
    }

    const counts = new Map<string, number>()
    let classifiedCount = 0
    let missingCount = 0

    clients.forEach((client) => {
      const path = resolvePath(geoAssessments.get(client.id))
      const area = level === 'REGION' ? path.region : level === 'PROVINCIA' ? path.province : level === 'MUNICIPIO' ? path.municipality : path.district
      if (!area) {
        missingCount += 1
        return
      }
      classifiedCount += 1
      counts.set(area.id, (counts.get(area.id) || 0) + 1)
    })

    const denominator = clients.length || 1
    const rows: AnalyticsRow[] = [...counts.entries()]
      .map(([id, count]) => ({ id, name: byId.get(id)?.name || 'Territorio', count, percentage: (count / denominator) * 100 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))

    return { rows, classifiedCount, missingCount }
  }, [clients, geoAssessments, officialAreas, level])

  const gpsCount = useMemo(() => clients.filter((client) => client.latitude != null && client.longitude != null).length, [clients])
  const gpsPercentage = clients.length ? (gpsCount / clients.length) * 100 : 0
  const classifiedPercentage = clients.length ? (analytics.classifiedCount / clients.length) * 100 : 0
  const levelLabel = LEVELS.find((item) => item.value === level)?.shortLabel || 'Territorio'

  const selectArea = (row: AnalyticsRow) => {
    onSelectArea(row.id)
    setLevel(nextLevel(level))
  }

  if (!open) {
    return <button className="map-analytics-trigger" type="button" onClick={() => setOpen(true)}>
      <span className="map-analytics-trigger-icon"><BarChart3 size={18}/></span>
      <span><b>Análisis territorial</b><small>{clients.length.toLocaleString()} clientes</small></span>
    </button>
  }

  return <aside className="map-analytics-panel" aria-label="Análisis territorial oficial">
    <header className="map-analytics-head">
      <div>
        <span className="eyebrow">DIVISIÓN TERRITORIAL OFICIAL</span>
        <h3>Análisis territorial</h3>
        <p>{activeTerritoryName}</p>
      </div>
      <button className="map-analytics-close" type="button" onClick={() => setOpen(false)} aria-label="Cerrar análisis"><X size={18}/></button>
    </header>

    <div className="map-analytics-kpis">
      <div><span>Clientes</span><b>{clients.length.toLocaleString()}</b><small>filtro actual</small></div>
      <div><span>Con GPS</span><b>{gpsCount.toLocaleString()}</b><small>{gpsPercentage.toFixed(1)}%</small></div>
      <div><span>Clasificados</span><b>{analytics.classifiedCount.toLocaleString()}</b><small>{classifiedPercentage.toFixed(1)}%</small></div>
    </div>

    <div className="map-analytics-tabs" role="tablist" aria-label="Nivel territorial">
      {LEVELS.map((item) => <button key={item.value} type="button" className={level === item.value ? 'active' : ''} onClick={() => setLevel(item.value)}>{item.label}</button>)}
    </div>

    <div className="map-analytics-body">
      <div className="map-analytics-caption">
        <span>Distribución por {levelLabel.toLocaleLowerCase('es')}</span>
        <span>% sobre {clients.length.toLocaleString()}</span>
      </div>

      {!analytics.rows.length && !analytics.missingCount ? <div className="map-analytics-empty"><MapPinned size={22}/><b>Sin clientes para analizar</b><span>Ajusta los filtros del mapa.</span></div> : <div className="map-analytics-bars">
        {analytics.rows.map((row) => <button type="button" className="map-analytics-row" key={row.id} onClick={() => selectArea(row)} title={`Filtrar y enfocar ${row.name}`}>
          <span className="map-analytics-row-top"><b>{row.name}</b><span><strong>{row.count.toLocaleString()}</strong> · {row.percentage.toFixed(1)}%</span></span>
          <span className="map-analytics-bar-track"><span className="map-analytics-bar-fill" style={{ width: `${Math.max(2, Math.min(100, row.percentage))}%` }}/></span>
          <ChevronRight className="map-analytics-row-arrow" size={16}/>
        </button>)}
        {analytics.missingCount > 0 && <div className="map-analytics-row missing">
          <span className="map-analytics-row-top"><b>Sin clasificación oficial</b><span><strong>{analytics.missingCount.toLocaleString()}</strong> · {((analytics.missingCount / (clients.length || 1)) * 100).toFixed(1)}%</span></span>
          <span className="map-analytics-bar-track"><span className="map-analytics-bar-fill muted" style={{ width: `${Math.max(2, Math.min(100, (analytics.missingCount / (clients.length || 1)) * 100))}%` }}/></span>
        </div>}
      </div>}
    </div>

    <footer className="map-analytics-footer">
      <span>Los porcentajes respetan todos los filtros activos del mapa.</span>
      {activeAreaId && <button type="button" onClick={() => { onResetTerritory(); setLevel('REGION') }}><RotateCcw size={14}/> Todo RD</button>}
    </footer>
  </aside>
}
