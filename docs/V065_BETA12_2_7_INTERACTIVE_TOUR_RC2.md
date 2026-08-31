# V0.6.5-beta.12.2.7-rc.2 · Interactive Product Tour

Estado: **TEST / release candidate**. No desplegado a producción.

## Cambio frente a rc.1

El paso `Secuencia de ruta` deja de ser solo textual y ahora incluye una demostración visual superpuesta sobre el mapa de Planificación:

- Ruta punteada verde `Cercanos → Lejanos`.
- Ruta punteada violeta `Lejanos → Cercanos`.
- Flechas de dirección.
- Numeración 1..6 en ambos sentidos.
- Animación de flujo de las líneas.
- Leyenda visible.
- Etiqueta `SIMULACIÓN VISUAL · NO GUARDA DATOS`.

La representación durante el tour es demostrativa cuando todavía no hay vendedor/clientes seleccionados; la lógica operativa real continúa usando las coordenadas de los clientes seleccionados.

## Seguridad

- No crea rutas.
- No escribe en Supabase.
- No modifica Tracking, Jornadas, Visitas ni Rutas.
- No ejecuta SQL ni migraciones.
- No despliega a Cloudflare.

## QA manual

1. Abrir el tour.
2. Avanzar hasta `03 · SECUENCIA DE RUTA`.
3. Confirmar que el mapa muestre simultáneamente las dos rutas punteadas con sentidos opuestos y numeración inversa.
4. Confirmar que se lea claramente que es una simulación visual.
5. Continuar el tour y validar Tracking / Control Tower.
6. Probar salida anticipada y reinicio.

Solo después de QA manual aprobado se considerará promoción a `0.6.5-beta.12.2.7`.
