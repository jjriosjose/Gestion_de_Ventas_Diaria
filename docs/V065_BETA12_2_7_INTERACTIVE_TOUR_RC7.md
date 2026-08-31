# V0.6.5-beta.12.2.7-rc.7 — Interactive Tour Spotlight Mask

## Estado
TEST / release candidate. **No desplegar a producción todavía.**

## Problema observado en RC6
Los pasos con múltiples bloques funcionales usaban un `box-shadow` de gran extensión por cada foco. Al existir dos o más focos simultáneos, el oscurecimiento se acumulaba y reducía excesivamente la legibilidad de Inicio, Jornadas, Calidad geográfica y Reportes.

## Corrección RC7
- Se elimina el oscurecimiento acumulativo de cada `.product-tour-focus`.
- Se incorpora una única máscara SVG de pantalla completa.
- La máscara utiliza ventanas transparentes para el foco principal y todos los focos secundarios.
- Intensidad exterior con foco: 34%.
- Intensidad exterior sin objetivo disponible: 52%.
- Las áreas destacadas conservan el brillo original de la aplicación.
- Los bordes rojos y halos pasan a ser locales y sutiles.
- Los focos seguros de Tracking conservan interacción y pulso visual sin oscurecimiento global adicional.

## Alcance conservado
- 01 Inicio: pulso ejecutivo + KPIs + gráficos visibles.
- 05 Jornadas: filtros + indicadores + historial visible.
- 09 Recepción: KPIs + Llegada sin cita + flujo visual.
- 13 Calidad geográfica: resumen + diagnóstico.
- 14 Reportes: filtros + Calle + CRM/Showroom + resultado comercial + gráficas visibles.

## Protección
- Sin SQL ni migraciones.
- Sin cambios de esquema o RLS Supabase.
- Sin cambios funcionales de Rutas, Jornadas, Tracking, Visitas, Llamadas, Agenda o Recepción.
- Sin deploy Cloudflare.
- Sin merge a `main` durante QA.

## QA manual solicitado
1. Chrome al 100%.
2. Confirmar versión `0.6.5-beta.12.2.7-rc.7`.
3. Revisar pasos 01, 05, 09, 13 y 14.
4. Confirmar que el exterior queda atenuado, pero los bloques destacados permanecen claros y legibles.
5. Verificar que múltiples focos no oscurecen entre sí.
6. Completar el tour hasta Finalizar.

## Resultado esperado
El recorrido debe conservar jerarquía visual sin convertir la pantalla en una capa oscura: el fondo se atenúa una sola vez y cada ventana funcional permanece legible con su brillo normal.
