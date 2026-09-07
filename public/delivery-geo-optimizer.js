(() => {
  const isDriverRoute = () => window.location.pathname.startsWith('/entrega/')
  if (!isDriverRoute() || !navigator.geolocation) return

  const geo = navigator.geolocation
  const originalGetCurrentPosition = geo.getCurrentPosition.bind(geo)
  let lastPosition = null
  let lastPositionAt = 0
  let nextMode = 'fresh'

  const CACHE_ONLY_ACTIONS = ['iniciar descarga', 'fin de descarga', 'finalizar descarga']
  const INTERMEDIATE_CACHE_MS = 120000
  const INTERMEDIATE_FALLBACK_MS = 300000
  const FRESH_TIMEOUT_MS = 3500
  const INTERMEDIATE_TIMEOUT_MS = 1800

  const buttonText = target => {
    const button = target instanceof Element ? target.closest('button') : null
    return button ? String(button.textContent || '').trim().toLocaleLowerCase('es') : ''
  }

  document.addEventListener('click', event => {
    if (!isDriverRoute()) return
    const text = buttonText(event.target)
    nextMode = CACHE_ONLY_ACTIONS.some(label => text.includes(label)) ? 'intermediate' : 'fresh'
  }, true)

  const useCached = (success, maxAgeMs) => {
    const age = Date.now() - lastPositionAt
    if (!lastPosition || age < 0 || age > maxAgeMs) return false
    queueMicrotask(() => success(lastPosition))
    window.__deliveryGeoLast = { mode: nextMode, source: 'cache', age_ms: age, at: Date.now() }
    return true
  }

  geo.getCurrentPosition = function(success, error, options = {}) {
    if (!isDriverRoute()) return originalGetCurrentPosition(success, error, options)

    const mode = nextMode
    nextMode = 'fresh'
    const startedAt = performance.now()

    if (mode === 'intermediate' && useCached(success, INTERMEDIATE_CACHE_MS)) return

    const requestedTimeout = Number(options.timeout)
    const timeout = mode === 'intermediate'
      ? INTERMEDIATE_TIMEOUT_MS
      : Math.min(Number.isFinite(requestedTimeout) && requestedTimeout > 0 ? requestedTimeout : FRESH_TIMEOUT_MS, FRESH_TIMEOUT_MS)

    const adjustedOptions = {
      ...options,
      enableHighAccuracy: true,
      timeout,
      maximumAge: mode === 'intermediate' ? 30000 : 0,
    }

    originalGetCurrentPosition(position => {
      lastPosition = position
      lastPositionAt = Date.now()
      window.__deliveryGeoLast = {
        mode,
        source: 'fresh',
        elapsed_ms: Math.round(performance.now() - startedAt),
        accuracy_m: position.coords.accuracy,
        at: Date.now(),
      }
      success(position)
    }, geoError => {
      if (mode === 'intermediate' && useCached(success, INTERMEDIATE_FALLBACK_MS)) return
      window.__deliveryGeoLast = {
        mode,
        source: 'unavailable',
        elapsed_ms: Math.round(performance.now() - startedAt),
        code: geoError?.code ?? null,
        at: Date.now(),
      }
      if (typeof error === 'function') error(geoError)
    }, adjustedOptions)
  }
})()
