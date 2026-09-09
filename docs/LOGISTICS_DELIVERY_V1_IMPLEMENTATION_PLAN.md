# Logistics & Delivery V1 — Plan de implementación

Fecha: **06/09/2026 (RD)**

Estado: **IMPLEMENTACIÓN EN PROGRESO EN `feature/logistics-delivery-v1` / NO PROMOVIDO A PRODUCCIÓN**

Documento rector funcional: `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`.

Política obligatoria de consumo durante validación Free: `docs/LOGISTICS_DELIVERY_V1_RESOURCE_POLICY.md`.

> Este plan divide el módulo en entregas pequeñas y controlables. Verificar siempre el estado real antes de cada fase. La existencia de código en la rama no implica que el módulo esté aprobado para `main` o producción.

---

# 1. Principios de ejecución

- No mezclar Logística con las tablas comerciales de rutas/visitas.
- Crear rama específica desde `main` actualizado para cada bloque o release controlado.
- Explicar DDL/RLS/Auth/Edge Function antes de aplicarlo.
- Migraciones incrementales, nunca replay ciego.
- PR + diff + CI + QA antes de merge.
- No desplegar frontend a producción hasta validar end-to-end.
- Mantener datos TEST hasta declaración explícita de uso real del nuevo módulo.
- Reutilizar componentes visuales existentes cuando sea seguro, no duplicar lógica innecesariamente.
- Durante validación en Supabase Free, priorizar consumo bajo y predecible sobre apariencia de tiempo real.
- No introducir polling periódico, auto-refresh silencioso ni Realtime en Logística V1 sin nueva decisión explícita.

---

# 2. Fase 0 — Auditoría técnica previa

Antes de escribir código:

- verificar `main` real y versión;
- leer `CHAT_CONTINUATION_CURRENT.md`;
- leer diseño funcional completo;
- inspeccionar esquema Supabase actual;
- revisar roles/permisos existentes;
- revisar patrón de migraciones;
- revisar Storage actual;
- revisar Edge Functions existentes;
- revisar componentes de mapa/Tracking/fotos/Excel;
- revisar límite de bundle y UX móvil.

Salida: diseño técnico final y lista exacta de objetos a crear/modificar.

Estado: realizada para el primer bloque de implementación.

---

# 3. Fase 1 — Núcleo de datos y permisos

Objetivo: crear base segura del dominio sin mezclarla con rutas/visitas comerciales.

Implementado inicialmente:

- `delivery_transport_providers`;
- `delivery_drivers`;
- `delivery_vehicles`;
- `delivery_trips`;
- `delivery_stops`;
- `delivery_documents`;
- `delivery_events`;
- `delivery_incidents`;
- `delivery_proofs`;
- `delivery_proof_documents`;
- `delivery_evidence`;
- `delivery_import_batches`;
- `delivery_access_links`;
- RLS del dominio;
- bucket privado `delivery-evidence`.

Estado: migración aditiva aplicada en Supabase; pendiente QA integral antes de promover frontend.

---

# 4. Fase 2 — Maestros logísticos

UI:

- Vehículos;
- Choferes;
- Transportistas.

Reglas:

- vehículo propio / alquilado / tercero;
- vehículo ocasional;
- chofer interno / contratado / tercero;
- chofer ocasional sin usuario;
- snapshots al asignar un viaje.

Estado: implementación base creada en rama; pendiente QA funcional/móvil.

---

# 5. Fase 3 — Importación Excel + carga manual

Implementar Excel como vía principal.

Incluye:

- lector Excel;
- normalización;
- Preview;
- validación de factura/pedido;
- duplicados;
- montos/bultos;
- lat/lon opcionales;
- matching de clientes;
- posibles coincidencias;
- clientes externos;
- ubicación pendiente;
- carga manual complementaria.

No crear clientes maestros automáticamente.

QA requerido:

- cliente existente con GPS;
- cliente existente sin GPS;
- cliente externo con GPS;
- cliente externo sin GPS;
- coordenadas inválidas/incompletas;
- varias facturas mismo destino;
- mismo cliente con destinos distintos;
- duplicados.

Estado: implementación base creada; pendiente QA con Excel representativo.

---

# 6. Fase 4 — Preparación del viaje / Despacho

Implementar:

- crear manifiesto;
- agrupar documentos en paradas;
- asignar chofer;
- asignar vehículo;
- elegir transportista;
- ordenar manualmente;
- reutilizar Cercanos/Lejanos solo en paradas con GPS;
- paradas sin GPS al final/orden manual;
- totales de monto y bultos;
- publicar viaje;
- `route_revision`.

Estado: estructura base creada; pendiente QA de secuencia, snapshots y reglas de publicación.

---

# 7. Fase 5 — Acceso Chofer interno y externo

## Interno

- capability/permisos de Logística;
- solo viajes permitidos por política del módulo.

## Externo

Mecanismo diseñado/implementado en rama:

- `delivery_access_links`;
- token aleatorio;
- hash en DB;
- expiración;
- revocación;
- PIN;
- Edge Function de acceso/acciones;
- sin `service_role` en navegador;
- experiencia móvil aislada.

## Regla obligatoria de consumo

La experiencia del chofer **NO consulta periódicamente**.

No usar:

- `setInterval` para refrescar;
- refresh automático al volver la pestaña a primer plano;
- Realtime solo para detectar cambios;
- consultas periódicas de `route_revision`.

El estado se consulta únicamente cuando:

1. se valida inicialmente enlace + PIN;
2. el chofer pulsa **Actualizar ruta** manualmente;
3. el chofer registra una acción real y la respuesta de esa acción devuelve el estado actualizado.

No hacer un segundo refresh redundante después de una acción exitosa.

QA de seguridad:

- token inválido/expirado/revocado;
- no puede leer otro viaje;
- no puede alterar monto/documentos/chofer/vehículo;
- idempotencia básica;
- ausencia de polling.

Estado: frontend y Edge Function escritos en rama; Edge Function aún no promovida como flujo validado.

---

# 8. Fase 6 — Ejecución de ruta y tiempos

Implementar eventos:

- inicio ruta;
- salida origen;
- llegada;
- inicio descarga;
- fin descarga;
- confirmación entrega;
- salida cliente;
- retorno/cierre.

Cada evento con hora + GPS cuando disponible.

Calcular tiempos derivados sin confundirlos con telemetría continua.

Estado: flujo base implementado en experiencia externa; pendiente QA end-to-end.

---

# 9. Fase 7 — Incidencias

Implementar:

- catálogo inicial;
- incidencia de viaje/parada;
- severidad;
- GPS;
- viaje detenido sí/no;
- resolución;
- tiempo afectado.

Incluir casos de ubicación/destino no localizado.

Estado: reporte desde chofer y gestión desde Torre de Control implementados en rama; pendiente QA.

---

# 10. Fase 8 — POD: firma, receptor, fotos y conciliación

Incluye:

- `delivery_proofs`;
- `delivery_proof_documents`;
- `delivery_evidence`;
- bucket privado;
- receptor;
- firma táctil;
- bultos entregados/retornados;
- foto;
- observación;
- evidencia completa/parcial.

Una firma puede cubrir varias facturas de la parada.

Regla de recursos: comprimir fotografías antes de subir y evitar evidencias duplicadas.

Estado: implementación base creada en rama; pendiente QA en móvil real.

---

# 11. Fase 9 — Torre de Control y actualización dinámica de GPS

Requisito prioritario:

- viaje puede iniciar con parada sin GPS;
- Torre de Control puede cargar/corregir GPS durante viaje activo;
- incremento de `route_revision`;
- no reiniciar viaje;
- notificación de cambio cuando el dispositivo obtiene una revisión superior;
- cambios de secuencia solo explícitos y solo pendientes;
- reconocimiento del chofer para cambios relevantes.

## Sincronización durante validación Free

Se reemplaza la idea anterior de `refresh periódico + foreground + manual` por una regla estricta:

**actualización manual + respuestas de acciones operativas.**

Torre de Control puede actualizar una parada en cualquier momento, pero el dispositivo del chofer obtiene el cambio cuando:

- pulsa **Actualizar ruta**; o
- registra su siguiente acción real y la respuesta devuelve la revisión vigente.

No existe polling, refresh por visibilidad ni Realtime por defecto.

Si Torre de Control no resuelve GPS:

- capturar GPS al `Llegué` y/o entrega;
- conservar GPS real de entrega;
- no modificar automáticamente maestro comercial.

QA con viaje parcialmente ejecutado y modificación de ubicación mientras está activo.

---

# 12. Fase 10 — Tracking logístico

Pantalla independiente del Tracking comercial.

Mostrar:

- viajes activos;
- chofer/vehículo/placa;
- propio/alquilado/tercero;
- última ubicación por evento;
- progreso;
- paradas;
- ubicación pendiente;
- incidencias;
- bultos/montos;
- mapa y timeline.

Regla semántica:

**trayectoria estimada entre eventos GPS**, no GPS continuo de fondo.

Regla de consumo: actualización manual por defecto. No polling automático.

---

# 13. Fase 11 — Historial / POD / reportes

Implementar búsqueda por:

- factura;
- pedido;
- viaje;
- cliente/destino;
- chofer;
- placa;
- transportista.

Exportaciones futuras:

- comprobante POD PDF;
- Excel operacional;
- dashboard KPI logístico.

Mantener completamente separado de KPI comerciales.

Regla de consumo: paginar/limitar; no descargar todo el histórico al abrir la pantalla.

Estado: historial/POD base creado en rama; pendiente optimización de paginación y QA.

---

# 14. Fase 12 — Hardening y optimización

- auditoría RLS;
- auditoría Edge Function/token;
- CORS;
- rate limiting si aplica;
- expiración/rotación;
- Storage access;
- compresión y límites de fotos;
- performance/indexes;
- bundle/code splitting;
- UX móvil;
- accesibilidad;
- reintentos/conectividad;
- pruebas de volumen;
- revisión de logs/auditoría;
- revisión mensual de Database Size, Storage, Egress y Edge Function invocations durante validación.

---

# 15. Release strategy recomendada

No considerar el módulo terminado solo porque compile.

Secuencia lógica:

1. foundation — esquema/maestros/permisos;
2. dispatch — Excel/manual/manifiesto;
3. driver — ejecución + acceso temporal;
4. pod — firma/foto/incidencias;
5. control tower — updates manuales + Tracking;
6. history/reporting — POD/reportes.

El PR #58 puede agrupar el prototipo integrado para QA, pero antes de promoción debe revisarse como un release único y controlado.

---

# 16. Gates antes de producción

- CI verde;
- migraciones verificadas;
- RLS verificado con Admin/acceso externo;
- Excel con datos TEST representativos;
- móvil Android/iOS navegador;
- firma y cámara;
- GPS permitido/denegado;
- señal intermitente;
- token externo expirado/revocado;
- ubicación pendiente resuelta por Torre de Control con viaje activo;
- chofer obtiene la modificación mediante refresh manual o siguiente acción;
- ubicación capturada por chofer cuando no se resolvió;
- entrega parcial;
- incidencia crítica;
- cierre y conciliación;
- historial por factura;
- Tracking sin afectar Tracking comercial;
- verificación de que no existe polling periódico ni Realtime de Logística V1;
- consumo revisado;
- rollback definido.

---

# 17. Regla de continuidad

Si este proyecto continúa en otro chat:

1. leer `docs/CHAT_CONTINUATION_CURRENT.md`;
2. leer `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md` completo;
3. leer este plan completo;
4. leer `docs/LOGISTICS_DELIVERY_V1_RESOURCE_POLICY.md` completo;
5. verificar GitHub, Supabase y producción reales;
6. no asumir que una fase está en producción por estar documentada o existir en una feature branch;
7. determinar la última fase realmente mergeada/desplegada antes de continuar.
