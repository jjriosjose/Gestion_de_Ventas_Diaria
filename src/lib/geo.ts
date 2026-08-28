export type GeoPoint = { latitude: number; longitude: number; accuracy: number }
export type GeoQuality = 'EXCELLENT'|'GOOD'|'APPROXIMATE'|'LOW'|'UNRELIABLE'|'UNKNOWN'

export function gpsQuality(accuracy?: number | null): GeoQuality {
  const a=Number(accuracy)
  if(!Number.isFinite(a)||a<=0)return 'UNKNOWN'
  if(a<=50)return 'EXCELLENT'
  if(a<=150)return 'GOOD'
  if(a<=500)return 'APPROXIMATE'
  if(a<=1000)return 'LOW'
  return 'UNRELIABLE'
}

export function isReliableGps(accuracy?: number | null){return gpsQuality(accuracy)!=='UNRELIABLE'&&gpsQuality(accuracy)!=='UNKNOWN'}

export function distanceMeters(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){
  const rad=(v:number)=>v*Math.PI/180,R=6371000
  const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude),lat1=rad(a.latitude),lat2=rad(b.latitude)
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)))
}

/**
 * Obtiene la mejor lectura disponible dentro de una ventana corta.
 * Una lectura imprecisa NUNCA bloquea la operación: al vencer la ventana se
 * devuelve el mejor punto recibido para que backend/UI lo clasifiquen.
 */
export function currentPosition(): Promise<GeoPoint> {
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation)return reject(new Error('Este dispositivo no dispone de geolocalización.'))
    let best:GeoPoint|null=null,settled=false,watchId:number|null=null
    const finish=(error?:Error)=>{
      if(settled)return
      settled=true
      if(watchId!=null)navigator.geolocation.clearWatch(watchId)
      window.clearTimeout(timer)
      if(best)return resolve(best)
      reject(error||new Error('No fue posible obtener la ubicación. Verifica los permisos del navegador.'))
    }
    const timer=window.setTimeout(()=>finish(),8000)
    watchId=navigator.geolocation.watchPosition(
      p=>{
        const next={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}
        if(!best||next.accuracy<best.accuracy)best=next
        // En móviles una lectura <=100 m suele ser suficiente y evita esperas innecesarias.
        if(next.accuracy>0&&next.accuracy<=100)finish()
      },
      ()=>finish(new Error('No fue posible obtener la ubicación. Verifica los permisos del navegador.')),
      {enableHighAccuracy:true,timeout:8000,maximumAge:0},
    )
  })
}

export function googleMapsNavigation(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving&dir_action=navigate`
}
