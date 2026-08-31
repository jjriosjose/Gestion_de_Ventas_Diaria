# V0.6.5-beta.12.2.7-rc.1 · Interactive Product Tour

Estado: **TEST / release candidate**. No desplegado a producción.

## Objetivo

Incorporar una demo guiada dentro de la propia aplicación para explicar visualmente las capacidades principales del sistema sin narración y sin ejecutar acciones operativas sensibles.

## Alcance

- Botón de `Recorrido interactivo` en la barra superior.
- Overlay con foco visual sobre elementos reales de la aplicación.
- Navegación guiada por permisos del usuario.
- Pasos: Inicio, Planificación, secuencia de ruta, Rutas/TMS, Jornadas, Tracking, Recorridos/Calidad, Control Tower, Calidad geográfica y Reportes.
- Controles `Anterior`, `Siguiente`, `Salir` y progreso.
- Interacciones seguras permitidas únicamente para cambios de vista de Tracking (`Recorridos` y `Control Tower`).
- El overlay bloquea el resto de la interfaz durante el tour para evitar escrituras accidentales.
- Diseño responsive para escritorio y móvil.

## Protección de alcance

- Sin SQL.
- Sin migraciones Supabase.
- Sin cambios de esquema ni RLS.
- Sin cambios en la lógica operativa de Rutas, Jornadas, Visitas o Tracking.
- Sin creación, eliminación, inicio o cierre de rutas desde el tour.
- Sin deploy Cloudflare mientras permanezca RC.

## Precisión funcional

Tracking se describe como seguimiento operativo basado en eventos GPS reales (inicio/fin de ruta, visitas y eventualidades). No se presenta como rastreo GPS continuo de fondo.

## QA automatizado

GitHub Actions `Build validation` sobre el head RC: **SUCCESS** (`tsc -b && vite build`).

## QA manual requerido

1. Abrir la rama `feature/beta12-2-7-interactive-tour` localmente.
2. Confirmar versión `0.6.5-beta.12.2.7-rc.1`.
3. Iniciar el tour desde el icono `?` de la barra superior.
4. Recorrer todos los pasos en escritorio.
5. Confirmar navegación automática entre módulos.
6. Confirmar foco visual y tarjeta explicativa.
7. Probar `Mostrar Recorridos` y `Activar Control Tower`.
8. Confirmar que las acciones operativas permanecen bloqueadas durante el tour.
9. Probar salida anticipada y reinicio del tour.
10. Probar responsive/móvil.

Solo después de QA manual aprobado se considerará promoción a `0.6.5-beta.12.2.7`.
