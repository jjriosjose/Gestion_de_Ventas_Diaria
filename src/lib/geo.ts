export type GeoPoint = { latitude: number; longitude: number; accuracy: number }
export function currentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Este dispositivo no dispone de geolocalización.'))
    navigator.geolocation.getCurrentPosition(
      p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => reject(new Error('No fue posible obtener la ubicación. Verifica los permisos del navegador.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}
export function googleMapsNavigation(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving&dir_action=navigate`
}
