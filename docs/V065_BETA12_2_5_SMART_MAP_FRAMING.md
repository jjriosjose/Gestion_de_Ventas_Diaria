# V0.6.5-beta.12.2.5 · Smart Map Framing

## Objetivo
Mejorar el aprovechamiento cartográfico de Tracking antes de la prueba multi-vendedor real, especialmente en Mapa grande y Control Tower.

## Cambios
- Encuadre adaptativo según cantidad de vendedores visibles.
- Una ruta/vendedor usa un zoom más cercano para aprovechar la superficie disponible.
- Dos a cuatro vendedores usan un fit conjunto con margen controlado.
- Cinco o más vendedores reducen el zoom máximo para mantener contexto.
- Al seleccionar una ruta, el mapa prioriza sus paradas y puntos GPS coherentes.
- Los registros `DISTANT_REGISTRATION` y GPS no confiables no fuerzan el encuadre operativo normal.
- Calidad GPS conserva su comportamiento especial de comparación R ↔ C.
- El playback conserva el control de cámara sobre el evento reproducido.
- ResizeObserver vuelve a calcular el encuadre cuando se cambia entre Estándar, Mapa grande y Control Tower.
- No modifica coordenadas, datos, reglas de geocalidad ni el orden de rutas.

## Seguridad y alcance
No modifica Supabase, RLS, permisos, captura GPS, Rutas, Visitas, Jornadas ni datos operativos. No requiere SQL.

## QA esperado
1. Con un vendedor, Mapa grande/Control Tower debe acercarse a la zona de sus paradas.
2. Con 2–4 vendedores próximos, debe encuadrar todas las rutas sin exceso de espacio vacío.
3. Con vendedores geográficamente alejados, debe ampliar el contexto hasta incluirlos.
4. Seleccionar un vendedor debe priorizar su ruta.
5. Calidad GPS debe seguir mostrando comparaciones distantes completas.
