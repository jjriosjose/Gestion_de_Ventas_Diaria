# V0.6.5-beta.12.2.7-rc.5 · Interactive Tour refinement

Estado: **TEST / release candidate**. No desplegado a producción.

## Objetivo

Cerrar el QA visual del recorrido interactivo ajustando los pasos de **Visitas** y **Recepción** para que demuestren la operación real y no se limiten a señalar una cabecera o un conjunto de indicadores.

## Ajustes RC5

### Visitas
- El foco principal apunta a la lista real de visitas (`.page-stack > .cards-list`).
- El tour incorpora un flujo visual no destructivo: `Llegada → Duración → Resultado → Compra / No compra → Próxima acción`.
- Se agregó `MutationObserver` al recorrido para recalcular el foco cuando los datos asíncronos terminan de cargar; evita que el marco quede reducido a una franja vacía antes de que aparezcan las filas.
- No abre ni finaliza visitas.

### Recepción
- Se mantiene el foco principal sobre los indicadores operativos de Recepción.
- Se destaca adicionalmente el botón real `Llegada sin cita` sin habilitar su acción durante el tour.
- Se incorpora un flujo visual no destructivo: `Llegada → Espera → Atención → Salida`.
- El texto aclara que la presencia física y la gestión comercial se mantienen separadas para conservar trazabilidad.
- No registra llegadas, atenciones ni salidas.

## Protección de alcance
- Sin SQL.
- Sin migraciones Supabase.
- Sin cambios de esquema ni RLS.
- Sin cambios en lógica operativa de Visitas, Recepción, Agenda, Llamadas, Rutas, Jornadas o Tracking.
- Sin deploy Cloudflare.
- Sin merge a `main` durante QA.

## QA manual requerido
1. Chrome al 100%.
2. Confirmar `0.6.5-beta.12.2.7-rc.5`.
3. Ejecutar recorrido completo.
4. En **08 · Visitas**, confirmar que el marco se expande a la lista una vez cargan los datos y que se ve el flujo visual.
5. En **09 · Recepción**, confirmar KPIs + `Llegada sin cita` + flujo visual.
6. Confirmar que ninguna de las dos pantallas ejecuta escrituras desde el tour.
7. Finalizar recorrido completo y comprobar que la app vuelve a operación normal.

Solo después del QA manual aprobado se considera promoción a `0.6.5-beta.12.2.7`.
