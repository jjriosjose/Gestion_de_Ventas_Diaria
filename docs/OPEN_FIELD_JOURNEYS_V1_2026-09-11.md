# Jornadas Libres y Visitas Adicionales V1

Fecha inicial: **11/09/2026 (RD)**  
Última actualización QA: **12/09/2026 (RD)**

Estado: **IMPLEMENTADO EN RAMA / MIGRACIONES APLICADAS EN SUPABASE TEST / QA JORNADA LIBRE E2E APROBADO / QA RUTA PLANIFICADA + ADICIONAL PENDIENTE / NO DESPLEGADO A PRODUCCIÓN**

Rama: `feature/open-field-journeys-v1`

Base de la rama: `968671f26b4cbff3896ffdc11fb325fa861b96d9`

Producción vigente mientras se valida esta funcionalidad: **0.6.5-beta.14.0**.

## Objetivo

Permitir que un vendedor pueda trabajar en calle aunque Dirección no haya creado previamente una ruta para ese día, y permitir que dentro de una ruta planificada visite clientes adicionales sin alterar artificialmente la cobertura del plan original.

La Jornada Libre debe medir los mismos hitos temporales de una jornada planificada:

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
- Internamente se crea un `route_plan` técnico con:
  - `route_mode = LIBRE`;
  - `plan_type = VISITAS`;
  - estado inicial transaccional `PLANIFICADA` para respetar el guard histórico de inicio;
  - luego de crear correctamente la `route_session`, pasa a `ACTIVA`;
  - cero paradas planificadas.
- También se crea su `route_session` activa con GPS/hora de salida.
- No se crean `route_stops` artificiales para las visitas libres.
- La cobertura del plan se muestra como `N/A` porque no existe un denominador planificado.
- Dentro de Jornada Libre la acción se presenta al usuario como **`Visitar cliente`**, no `Visita adicional`.

### Visita adicional en ruta planificada

- Se ejecuta dentro de la misma `route_session` activa.
- Guarda `planned = false`.
- Guarda `route_stop_id = null`.
- Puede pertenecer a la cartera del vendedor o ser un cliente encontrado fuera de cartera.
- Si el cliente ya existe como parada planificada en la ruta actual, el sistema bloquea la visita adicional y obliga a registrar la llegada desde la parada original.
- Solo puede existir una visita abierta por empleado.
- No puede iniciarse una visita adicional mientras exista una eventualidad activa.
- Usa el mismo cierre de visita ya existente: GPS de salida, resultado comercial, compra, fotos, seguimiento, showroom y verificación geográfica.

## Tiempos y GPS

Las Jornadas Libres reutilizan exactamente las mismas entidades operativas:

- `route_sessions.started_at`: inicio/salida de jornada;
- `visits.started_at`: llegada al cliente;
- `visits.ended_at`: salida del cliente;
- duración de atención = diferencia entre llegada y salida;
- `route_sessions.ended_at`: cierre definitivo de jornada.

Se guardan GPS de inicio, llegada, salida y cierre usando el mismo flujo existente. La ausencia o mala precisión GPS no debe falsear los tiempos.

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
- `Realizadas` = visitas finalizadas de la jornada;
- Total visitas = visitas finalizadas de la jornada;
- una visita abierta aparece separadamente como `En visita`.

## Cambios de Supabase

Migraciones vivas TEST y alineadas con GitHub:

1. `20260911225302_open_field_journeys_v1`
   - `route_plans.route_mode = PLANIFICADA | LIBRE`;
   - índice modo/fecha/empleado;
   - índice único parcial `route_sessions_one_active_employee_idx`;
   - RPC `public.start_open_journey(...)`;
   - RPC `public.start_additional_visit(...)`;
   - vista `public.executive_route_journeys_v4`.
2. `20260912163228_open_field_journey_start_fix`
   - corrige el orden de creación de Jornada Libre para respetar `private.enforce_route_session_operational_date()`;
   - crea plan técnico `PLANIFICADA`, crea sesión y luego promueve plan a `ACTIVA`.
3. `20260912172056_open_field_one_free_journey_per_day`
   - índice único `route_plans_one_free_per_employee_day_idx` sobre `(employee_id, route_date)` cuando `route_mode = LIBRE`;
   - guard explícito en `start_open_journey(...)` para impedir una segunda Jornada Libre en la misma fecha aunque la primera esté finalizada.

No reejecutar migraciones por memoria: verificar `supabase_migrations` antes de cualquier acción futura.

## Cambios frontend

### `src/pages/Routes.tsx`

- Banner `Iniciar jornada libre` solo cuando realmente corresponde.
- Si la Jornada Libre del día ya fue finalizada, muestra **`Jornada del día finalizada`** y elimina la opción de iniciar otra.
- Auto-selección de la Jornada Libre del día para facilitar consulta posterior al cierre.
- Etiqueta explícita `Jornada libre | Ruta planificada`.
- En Jornada Libre: botón **`Visitar cliente`**.
- En ruta planificada: botón **`Visita adicional`**.
- Visitas libres/adicionales separadas de las paradas planificadas.
- Jornada Libre no fabrica mapa/secuencia de paradas inexistentes.
- KPIs Plan vs actividad real.
- Cierre compatible con Jornada Libre.
- Excel/PDF usa `Origen = JORNADA_LIBRE` para Jornada Libre y `ADICIONAL` para actividad extra de una ruta planificada.

### `src/components/AdditionalVisitModal.tsx`

- Copia contextual según `journeyMode`.
- En Jornada Libre explica que `Registrar llegada` inicia el tiempo de atención hasta `Finalizar visita y salir`.
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

La Jornada Libre conserva un `route_plan_id` técnico para mantener compatibilidad con Tracking, Jornadas y reportes existentes.

Los eventos reales de las visitas libres/adicionales se registran en `visits`; no se agrega tracking continuo.

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
- Índice único DB impide dos Jornadas Libres del mismo vendedor en la misma fecha.
- Guard existente impide más de una visita abierta simultánea.
- Guard de fecha sigue impidiendo continuar una sesión en días posteriores.

## QA real completado — Jornada Libre

Usuario TEST: **Cesar Caba**.

Flujo validado el 12/09/2026:

1. Sin ruta planificada disponible → aparece `Iniciar jornada libre`.
2. Jornada Libre inicia correctamente.
3. Se registra llegada a un cliente seleccionado durante la jornada.
4. La visita queda `planned=false` y `route_stop_id=null`.
5. Se completa el formulario comercial normal.
6. `Finalizar visita y salir` registra hora/GPS de salida.
7. Se cierra Jornada Libre sin crear pendientes artificiales.
8. Sesión y plan quedan `FINALIZADA`.
9. Cobertura = `N/A`.
10. Una segunda Jornada Libre del mismo día queda bloqueada por DB/RPC y ya no debe ofrecerse en la UI.

Validación Supabase del caso:

- Jornada: `LIBRE`;
- inicio: 13:03:45 RD aprox.;
- cierre: 13:11:19 RD aprox.;
- duración total: ~7.55 min;
- visitas registradas: 1;
- visitas libres/no planificadas: 1;
- visitas completadas: 1;
- pendientes: 0;
- cierre: `NORMAL / SIN_PENDIENTES`.

La prueba desde PC entregó precisión GPS aproximada de 10.29 km; por tanto valida flujo/tiempos, **no calidad geográfica**. No se marcó el cliente como geográficamente verificado.

## QA pendiente antes de producción

1. Ruta planificada + visita adicional:
   - iniciar ruta normal;
   - completar al menos una parada planificada;
   - iniciar visita adicional a cliente fuera del plan;
   - comprobar que cliente planificado no puede registrarse como adicional;
   - cobertura plan no cambia por la adicional;
   - Total visitas sí aumenta.
2. Guards adicionales:
   - segunda visita abierta bloqueada;
   - visita adicional durante eventualidad bloqueada;
   - Jornada Libre bloqueada cuando existe plan disponible hoy.
3. Tracking/Jornadas/Visitas deben continuar cargando sin regresiones.

## Producción

**NO mergear / NO desplegar todavía.** PR #60 permanece Draft hasta completar el QA de ruta planificada + visita adicional y validar CI final.
