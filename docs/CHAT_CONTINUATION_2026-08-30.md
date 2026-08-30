# Continuidad de chat — Gestión de Ventas Diaria

Fecha del checkpoint: **30/08/2026 (República Dominicana)**

> Este documento existe para continuar el proyecto en un nuevo chat sin depender del historial completo. Si algo aquí difiere del estado real de GitHub, Supabase o Cloudflare, **los servicios reales son la fuente de verdad**.

## 1. Fuentes de verdad

- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`
- Rama estable: `main`
- Frontend: React + TypeScript + Vite
- Backend: Supabase
- Deploy: Cloudflare Workers / Wrangler
- No asumir que una función existe solo porque fue mencionada en conversaciones anteriores: verificar primero el código y los servicios.
- No ejecutar cambios de código, deploys, migraciones ni modificaciones de datos al comenzar el nuevo chat. Primero reconstruir contexto y auditar.

## 2. Estado productivo actual

- Versión en `main`: **0.6.5-beta.12.2.5**
- Último bloque: **Smart Map Framing**
- PR #51: fusionado a `main`
- Merge SHA: `82ec55ea192032836076eafd934b0375c774daaf`
- Build TypeScript + Vite: SUCCESS antes del merge
- Cloudflare producción: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Cloudflare Current Version ID: **`c359c16b-b8fa-4e86-98b5-79c30d22e83d`**

La interfaz debe mostrar versión `0.6.5-beta.12.2.5` después de refresco fuerte.

## 3. Tracking — estado actual

Tracking es una pantalla de control operativo / torre de control, no GPS continuo de fondo.

### Capacidades actuales

- ruta `/tracking`
- permiso `tracking.view`
- Administrador/Supervisor global por defecto; otros perfiles sin acceso por defecto salvo override explícito
- backend también protege el acceso; no depender solo del menú/frontend
- filtros por fecha, vendedor, estado, frescura, territorio, recorrido, tipo de registro, calidad GPS y registro vs cliente
- KPI operativos
- modos: `En vivo`, `Recorridos`, `Calidad GPS`
- vistas de layout: `Estándar`, `Mapa grande`, `Control Tower`
- panel `Fuerza de calle`
- playback por `route_plan_id`, nunca mezclar dos planes del mismo vendedor
- timeline de eventos GPS
- mapa Leaflet + OSM
- colores estables por vendedor
- número de parada siempre visible; estado como segunda señal visual
- líneas/flechas de secuencia planificada
- comparación `R = registro` vs `C = ubicación maestra del cliente`
- anomalías geográficas no bloquean la gestión
- GPS no confiable se conserva para auditoría, pero no debe presentarse como ubicación exacta
- registros distantes/no confiables no deben deformar el encuadre operativo normal
- Calidad GPS sí puede abrir el mapa para mostrar `R ↔ C`
- Smart Map Framing beta.12.2.5:
  - 1 vendedor: zoom más cercano
  - 2–4 vendedores: fit conjunto
  - 5+: contexto más amplio
  - ruta seleccionada: prioridad de cámara
  - ResizeObserver al cambiar Estándar/Mapa grande/Control Tower

### Definición importante

No hay breadcrumbs/GPS continuo en segundo plano. Existen puntos GPS reales asociados a eventos: inicio/fin de ruta, inicio/fin de visita y eventualidades. Las uniones entre puntos son estimadas y no deben presentarse como calle exacta recorrida.

## 4. Validación GPS beta.12.x

Prueba real con Cesar Caba desde móvil:

- precisión aprox. ±15 m
- calidad GPS excelente
- registro realizado físicamente en Santo Domingo para cliente con punto maestro en Barahona
- distancia aprox. 130 km
- clasificación `DISTANT_REGISTRATION`
- la visita se permitió y quedó marcada para auditoría

Esto confirmó la regla actual: una anomalía geográfica **no bloquea** la gestión; se registra y se audita.

## 5. Supabase tracking ya aplicado

No pedir al usuario ejecutar SQL de beta.12. Las migraciones de tracking ya fueron aplicadas.

Vistas públicas estables:

- `executive_tracking_events_v1`
- `executive_tracking_stops_v1`
- `executive_tracking_snapshot_v1`

Función de permiso:

- `private.current_user_can_view_tracking()`

Scoping:

- Admin/Supervisor con permiso -> global
- otros con permiso explícito -> solo sus propias filas
- sin permiso -> 0 filas

## 6. Principio de producto

La aplicación debe evolucionar como producto empresarial comercializable / SaaS-ready, no como lógica rígida exclusiva de Almacenes Karaka.

Concepto comercial recomendado:

**Field Sales Execution / Sales Force Automation (SFA) con inteligencia geográfica**.

No implementar multi-tenancy parcial improvisado. Para una demo futura se acordó que la opción profesional es:

- app demo separada
- branding neutral
- Supabase Demo independiente
- usuario demo con permisos completos
- datos ficticios
- ninguna acción de demo debe afectar producción
- posible reset periódico de datos demo

Esta fase demo/SaaS todavía NO se ha ejecutado.

## 7. Datos de prueba y Go-Live

Los datos actuales siguen considerándose **TEST** hasta que el usuario declare explícitamente Go-Live.

- no borrar/resetear historial de prueba sin aprobación
- no asumir que es momento de limpiar producción
- cualquier dataset artificial para QA debe ser claramente identificable y reversible

## 8. Próxima prueba de Tracking

Después de beta.12.2.5, el siguiente QA deseado es multi-vendedor con 3–4 vendedores para validar:

- colores por vendedor
- smart framing
- rutas próximas y parcialmente solapadas
- Fuerza de calle con varias tarjetas
- selección individual y atenuación de otras rutas
- flechas y secuencia
- puntos cercanos/solapados
- Control Tower

No insertar datos de prueba en Supabase sin confirmar primero el escenario y la reversibilidad.

## 9. TAREA PENDIENTE PRIORITARIA — CARTERA → RUTAS MENSUALES EN EXCEL

La última solicitud del usuario antes de cambiar de chat es **NO código**. Es un análisis de la base/cartera y generación de un Excel para luego cargar rutas de prueba en la app.

Solicitud exacta a reconstruir:

1. localizar y analizar detalladamente el documento/archivo **Cartera** disponible en el proyecto/conversación;
2. utilizar toda la información relevante de clientes, incluyendo cuando exista:
   - última fecha de compra
   - última fecha de pago
   - montos de compra/venta
   - balances u otros indicadores
   - vendedor asociado
   - gestor asociado
   - región/provincia/municipio
   - latitud/longitud
3. crear un **Excel de rutas diarias por vendedor para un mes completo**;
4. días de trabajo: **lunes a viernes**;
5. mínimo **8 clientes diarios por vendedor** cuando la cartera disponible lo permita;
6. **excluir cadenas**;
7. algunos clientes deben programarse **2 veces en el mes**, priorizados con una lógica defendible basada en fecha de compra, monto, pago/recencia y relevancia comercial;
8. las rutas deben tener coherencia geográfica, no solo prioridad comercial: agrupar/ordenar por proximidad usando ubicación/territorio cuando exista;
9. evitar asignaciones absurdas entre provincias/zonas en un mismo día;
10. conservar vendedor/gestor real del cliente;
11. preparar el Excel de forma que posteriormente pueda utilizarse como dataset de prueba/carga de rutas en la app;
12. documentar claramente la lógica de priorización y cualquier cliente excluido por falta de datos o por ser cadena.

### Antes de generar el Excel

En el nuevo chat:

- usar Files para localizar el archivo Cartera si no está adjunto directamente;
- leer la skill de spreadsheets (`/home/oai/skills/spreadsheets/SKILL.md`) antes de crear/modificar Excel;
- inspeccionar nombres de hojas/columnas y calidad de datos;
- identificar cómo reconocer `cadenas` con la información real del archivo, no inventar una lista ciega;
- validar qué mes se va a planificar. Si el archivo y el contexto no determinan el mes, pedir únicamente ese dato antes de generar rutas;
- no modificar Supabase ni la app para esta tarea;
- primero entregar el Excel y explicar la lógica; después el usuario decidirá si se carga a la app.

## 10. Regla para comenzar el próximo chat

El nuevo chat debe iniciar con una **Auditoría de Continuidad breve**:

1. leer este documento;
2. verificar `package.json` en GitHub `main`;
3. verificar estado actual del repositorio antes de cualquier cambio;
4. no tocar código ni datos;
5. localizar el archivo Cartera;
6. analizarlo;
7. continuar con la tarea de rutas mensuales en Excel.

## 11. Workflow de desarrollo que debe mantenerse

Cuando posteriormente haya cambios de código:

- trabajar en feature branch
- PR hacia `main`
- revisar archivos cambiados
- esperar GitHub Actions build
- fusionar solo con CI verde
- usuario hace GitHub Desktop Fetch/Pull
- `npm run build`
- luego `npm run deploy`
- no afirmar deploy hasta recibir Wrangler `Current Version ID`
- registrar checkpoint de producción

No trabajar directamente sobre `main` salvo documentación/checkpoints muy controlados.

## 12. Nota sobre PROJECT_HANDOFF.md

`PROJECT_HANDOFF.md` existe, pero su cabecera de estado quedó en beta.10. Contiene historial y decisiones arquitectónicas útiles, pero para el estado operativo más reciente debe leerse primero **este documento de 30/08/2026**, y luego usar `PROJECT_HANDOFF.md` como contexto histórico.
