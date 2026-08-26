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

let directoryCache: OfficialArea[] | null = null
let directoryPromise: Promise<OfficialArea[]> | null = null
const geometryCache = new Map<string, OfficialArea | null>()
const geometryPromises = new Map<string, Promise<OfficialArea | null>>()
const areaIndexCache = new WeakMap<OfficialArea[], Map<string, OfficialArea>>()

function areaIndex(areas: OfficialArea[]) {
  let index = areaIndexCache.get(areas)
  if (!index) {
    index = new Map(areas.map((area) => [area.id, area]))
    areaIndexCache.set(areas, index)
  }
  return index
}

export async function loadOfficialAreaDirectory(forceRefresh = false): Promise<OfficialArea[]> {
  if (!forceRefresh && directoryCache) return directoryCache
  if (!forceRefresh && directoryPromise) return directoryPromise

  const request = (async () => {
    const { data, error } = await supabase
      .from('administrative_areas')
      .select('id,area_level,code,name,parent_id')
      .eq('active', true)
      .in('area_level', ['REGION','PROVINCIA','MUNICIPIO','DISTRITO_MUNICIPAL'])
      .order('area_level')
      .order('name')
    if (error) throw new Error(`No fue posible cargar la división territorial oficial: ${error.message}`)
    const rows = (data || []) as OfficialArea[]
    directoryCache = rows
    return rows
  })()

  directoryPromise = request
  try {
    return await request
  } finally {
    if (directoryPromise === request) directoryPromise = null
  }
}

export async function loadOfficialAreaGeometry(id: string, forceRefresh = false): Promise<OfficialArea | null> {
  if (!id) return null
  if (!forceRefresh && geometryCache.has(id)) return geometryCache.get(id) ?? null
  if (!forceRefresh && geometryPromises.has(id)) return geometryPromises.get(id)!

  const request = (async () => {
    const { data, error } = await supabase
      .from('administrative_areas')
      .select('id,area_level,code,name,parent_id,geometry')
      .eq('id', id)
      .eq('active', true)
      .maybeSingle()
    if (error) throw new Error(`No fue posible cargar el polígono oficial: ${error.message}`)
    const area = data as OfficialArea | null
    geometryCache.set(id, area)
    return area
  })()

  geometryPromises.set(id, request)
  try {
    return await request
  } finally {
    if (geometryPromises.get(id) === request) geometryPromises.delete(id)
  }
}

export function clearOfficialTerritoryMemoryCache() {
  directoryCache = null
  directoryPromise = null
  geometryCache.clear()
  geometryPromises.clear()
}

export function areaById(areas: OfficialArea[], id?: string | null) { return id ? areaIndex(areas).get(id) || null : null }
export function selectedOfficialAreaId(selection: OfficialSelection) { return selection.districtId || selection.municipalityId || selection.provinceId || selection.regionId }

export function officialSelectionForArea(areas: OfficialArea[], areaId?: string | null): OfficialSelection {
  const selection: OfficialSelection = { ...EMPTY_OFFICIAL_SELECTION }
  const index = areaIndex(areas)
  let current = areaId ? index.get(areaId) || null : null
  const visited = new Set<string>()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    if (current.area_level === 'REGION') selection.regionId = current.id
    if (current.area_level === 'PROVINCIA') selection.provinceId = current.id
    if (current.area_level === 'MUNICIPIO') selection.municipalityId = current.id
    if (current.area_level === 'DISTRITO_MUNICIPAL') selection.districtId = current.id
    current = current.parent_id ? index.get(current.parent_id) || null : null
  }
  return selection
}

export function officialSelectionNames(areas: OfficialArea[], selection: OfficialSelection) {
  const index = areaIndex(areas)
  return {
    region: index.get(selection.regionId)?.name || '',
    province: index.get(selection.provinceId)?.name || '',
    municipality: index.get(selection.municipalityId)?.name || '',
    district: index.get(selection.districtId)?.name || '',
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
