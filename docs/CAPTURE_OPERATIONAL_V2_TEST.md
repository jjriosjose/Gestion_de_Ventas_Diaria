# Captación Operativa V2 — Prueba aislada

> **ESTADO FINAL:** este documento describe el QA histórico de Captación Operativa V2. La funcionalidad fue promovida a **0.6.5-beta.16.3.14** y está en producción. Las vistas productivas finales son `executive_tracking_events_v2` y `executive_route_journeys_v5`. Para estado actual leer `docs/CHAT_CONTINUATION_CURRENT.md`. No repetir esta prueba contra Supabase productivo.

Fecha: 24/09/2026 (RD)

## Objetivo
Validar Captación dentro de una Ruta Planificada o Jornada Libre sin crear una jornada paralela.

## Regla principal
Una sola jornada operativa por vendedor. Dentro de ella pueden existir:
- visitas planificadas;
- visitas adicionales / jornada libre;
- captaciones;
- eventualidades.

El módulo Captación permanece separado para captaciones planificadas y no se modifica en esta primera prueba.

## Alcance de la prueba
### Rutas
- nuevo botón **Captar prospecto** durante una jornada activa;
- bloquea inicio si existe visita abierta o eventualidad activa;
- registra GPS + hora de llegada;
- inicia una interacción de captación;
- mientras está activa bloquea nueva visita, eventualidad y cierre de jornada;
- permite finalizar con resultado comercial;
- registra GPS + hora de salida;
- calcula duración;
- solo crea un registro en `prospects` cuando el resultado es **CAPTADO**;
- una gestión fallida queda registrada sin contaminar `prospects`;
- permite cancelar una captación de prueba conservando auditoría;
- fotos se adjuntan al prospecto cuando el resultado crea prospecto.

### Tracking
La rama usa `executive_tracking_events_v2_test`, que agrega:
- `CAPTURE_START`;
- `CAPTURE_END`.

Los puntos de Captación se integran a la trayectoria estimada y al mapa de eventos GPS.
Cuando el último evento es `CAPTURE_START`, la rama muestra estado **En captación**.

### Jornadas
La rama usa `executive_route_journeys_v5_test` y separa:
- tiempo de visitas;
- tiempo de captación;
- eventualidades;
- traslado / espera residual.

También expone:
- gestiones de captación;
- prospectos captados;
- captación abierta;
- tiempo total de captación.

## Backend aditivo
Migración remota y GitHub:
`20260925024317_capture_operational_v2_test_foundation.sql`

Objetos nuevos:
- `capture_interactions`;
- `start_route_capture_interaction`;
- `finish_route_capture_interaction`;
- `cancel_route_capture_interaction`;
- `executive_tracking_events_v2_test`;
- `executive_route_journeys_v5_test`.

La UI productiva 16.3.13 sigue consultando las vistas anteriores.

## Fuera de alcance de esta prueba
- ejecutar tareas planificadas de Captación como jornada `CAPTACION`;
- Historial de tareas de Captación;
- limpiar las dos tareas TEST antiguas;
- cambiar `start_open_journey`;
- reemplazar vistas productivas existentes;
- merge a `main`;
- deploy Cloudflare.

## Ajuste UX test.2
- al pulsar **Llegué / iniciar captación**, se registra GPS/hora y el modal se cierra;
- la jornada vuelve a Rutas mostrando la captación ACTIVA;
- el formulario completo de resultado, contacto, fotos y observaciones se abre únicamente al pulsar **Finalizar captación**.

## QA mínimo
1. Abrir rama `feature/capture-operational-v2-test`.
2. Iniciar una Ruta Planificada o Jornada Libre de prueba.
3. Pulsar **Captar prospecto**.
4. Registrar llegada con un nombre de negocio.
5. Verificar que aparece **Captación activa**.
6. Comprobar que visita/eventualidad/cierre están bloqueados durante la captación.
7. Finalizar con resultado distinto de CAPTADO y confirmar que no crea prospecto.
8. Repetir y finalizar como **Prospecto creado**.
9. Confirmar que el prospecto aparece en Captación.
10. Revisar Tracking: eventos Inicio/Fin de captación y GPS.
11. Revisar Jornadas: tiempo de captación separado y traslado/espera recalculado.
12. Confirmar que una visita normal sigue funcionando después.

## Promoción
No mergear ni desplegar a producción hasta QA explícito del usuario.
