# V0.6.5-beta.12.2.7-rc.3 · Interactive Product Tour + Adaptive View

Estado: **TEST / release candidate**. No desplegado a producción.

## Objetivo

Resolver la necesidad de visualizar la aplicación y el recorrido interactivo a zoom normal del navegador, sin aplicar `CSS zoom` ni reducir tipografías de forma artificial.

## Cambios RC3

- Nueva preferencia de densidad: `Automática`, `Cómoda` y `Compacta`.
- `Automática` es el valor predeterminado para usuarios que aún no han elegido la nueva preferencia.
- La vista automática detecta ancho y alto de la ventana y cambia a una composición compacta cuando el espacio lo requiere.
- En 1920×1080 la vista automática usa composición compacta para aprovechar mejor la altura disponible.
- Se reducen paddings, separaciones, alturas de navegación, paneles y controles; no se escala toda la aplicación ni se altera el zoom del navegador.
- Los mapas territoriales reducen su altura mínima de forma adaptativa en pantallas con menos altura.
- El recorrido interactivo hace scroll inteligente hacia el objetivo de cada paso.
- El paso `03 · Secuencia de ruta` enfoca directamente el mapa y mantiene la simulación visual Cercanos → Lejanos / Lejanos → Cercanos.
- La tarjeta del paso 03 se fija en una zona libre de la pantalla para no exigir zoom manual.
- El tour permite desplazamiento programático/visual sin desbloquear acciones operativas sensibles.

## Protección de alcance

- Sin SQL.
- Sin migraciones Supabase.
- Sin cambios de esquema ni RLS.
- Sin cambios en lógica de Rutas, Jornadas, Visitas o Tracking.
- Sin creación/eliminación de rutas desde el tour.
- Sin deploy Cloudflare.

## QA requerido

1. Mantener Chrome en 100%.
2. Confirmar versión `0.6.5-beta.12.2.7-rc.3`.
3. Abrir `Vista rápida` y confirmar `Automática / Cómoda / Compacta`.
4. En Automática, validar Inicio, Planificación, Rutas y Tracking a 100%.
5. Ejecutar el tour completo a 100%.
6. Confirmar que cada paso hace scroll al objetivo sin intervención manual.
7. En paso 03 confirmar que el mapa y ambas rutas punteadas son visibles sin reducir el navegador.
8. Confirmar que los textos continúan legibles y que Leaflet mantiene clics/coordenadas correctos fuera del tour.
9. Validar salida anticipada y reinicio del recorrido.
10. Validar al redimensionar la ventana que Automática se recalcula.

Solo después de QA manual aprobado se considerará promoción a versión final.
