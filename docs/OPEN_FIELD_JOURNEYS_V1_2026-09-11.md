# Jornadas Libres y Visitas Adicionales V1

Fecha inicial: **11/09/2026 (RD)**  
Última actualización: **13/09/2026 (RD)**

Estado: **PRODUCTIVO / QA E2E APROBADO / CI PRE Y POST MERGE SUCCESS / CLOUDFLARE DEPLOY SUCCESS**

Release productivo: **0.6.5-beta.15.0**

PR: **#60 — MERGED**

Merge productivo: `ea6a7314e34dbbdad2a54b6590c177f1bcebadf0`

Cloudflare Version ID: `6889d500-e3f0-477a-9994-79a5c6c30bf9`

Producción: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

## Objetivo

Permitir que un vendedor pueda trabajar en calle aunque Dirección no haya creado previamente una ruta para ese día, y permitir que dentro de una ruta planificada visite clientes adicionales sin alterar artificialmente la cobertura del plan original.

La Jornada Libre mide los mismos hitos temporales de una jornada planificada:

- inicio/salida de jornada;
- llegada al cliente;
- tiempo de atención;
- salida del cliente;
- siguientes visitas;
- eventualidades;
- cierre de jornada.

La diferencia funcional es que no existe una secuencia previa de clientes ni un denominador de cobertura planificada.

## Reglas funcionales

### Jornada Libre

- Solo un `Vendedor` activo puede iniciarla.
- Solo puede iniciarse para el día actual.
- No puede iniciarse si el vendedor ya tiene una jornada activa.
- No puede iniciarse si existe una ruta planificada disponible para el mismo vendedor en el día actual.
- **Solo puede existir una Jornada Libre por vendedor y fecha, aunque la primera ya haya sido finalizada.**
- Después de cerrar la Jornada Libre, el vendedor no puede iniciar otra hasta el próximo día.
- Internamente se crea un `route_plan` técnico con `route_mode = LIBRE` y cero paradas planificadas.
- El orden transaccional es: plan técnico `PLANIFICADA` → `route_session` → plan `ACTIVA`.
- La cobertura se muestra `N/A`.
- La acción para el usuario se presenta como **`Visitar cliente`**, no `Visita adicional`.

### Visita adicional en ruta planificada

- Se ejecuta dentro de la misma `route_session` activa.
- Guarda `planned = false`.
- Guarda `route_stop_id = null`.
- Puede pertenecer a la cartera del vendedor o ser un cliente encontrado fuera de cartera.
- Si el cliente ya existe como parada planificada en la ruta actual, el sistema bloquea la visita adicional.
- Solo puede existir una visita abierta por empleado.
- No puede iniciarse una visita adicional mientras exista una eventualidad activa.
- Usa el mismo cierre comercial de una visita planificada.

## Tiempos y GPS

Las Jornadas Libres reutilizan las mismas entidades operativas:

- `route_sessions.started_at`: inicio/salida de jornada;
- `visits.started_at`: llegada al cliente;
- `visits.ended_at`: salida del cliente;
- duración de atención = llegada → salida;
- `route_sessions.ended_at`: cierre definitivo.

### Fallback GPS de salida

Previo a producción se endureció el cierre de visita:

1. primer intento GPS;
2. si falla, opción explícita `Intentar nuevamente`;
3. si vuelve a fallar, posibilidad de `Finalizar sin coordenadas`;
4. la gestión comercial, hora de salida, seguimiento, showroom, observaciones y evidencia no se pierden por un fallo GPS.

El inicio de ruta/jornada mantiene la necesidad de obtener ubicación antes de arrancar; un fallo inicial no debe dejar una sesión huérfana.

## Resultado comercial `NO_GESTIONADO`

Se incorporó el resultado:

**Cliente no estaba / no gestionado**

Cuando `¿Lo recibieron? = No`, el formulario propone:

- `purchase_result = NO_GESTIONADO`;
- `visit_result = NO_RECIBIDO`.

Esto evita clasificar como `No compró` una visita donde realmente no existió una gestión comercial completa.

## Showroom — confirmación de fecha/hora

El selector nativo de fecha/hora se complementó con confirmación explícita. La fecha/hora de showroom debe seleccionarse y confirmarse antes de finalizar la visita cuando corresponda.

## Métricas

Una ruta planificada reporta por separado:

- `Planificados`;
- `Visitados plan`;
- `Cobertura plan`;
- `Visitas adicionales`;
- `Total visitas`.

Las visitas adicionales **nunca aumentan el numerador ni el denominador de cobertura del plan**.

En Jornada Libre:

- Planificados = 0;
- Cobertura = `N/A`;
- `Realizadas` = visitas finalizadas;
- Total visitas = visitas finalizadas;
- una visita abierta aparece como `En visita`.

## Tracking — alerta >45 min

Se reemplazó la lectura ambigua anterior por un KPI especializado:

**Sin registro >45 min**

Reglas:

- se calcula sobre vendedores con jornada activa;
- cuenta vendedores únicos, no filas/rutas;
- si existen vendedores que superan 45 minutos sin nuevo registro operativo, el KPI indica cuántos requieren revisión;
- al hacer clic se muestra el detalle de esos vendedores para investigación;
- no se agregó GPS continuo, polling nuevo, Realtime ni escrituras periódicas.

La calidad GPS y la coherencia geográfica se mantienen separadas:

- `accuracy_m` expresa incertidumbre de la coordenada capturada;
- distancia al cliente compara esa coordenada con el punto maestro;
- una coordenada puede tener precisión de ±150 m y aun estar a decenas o cientos de kilómetros del cliente.

## Cambios de Supabase

Migraciones aplicadas y alineadas con GitHub:

1. `20260911225302_open_field_journeys_v1`
   - `route_plans.route_mode = PLANIFICADA | LIBRE`;
   - índice modo/fecha/empleado;
   - índice único parcial para una sola `route_session` ACTIVA por empleado;
   - RPC `public.start_open_journey(...)`;
   - RPC `public.start_additional_visit(...)`;
   - vista `public.executive_route_journeys_v4`.
2. `20260912163228_open_field_journey_start_fix`
   - corrige el orden de creación para respetar guards históricos.
3. `20260912172056_open_field_one_free_journey_per_day`
   - índice único de una Jornada Libre por empleado/fecha;
   - guard adicional en `start_open_journey(...)`.

No reejecutar migraciones por memoria: verificar migraciones vivas antes de cualquier acción futura.

## Cambios frontend principales

### `src/pages/Routes.tsx`

- Jornada Libre cuando corresponde.
- `Jornada del día finalizada` después del cierre.
- `Visitar cliente` en Jornada Libre.
- `Visita adicional` en ruta planificada.
- KPIs Plan vs actividad real.
- separación visual de visitas libres/adicionales.
- cierre compatible con Jornada Libre.

### `src/components/AdditionalVisitModal.tsx`

- copy contextual por tipo de jornada;
- cartera por defecto;
- búsqueda global por nombre/código;
- cliente planificado bloqueado;
- llegada mediante RPC y GPS.

### `src/pages/Journeys.tsx`

- `executive_route_journeys_v4`;
- `Modo`, `Visitados plan`, `Adicionales`, `Total`;
- cobertura `N/A` en Jornada Libre;
- Excel diferenciado Plan vs Adicionales.

### `src/pages/Visits.tsx`

- fallback GPS de salida;
- `NO_GESTIONADO`;
- confirmación explícita de fecha/hora showroom.

### `src/pages/Tracking.tsx`

- KPI `Sin registro >45 min`;
- detalle clicable de vendedores que requieren revisión;
- sin tracking continuo adicional.

## QA real — Jornada Libre

Usuario TEST: **Cesar Caba**.

Validado:

1. Sin ruta planificada → aparece `Iniciar jornada libre`.
2. Inicio correcto.
3. Llegada a cliente libre.
4. `planned=false`, `route_stop_id=null`.
5. Formulario comercial normal.
6. Salida con hora/GPS.
7. Cierre sin pendientes artificiales.
8. Sesión y plan `FINALIZADA`.
9. Cobertura `N/A`.
10. Segunda Jornada Libre del mismo día bloqueada en UI y DB.

Caso validado:

- duración jornada ~7.55 min;
- visitas: 1;
- pendientes: 0;
- cierre `NORMAL / SIN_PENDIENTES`.

## QA real — ruta planificada + adicionales

Prueba 13/09/2026:

- 3 paradas planificadas;
- 3 planificadas finalizadas `VISITADO`;
- 2 visitas fuera del plan completadas;
- 5 visitas totales;
- 0 visitas abiertas al cierre;
- ruta y sesión `FINALIZADA`.

La prueba confirmó que las adicionales no alteran la cobertura planificada.

## QA de endurecimiento

Validado por usuario:

- fallo GPS inicial de navegador no creó una sesión huérfana;
- intento posterior capturó GPS y creó una única sesión válida;
- `Cliente no estaba / no gestionado`;
- confirmación explícita de fecha/hora showroom;
- Tracking `Sin registro >45 min`;
- smoke de Rutas, Jornadas, Visitas y Tracking.

Antes de promoción se verificó en Supabase:

- 0 sesiones activas;
- 0 visitas abiertas;
- sin duplicidad de jornadas activas.

## CI y promoción

- CI feature antes del release: **SUCCESS**.
- Release branch: `0.6.5-beta.15.0`.
- PR #60: **MERGED**.
- Merge SHA: `ea6a7314e34dbbdad2a54b6590c177f1bcebadf0`.
- CI post-merge sobre `main`: **SUCCESS**.
- Deploy Cloudflare: **SUCCESS**.
- Cloudflare Version ID: `6889d500-e3f0-477a-9994-79a5c6c30bf9`.

## Producción

**DESPLEGADO EN PRODUCCIÓN — 13/09/2026.**

Los datos continúan siendo TEST hasta declaración explícita de Go-Live.
