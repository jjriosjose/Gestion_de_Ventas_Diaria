# V0.6.5-beta.12.1 — Production Deployment Status

Fecha: **28/08/2026 (RD)**.

## Estado productivo

- Versión: **0.6.5-beta.12.1**
- PR: **#44 — V0.6.5-beta.12.1 · GPS Quality Guard**
- Merge commit: `edb963165e2a1d049b9d6dda5d3f81fe7c92b69c`
- Cloudflare Worker: `gestion-de-ventas-diaria`
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Wrangler: `4.125.0`
- Assets leídos: `18`
- Assets nuevos/modificados subidos: `6`
- Assets ya existentes: `9`
- **Cloudflare Current Version ID: `61742248-add5-4527-8b41-8b59f4d889a4`**
- Deploy: **SUCCESS**

## Backend

La migración beta.12.1 `v065_beta12_1_gps_quality_guard` ya está aplicada en Supabase. No ejecutar SQL manual adicional.

La política vigente es **controlada no bloqueante**:

- la precisión GPS clasifica calidad, no autoriza/rechaza por sí sola una gestión;
- la distancia al cliente se audita independientemente de la precisión;
- un registro distante con GPS confiable se conserva como `DISTANT_REGISTRATION`;
- un registro con precisión >1000 m se conserva como `GPS_UNRELIABLE`;
- Tracking no usa un GPS no confiable como posición exacta de mapa/playback.

## Validación previa al deploy

- TypeScript + Vite: **SUCCESS**
- Generate territorial GeoJSON: **SUCCESS**
- Caso real César Caba con `accuracy = 50000 m`: clasificado `UNRELIABLE`; posición exacta ocultada en Tracking.
- Caso reversible GPS 12 m y distancia ~2.2 km: `DISTANT_REGISTRATION`, operación permitida.
- Caso reversible GPS 15 m en punto: sin excepción automática.

## Pendiente post-deploy

1. `Ctrl + F5` y confirmar **Versión 0.6.5-beta.12.1**.
2. Probar desde un teléfono con ubicación precisa/GPS activado.
3. Registrar inicio/fin de visita y observar precisión capturada.
4. Validar que Tracking muestre el punto cuando `accuracy <= 1000 m`.
5. Validar que Tracking conserve estado pero no pinte posición exacta si el GPS es `UNRELIABLE`.
6. Validar un registro realizado lejos del cliente: debe permitirse y quedar auditado, nunca bloquearse automáticamente.

## Producción anterior

- beta.12 Version ID: `0707a082-57aa-40e4-ae92-9c182b710ff6`

Beta.12.1 reemplaza a beta.12 como versión productiva actual.