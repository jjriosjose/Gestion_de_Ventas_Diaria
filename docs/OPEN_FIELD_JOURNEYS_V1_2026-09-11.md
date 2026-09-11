# Jornadas Libres y Visitas Adicionales V1

Fecha: **11/09/2026 (RD)**

Estado: **IMPLEMENTADO EN RAMA / MIGRACIÓN APLICADA EN SUPABASE TEST / CI VERDE / QA DE USUARIO PENDIENTE / NO DESPLEGADO A PRODUCCIÓN**

Rama: `feature/open-field-journeys-v1`

Base de la rama: `968671f26b4cbff3896ffdc11fb325fa861b96d9`

Producción vigente mientras se valida esta funcionalidad: **0.6.5-beta.14.0**.

## Objetivo

Permitir que un vendedor pueda trabajar en calle aunque Dirección no haya creado previamente una ruta para ese día, y permitir que dentro de una ruta planificada visite clientes adicionales sin alterar artificialmente la cobertura del plan original.

## Reglas funcionales

### Jornada libre

- Solo un `Vendedor` activo puede iniciarla.
- Solo puede iniciarse para el día actual.
- No puede iniciarse si el vendedor ya tiene una jornada activa.
- No puede iniciarse si existe una ruta planificada disponible para el mismo vendedor en el día actual.
- Internamente se crea un `route_plan` técnico con:
  - `route_mode = LIBRE`;
  - `plan_type = MIXTA`;
  - `status = ACTIVA`;
  - cero paradas planificadas.
- También se crea su `route_session` activa con GPS/hora de salida.
- No se crean `route_stops` artificiales para las visitas libres.
- La cobertura del plan se muestra como `N/A` porque no existe un denominador planificado.

### Visita adicional

- Se ejecuta dentro de la misma `route_session` activa.
- Guarda `planned = false`.
- Guarda `route_stop_id = null`.
- Puede pertenecer a la cartera del vendedor o ser un cliente encontrado fuera de cartera.
- Si el cliente ya existe como parada planificada en la ruta actual, el sistema bloquea la visita adicional y obliga a registrar la llegada desde la parada original.
- Solo puede existir una visita abierta por empleado.
- No puede iniciarse una visita adicional mientras exista una eventualidad activa.
- Usa el mismo cierre de visita ya existente: GPS de salida, resultado comercial, compra, fotos, seguimiento, showroom y verificación geográfica.

## Métricas

Una ruta planificada debe reportar por separado:

- `Planificados`;
- `Visitados plan`;
- `Cobertura plan`;
- `Visitas adicionales`;
- `Total visitas`.

Ejemplo:

- 10 planificados;
- 8 visitados del plan;
- 3 adicionales;
- cobertura = 80%;
- total visitas = 11.

Las visitas adicionales **nunca aumentan el denominador ni el numerador de cobertura del plan**.

En Jornada Libre:

- Planificados = 0;
- Cobertura plan = `N/A`;
- Visitas adicionales/libres = actividad real;
- Total visitas = visitas finalizadas de la jornada.

## Cambios de Supabase

Migración viva TEST:

`20260911225302_open_field_journeys_v1`

Archivo GitHub:

`supabase/migrations/20260911225302_open_field_journeys_v1.sql`

Incluye:

1. `route_plans.route_mode` con valores `PLANIFICADA | LIBRE`.
2. Índice de búsqueda por modo/fecha/empleado.
3. Índice único parcial `route_sessions_one_active_employee_idx` para impedir más de una jornada activa por empleado incluso si el frontend falla.
4. RPC `public.start_open_journey(...)`.
5. RPC `public.start_additional_visit(...)`.
6. Vista `public.executive_route_journeys_v4` con:
   - `route_mode`;
   - `planned_visit_records`;
   - `additional_visits`;
   - `additional_visit_records`;
   - `total_completed_visits`.

No reejecutar esta migración por memoria: verificar `supabase_migrations` antes de cualquier acción futura.

## Cambios frontend

### `src/pages/Routes.tsx`

- Banner `Iniciar jornada libre` cuando corresponde.
- Auto-selección de la jornada activa del vendedor.
- Etiqueta explícita `Jornada libre | Ruta planificada`.
- Botón `Visita adicional` en jornada activa.
- Visitas adicionales separadas de las paradas planificadas.
- Jornada Libre no fabrica mapa/secuencia de paradas inexistentes.
- KPIs Plan vs Adicionales.
- Cierre compatible con Jornada Libre.
- Excel/PDF de ruta identifica `Origen = PLANIFICADA | ADICIONAL`.

### `src/components/AdditionalVisitModal.tsx`

- Tu cartera por defecto.
- Búsqueda por nombre/código en toda la base al escribir al menos 2 caracteres.
- Cliente planificado bloqueado.
- Navegación Google Maps cuando hay coordenadas.
- Registro de llegada mediante RPC con GPS.

### `src/pages/Journeys.tsx`

- Usa `executive_route_journeys_v4`.
- Muestra `Modo`, `Visitados plan`, `Adicionales`, `Total`.
- Cobertura `N/A` en Jornada Libre.
- Excel diferencia Plan vs Adicionales.
- Drawer muestra visitas adicionales por separado.

## Tracking

La Jornada Libre conserva un `route_plan_id` técnico precisamente para mantener compatibilidad con el Tracking existente.

Los eventos reales de visitas adicionales se registran en `visits` y por tanto pueden alimentar la cronología/posición del vendedor sin tracking continuo.

No se agrega:

- polling nuevo;
- Realtime;
- GPS continuo;
- breadcrumbs periódicos.

## Controles de seguridad

- Identidad del vendedor se resuelve en backend con `private.current_employee_id()`.
- RPC de Jornada Libre no acepta un employee_id arbitrario enviado por navegador.
- RPC de visita adicional verifica que la sesión pertenezca al vendedor autenticado.
- Índice único DB impide dos jornadas activas simultáneas.
- Guard existente impide más de una visita abierta simultánea.
- Guard de fecha sigue impidiendo continuar una sesión en días posteriores.

## QA obligatorio antes de producción

1. Vendedor sin ruta planificada:
   - ve `Iniciar jornada libre`;
   - inicia jornada;
   - registra una visita;
   - finaliza visita;
   - registra otra;
   - cierra jornada;
   - Jornadas muestra Plan 0 / Adicionales reales / Total real / Cobertura N/A.
2. Vendedor con ruta planificada:
   - inicia ruta normal;
   - parada planificada sigue funcionando;
   - inicia visita adicional a cliente fuera del plan;
   - cliente planificado no puede registrarse como adicional;
   - cobertura plan no cambia por la adicional;
   - Total visitas sí aumenta.
3. Guards:
   - segunda jornada activa bloqueada;
   - segunda visita abierta bloqueada;
   - visita adicional durante eventualidad bloqueada;
   - jornada libre bloqueada cuando existe plan disponible hoy.
4. Tracking/Jornadas/Visitas deben continuar cargando sin regresiones.

## CI

Build validation del head `d9dca7bbd559f8cf60779924ab39b7a03e81e28f`: **SUCCESS**.

## Producción

**NO mergear / NO desplegar todavía.** Primero completar QA local con usuario Vendedor y validar datos en Supabase.