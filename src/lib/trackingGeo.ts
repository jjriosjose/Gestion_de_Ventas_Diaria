export type TrackingMapMode='LIVE'|'ROUTES'|'QUALITY'
export type TrackingGeoClass='ON_SITE'|'NEAR'|'OUTSIDE'|'DISTANT'|'UNRELIABLE'|'NO_TARGET'|'NO_GPS'

export const TRACKING_ROUTE_COLORS=['#2563eb','#159a66','#ea580c','#7c3aed','#0891b2','#c026d3','#a16207','#475569'] as const

export const ACTIVE_TRACKING_STATUSES=['EN_VISITA','EN_TRASLADO','EVENTUALIDAD','PENDIENTE_CIERRE']

export function routeColorFor(employeeId:string,employeeIds:string[]){
  const ids=Array.from(new Set(employeeIds)).sort()
  const index=Math.max(0,ids.indexOf(employeeId))
  return TRACKING_ROUTE_COLORS[index%TRACKING_ROUTE_COLORS.length]
}

export function gpsQualityLabel(value?:string|null){
  return ({EXCELLENT:'Excelente',GOOD:'Buena',APPROXIMATE:'Aproximada',LOW:'Baja',UNRELIABLE:'No confiable',UNKNOWN:'Sin precisión'} as Record<string,string>)[value||'']||'Sin clasificar'
}

export function gpsQualityClass(value?:string|null){
  return ({EXCELLENT:'excellent',GOOD:'good',APPROXIMATE:'approximate',LOW:'low',UNRELIABLE:'unreliable',UNKNOWN:'unknown'} as Record<string,string>)[value||'']||'unknown'
}

type GeoEventLike={
  raw_has_gps?:boolean|null
  has_gps?:boolean|null
  gps_quality?:string|null
  distance_to_target_m?:number|string|null
  location_exception_code?:string|null
  latitude?:number|null
  longitude?:number|null
}

export function geoClassFor(event?:GeoEventLike|null):TrackingGeoClass{
  if(!event)return 'NO_GPS'
  const raw=event.raw_has_gps ?? (event.latitude!=null&&event.longitude!=null)
  if(!raw)return 'NO_GPS'
  if(event.location_exception_code==='GPS_UNRELIABLE'||event.gps_quality==='UNRELIABLE'||event.gps_quality==='UNKNOWN'||event.has_gps===false)return 'UNRELIABLE'
  const distance=event.distance_to_target_m==null?null:Number(event.distance_to_target_m)
  if(distance==null||!Number.isFinite(distance))return 'NO_TARGET'
  if(event.location_exception_code==='DISTANT_REGISTRATION'||distance>1000)return 'DISTANT'
  if(distance<=100)return 'ON_SITE'
  if(distance<=300)return 'NEAR'
  return 'OUTSIDE'
}

export function geoClassLabel(value:TrackingGeoClass){
  return ({ON_SITE:'En punto',NEAR:'Cercano',OUTSIDE:'Fuera del entorno',DISTANT:'Registro distante',UNRELIABLE:'GPS no confiable',NO_TARGET:'Sin punto maestro',NO_GPS:'Sin GPS'} as Record<TrackingGeoClass,string>)[value]
}

export function geoClassTone(value:TrackingGeoClass){
  return ({ON_SITE:'success',NEAR:'info',OUTSIDE:'warning',DISTANT:'danger',UNRELIABLE:'warning',NO_TARGET:'neutral',NO_GPS:'neutral'} as Record<TrackingGeoClass,string>)[value]
}

export function formatDistance(value?:number|string|null){
  if(value==null||!Number.isFinite(Number(value)))return '—'
  const meters=Math.max(0,Number(value))
  if(meters<1000)return `${Math.round(meters)} m`
  return `${(meters/1000).toFixed(meters>=10000?1:2)} km`
}

export function formatAccuracy(value?:number|string|null){
  if(value==null||!Number.isFinite(Number(value)))return 'Sin precisión'
  const meters=Math.max(0,Number(value))
  return meters>=1000?`±${(meters/1000).toFixed(meters>=10000?0:1)} km`:`±${Math.round(meters)} m`
}

export function gpsIsReliable(event?:GeoEventLike|null){
  if(!event)return false
  if(event.has_gps!=null)return Boolean(event.has_gps)
  const accuracy=(event as any).accuracy_m
  return event.latitude!=null&&event.longitude!=null&&(accuracy==null||Number(accuracy)<=1000)
}
