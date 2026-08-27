import { useMemo } from 'react'
import { officialSelectionForArea } from '../lib/officialTerritory'
import type { OfficialArea, OfficialSelection } from '../lib/officialTerritory'

type Props = {
  areas: OfficialArea[]
  value: OfficialSelection
  onChange: (value: OfficialSelection) => void
  disabled?: boolean
  compact?: boolean
}

export function OfficialTerritoryFilters({ areas, value, onChange, disabled = false, compact = false }: Props) {
  const areaIndex = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas])
  const regions = useMemo(() => areas.filter((area) => area.area_level === 'REGION'), [areas])
  const provinces = useMemo(
    () => areas.filter((area) => area.area_level === 'PROVINCIA' && (!value.regionId || area.parent_id === value.regionId)),
    [areas, value.regionId],
  )
  const municipalities = useMemo(() => {
    const provinceIds = value.provinceId
      ? new Set([value.provinceId])
      : value.regionId
        ? new Set(areas.filter((area) => area.area_level === 'PROVINCIA' && area.parent_id === value.regionId).map((area) => area.id))
        : null
    return areas.filter((area) => area.area_level === 'MUNICIPIO' && (!provinceIds || provinceIds.has(area.parent_id || '')))
  }, [areas, value.regionId, value.provinceId])
  const districts = useMemo(() => {
    let municipalityIds: Set<string> | null = null
    if (value.municipalityId) {
      municipalityIds = new Set([value.municipalityId])
    } else if (value.provinceId) {
      municipalityIds = new Set(areas.filter((area) => area.area_level === 'MUNICIPIO' && area.parent_id === value.provinceId).map((area) => area.id))
    } else if (value.regionId) {
      const provinceIds = new Set(areas.filter((area) => area.area_level === 'PROVINCIA' && area.parent_id === value.regionId).map((area) => area.id))
      municipalityIds = new Set(areas.filter((area) => area.area_level === 'MUNICIPIO' && provinceIds.has(area.parent_id || '')).map((area) => area.id))
    }
    return areas.filter((area) => area.area_level === 'DISTRITO_MUNICIPAL' && (!municipalityIds || municipalityIds.has(area.parent_id || '')))
  }, [areas, value.regionId, value.provinceId, value.municipalityId])

  const parentName = (area: OfficialArea) => area.parent_id ? areaIndex.get(area.parent_id)?.name || '' : ''
  const provinceLabel = (area: OfficialArea) => value.regionId ? area.name : `${area.name}${parentName(area) ? ` · ${parentName(area)}` : ''}`
  const municipalityLabel = (area: OfficialArea) => value.provinceId ? area.name : `${area.name}${parentName(area) ? ` · ${parentName(area)}` : ''}`
  const districtLabel = (area: OfficialArea) => value.municipalityId ? area.name : `${area.name}${parentName(area) ? ` · ${parentName(area)}` : ''}`

  const selectArea = (areaId: string, level: 'PROVINCIA' | 'MUNICIPIO' | 'DISTRITO_MUNICIPAL') => {
    if (!areaId) {
      if (level === 'PROVINCIA') onChange({ ...value, provinceId: '', municipalityId: '', districtId: '' })
      if (level === 'MUNICIPIO') onChange({ ...value, municipalityId: '', districtId: '' })
      if (level === 'DISTRITO_MUNICIPAL') onChange({ ...value, districtId: '' })
      return
    }
    onChange(officialSelectionForArea(areas, areaId))
  }

  return <>
    <select className={compact ? 'compact-select' : ''} value={value.regionId} disabled={disabled} onChange={(event) => onChange({ regionId: event.target.value, provinceId: '', municipalityId: '', districtId: '' })}>
      <option value="">Todas las regiones oficiales</option>{regions.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
    </select>
    <select className={compact ? 'compact-select' : ''} value={value.provinceId} disabled={disabled} onChange={(event) => selectArea(event.target.value, 'PROVINCIA')}>
      <option value="">Todas las provincias oficiales</option>{provinces.map((area) => <option value={area.id} key={area.id}>{provinceLabel(area)}</option>)}
    </select>
    <select className={compact ? 'compact-select' : ''} value={value.municipalityId} disabled={disabled} onChange={(event) => selectArea(event.target.value, 'MUNICIPIO')}>
      <option value="">Todos los municipios oficiales</option>{municipalities.map((area) => <option value={area.id} key={area.id}>{municipalityLabel(area)}</option>)}
    </select>
    <select className={compact ? 'compact-select' : ''} value={value.districtId} disabled={disabled} onChange={(event) => selectArea(event.target.value, 'DISTRITO_MUNICIPAL')}>
      <option value="">Todos los distritos municipales</option>{districts.map((area) => <option value={area.id} key={area.id}>{districtLabel(area)}</option>)}
    </select>
  </>
}
