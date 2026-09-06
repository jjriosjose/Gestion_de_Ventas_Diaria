# Logistics & Delivery V1 — Diseño funcional

Fecha de diseño: **06/09/2026 (RD)**

Estado: **DISEÑO APROBADO CONCEPTUALMENTE / NO IMPLEMENTADO**

> Este documento congela las reglas acordadas para un nuevo dominio logístico dentro de Gestión de Ventas Diaria. No implica que existan todavía tablas, RLS, Edge Functions, pantallas o datos de Logística. Antes de implementar, verificar siempre GitHub `main`, Supabase y producción.

---

# 1. Objetivo

Crear un módulo logístico profesional para **despacho, asignación y entrega de facturas/pedidos**, sin depender de integración directa con el sistema de facturación.

La solución debe permitir:

- cargar documentos por Excel como vía principal;
- agregar documentos manualmente como excepción;
- asociar clientes existentes del maestro cuando sea posible;
- aceptar clientes/destinos externos aunque no existan en `clients`;
- trabajar con ubicaciones conocidas o pendientes;
- asignar chofer y vehículo;
- diferenciar recursos propios, alquilados y de terceros;
- ejecutar una ruta de entrega desde móvil;
- registrar GPS por eventos, tiempos, incidencias, descarga y resultado;
- capturar firma digital, fotografías y receptor;
- generar evidencia/POD de entrega;
- visualizar operación en Torre de Control / Tracking;
- permitir que Torre de Control complete o corrija ubicaciones incluso con el viaje ya iniciado;
- conservar auditoría histórica por factura/pedido, chofer, vehículo, destino y evento.

La primera versión NO pretende sustituir ERP, facturación, inventario, cuentas por cobrar ni telemática vehicular continua.

---

# 2. Principio arquitectónico

Logística debe ser un **dominio independiente** de las rutas comerciales de Vendedores.

No reutilizar como modelo de negocio principal:

- `route_plans`;
- `route_stops`;
- `route_sessions`;
- `visits`.

Sí se pueden reutilizar componentes y patrones técnicos existentes:

- Leaflet/OSM;
- Smart Map Framing;
- ordenamiento Cercanos/Lejanos;
- numeración de paradas;
- utilidades GPS;
- Timeline;
- Tracking / Control Tower;
- captura de fotografías;
- exportación PDF/Excel;
- filtros;
- design system responsive.

Motivo: las métricas de **visitas comerciales** y **entregas logísticas** no deben mezclarse ni contaminar cobertura, productividad o reportería comercial.

---

# 3. Navegación propuesta

Nueva sección principal:

## LOGÍSTICA

- **Despacho** — preparar/importar documentos, agrupar paradas, asignar viaje.
- **Mis Entregas** — experiencia móvil del chofer interno.
- **Tracking Entregas / Torre de Control** — seguimiento operativo.
- **Vehículos** — maestro de flota y recursos ocasionales.
- **Choferes / Transportistas** — administración logística.
- **Historial / POD** — búsqueda por factura, pedido, viaje, cliente, chofer o vehículo.
- **Reportes Logísticos** — KPI separados de Ventas.

El acceso temporal de un chofer externo no debe mostrar el sidebar general; debe abrir una experiencia móvil aislada del viaje asignado.

---

# 4. Entidad principal: Viaje / Manifiesto de entrega

La factura NO es la entidad principal del flujo.

Entidad principal propuesta:

**Viaje / Manifiesto de Entrega**

Ejemplo:

- Viaje: `ENT-2026-000125`;
- fecha;
- centro/origen de carga;
- chofer;
- vehículo;
- transportista si aplica;
- documentos cargados;
- monto total;
- bultos/cajas;
- paradas;
- estado;
- revisión de ruta.

Un viaje contiene varias paradas y cada parada puede contener uno o varios documentos.

Regla crítica:

> **5 facturas no significan necesariamente 5 paradas.** Varias facturas dirigidas al mismo destino pueden ser una sola parada.

---

# 5. Importación Excel — método principal

El método normal de carga debe ser **Excel**, no CSV.

Flujo obligatorio:

1. Seleccionar Excel.
2. Leer y normalizar.
3. Mostrar Preview.
4. Validar estructura/documentos/duplicados.
5. Intentar asociación con clientes.
6. Resolver coincidencias dudosas si las hay.
7. Mostrar destinos con/sin GPS.
8. Confirmar importación.

Nunca aplicar directamente a base solo por seleccionar el archivo.

## 5.1 Columnas recomendadas

| Campo | Requerido | Regla |
|---|---|---|
| Empresa | Sí | Empresa emisora/contexto |
| Número factura | Factura o pedido | Al menos uno de ambos |
| Número pedido | Factura o pedido | Al menos uno de ambos |
| Código cliente externo | Recomendado | Mejor clave de asociación si existe |
| Nombre cliente | Sí | Se conserva como snapshot |
| Monto | Sí | Monto del documento |
| Bultos / cajas | Sí | Cantidad cargada |
| Latitud | No | Opcional |
| Longitud | No | Opcional |
| Teléfono | No | Útil para externos/confirmación |
| Observación | No | Referencias logísticas |

**Dirección textual NO es obligatoria en la plantilla principal.**

## 5.2 Regla de carga con datos incompletos

La ausencia de cliente maestro o de GPS **NO impide importar** una factura/pedido válido.

Un documento puede quedar:

- cliente asociado + GPS;
- cliente asociado + sin GPS;
- cliente externo + GPS;
- cliente externo + sin GPS.

Todos son estados válidos de importación.

## 5.3 Validación de coordenadas

Si Latitud/Longitud vienen informadas:

- latitud entre -90 y 90;
- longitud entre -180 y 180;
- aceptar punto decimal y normalizar coma decimal cuando no exista ambigüedad;
- latitud sin longitud o viceversa = coordenadas incompletas;
- coordenadas incompletas NO bloquean la importación; quedan como ubicación pendiente.

---

# 6. Carga manual

Debe existir botón **+ Agregar documento**.

Uso: cargas pequeñas, documentos de último minuto o excepciones.

Campos mínimos equivalentes al Excel:

- empresa;
- factura;
- pedido;
- cliente existente o externo;
- monto;
- bultos/cajas;
- latitud/longitud opcionales;
- teléfono opcional;
- observación.

Excel = vía habitual.

Manual = vía complementaria.

---

# 7. Asociación con el maestro de clientes

La app debe intentar asociar cada fila usando una jerarquía controlada:

1. código de cliente/empresa cuando sea confiable;
2. identificador fiscal si está disponible en el futuro;
3. nombre normalizado exacto;
4. teléfono;
5. similitud de nombre;
6. revisión manual cuando la coincidencia no sea inequívoca.

Estados visuales sugeridos:

- **Asociado** — coincidencia confirmada.
- **Posible coincidencia** — requiere revisión.
- **Cliente/Destino externo** — no existe en el maestro.

La importación NO debe crear automáticamente registros en `clients`.

---

# 8. Clientes y destinos externos

Si un cliente no existe en `clients`:

- el documento se conserva;
- se crea/usa un **destino logístico externo**;
- se mantienen nombre, teléfono, GPS si existe y observaciones;
- el despacho puede continuar normalmente.

Posteriormente Administración puede evaluar:

- vincular con cliente existente;
- convertir/proponer como cliente maestro;
- mantenerlo únicamente como destino logístico.

Nunca contaminar automáticamente el maestro comercial.

---

# 9. Puntos logísticos alternativos

Un cliente comercial puede tener varios destinos reales de entrega:

- principal;
- sucursal;
- almacén;
- obra;
- centro de distribución;
- ubicación temporal.

Se recomienda contemplar una entidad futura/desde V1:

`delivery_locations`

para conservar puntos logísticos alternativos sin sobrescribir el GPS comercial principal.

Esto permite que una factura esté asociada al cliente maestro pero a un destino diferente.

---

# 10. Jerarquía geográfica de la entrega

## 10.1 Prioridad 1 — GPS del Excel

Si el Excel trae Latitud/Longitud válidas, esas coordenadas representan el **destino específico de esa entrega**.

Tienen prioridad operativa para esa entrega aunque el cliente exista en el maestro.

No modificar `clients.latitude/longitude`.

## 10.2 Prioridad 2 — GPS del cliente maestro

Si Excel no trae GPS y el cliente se asocia al maestro con coordenadas válidas:

- usar coordenadas del maestro para planificar;
- copiar un snapshot de esas coordenadas a la parada;
- conservar la fuente como `CLIENT_MASTER_GPS`.

Si el maestro cambia meses después, el viaje histórico sigue reconstruible.

## 10.3 Prioridad 3 — Ubicación pendiente

Si ninguna fuente tiene GPS:

- documento y parada se crean normalmente;
- `geo_status = UBICACION_PENDIENTE`;
- puede publicarse el viaje;
- puede iniciarse la ruta;
- la parada no participa en optimización automática hasta tener coordenadas;
- sigue siendo ordenable manualmente.

## 10.4 Fuentes geográficas sugeridas

- `EXCEL_GPS`;
- `CLIENT_MASTER_GPS`;
- `CONTROL_TOWER_GPS`;
- `MANUAL_GPS`;
- `DRIVER_ARRIVAL_GPS`;
- `DRIVER_DELIVERY_GPS`;
- `NO_GPS`.

---

# 11. Diferencia entre ubicación planificada y real

Siempre distinguir:

## Ubicación planificada

Dónde debía ejecutarse la entrega.

## Ubicación real

Dónde ocurrió realmente, obtenida de eventos de campo.

Una parada puede quedar históricamente así:

- `planned_latitude = null`;
- `planned_longitude = null`;
- `actual_delivery_latitude = ...`;
- `actual_delivery_longitude = ...`.

Esto es válido y debe ser auditable.

---

# 12. Agrupación de facturas en paradas

Regla base:

> Agrupar por **destino real**, no solamente por nombre del cliente.

Si varias facturas pertenecen al mismo cliente y mismas coordenadas/destino, pueden formar una parada.

Si un mismo cliente tiene documentos con coordenadas diferentes, deben poder convertirse en paradas distintas.

Una misma firma/POD puede cubrir varios documentos entregados en una sola parada.

---

# 13. Control de duplicados

Durante Preview/importación, advertir si factura/pedido ya existe en:

- el mismo lote;
- otro viaje activo;
- historial entregado, según reglas de negocio.

No duplicar silenciosamente documentos.

Debe poder existir una excepción administrativa trazable para casos legítimos (reentrega/reprogramación/devolución futura), pero no como comportamiento por defecto.

---

# 14. Choferes

Entidad propuesta:

`delivery_drivers`

Campos conceptuales:

- id;
- `employee_id` nullable;
- nombre completo;
- documento/cédula;
- teléfono;
- licencia;
- vencimiento licencia opcional;
- tipo;
- transportista;
- observaciones;
- activo.

Tipos:

- `INTERNAL`;
- `CONTRACTOR`;
- `THIRD_PARTY`.

## 14.1 Chofer interno

Puede vincularse a `employees` y utilizar usuario normal de la aplicación con perfil/capacidad **Chofer**.

## 14.2 Chofer contratado recurrente

Puede existir en `delivery_drivers` sin usuario permanente.

Recibe acceso temporal por viaje.

## 14.3 Chofer ocasional

Puede registrarse al preparar un viaje:

- nombre;
- documento;
- teléfono;
- empresa/transportista.

No requiere usuario permanente.

Debe quedar snapshot histórico en el viaje.

---

# 15. Acceso temporal para chofer externo

Requisito central.

Un chofer externo NO debe requerir usuario permanente de la aplicación.

Despacho genera un **enlace temporal único para ese viaje**.

El enlace solo permite:

- ver el viaje asignado;
- ver paradas/documentos permitidos;
- navegar;
- registrar eventos;
- registrar incidencias;
- capturar llegada/descarga/entrega;
- firma/foto/POD;
- finalizar la operación permitida.

Nunca permite acceso al resto de la app.

## 15.1 Seguridad

No usar URLs predecibles tipo `/ruta/245` como único control.

Entidad sugerida:

`delivery_access_links`

Campos conceptuales:

- trip_id;
- driver_id;
- `token_hash`;
- expires_at;
- first_used_at;
- last_used_at;
- revoked_at;
- status;
- optional_pin_hash.

Reglas:

- token largo, aleatorio;
- guardar hash, no token plano;
- expiración al cerrar viaje o según ventana definida;
- capacidad de revocar;
- PIN de 4–6 dígitos opcional/configurable;
- no exponer `service_role` al navegador.

Arquitectura recomendada:

**Navegador chofer externo → Edge Function → valida token/PIN → operaciones estrictamente limitadas al viaje.**

---

# 16. Vehículos

Entidad propuesta:

`delivery_vehicles`

Campos:

- placa;
- tipo;
- marca;
- modelo;
- año opcional;
- capacidad opcional;
- modalidad/propiedad;
- transportista;
- estado;
- observaciones.

Tipos de vehículo configurables:

- Camión;
- Furgoneta;
- Camioneta;
- Gandola;
- Cabezal;
- Contenedor;
- Motocicleta;
- Otro.

Modalidad/propiedad:

- `OWNED` — propio;
- `RENTED` — alquilado;
- `THIRD_PARTY` — tercero/transportista.

## Vehículo ocasional

Debe poder usarse un vehículo no registrado permanentemente:

- placa;
- tipo;
- descripción;
- transportista.

El viaje conserva snapshot histórico aunque el vehículo ocasional no quede en maestro.

---

# 17. Transportistas

Entidad opcional/recomendada:

`transport_providers`

Campos futuros:

- nombre;
- RNC/identificador;
- teléfono;
- contacto;
- estado;
- observaciones.

Permite posteriormente analizar cumplimiento e incidencias de transportistas externos.

---

# 18. Estados del viaje

Estados conceptuales iniciales:

- `BORRADOR`;
- `PREPARANDO`;
- `CARGADO`;
- `LISTO_PARA_SALIR`;
- `EN_RUTA`;
- `CON_INCIDENCIA`;
- `RETORNANDO`;
- `FINALIZADO`;
- `CANCELADO`.

Las transiciones reales deben definirse y protegerse en backend durante implementación.

---

# 19. Estados de la parada

Estados conceptuales:

- `PENDIENTE`;
- `EN_CAMINO`;
- `EN_CLIENTE`;
- `ESPERANDO_DESCARGA`;
- `DESCARGANDO`;
- `ENTREGADA`;
- `ENTREGA_PARCIAL`;
- `NO_ENTREGADA`;
- `REPROGRAMADA`.

No inferir que `ENTREGADA` significa automáticamente todos los bultos sin validar cantidades.

---

# 20. Bultos/cajas y conciliación

No almacenar únicamente cantidad cargada.

Campos conceptuales por documento/parada:

- `packages_loaded`;
- `packages_delivered`;
- `packages_returned`.

Ejemplo:

20 cargados, 18 entregados, 2 retornados → `ENTREGA_PARCIAL`.

El cierre del viaje debe permitir conciliación de:

- facturas cargadas;
- facturas entregadas;
- parciales;
- no entregadas;
- bultos cargados;
- entregados;
- retornados;
- monto cargado;
- monto entregado;
- incidencias.

---

# 21. Eventos operativos y tiempos

Cada evento debe conservar:

- viaje;
- parada si aplica;
- chofer/contexto de acceso;
- timestamp;
- GPS si disponible;
- fuente;
- observaciones/contexto.

Eventos iniciales:

- inicio preparación/carga;
- carga confirmada;
- inicio de ruta;
- salida del centro de carga;
- llegada a cliente;
- inicio descarga;
- fin descarga;
- entrega confirmada;
- salida de cliente;
- incidencia;
- incidencia resuelta;
- retorno a base;
- cierre de viaje.

Métricas derivables:

- tiempo hasta cliente;
- espera antes de descarga;
- tiempo de descarga;
- tiempo total en cliente;
- tiempo afectado por incidencias;
- duración total del viaje.

---

# 22. Incidencias del viaje

Registrar incidencia debe ser una función de primera clase, disponible durante toda la ejecución.

Categorías iniciales:

- neumático pinchado;
- avería mecánica;
- accidente;
- tránsito/congestión;
- vía bloqueada;
- problema de seguridad;
- retraso en carga;
- retraso en cliente;
- cliente cerrado;
- cliente no responde;
- dirección/ubicación incorrecta;
- destino no localizado;
- rechazo de mercancía;
- mercancía dañada;
- faltante de mercancía;
- problema documental;
- problema con vehículo;
- problema con chofer;
- otro.

Cada incidencia debe poder guardar:

- tipo;
- severidad: informativa / demora / crítica;
- hora inicio;
- GPS;
- viaje;
- parada opcional;
- chofer;
- vehículo;
- observación;
- fotografía opcional;
- si detuvo el viaje;
- hora resolución;
- comentario de resolución.

Diferenciar incidencia general del viaje vs incidencia asociada a parada.

---

# 23. Firma digital y Proof of Delivery (POD)

Al confirmar entrega:

- nombre de quien recibe;
- identificación opcional;
- firma táctil;
- hora;
- GPS;
- chofer;
- viaje/parada;
- documentos cubiertos;
- bultos entregados;
- observaciones;
- fotografía(s).

Una firma puede cubrir varios documentos de la misma parada.

Entidad conceptual:

- `delivery_proofs`;
- `delivery_proof_documents`;
- `delivery_evidence`.

## Calidad de evidencia

Indicador posible:

- COMPLETA: receptor + firma + foto + GPS;
- PARCIAL: falta alguno de los elementos requeridos/configurados.

Una parada que comenzó sin GPS puede terminar con evidencia COMPLETA si el GPS fue capturado durante llegada/entrega.

---

# 24. Fotografías

Permitir varias evidencias:

- mercancía entregada;
- factura/documento firmado;
- lugar de entrega;
- incidencia;
- mercancía dañada;
- otra.

Storage debe ser **privado**.

No usar URLs públicas permanentes como diseño por defecto.

Controlar acceso mediante Auth/RLS o entrega firmada/temporal según el tipo de usuario.

---

# 25. Torre de Control — ubicación pendiente durante ruta activa

Requisito central aprobado.

Una parada con `UBICACION_PENDIENTE` puede existir dentro de un viaje publicado e iniciado.

Ejemplo:

- chofer ya entregó paradas 1, 2 y 3;
- parada 5 continúa sin GPS;
- Torre de Control consigue la ubicación posteriormente;
- Despacho asigna/corrige coordenadas;
- el chofer recibe la actualización SIN reiniciar el viaje.

Acciones de Torre de Control:

- introducir Latitud/Longitud;
- seleccionar punto en mapa;
- usar GPS de cliente maestro;
- seleccionar punto logístico alternativo;
- corregir una ubicación previa;
- resolver una incidencia de destino no localizado.

La modificación debe ser auditada:

- quién cambió;
- cuándo;
- valor anterior;
- valor nuevo;
- fuente.

---

# 26. Sincronización de cambios en ruta activa

Para V1, la pantalla del chofer debe detectar actualizaciones mientras esté abierta.

Mecanismo recomendado inicial:

- refresh/control cada ~10–20 segundos mientras la ruta está visible;
- refresh al volver a foreground;
- refresh al cambiar de parada;
- botón manual `Actualizar ruta`;
- detección mediante `route_revision`/`trip_revision`.

No es necesario comenzar con Supabase Realtime para el acceso temporal externo.

Razón: el chofer externo no tendrá necesariamente sesión Auth normal; una Edge Function controlada simplifica seguridad.

## Revisiones

El viaje debe mantener una revisión incremental conceptual:

- Publicado = revisión 1;
- Torre de Control agrega ubicación = revisión 2;
- cambia secuencia = revisión 3.

El dispositivo compara revisión local vs servidor y descarga cambios.

---

# 27. Cambios de secuencia durante ruta activa

Agregar GPS a una parada NO debe reordenar silenciosamente la ruta.

Después de agregar coordenadas, Torre de Control puede recibir sugerencia:

- Mantener orden actual;
- Optimizar paradas pendientes.

Si se optimiza:

- solo afectar paradas aún pendientes;
- nunca modificar entregas completadas;
- nunca mover una parada actualmente en descarga sin flujo explícito;
- registrar cambio;
- notificar al chofer;
- cambios importantes deben permitir `driver_acknowledged_at`.

---

# 28. Si Torre de Control nunca consigue la ubicación

La parada sigue siendo ejecutable.

El chofer puede localizar al cliente por llamada/referencia/conocimiento de zona.

Al pulsar **Llegué**, la app intenta capturar GPS.

También capturar GPS en:

- inicio descarga;
- fin descarga si aporta valor;
- entrega confirmada.

La ubicación real queda guardada como fuente de campo:

- `DRIVER_ARRIVAL_GPS`;
- `DRIVER_DELIVERY_GPS`.

No actualizar automáticamente `clients`.

---

# 29. Mejora posterior del maestro geográfico

Después de capturar un GPS nuevo en campo, Administración puede evaluar:

- guardar como punto logístico;
- proponer actualización del cliente comercial;
- asociar a destino externo histórico;
- descartar.

La app nunca debe concluir automáticamente que el GPS de una entrega es superior al maestro.

Las discrepancias se auditan y revisan.

---

# 30. Destinos externos históricos

Si un cliente/destino externo fue entregado anteriormente y vuelve a aparecer en otro Excel, la app puede sugerir:

> Se encontró un destino logístico utilizado anteriormente.

Esto permite construir inteligencia logística sin obligar a crear clientes comerciales.

---

# 31. Experiencia móvil del chofer

Debe ser extremadamente simple y responsive.

Pantalla conceptual:

- Viaje;
- chofer;
- vehículo/placa;
- progreso `3 de 5`;
- próxima entrega;
- cliente/destino;
- factura(s)/pedido(s);
- bultos;
- monto si el rol puede verlo;
- teléfono;
- ubicación/navegación;
- estado.

Acciones progresivas:

- Navegar;
- Llegué;
- Iniciar descarga;
- Finalizar descarga;
- Confirmar entrega;
- Registrar incidencia;
- Actualizar ruta.

En confirmación de entrega:

- cantidades;
- receptor;
- firma;
- foto;
- observación.

---

# 32. Conectividad / reintentos

V1 debe ser tolerante a señal móvil inestable.

Como mínimo:

- no perder formularios inmediatamente ante fallo;
- mostrar estado de envío;
- permitir reintento;
- evitar doble registro por reintentos;
- proteger acciones mediante idempotencia donde aplique;
- avisar si firma/foto/evento quedó pendiente de sincronizar.

Offline completo/PWA avanzada puede ser fase posterior si requiere arquitectura adicional.

---

# 33. Tracking de Entregas

Tracking logístico debe ser independiente del Tracking comercial.

Mostrar por viaje/chofer:

- chofer;
- vehículo;
- placa;
- modalidad Propio/Alquilado/Tercero;
- transportista;
- última actualización;
- última ubicación por evento;
- parada actual/próxima;
- entregadas;
- pendientes;
- fallidas;
- monto cargado/entregado;
- bultos cargados/entregados;
- incidencias activas;
- ubicación pendiente.

Mapa con secuencia numerada.

## Regla de Tracking

No describir como GPS continuo de fondo.

La primera versión usa eventos GPS reales registrados durante:

- inicio/salida;
- llegada;
- descarga;
- entrega;
- incidencias;
- cierre.

Las líneas entre eventos son **trayectoria estimada entre puntos GPS registrados**, no recorrido vial exacto.

---

# 34. Torre de Control — filtros críticos

Filtros recomendados:

- fecha;
- viaje;
- chofer;
- transportista;
- vehículo;
- propio/alquilado/tercero;
- estado viaje;
- estado parada;
- ubicación pendiente;
- con incidencia;
- evidencia/POD incompleto;
- factura/pedido;
- cliente/destino.

Filtro especial **Ubicación pendiente** debe priorizar:

- ruta ya iniciada;
- chofer próximo a parada;
- viaje aún no iniciado.

---

# 35. Historial por factura/pedido

Búsqueda de un número debe devolver:

- empresa;
- factura;
- pedido;
- cliente/destino;
- viaje;
- fecha;
- chofer;
- vehículo/placa;
- transportista;
- salida;
- llegada;
- descarga;
- resultado;
- bultos;
- monto;
- incidencias;
- receptor;
- firma;
- fotografías;
- GPS;
- POD.

Debe ser útil para responder reclamaciones operativas.

---

# 36. Comprobante/PDF de entrega

POD exportable opcional con:

- identidad visual;
- factura/pedido;
- cliente/destino;
- fecha;
- chofer;
- vehículo/placa;
- hora llegada;
- hora entrega;
- bultos;
- receptor;
- firma;
- GPS;
- foto opcional;
- resultado.

No mezclar este PDF con reportes comerciales.

---

# 37. Dashboard logístico

KPI separados de Ventas:

- viajes hoy;
- vehículos en ruta;
- facturas/pedidos cargados;
- entregados;
- pendientes;
- fallidos;
- monto cargado;
- monto entregado;
- bultos cargados;
- entregados;
- retornados;
- tiempo promedio de descarga;
- tiempo promedio por parada;
- incidencias;
- % POD completo;
- destinos con ubicación pendiente.

Segmentación futura:

- chofer;
- vehículo;
- propio vs alquilado;
- transportista;
- zona;
- cliente;
- día/semana/mes.

---

# 38. Alertas futuras

Candidatos:

- llegó pero no inicia descarga en X minutos;
- descarga excede umbral;
- viaje sin eventos durante periodo excesivo;
- entrega completa sin evidencia requerida;
- bultos pendientes al cierre;
- factura retornada sin motivo;
- incidencia crítica activa;
- ubicación pendiente próxima en la ruta;
- cambio de ruta pendiente de reconocimiento del chofer.

No es obligatorio implementar todas en la primera entrega.

---

# 39. Seguridad y permisos

## Administrador / Logística / Despacho

Puede según permiso:

- importar;
- crear viaje;
- asociar clientes;
- asignar/cambiar chofer;
- asignar/cambiar vehículo;
- resolver GPS;
- reordenar pendientes;
- ver Tracking;
- revisar POD;
- resolver incidencias administrativas.

## Chofer interno

Debe ver únicamente viajes asignados según alcance backend.

Puede registrar ejecución/evidencia, no alterar documentos financieros o asignaciones críticas.

## Chofer externo

Acceso temporal limitado estrictamente al viaje mediante Edge Function/token.

No Auth permanente requerido.

## Vendedor/Gestor

Futuro opcional: lectura del estado de entrega de clientes/documentos autorizados sin capacidad de modificación.

## Regla

Frontend NO es frontera de seguridad. RLS/funciones backend deben implementar alcance real.

---

# 40. Modelo de datos conceptual

Tablas propuestas, sujetas a revisión antes de migrar:

- `delivery_drivers`;
- `delivery_vehicles`;
- `transport_providers`;
- `delivery_locations`;
- `delivery_trips`;
- `delivery_stops`;
- `delivery_documents`;
- `delivery_import_batches`;
- `delivery_access_links`;
- `delivery_events`;
- `delivery_incidents`;
- `delivery_proofs`;
- `delivery_proof_documents`;
- `delivery_evidence`.

No crear estas tablas por inferencia de este documento sin revisar esquema/migraciones reales en Supabase.

---

# 41. Campos conceptuales clave

## `delivery_trips`

- id;
- trip_code;
- delivery_date;
- origin snapshot;
- driver_id nullable;
- driver snapshot;
- vehicle_id nullable;
- vehicle snapshot;
- provider_id nullable;
- status;
- route_revision;
- started_at;
- ended_at;
- totals/snapshots derivados o calculados;
- audit fields.

## `delivery_stops`

- trip_id;
- stop_order;
- client_id nullable;
- delivery_location_id nullable;
- destination_name_snapshot;
- phone_snapshot;
- planned_latitude;
- planned_longitude;
- master_latitude_snapshot;
- master_longitude_snapshot;
- geo_source;
- geo_status;
- actual_arrival_latitude/longitude;
- actual_delivery_latitude/longitude;
- status;
- timestamps operativos.

## `delivery_documents`

- trip_id;
- stop_id;
- company code/context;
- invoice_number;
- order_number;
- external_client_code;
- client_id nullable;
- client_name_snapshot;
- amount;
- packages_loaded;
- packages_delivered;
- packages_returned;
- status;
- notes;
- import batch/reference.

---

# 42. Auditabilidad

Debe quedar trazabilidad de:

- quién creó/importó;
- lote Excel;
- asociación de cliente;
- GPS original y fuente;
- cambios de GPS;
- cambios de secuencia;
- cambio de chofer/vehículo;
- publicación;
- cada evento del chofer;
- incidencias/resolución;
- POD;
- reconocimiento de cambios importantes;
- cierre/conciliación.

No sobrescribir silenciosamente snapshots históricos.

---

# 43. Fuera de alcance inicial

No incluir en Logistics & Delivery V1 salvo aprobación posterior:

- inventario detallado por SKU;
- líneas/artículos completos de factura;
- precios unitarios/impuestos;
- cuentas por cobrar;
- cobros;
- facturación;
- combustible;
- mantenimiento completo de flota;
- costos logísticos avanzados;
- devoluciones ERP complejas;
- telemetría GPS continua en background;
- rutas viales/ETA garantizados;
- integración automática con ERP/facturador.

Principio V1:

> **Qué se cargó → quién lo lleva → en qué vehículo → dónde debe entregarse → qué ocurrió durante el viaje → cuándo llegó → cuánto tardó → qué se entregó → quién recibió → evidencia → cierre.**

---

# 44. Criterios de aceptación de negocio

La primera versión completa del dominio debe permitir, como mínimo:

1. Importar Excel con varias facturas/pedidos.
2. Importar aunque existan clientes externos.
3. Importar aunque existan destinos sin GPS.
4. Asociar automáticamente o manualmente clientes del maestro.
5. Usar GPS Excel o GPS maestro sin modificar `clients`.
6. Agrupar documentos por destino.
7. Crear viaje con chofer y vehículo.
8. Diferenciar vehículo propio/alquilado/tercero.
9. Trabajar con chofer interno o externo sin usuario permanente.
10. Generar/revocar acceso temporal seguro.
11. Iniciar ruta con paradas sin GPS.
12. Permitir Torre de Control completar GPS después del inicio.
13. Propagar la actualización al chofer sin reiniciar viaje.
14. No reordenar ruta activa silenciosamente.
15. Capturar GPS del chofer si el destino sigue pendiente al llegar.
16. Registrar llegada, descarga, entrega y cierre.
17. Registrar incidencias de viaje/parada.
18. Conciliar bultos cargados/entregados/retornados.
19. Capturar receptor, firma y fotos.
20. Generar POD/auditoría por documento.
21. Mostrar Tracking logístico basado en eventos.
22. Buscar historial por factura/pedido.
23. Mantener seguridad backend diferenciada por rol/acceso temporal.
24. Mantener separadas las métricas comerciales y logísticas.

---

# 45. Decisiones que requieren validación técnica antes de implementar

- DDL final y constraints;
- estrategia RLS exacta;
- permisos/capability codes;
- Edge Function(s) para acceso externo;
- vida útil del token/PIN;
- estrategia de polling/revisión e idempotencia;
- bucket Storage y políticas de evidencia;
- formato exacto de Excel y mapeo de columnas;
- límites de tamaño de archivos/fotos;
- componente de firma;
- algoritmo de matching de clientes;
- regla exacta de agrupación de destinos;
- reglas de reentrega/reprogramación/duplicados;
- rendimiento con volúmenes reales;
- QA móvil.

---

# 46. Estado de implementación al crear este documento

Al 06/09/2026:

- **NO existen todavía las tablas logísticas propuestas por este diseño por el solo hecho de documentarlas.**
- No se ha aplicado SQL de Logistics & Delivery V1.
- No se ha modificado RLS por este módulo.
- No se ha creado Edge Function de chofer temporal.
- No se ha creado Storage adicional para POD.
- No se ha modificado Cloudflare.
- No se ha desplegado frontend logístico.

La producción estable sigue siendo `0.6.5-beta.12.2.8` hasta que servicios reales demuestren otra cosa.

---

# 47. Regla para continuar en otro chat

Antes de implementar Logistics & Delivery V1, un nuevo chat debe:

1. leer `docs/CHAT_CONTINUATION_CURRENT.md`;
2. leer **completo** este documento;
3. leer `docs/LOGISTICS_DELIVERY_V1_IMPLEMENTATION_PLAN.md`;
4. verificar GitHub `main`;
5. verificar Supabase real;
6. verificar producción;
7. confirmar que el usuario todavía desea estas reglas;
8. explicar cualquier DDL/RLS/Auth/Edge Function antes de aplicarlo;
9. crear una rama específica desde el `main` actualizado;
10. implementar por fases pequeñas con PR + CI + QA.

Nunca asumir que el diseño documentado ya está implementado.
