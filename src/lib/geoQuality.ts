import { supabase } from './supabase'

export type GeoAssessmentStatus =
  | 'COHERENTE_SIN_VISITA'
  | 'VERIFICADO_VISITA'
  | 'PENDIENTE_VISITA'
  | 'COORDENADA_SOSPECHOSA'
  | 'TERRITORIO_SOSPECHOSO'
  | 'INCONSISTENCIA_VISITA'
  | 'INCONSISTENCIA_GRAVE'
  | 'FUERA_DIVISION'
  | 'SIN_GEO'
  | 'SIN_CARTOGRAFIA'

export type GeoQualityFilter =
  | 'ALL'
  | 'COHERENTE'
  | 'DIFERENCIA'
  | 'SIN_GEO'
  | 'FUERA_DIVISION'
  | 'VERIFICADO_VISITA'

export type GeoAssessment = {
  client_id: string
  assessment_status: GeoAssessmentStatus
  detected_region?: string | null
  detected_province?: string | null
  detected_municipality?: string | null
  detected_locality?: string | null
}

const PAGE_SIZE = 1000
const CACHE_TTL_MS = 60_000
let assessmentCache: { loadedAt: number; value: Map<string, GeoAssessment> } | null = null
let assessmentPromise: Promise<Map<string, GeoAssessment>> | null = null

const mismatchStatuses = new Set<GeoAssessmentStatus>([
  'PENDIENTE_VISITA',
  'COORDENADA_SOSPECHOSA',
  'TERRITORIO_SOSPECHOSO',
  'INCONSISTENCIA_VISITA',
  'INCONSISTENCIA_GRAVE',
])

export async function loadGeoAssessmentMap(forceRefresh = false): Promise<Map<string, GeoAssessment>> {
  const now = Date.now()
  if (!forceRefresh && assessmentCache && now - assessmentCache.loadedAt < CACHE_TTL_MS) return assessmentCache.value
  if (!forceRefresh && assessmentPromise) return assessmentPromise

  const request = (async () => {
    const rows: GeoAssessment[] = []

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('client_geo_assessments')
        .select('client_id,assessment_status,detected_region,detected_province,detected_municipality,detected_locality')
        .order('client_id')
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw new Error(`No fue posible cargar la coherencia territorial: ${error.message}`)

      const page = (data || []) as GeoAssessment[]
      rows.push(...page)
      if (page.length < PAGE_SIZE) break
    }

    const value = new Map(rows.map((row) => [row.client_id, row]))
    assessmentCache = { loadedAt: Date.now(), value }
    return value
  })()

  assessmentPromise = request
  try {
    return await request
  } finally {
    if (assessmentPromise === request) assessmentPromise = null
  }
}

export function clearGeoAssessmentMemoryCache() {
  assessmentCache = null
  assessmentPromise = null
}

export function isGeoMismatch(status?: GeoAssessmentStatus | null) {
  return Boolean(status && mismatchStatuses.has(status))
}

export function matchesGeoQualityFilter(assessment: GeoAssessment | undefined, filter: GeoQualityFilter) {
  if (filter === 'ALL') return true
  const status = assessment?.assessment_status
  if (!status) return false
  if (filter === 'COHERENTE') return status === 'COHERENTE_SIN_VISITA' || status === 'VERIFICADO_VISITA'
  if (filter === 'DIFERENCIA') return isGeoMismatch(status)
  if (filter === 'SIN_GEO') return status === 'SIN_GEO'
  if (filter === 'FUERA_DIVISION') return status === 'FUERA_DIVISION'
  if (filter === 'VERIFICADO_VISITA') return status === 'VERIFICADO_VISITA'
  return true
}

export function geoQualityLabel(status?: GeoAssessmentStatus | null) {
  switch (status) {
    case 'COHERENTE_SIN_VISITA': return 'Maestro = coordenada'
    case 'VERIFICADO_VISITA': return 'Verificado por visita'
    case 'PENDIENTE_VISITA': return 'Maestro ≠ coordenada'
    case 'COORDENADA_SOSPECHOSA': return 'Coordenada sospechosa'
    case 'TERRITORIO_SOSPECHOSO': return 'Territorio sospechoso'
    case 'INCONSISTENCIA_VISITA': return 'GPS de visita inconsistente'
    case 'INCONSISTENCIA_GRAVE': return 'Inconsistencia fuerte'
    case 'FUERA_DIVISION': return 'Fuera de división'
    case 'SIN_GEO': return 'Sin GPS'
    case 'SIN_CARTOGRAFIA': return 'Sin cartografía'
    default: return 'Sin diagnóstico'
  }
}

export function assessmentDetectedTerritory(assessment?: GeoAssessment) {
  if (!assessment) return 'No resuelta'
  return [assessment.detected_region, assessment.detected_province, assessment.detected_municipality]
    .filter(Boolean)
    .join(' · ') || 'No resuelta'
}
