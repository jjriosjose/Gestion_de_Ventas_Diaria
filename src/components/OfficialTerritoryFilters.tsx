import { useMemo } from 'react'
import type { OfficialArea, OfficialSelection } from '../lib/officialTerritory'

type Props = {
  areas: OfficialArea[]
  value: OfficialSelection
  onChange: (value: OfficialSelection) => void
  disabled?: boolean
  compact?: boolean
}

export function OfficialTerritoryFilters({ areas, value, onChange, compact = false }: Props) {
  const regions = useMemo(() => areas.filter((area) => area.area_level === 'REGION'), [areas])
  const provinces = useMemo(() => areas.filter((area) => area.area_level === 'PROVINCIA' && (!value.regionId || area.parent_id === value.regionId)), [areas, value.regionId])
  const municipalities = useMemo(() => areas.filter((area) => area.area_level === 'MUNICIPIO' && (!value.provinceId || area.parent_id === value.provinceId)), [areas, value.provinceId])
  const districts = useMemo(() => areas.filter((area) => area.area_level === 'DISTRITO_MUNICIPAL' && (!value.municipalityId || area.parent_id === value.municipalityId)), [areas, value.municipalityId])

  return <>
    <select className={compact ? 'compact-select' : ''} value={value.regionId} onChange={(event) => onChange({ regionId: event.target.value, provinceId: '', municipalityId: '', districtId: '' })}>
      <option value="">Todas las regiones oficiales</option>{regions.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
    </select>
    <select className={compact ? 'compact-select' : ''} value={value.provinceId} disabled={!value.regionId} onChange={(event) => onChange({ ...value, provinceId: event.target.value, municipalityId: '', districtId: '' })}>
      <option value="">Todas las provincias oficiales</option>{provinces.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
    </select>
    <select className={compact ? 'compact-select' : ''} value={value.municipalityId} disabled={!value.provinceId} onChange={(event) => onChange({ ...value, municipalityId: event.target.value, districtId: '' })}>
      <option value="">Todos los municipios oficiales</option>{municipalities.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
    </select>
    <select className={compact ? 'compact-select' : ''} value={value.districtId} disabled={!value.municipalityId} onChange={(event) => onChange({ ...value, districtId: event.target.value })}>
      <option value="">Todos los distritos municipales</option>{districts.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
    </select>
  </>
}
