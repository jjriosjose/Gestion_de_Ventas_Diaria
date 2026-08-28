# V0.6.5-beta.12.2 — Tracking Intelligence

Fecha: **28/08/2026 (RD)**.

## Objetivo

Evolucionar Tracking de una pantalla de última posición a una torre de control empresarial capaz de visualizar simultáneamente varios vendedores, sus paradas, sus recorridos estimados y la calidad geográfica de cada registro.

No modifica la lógica de ejecución de Rutas, Jornadas ni Visitas. No añade GPS continuo en segundo plano y no bloquea gestiones por distancia o precisión.

## Modos del mapa

### En vivo

- una última posición GPS confiable por vendedor;
- estado operativo y frescura;
- paradas opcionales;
- los registros GPS no confiables no se presentan como posición exacta.

### Recorridos

- múltiples rutas visibles simultáneamente;
- color estable por vendedor;
- número/estado dentro del marcador de parada;
- línea fina punteada: secuencia planificada entre puntos, no navegación vial;
- línea gruesa discontinua: unión estimada entre eventos GPS confiables;
- marcadores `S` y `F` para inicio/fin cuando existe GPS confiable;
- selección de una ruta resalta sin ocultar las demás;
- opción `Solo ruta seleccionada` para aislarla;
- leyenda de rutas visible en el mapa.

El color identifica al vendedor. El interior del marcador identifica el estado operativo de la parada. Así no se confunden dos dimensiones distintas.

## Filtros nuevos

Segunda capa contextual:

- Recorrido: todos / activos / finalizados / con GPS / con anomalías;
- Tipo de registro: inicio ruta, llegada, salida, eventualidad, cierre;
- Calidad GPS: confiable / excelente / buena / aproximada / baja / no confiable;
- Registro vs cliente: en punto, cercano, fuera del entorno, distante, GPS no confiable o sin punto maestro.

## Calidad geográfica en Tracking

Cada evento puede mostrar:

- precisión GPS;
- calidad GPS;
- distancia registro -> cliente;
- clasificación geográfica;
- coordenada registrada;
- coordenada maestra del cliente;
- código/texto de excepción automática.

El botón `Comparar registro vs cliente` cambia el mapa a modo Calidad GPS y representa:

- `R`: lugar del registro;
- `C`: ubicación maestra del cliente;
- línea comparativa y distancia.

Estas señales son auditoría. No bloquean la gestión y no se usan por sí solas para puntuar la calidad comercial.

## Timeline rediseñado

Se reemplaza la línea comprimida que mezclaba hora, nodo y texto por una secuencia horizontal con:

- hora independiente;
- rail y nodo alineados;
- tarjeta por evento con altura mínima;
- nombre de evento;
- cliente/parada;
- badge de validación geográfica;
- precisión y distancia;
- scroll horizontal limpio;
- estado activo con borde/foco visible.

El objetivo es evitar montajes y distorsión visual cuando existen eventos cercanos en el tiempo o nombres largos.

## Paleta multi-vendedor

Paleta empresarial reutilizable de ocho colores. En una vista típica de cuatro vendedores cada recorrido mantiene un color distinto y estable durante la sesión.

La información nunca depende únicamente del color: se complementa con nombre, inicial, número de parada, estado, badges y tooltips.

## Límites deliberados

- No se afirma recorrido vial exacto porque no existe breadcrumb GPS continuo.
- Las líneas entre puntos son explícitamente estimadas.
- No se implementa geofencing bloqueante.
- No se altera la base operacional ni se requiere migración Supabase para beta.12.2.
- La auditoría histórica agregada continúa disponible en Calidad geográfica; Tracking concentra la supervisión operacional y el drill-down inmediato.

## Archivos principales

- `src/pages/Tracking.tsx`
- `src/components/LiveTrackingMap.tsx`
- `src/lib/trackingGeo.ts`
- `src/styles/tracking.css`
- `package.json`
- `public/sw.js`

## Checklist

- [x] rama aislada beta.12.2
- [x] multi-ruta y color por vendedor
- [x] filtros de recorrido/calidad
- [x] comparación registro vs cliente
- [x] timeline visual rediseñado
- [x] versión y PWA cache rotados
- [ ] TypeScript + Vite CI
- [ ] GeoJSON CI
- [ ] revisión PR
- [ ] merge a `main`
- [ ] deploy Cloudflare
- [ ] QA visual con 2–4 vendedores
