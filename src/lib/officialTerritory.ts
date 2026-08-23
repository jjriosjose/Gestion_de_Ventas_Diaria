import { supabase } from './supabase'
import type { GeoAssessment } from './geoQuality'

export type OfficialAreaLevel = 'REGION' | 'PROVINCIA' | 'MUNICIPIO' | 'DISTRITO_MUNICIPAL'
export type OfficialArea = {
  id: string
  area_level: OfficialAreaLevel
  code?: string | null
  name: string
  parent_id?: string | null
  geometry?: unknown
}
export type OfficialSelection = { regionId: string; provinceId: string; municipalityId: string; districtId: string }
export const EMPTY_OFFICIAL_SELECTION: OfficialSelection = { regionId: '', provinceId: '', municipalityId: '', districtId: '' }

export async function loadOfficialAreaDirectory(): Promise<OfficialArea[]> {
  const { data, error } = await supabase
    .from('administrative_areas')
    .select('id,area_level,code,name,parent_id')
    .eq('active', true)
    .in('area_level', ['REGION','PROVINCIA','MUNICIPIO','DISTRITO_MUNICIPAL'])
    .order('area_level')
    .order('name')
  if (error) throw new Error(`No fue posible cargar la división territorial oficial: ${error.message}`)
  return (data || []) as OfficialArea[]
}

export async function loadOfficialAreaGeometry(id: string): Promise<OfficialArea | null> {
  if (!id) return null
  const { data, error } = await supabase
    .from('administrative_areas')
    .select('id,area_level,code,name,parent_id,geometry')
    .eq('id', id)
    .eq('active', true)
    .maybeSingle()
  if (error) throw new Error(`No fue posible cargar el polígono oficial: ${error.message}`)
  return data as OfficialArea | null
}

export function areaById(areas: OfficialArea[], id?: string | null) { return id ? areas.find((area) => area.id === id) || null : null }
export function selectedOfficialAreaId(selection: OfficialSelection) { return selection.districtId || selection.municipalityId || selection.provinceId || selection.regionId }

export function officialSelectionForArea(areas: OfficialArea[], areaId?: string | null): OfficialSelection {
  const selection: OfficialSelection = { ...EMPTY_OFFICIAL_SELECTION }
  let current = areaById(areas, areaId)
  const visited = new Set<string>()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    if (current.area_level === 'REGION') selection.regionId = current.id
    if (current.area_level === 'PROVINCIA') selection.provinceId = current.id
    if (current.area_level === 'MUNICIPIO') selection.municipalityId = current.id
    if (current.area_level === 'DISTRITO_MUNICIPAL') selection.districtId = current.id
    current = areaById(areas, current.parent_id)
  }
  return selection
}

export function officialSelectionNames(areas: OfficialArea[], selection: OfficialSelection) {
  return {
    region: areaById(areas, selection.regionId)?.name || '',
    province: areaById(areas, selection.provinceId)?.name || '',
    municipality: areaById(areas, selection.municipalityId)?.name || '',
    district: areaById(areas, selection.districtId)?.name || '',
  }
}

const norm = (value?: string | null) => (value || '').trim().toLocaleUpperCase('es')

export function matchesOfficialSelection(assessment: GeoAssessment | undefined, areas: OfficialArea[], selection: OfficialSelection) {
  const names = officialSelectionNames(areas, selection)
  if (names.region && norm(assessment?.detected_region) !== norm(names.region)) return false
  if (names.province && norm(assessment?.detected_province) !== norm(names.province)) return false
  if (names.municipality && norm(assessment?.detected_municipality) !== norm(names.municipality)) return false
  if (names.district && norm(assessment?.detected_locality) !== norm(names.district)) return false
  return true
}
