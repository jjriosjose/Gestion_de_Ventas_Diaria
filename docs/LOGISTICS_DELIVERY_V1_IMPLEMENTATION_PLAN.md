# Logistics & Delivery V1 — Plan de implementación

Fecha: **06/09/2026 (RD)**

Estado: **PLAN / NO IMPLEMENTADO**

Documento rector funcional: `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`.

> Este plan divide el módulo en entregas pequeñas y controlables. No aplicar SQL, RLS, Auth, Edge Functions ni Storage solo por estar documentados aquí. Verificar siempre el estado real antes de cada fase.

---

# 1. Principios de ejecución

- No mezclar Logística con las tablas comerciales de rutas/visitas.
- Crear rama específica desde `main` actualizado para cada bloque o release controlado.
- Explicar DDL/RLS/Auth/Edge Function antes de aplicarlo.
- Migraciones incrementales, nunca replay ciego.
- PR + diff + CI + QA antes de merge.
- No desplegar a producción hasta validar end-to-end.
- Mantener datos TEST hasta declaración explícita de uso real del nuevo módulo.
- Reutilizar componentes visuales existentes cuando sea seguro, no duplicar lógica innecesariamente.

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

---

# 3. Fase 1 — Núcleo de datos y permisos

Objetivo: crear base segura del dominio sin UI operativa completa.

Candidatos:

- `delivery_drivers`;
- `delivery_vehicles`;
- `transport_providers`;
- `delivery_locations`;
- `delivery_trips`;
- `delivery_stops`;
- `delivery_documents`;
- `delivery_events`;
- `delivery_incidents`;
- tablas de auditoría/relación necesarias.

Definir:

- enums/check constraints;
- FKs;
- índices;
- snapshots históricos;
- RLS;
- capability codes;
- funciones backend estrictamente necesarias.

QA:

- Admin puede crear/leer;
- usuarios no autorizados no acceden;
- dominio comercial existente no cambia.

---

# 4. Fase 2 — Maestros logísticos

UI:

- Vehículos;
- Choferes;
- Transportistas;
- puntos logísticos alternativos básicos si se incluyen desde V1.

Reglas:

- vehículo propio / alquilado / tercero;
- vehículo ocasional;
- chofer interno / contratado / tercero;
- chofer ocasional sin usuario;
- snapshots al asignar un viaje.

QA móvil/desktop y permisos.

---

# 5. Fase 3 — Importación Excel + carga manual

Implementar Excel como vía principal.

Incluye:

- plantilla definida;
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

QA con casos:

- cliente existente con GPS;
- cliente existente sin GPS;
- cliente externo con GPS;
- cliente externo sin GPS;
- coordenadas inválidas/incompletas;
- varias facturas mismo destino;
- mismo cliente con destinos distintos;
- duplicados.

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
- `route_revision`/`trip_revision`.

QA de secuencia y snapshots.

---

# 7. Fase 5 — Acceso Chofer interno y externo

## Interno

- perfil/capability Chofer;
- solo viajes asignados.

## Externo

Crear mecanismo seguro:

- `delivery_access_links`;
- token aleatorio;
- hash en DB;
- expiración;
- revocación;
- PIN opcional;
- Edge Function de acceso/acciones;
- sin `service_role` en navegador;
- experiencia móvil aislada.

QA de seguridad:

- token inválido/expirado/revocado;
- no puede leer otro viaje;
- no puede alterar monto/documentos/chofer/vehículo;
- idempotencia básica.

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

---

# 9. Fase 7 — Incidencias

Implementar:

- catálogo inicial;
- incidencia de viaje/parada;
- severidad;
- GPS;
- foto opcional;
- viaje detenido sí/no;
- resolución;
- tiempo afectado.

Incluir casos de ubicación/destino no localizado.

---

# 10. Fase 8 — POD: firma, receptor, fotos y conciliación

Crear:

- `delivery_proofs`;
- `delivery_proof_documents`;
- `delivery_evidence`;
- bucket/policies privadas si se requiere nuevo Storage.

UI:

- receptor;
- firma táctil;
- bultos entregados/retornados;
- fotos;
- observación;
- evidencia completa/parcial.

Una firma puede cubrir varias facturas de la parada.

QA en móvil real.

---

# 11. Fase 9 — Torre de Control y actualización dinámica de GPS

Requisito prioritario:

- viaje puede iniciar con parada sin GPS;
- Torre de Control puede cargar/corregir GPS durante viaje activo;
- incremento de revisión;
- chofer recibe actualización sin reiniciar;
- refresh periódico + foreground + manual;
- notificación de cambio;
- cambios de secuencia solo explícitos y solo pendientes;
- reconocimiento del chofer para cambios relevantes.

Si Torre de Control no resuelve GPS:

- capturar GPS al `Llegué`;
- conservar GPS real de entrega;
- no modificar automáticamente maestro comercial.

QA con viaje parcialmente ejecutado y modificación en vivo.

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

Exportaciones:

- comprobante POD PDF;
- Excel operacional;
- dashboard KPI logístico.

Mantener completamente separado de KPI comerciales.

---

# 14. Fase 12 — Hardening y optimización

- auditoría RLS;
- auditoría Edge Function/token;
- CORS;
- rate limiting si aplica;
- expiración/rotación;
- Storage access;
- performance/indexes;
- bundle/code splitting;
- UX móvil;
- accesibilidad;
- reintentos/conectividad;
- pruebas de volumen;
- revisión de logs/auditoría.

---

# 15. Release strategy recomendada

No implementar todo en un único PR gigante.

Secuencia sugerida de releases:

1. `logistics-v1-foundation` — esquema/maestros/permisos.
2. `logistics-v1-dispatch` — Excel/manual/manifiesto.
3. `logistics-v1-driver` — ejecución + acceso temporal.
4. `logistics-v1-pod` — firma/foto/incidencias.
5. `logistics-v1-control-tower` — updates dinámicos + Tracking.
6. `logistics-v1-history-reporting` — POD/reportes.

Los nombres/versiones definitivos se decidirán al implementar.

---

# 16. Gates antes de producción

- CI verde;
- migraciones verificadas;
- RLS verificado con Admin/Chofer interno/acceso externo;
- Excel con datos reales anonimizados o TEST representativos;
- móvil Android/iOS navegador;
- firma y cámara;
- GPS permitido/denegado;
- señal intermitente;
- token externo expirado/revocado;
- ubicación pendiente resuelta por Torre de Control con viaje activo;
- ubicación capturada por chofer cuando no se resolvió;
- entrega parcial;
- incidencia crítica;
- cierre y conciliación;
- historial por factura;
- Tracking sin afectar Tracking comercial;
- rollback definido.

---

# 17. Regla de continuidad

Si este proyecto continúa en otro chat:

1. leer `docs/CHAT_CONTINUATION_CURRENT.md`;
2. leer `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md` completo;
3. leer este plan completo;
4. verificar servicios reales;
5. no asumir que ninguna fase está implementada por estar documentada;
6. determinar la última fase realmente mergeada/desplegada antes de continuar.
