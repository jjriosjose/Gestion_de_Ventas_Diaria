# V0.6.5-beta.12.2.4 — Tracking Control Tower

## Objetivo
Dar mayor protagonismo al mapa de Tracking sin reemplazar la vista analítica existente y completar los refinamientos pendientes del QA de Recorridos.

## Nuevas vistas
- **Estándar**: conserva la experiencia actual completa.
- **Mapa grande**: oculta por defecto filtros/KPI extensos y aumenta significativamente la superficie cartográfica; filtros y panel de vendedores siguen disponibles.
- **Control Tower**: superficie fija de supervisión que ocupa prácticamente todo el viewport de la aplicación y puede colapsar filtros o Fuerza de calle.
- La preferencia de tamaño de mapa se recuerda localmente por navegador.

## Estado vacío profesional
Cuando la fecha seleccionada no tiene jornadas visibles:
- se mantiene la fecha seleccionada;
- se informa explícitamente que no hay operación planificada;
- se consulta la última fecha anterior visible con actividad;
- se ofrece `Ver última jornada con actividad` sin cambiar la fecha automáticamente.

## Recorridos
- Se conserva la numeración de parada y estado secundario de beta.12.2.3.
- Las flechas de dirección reciben mayor contraste visual mediante halo claro, sin convertir la secuencia planificada en navegación vial.
- El mayor tamaño del mapa mejora la lectura de grupos de paradas próximas y de varios vendedores simultáneos.

## Seguridad y datos
- No modifica Rutas, Visitas, Jornadas, permisos ni captura GPS.
- No cambia tablas, vistas o políticas de Supabase.
- La búsqueda de última jornada usa la vista segura `executive_tracking_snapshot_v1`, por lo que respeta el mismo alcance del usuario autenticado.
- No requiere SQL.

## Archivos
- `src/pages/Tracking.tsx`
- `src/styles/tracking-control-tower.css`
- `package.json`
- `public/sw.js`

## QA esperado
1. Día sin rutas: mensaje vacío y acceso a última jornada con actividad.
2. Vista Estándar: no debe perder ninguna función previa.
3. Mapa grande: mapa de aproximadamente 60–70% del viewport o superior según resolución.
4. Control Tower: mapa + Fuerza de calle ocupan el viewport y permiten ocultar panel/filtros.
5. Cambiar entre layouts no debe alterar filtros, jornada seleccionada ni datos.
6. Leaflet debe reajustar su tamaño al cambiar layout.
