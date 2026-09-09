import type { DeliveryStop, DeliveryTrip } from './logistics'

export type TripDistanceEvent = {
  id?: string
  trip_id: string
  stop_id?: string | null
  event_type: string
  latitude?: number | null
  longitude?: number | null
  occurred_at: string
}

export type OperationalPointSource = 'ORIGIN' | 'STOP_GPS' | 'STOP_PLANNED' | 'RETURN_GPS' | 'RETURN_PLANNED'

export type OperationalPoint = {
  key: string
  label: string
  latitude: number
  longitude: number
  source: OperationalPointSource
  stopId?: string
  stopOrder?: number
}

export type OperationalSegment = {
  from: OperationalPoint
  to: OperationalPoint
  distanceMeters: number
}

export type OperationalDistanceEstimate = {
  points: OperationalPoint[]
  segments: OperationalSegment[]
  totalMeters: number
  gpsStopPoints: number
  plannedStopPoints: number
  missingStops: number
}

type DistanceTrip = DeliveryTrip & {
  origin_latitude?: number | null
  origin_longitude?: number | null
  returned_at?: string | null
}

type DistanceStop = DeliveryStop & {
  actual_delivery_latitude?: number | null
  actual_delivery_longitude?: number | null
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371000
  const toRad = (value: number) => value * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function hasCoordinates(value: { latitude?: number | null; longitude?: number | null }) {
  return value.latitude != null && value.longitude != null
}

function eventPriority(eventType: string) {
  const priorities: Record<string, number> = {
    DELIVERY_CONFIRMED: 1,
    DELIVERY_PARTIAL: 1,
    DELIVERY_NOT_DELIVERED: 1,
    DELIVERY_RESCHEDULED: 1,
    ARRIVED: 2,
    UNLOAD_FINISHED: 3,
    UNLOAD_STARTED: 4,
  }
  return priorities[eventType] ?? 9
}

function pickStopEvent(stopId: string, events: TripDistanceEvent[]) {
  return events
    .filter(event => event.stop_id === stopId && hasCoordinates(event))
    .sort((a, b) => eventPriority(a.event_type) - eventPriority(b.event_type) || new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())[0]
}

function pickEvent(events: TripDistanceEvent[], eventTypes: string[], latest = false) {
  const matches = events
    .filter(event => eventTypes.includes(event.event_type) && hasCoordinates(event))
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
  return latest ? matches[matches.length - 1] : matches[0]
}

export function estimateOperationalDistance(trip: DistanceTrip, stops: DeliveryStop[], events: TripDistanceEvent[]): OperationalDistanceEstimate {
  const orderedStops = [...stops].sort((a, b) => a.stop_order - b.stop_order) as DistanceStop[]
  const points: OperationalPoint[] = []
  let gpsStopPoints = 0
  let plannedStopPoints = 0
  let missingStops = 0

  const departed = pickEvent(events, ['DEPARTED_ORIGIN'])
  if (trip.origin_latitude != null && trip.origin_longitude != null) {
    points.push({ key: 'origin', label: trip.origin_name || 'Centro de carga', latitude: trip.origin_latitude, longitude: trip.origin_longitude, source: 'ORIGIN' })
  } else if (departed) {
    points.push({ key: 'origin-event', label: trip.origin_name || 'Salida registrada', latitude: departed.latitude!, longitude: departed.longitude!, source: 'ORIGIN' })
  }

  orderedStops.forEach(stop => {
    if (stop.actual_delivery_latitude != null && stop.actual_delivery_longitude != null) {
      points.push({ key: `stop-${stop.id}`, label: stop.destination_name_snapshot, latitude: stop.actual_delivery_latitude, longitude: stop.actual_delivery_longitude, source: 'STOP_GPS', stopId: stop.id, stopOrder: stop.stop_order })
      gpsStopPoints += 1
      return
    }
    const event = pickStopEvent(stop.id, events)
    if (event) {
      points.push({ key: `stop-${stop.id}`, label: stop.destination_name_snapshot, latitude: event.latitude!, longitude: event.longitude!, source: 'STOP_GPS', stopId: stop.id, stopOrder: stop.stop_order })
      gpsStopPoints += 1
      return
    }
    if (stop.planned_latitude != null && stop.planned_longitude != null) {
      points.push({ key: `stop-${stop.id}`, label: stop.destination_name_snapshot, latitude: stop.planned_latitude, longitude: stop.planned_longitude, source: 'STOP_PLANNED', stopId: stop.id, stopOrder: stop.stop_order })
      plannedStopPoints += 1
      return
    }
    missingStops += 1
  })

  const returned = pickEvent(events, ['RETURNED_ORIGIN', 'TRIP_COMPLETED'], true)
  if (returned) {
    points.push({ key: 'return-event', label: 'Retorno / cierre', latitude: returned.latitude!, longitude: returned.longitude!, source: 'RETURN_GPS' })
  } else if ((trip.returned_at || trip.completed_at) && trip.origin_latitude != null && trip.origin_longitude != null) {
    points.push({ key: 'return-planned', label: trip.origin_name || 'Retorno a base', latitude: trip.origin_latitude, longitude: trip.origin_longitude, source: 'RETURN_PLANNED' })
  }

  const segments: OperationalSegment[] = []
  let totalMeters = 0
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]
    const to = points[index]
    const distanceMeters = haversineMeters(from.latitude, from.longitude, to.latitude, to.longitude)
    segments.push({ from, to, distanceMeters })
    totalMeters += distanceMeters
  }

  return { points, segments, totalMeters, gpsStopPoints, plannedStopPoints, missingStops }
}

export function formatOperationalDistance(meters: number) {
  if (!Number.isFinite(meters) || meters < 0) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  if (meters < 10000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters / 100) / 10} km`
}

export function operationalDistanceDescription(estimate: OperationalDistanceEstimate) {
  if (!estimate.segments.length) return 'Sin puntos suficientes para estimar distancia'
  const parts = [`${estimate.segments.length} segmento(s)`]
  if (estimate.gpsStopPoints) parts.push(`${estimate.gpsStopPoints} parada(s) con GPS`)
  if (estimate.plannedStopPoints) parts.push(`${estimate.plannedStopPoints} estimada(s) por ubicación planificada`)
  if (estimate.missingStops) parts.push(`${estimate.missingStops} sin ubicación`)
  return parts.join(' · ')
}
