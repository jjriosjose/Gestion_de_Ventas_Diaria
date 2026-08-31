# V0.6.5-beta.12.2.7-rc.4 · Interactive Product Tour + Gestión del Gestor

Estado: **TEST / release candidate**. No desplegado a producción.

## Objetivo

Completar el recorrido interactivo incorporando el flujo comercial del Gestor, manteniendo el tour no destructivo y respetando permisos reales del usuario.

## Base heredada de RC3

- Vista `Automática / Cómoda / Compacta`.
- Adaptación de composición para 1920×1080 y otras alturas disponibles.
- Scroll inteligente del tour.
- Simulación visual de `Cercanos → Lejanos / Lejanos → Cercanos` en Planificación.
- Posicionamiento optimizado de la tarjeta explicativa.
- Acciones operativas sensibles bloqueadas durante el recorrido.

## Nuevos pasos de Gestión del Gestor

### 06 · Gestor / CRM · Llamadas

- Cartera priorizada con contexto 360.
- Última llamada, última visita, resultado comercial y estado de showroom.
- Seguimientos y próxima acción.
- Una llamada puede generar una solicitud de showroom pendiente de validación.
- El tour no registra llamadas ni crea citas.

### 07 · Agenda / Showroom

- Solicitud → validación → cita confirmada / reprogramada.
- Seguimiento de asistencia y conversión.
- Una intención de showroom no cuenta como cita pactada hasta su confirmación.

### 08 · Visitas y seguimiento

- Llegada, salida, duración, resultado, compra, contacto y próxima acción.
- Una visita con interés de showroom puede originar una solicitud para el flujo del Gestor.
- El tour no inicia ni finaliza visitas.

### 09 · Recepción

- Citas esperadas.
- Personas dentro del showroom.
- Clientes en espera.
- Atenciones en curso.
- Separación entre llegada física y gestión comercial.

## Numeración posterior

- 10 · Tracking.
- 11 · Recorridos y Calidad.
- 12 · Control Tower.
- 13 · Calidad geográfica.
- 14 · Inteligencia / Reportes.

## Protección de alcance

- Sin SQL.
- Sin migraciones Supabase.
- Sin cambios de esquema ni RLS.
- Sin cambios en lógica operativa de Rutas, Jornadas, Visitas, Llamadas, Agenda, Recepción o Tracking.
- Sin deploy Cloudflare.
- Sin merge a `main` durante QA.

## QA requerido

1. Confirmar versión `0.6.5-beta.12.2.7-rc.4`.
2. Ejecutar el recorrido desde Inicio.
3. Confirmar pasos 06–09: Llamadas → Agenda → Visitas → Recepción.
4. Verificar que cada paso navega y hace scroll al área correcta.
5. Confirmar que el texto describe el flujo real de datos.
6. Confirmar que no se ejecutan acciones de escritura durante esos pasos.
7. Completar Tracking, Control Tower, Calidad y Reportes.
8. Validar salida anticipada y reinicio del tour.

Solo después de QA manual aprobado se considerará promoción.
