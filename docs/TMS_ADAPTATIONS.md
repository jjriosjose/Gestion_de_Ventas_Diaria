# Adaptaciones útiles del TMS — Gestion de Ventas Diaria v0.3

El documento TMS se utiliza únicamente como referencia funcional. Gestion de Ventas Diaria no se convierte en un TMS ni incorpora funciones de transporte que no aportan a la gestión comercial.

## Incorporado en v0.3

- **Jornada comercial:** la ruta/sesión representa la fecha operativa de trabajo de un vendedor.
- **Parada comercial:** cada cliente planificado es una parada de la jornada.
- **Estados y excepciones:** las visitas/rutas permiten registrar causas de no ejecución en lugar de dejar pendientes sin explicación.
- **Ventanas de atención:** estructura `client_visit_windows` preparada para días/horarios preferidos por cliente.
- **Evidencia de visita:** GPS, precisión, resultado, observaciones y fotografías forman la prueba operativa de la visita.
- **Calidad geográfica:** las coordenadas reales de las visitas se comparan con el maestro para detectar errores territoriales.
- **Geografía verificada:** Región/Provincia/Municipio no se sobrescriben automáticamente cuando difieren; se genera una sugerencia para revisión administrativa.
- **Polígonos administrativos:** `administrative_areas` permite cargar límites oficiales y resolver una coordenada contra Región/Provincia/Municipio/Localidad mediante PostGIS.

## Deliberadamente fuera de alcance

- GPS continuo / telemetría de vehículos.
- Cubicaje, capacidad, peso, muelles y carga de camiones.
- Gestión WMS/ERP logística.
- Vehículos, placas, conductores y combustible.
- Prueba de entrega logística.

## Flujo de calidad geográfica

1. El vendedor inicia/finaliza una visita y se registra GPS puntual.
2. Al finalizar una visita de cliente se ejecuta `record_geo_verification_from_visit`.
3. PostGIS consulta los polígonos cargados en `administrative_areas`.
4. Si maestro y geografía detectada coinciden, el cliente puede quedar `VERIFICADA` cuando la precisión GPS es aceptable.
5. Si difieren, el cliente queda `POSIBLE_ERROR` y se crea un evento de revisión.
6. Un Administrador/Supervisor decide si aprueba o rechaza la corrección desde **Calidad geográfica**.

La primera etapa es conservadora: ninguna diferencia territorial sobrescribe automáticamente el maestro.
