# Logistics Driver Performance — Fase 1 aplicada

Fecha: **07/09/2026 (RD)**

Rama: **`feature/logistics-delivery-v1`**

Estado: **IMPLEMENTADA EN RAMA / BUILD VERDE / PENDIENTE QA MÓVIL**

## Cambio aplicado

Se agregó `public/delivery-geo-optimizer.js` y se carga antes de la aplicación desde `index.html`.

El optimizador solo actúa cuando la URL comienza por `/entrega/`.

No modifica otros módulos.

## Objetivo

Reducir la espera repetitiva del portal del chofer sin introducir:

- polling;
- Realtime;
- GPS continuo;
- consultas de fondo.

## Política implementada

### Eventos intermedios

Para:

- `Iniciar descarga`;
- `Fin de descarga` / `Finalizar descarga`;

se puede reutilizar el último GPS exitoso de la misma sesión si tiene hasta **120 segundos**.

Si no existe un fix reciente, se intenta obtener GPS con timeout corto de aproximadamente **1.8 s**. Si falla, puede usar un fix previo de hasta **5 minutos** únicamente para estos eventos intermedios.

### Eventos críticos

El resto de las acciones operativas mantienen intento de GPS fresco, incluyendo:

- salida del centro de carga;
- `Llegué`;
- entrega/POD;
- no entrega / reprogramación;
- incidencia;
- resolución de incidencia;
- iniciar retorno;
- llegar a base / cerrar viaje.

El timeout máximo del intento fresco se limita a aproximadamente **3.5 s** en vez de los 9 s anteriores.

No se reutiliza automáticamente un GPS antiguo para el cierre de viaje.

## Seguridad / alcance

- Solo opera en `/entrega/`.
- Cache exclusivamente en memoria del navegador; se pierde al recargar/cerrar.
- No escribe datos adicionales en Supabase.
- No aumenta Edge Function invocations.
- No altera la política de actualización manual.
- Si no hay GPS en un evento fresco, el comportamiento sigue permitiendo registrar el evento sin GPS igual que antes.

## Instrumentación QA

El navegador expone temporalmente `window.__deliveryGeoLast` para diagnóstico local con:

- modo `fresh` o `intermediate`;
- fuente `fresh`, `cache` o `unavailable`;
- edad del fix si fue cache;
- tiempo aproximado de obtención;
- precisión cuando existe.

No se envía esta telemetría a Supabase.

## CI

Commit que carga el optimizador desde `index.html`:

`304ea0eec70abbf5af80ca09d5205c751d44a1e3`

GitHub Actions:

- **Build validation #804: SUCCESS**.

## QA requerido inmediato

Después de `Fetch origin -> Pull origin` en GitHub Desktop, probar un viaje TEST corto y observar especialmente:

1. `Llegué` — puede requerir GPS fresco y tardar algo más.
2. `Iniciar descarga` — debe sentirse claramente más rápido si existe GPS reciente.
3. `Fin de descarga` — debe sentirse claramente más rápido.
4. `Guardar entrega/POD` — conserva GPS fresco.
5. `Iniciar retorno` — conserva GPS fresco.
6. `Llegué a base · cerrar viaje` — conserva GPS fresco.

Comparar sensación antes/después. Si la mejora es insuficiente, ejecutar Fase 2 backend: throttle de `last_used_at` y paralelización segura de operaciones de entrega.

## Release

Esta optimización NO autoriza merge ni producción por sí sola. PR #58 continúa Draft hasta cerrar reintentos/saldos, firma/POD mejorada, QA de performance y QA E2E final.
