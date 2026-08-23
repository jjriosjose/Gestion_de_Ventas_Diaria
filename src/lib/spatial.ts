export type LatLngLike = {
  latitude?: number | null
  longitude?: number | null
}

const toRad = (value: number) => (value * Math.PI) / 180

export function haversineKm(a: LatLngLike, b: LatLngLike) {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return Number.POSITIVE_INFINITY
  const earthRadiusKm = 6371.0088
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h))
}

export function pointInPolygon(latitude: number, longitude: number, polygon: Array<[number, number]>) {
  if (polygon.length < 3) return false
  let inside = false
  const x = longitude
  const y = latitude

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i][0]
    const xi = polygon[i][1]
    const yj = polygon[j][0]
    const xj = polygon[j][1]
    const intersects = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi)
    if (intersects) inside = !inside
  }

  return inside
}

export function orderByNearest<T extends LatLngLike>(items: T[], start?: LatLngLike | null) {
  const geocoded = items.filter((item) => item.latitude != null && item.longitude != null)
  const withoutGeo = items.filter((item) => item.latitude == null || item.longitude == null)
  if (geocoded.length < 2) return [...geocoded, ...withoutGeo]

  const remaining = [...geocoded]
  const ordered: T[] = []
  let current: LatLngLike

  if (start?.latitude != null && start.longitude != null) {
    current = start
  } else {
    current = {
      latitude: geocoded.reduce((sum, item) => sum + (item.latitude || 0), 0) / geocoded.length,
      longitude: geocoded.reduce((sum, item) => sum + (item.longitude || 0), 0) / geocoded.length,
    }
  }

  while (remaining.length) {
    let bestIndex = 0
    let bestDistance = Number.POSITIVE_INFINITY
    remaining.forEach((candidate, index) => {
      const distance = haversineKm(current, candidate)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = index
      }
    })
    const [next] = remaining.splice(bestIndex, 1)
    ordered.push(next)
    current = next
  }

  return [...ordered, ...withoutGeo]
}

const INVALID_FILTER_VALUES = new Set(['0', '[object object]', 'null', 'undefined', 'nan'])

export function isUsableFilterValue(value: string | null | undefined) {
  const clean = value?.trim()
  return Boolean(clean) && !INVALID_FILTER_VALUES.has(clean!.toLowerCase())
}

export function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => isUsableFilterValue(value))))
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}
