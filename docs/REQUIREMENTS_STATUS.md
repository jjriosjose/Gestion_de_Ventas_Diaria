# Estado de requerimientos — Gestión de Ventas Diaria

> Matriz viva para responder rápidamente **qué está terminado, qué está parcial y qué sigue pendiente**. Complementa `PROJECT_HANDOFF.md`; no lo sustituye.
>
> Última auditoría documental: **2026-08-25**. Baseline de aplicación auditado/productivo: **V0.6.4**.
>
> **V0.6.5 todavía NO está implementada.** Su diseño funcional previo al desarrollo está consolidado en `docs/V065_FUNCTIONAL_DESIGN.md`.

## Regla de uso

Antes de modificar el proyecto en un nuevo chat:

1. Leer `PROJECT_HANDOFF.md`.
2. Leer este archivo.
3. Leer **completo** `docs/V065_FUNCTIONAL_DESIGN.md` si se va a trabajar V0.6.5.
4. Verificar el `main` real de GitHub.
5. Verificar Supabase antes de asumir tablas, funciones, RLS, migraciones o datos.
6. Verificar producción si el cambio depende de la versión desplegada.
7. Explicar al usuario qué se va a modificar antes de ejecutar cambios.

Los servicios reales prevalecen si existe alguna discrepancia documental.

---

# 1. Snapshot auditado

Estado observado en Supabase al 2026-08-25:

| Indicador | Valor auditado |
|---|---:|
| Clientes | 1,997 |
| Empleados activos | 12 |
| Clientes CADENA | 135 |
| Clientes REGULAR | 1,862 |
| Clientes con GPS | 929 |
| Clientes sin GPS | 1,068 |
| Áreas administrativas oficiales activas | 593 |

Desglose territorial activo:

- 10 regiones.
- 32 provincias.
- 158 municipios.
- 393 distritos municipales.

Los conteos operativos de visitas, llamadas, citas, rutas y showroom cambian con el uso diario y no deben tratarse como constantes de arquitectura.

---

# 2. Leyenda

- ✅ Terminado / productivo.
- 🟡 Funcional con refinamiento pendiente.
- 🔶 Pendiente funcional priorizado para V0.6.5.
- ⚪ Futuro / técnico / depende de decisión externa.

---

# 3. Estado por módulo — mismo orden de la aplicación

## OPERACIÓN

### Inicio / Dashboard — ✅ / 🟡

Implementado:

- KPIs ejecutivos diarios.
- Planificados, visitados y cobertura real.
- Distancia GPS geodésica estimada y tramos disponibles.
- Llamadas, contactos y citas.
- Captaciones.
- Rutas iniciadas/cerradas.
- Gráficos separados Vendedores vs Gestores.
- Rankings separados por naturaleza del trabajo.
- Excel y PDF ejecutivo.

Pendiente V0.6.5:

- renombrar semántica comercial ambigua `Compras` / `Ventas`;
- mostrar **Clientes/Pedidos con venta** y **Monto vendido**;
- separar monto/origen cuando exista el nuevo flujo Pedidos/Ventas;
- incorporar planificadas vs adicionales;
- productividad: % jornada atención, % traslado/espera, visitas por hora;
- valorar `Resolución` -> `Cierre operativo`.

### Clientes — ✅

Implementado:

- maestro central en Supabase;
- consulta y filtros;
- edición autorizada;
- Vendedor y Gestor responsables;
- `client_type` CADENA/REGULAR;
- región/provincia/municipio;
- GPS;
- navegación Google Maps;
- protección de asignaciones manuales frente a importaciones/homologaciones.

Regla V0.6.5:

- una visita excepcional de otro Vendedor NO debe reasignar automáticamente la cartera del cliente.

### Mapa — ✅ / 🔶

Implementado:

- cartera completa paginada;
- Leaflet + OpenStreetMap;
- filtros comerciales y territoriales;
- maestro comercial vs división territorial oficial;
- Región -> Provincia -> Municipio -> Distrito Municipal;
- coherencia maestro/coordenada/GPS de visita;
- zonas guardadas;
- navegación a cliente;
- límites oficiales.

Pendiente V0.6.5:

- mejorar velocidad de reacción al usar División territorial oficial;
- feedback inmediato al activar límites;
- cache temporal en memoria para directorios/geo assessments/geometrías;
- evitar pedir nuevamente una geometría ya cargada;
- evaluar geometrías simplificadas desde Supabase para respuesta inmediata y dejar WMS externo como referencia/fallback;
- reducir reconstrucciones innecesarias de capas/`fitBounds`;
- aplicar iconografía empresarial de estado cuando el mapa represente ejecución de jornada.

### Planificación — ✅ / 🔶

Implementado:

- planificación por Vendedor y fecha;
- ruta VISITAS y tareas CAPTACION;
- filtros CADENA/REGULAR;
- territorio maestro u oficial;
- Gestor, empresa, GPS y calidad geográfica;
- disponibilidad y zonas guardadas;
- selección lista/mapa/polígono/radio;
- orden aproximado por cercanía;
- bloqueo de inicio de ruta fuera de la fecha programada.

Pendiente V0.6.5:

- **Histórico de Planificaciones** dedicado;
- filtros Desde/Hasta, Vendedor, Estado, tipo de cliente/tipo de plan;
- resumen de plan vs ejecución;
- abrir detalle histórico con mapa, secuencia, cierre y métricas;
- diferenciar visitas adicionales;
- valorar `Duplicar planificación` a nueva fecha.

Los `route_plans` históricos se conservan; el faltante principal es UX/consulta consolidada.

### Rutas — ✅ V0.6.4 / 🔶 V0.6.5

Implementado V0.6.4:

- mapa y secuencia de paradas;
- GPS inicio/final;
- una jornada activa por empleado;
- visitas desde parada;
- Gestor visible por cliente;
- vista Gestor de sus clientes dentro de rutas de Vendedores;
- eventualidades de jornada;
- cobertura real;
- resueltos / cierre operativo;
- cierre normal/parcial;
- cierre transaccional backend;
- `ended_at` congela jornada;
- ruta finalizada no puede reiniciarse;
- distancia GPS estimada por tramos;
- filtro CADENA/REGULAR visual sin falsear cierre global.

Regla V0.6.5 confirmada:

> **Tener una ruta planificada NO impide al Vendedor visitar otros clientes el mismo día.**

Pendiente:

- botón **+ Visita adicional** durante ruta activa;
- buscar cliente no incluido en la planificación;
- asociar visita adicional a la MISMA `route_session`;
- `planned=false`, sin inflar `route_stops`/denominador de cobertura;
- conservar cartera oficial aunque otro Vendedor realice la visita;
- motivo mínimo opcional/estructurado: solicitud cliente, oportunidad, seguimiento, prioridad, otro;
- mostrar Planificados, Visitados del plan, Adicionales, Total visitas y Cobertura del plan por separado;
- misma lógica/formulario para planificada y adicional;
- iconografía empresarial profesional y consistente;
- nuevo botón **Detalle de recorrido**.

### Detalle de recorrido — 🔶 NUEVO V0.6.5

Requerido desde Rutas.

Debe reconstruir la jornada usando eventos GPS existentes:

- punto de inicio registrado;
- llegada/salida de visitas;
- adicionales;
- eventualidades con GPS;
- cierre.

Reglas:

- no llamar al inicio `Casa del Vendedor`;
- no presentar línea como recorrido vial real;
- usar `Trayectoria estimada entre puntos GPS registrados`;
- distancia geodésica estimada, no odómetro;
- mostrar plan original vs secuencia ejecutada;
- cronología clicable;
- calidad de trazabilidad GPS completa/parcial.

### Captación — ✅

Implementado:

- tareas por Vendedor;
- división territorial oficial;
- rango de fechas;
- objetivo;
- sábado opcional;
- navegación por zona;
- clientes existentes como referencia;
- prospectos;
- GPS/fotografías;
- visibilidad por rol.

---

## GESTIÓN

### Cobertura cartera — 🔶 PRIORIDAD V0.6.5

Funcional actualmente:

- metas/frecuencias de visitas y llamadas;
- estados `CUMPLIDO`, `PENDIENTE`, `SIN_META`;
- filtros;
- Jornada Libre de Vendedor;
- visitas espontáneas desde cartera;
- frecuencia individual y masiva.

Problema semántico:

- `CUMPLIDO` significa cumplimiento de meta, no `tuvo gestión`.

V0.6.5 debe separar:

**Actividad**

- Gestionado hoy.
- Gestionado este mes.
- Nunca/no gestionado.

**Cumplimiento de meta**

- Cumplido.
- Pendiente.
- Sin meta.

Ejemplo válido:

```text
Actividad: GESTIONADO HOY
Meta: SIN META
```

No redefinir `CUMPLIDO`.

Cobertura no será el módulo principal de Pedidos/Ventas.

### Jornada Libre — 🟡 / 🔶

La base ya existe en V0.6.4.

Pendiente V0.6.5:

- hacer el flujo más visible/intuitivo;
- reutilizar exactamente el mismo formulario de visita;
- distinguir sus visitas en Visitas/Reportes;
- no mostrar cobertura ficticia como métrica de rendimiento cuando no existe plan;
- si hay ruta activa, las nuevas gestiones son **adicionales de esa misma jornada**, no una segunda Jornada Libre.

### Visitas — 🟡 / 🔶

Implementado:

- una visita abierta por empleado;
- llegada/salida con GPS puntual;
- relación con ruta o jornada libre;
- recibido/no recibido;
- resultado comercial;
- monto opcional actual;
- fotos/evidencias;
- observaciones/seguimiento;
- solicitud showroom;
- validación geográfica.

Pendiente V0.6.5:

- formalizar un único formulario compartido para planificada/adicional/Jornada Libre;
- reemplazar la lógica de `Compró + monto` por integración mínima con **Pedido comercial** cuando corresponda;
- abrir por defecto en `Hoy`;
- filtros Hoy/Ayer/7 días/rango, Vendedor, cliente, tipo, planificada/adicional/libre, recibido, resultado, con/sin pedido;
- KPIs de visitas, atención, promedio, planificadas, adicionales, pedidos y monto;
- vista visual empresarial con detalle por visita.

### Llamadas — ✅ / 🔶

Implementado:

- CRM de cartera;
- filtros;
- resultado estructurado;
- contacto/no contacto;
- siguiente acción;
- seguimiento;
- intención showroom;
- reportería.

Pendiente V0.6.5:

- dirección **Entrante / Saliente**;
- distinguir llamada entrante del cliente a Vendedor;
- distinguir llamada saliente Vendedor/Gestor;
- permitir que una llamada origine un Pedido comercial;
- no tratar `COMPRO` por sí solo como venta monetaria confirmada.

### Pedidos / Ventas — 🔶 NUEVO V0.6.5

Nuevo módulo recomendado dentro de Gestión.

Principio:

> El sistema externo sigue siendo la fuente oficial de ventas/facturación. Esta app registra trazabilidad comercial y monto con mínima digitación.

No duplicar artículos, cantidades, precios unitarios, impuestos, forma de pago, factura, inventario ni cuentas por cobrar.

Flujo principal:

```text
Actividad -> Pedido comercial -> Gestor procesa en sistema externo -> Resultado + monto
```

Responsabilidades:

- Vendedor/originador: indicar si la gestión generó pedido; observación opcional.
- Gestor/procesador: resultado + monto confirmado; referencia externa opcional.

Debe conservar:

- cliente;
- Vendedor/Gestor oficiales;
- originado por;
- procesado por;
- actividad fuente;
- canal/origen;
- estado;
- monto;
- fechas.

Estados sugeridos:

- PENDIENTE_GESTOR.
- EN_PROCESO.
- CONFIRMADA.
- NO_CONCRETADA.
- CANCELADA.

Orígenes iniciales:

- visita planificada;
- visita adicional;
- Jornada Libre;
- llamada entrante cliente;
- llamada saliente Vendedor;
- llamada saliente Gestor;
- showroom;
- otro.

### Agenda / Showroom — ✅ / 🔶 integración comercial

Implementado:

- intención -> validación -> contacto -> confirmación/reprogramación;
- llegada -> atención -> compra/no compra -> salida;
- responsable asignado distinto de quien atendió;
- notificaciones;
- solicitud no se pierde sin Gestor.

Pendiente V0.6.5:

- alimentar el mismo modelo Pedidos/Ventas sin duplicar datos ni perder quién originó/atendió/procesó.

### Recepción — ✅

Implementado:

- citas y walk-ins;
- búsqueda cliente/prospecto;
- llegada física;
- relación showroom;
- estados de atención.

---

## INTELIGENCIA

### Reportes — ✅ V0.6.4 / 🔶 V0.6.5

Implementado:

- Reporte Ejecutivo Diario;
- reporte personal;
- Vendedores/Gestores separados;
- jornada;
- cobertura real;
- cierre operativo;
- atención/promedio;
- traslado/espera estimado;
- distancia GPS estimada;
- llamadas/showroom;
- eventualidades;
- cronología;
- Excel/PDF.

Definiciones que no deben cambiar:

- Cobertura = visitados del plan / planificados.
- Adicionales NO aumentan denominador de cobertura.
- Cierre operativo = paradas con resultado / planificadas.
- Traslado/espera es residual estimado.
- Distancia GPS es geodésica, no odómetro.

Pendiente V0.6.5:

- `Compras` -> `Clientes que compraron` / `Pedidos confirmados` según contexto;
- `Ventas` -> `Monto vendido`;
- separar planificadas/adicionales/total;
- pedidos originados/confirmados;
- monto por origen;
- originado por / procesado por;
- colaboración Vendedor ↔ Gestor;
- detalle de recorrido.

### Calidad geográfica — ✅

Implementado:

- 593 áreas activas;
- diagnóstico maestro/coordenada/GPS;
- estados de coherencia/inconsistencia;
- revisión administrativa;
- ninguna discrepancia sobrescribe automáticamente maestro/coordenadas.

---

## SISTEMA

### Administración — 🟡

Implementado:

- importación con preview/apply;
- homologación V/G cartera;
- usuarios;
- perfiles;
- permisos/overrides;
- activar/desactivar;
- contraseña administrada.

Pendiente válido, pero **fuera de la primera tanda comercial V0.6.5**:

- usuarios conectados / sesiones;
- login_at;
- last_activity_at;
- logout_at;
- estado conectado/inactivo/desconectado;
- duración/histórico de sesión;
- heartbeat moderado.

No inferir conectado solo por token Auth.

### Configuración — ✅ / ⚪ externo

Implementado:

- temas Karaka, Claro, Oscuro, Ejecutivo;
- color principal;
- cambio de contraseña;
- perfil.

Pendiente externo:

- recuperación WhatsApp/OTP requiere proveedor y validación end-to-end.

---

# 4. Iconografía empresarial — 🔶 V0.6.5

No usar únicamente semáforo de color.

Estados definidos:

| Estado | Concepto visual |
|---|---|
| Pendiente | `MapPin + Clock` |
| En visita | `MapPin` + actividad/persona + pulso profesional |
| Gestionado | `MapPinCheck` / `BadgeCheck`, check fuerte, fondo suave |
| No realizada | `MapPinOff` / `LocationOff` |
| Reprogramado | `CalendarClock` / `CalendarSync` |
| Visita adicional | `MapPinPlus` |
| Inicio jornada | `Navigation` / `MapPinned` |
| Fin jornada | `Flag` / `CircleStop` |
| Eventualidad | `TriangleAlert` diferenciado |

La forma/icono debe comunicar el estado aunque el usuario no distinga el color.

Aplicar coherentemente en Rutas lista/mapa, Detalle recorrido, Histórico, Visitas y Cobertura.

---

# 5. Requerimientos transversales terminados

- ✅ persistencia central Supabase multiusuario;
- ✅ responsive;
- ✅ roles/perfiles/permisos;
- ✅ login por nick;
- ✅ versión visible;
- ✅ CADENA/REGULAR;
- ✅ geografía oficial;
- ✅ 593 áreas administrativas;
- ✅ no autocorrección geográfica por GPS;
- ✅ bloqueo de iniciar ruta fuera de fecha;
- ✅ día operativo;
- ✅ una visita abierta por empleado;
- ✅ cierre parcial;
- ✅ congelación de tiempo;
- ✅ motivos pendientes;
- ✅ eventualidades;
- ✅ distancia GPS estimada;
- ✅ dashboard/reportes por función;
- ✅ PDF corporativo;
- ✅ Service Worker limpiado/deshabilitado en localhost.

---

# 6. Prioridad V0.6.5 acordada antes del desarrollo

Leer detalle completo en `docs/V065_FUNCTIONAL_DESIGN.md`.

Orden recomendado:

1. Auditar esquema real antes de DDL.
2. Modelo mínimo Pedidos/Ventas.
3. Formulario único de Visita.
4. Visitas adicionales durante ruta activa.
5. Jornada Libre coherente con el mismo flujo.
6. Bandeja Gestor / Pedidos-Ventas.
7. Llamadas entrantes/salientes y origen de pedido.
8. Integración Showroom.
9. Histórico de Planificación.
10. Detalle de recorrido.
11. Iconografía empresarial transversal.
12. Rediseño Visitas.
13. Cobertura actividad vs meta.
14. Optimización Mapa/Planificación.
15. Dashboard/Reportes/PDF/Excel.
16. Pruebas por rol y operación real.
17. Merge/deploy solo tras validación.

---

# 7. Futuro / técnico no prioritario para la primera tanda

- usuarios conectados/sesiones administrativas;
- distancia vial con motor de rutas;
- recuperación WhatsApp OTP;
- code splitting/lazy loading global;
- auditoría integral access_profile/permission_overrides vs app_role/RLS;
- CORS restrictivo Edge Functions;
- revisión Storage/RLS/SECURITY DEFINER;
- protección formal de `main`;
- lockfile/reproducibilidad si se decide.

---

# 8. Regla de continuidad

Cuando este proyecto pase a otro chat, usar:

> Continúa Gestión de Ventas Diaria del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`. Lee primero `PROJECT_HANDOFF.md`, después `docs/REQUIREMENTS_STATUS.md` y luego `docs/V065_FUNCTIONAL_DESIGN.md` completo. Verifica `main`, Supabase y producción. V0.6.4 es el baseline productivo; V0.6.5 todavía debe implementarse. Antes de modificar código, resume las reglas de Vendedor/Gestor, visitas adicionales, Jornada Libre, Pedidos/Ventas, histórico de planificaciones, detalle de recorrido, iconografía y optimización del mapa.

No utilizar el historial del chat como única fuente de verdad. GitHub, Supabase y producción prevalecen.