# V0.6.5-beta.11 — Commercialization / SaaS-Ready Addendum

Fecha: **27/08/2026 (RD)**.

Este documento complementa obligatoriamente:

1. `PROJECT_HANDOFF.md`
2. `docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`
3. `docs/COMMERCIAL_PRODUCT_ARCHITECTURE.md`

Si existe conflicto entre una implementación específica de beta.11 y el principio comercial, debe revisarse antes de fusionar código.

---

# 1. Decisión estratégica

Desde beta.11, la aplicación se desarrolla como **producto empresarial comercializable SaaS-ready**.

Almacenes Karaka es la implementación/configuración de referencia actual.

Beta.11 NO convierte todavía el sistema en multi-tenant real. Beta.11 sí debe evitar introducir nuevo acoplamiento que haga esa transición futura más costosa.

---

# 2. Reglas beta.11 no negociables

1. No romper comportamiento productivo Karaka.
2. No cambiar reglas existentes sin autorización.
3. No introducir nuevos hardcodes específicos si puede usarse una abstracción simple.
4. No crear lógica por nombre de empresa.
5. No mezclar branding con lógica de negocio.
6. No mezclar textos visibles con códigos internos.
7. No duplicar métricas entre módulos.
8. No crear componentes visuales exclusivos si el patrón puede reutilizarse.
9. Toda query/vista nueva debe considerar scoping futuro por organización.
10. Cambios de impacto alto requieren advertencia previa.

---

# 3. Nomenclatura interna beta.11

Para evitar que la lógica dependa de términos de Karaka, preferir códigos conceptuales estables.

Ejemplos:

```text
FIELD_OPERATION     -> UI Karaka: Calle
CRM_OPERATION       -> UI Karaka: CRM / Showroom
FIELD_SALES         -> UI Karaka: Vendedor
CRM_MANAGER         -> UI Karaka: Gestor
```

No es obligatorio renombrar ahora columnas/tablas existentes. Aplicar este criterio en nuevos enums/configuraciones/componentes.

---

# 4. Design System reutilizable

Beta.11 debe evitar seguir agregando tarjetas y filtros con JSX/CSS diferentes por pantalla.

Objetivo mínimo de componentes compartidos:

## MetricCard

Props conceptuales:

```text
label
value
note
icon
severity / tone
interactive
selected
onActivate
loading
```

Debe soportar:

- default;
- hover;
- focus-visible;
- selected;
- disabled/loading;
- cifras grandes;
- moneda;
- duración;
- porcentaje.

## MetricGroup

Agrupa KPI por dominio sin depender del nombre de la empresa.

Ejemplos:

```text
Field Execution
CRM / Showroom
Commercial Results
```

## FilterBar / FilterChip

Reutilizables en Jornadas y Reportes.

## DetailDrawer

Reutilizable para jornada, follow-up, cita u otros detalles futuros.

## NotificationItem

Debe recibir categoría/severidad/destino, no decidir comportamiento por nombre de cliente.

---

# 5. Reportes bajo arquitectura comercial

Los tres bloques de beta.11 deben modelarse como capacidades, no como tarjetas Karaka hardcoded.

## Field / Calle

Métricas universales:

- planned;
- visited;
- coverage;
- resolved;
- resolution;
- route window;
- visit attention;
- transit/wait;
- incidents;
- GPS distance.

## CRM / Showroom

Capacidades:

- follow-ups;
- calls;
- contacts;
- appointments;
- indoor/showroom sessions;
- durations;
- conversion.

## Commercial Results

- customers with purchase;
- field sales;
- showroom/CRM sales;
- total sales;
- conversion.

Si un futuro cliente no tiene Showroom, el feature debe poder ocultarse sin reconstruir Reportes.

---

# 6. Corrección P0 de horas bajo este principio

Beta.11 debe corregir el bug de `Horas gestión calle` usando la fuente operacional estable:

```text
SUM(executive_route_journeys_v2.route_window_seconds)
```

No se permitirá crear una fórmula específica solo para los datos de Karaka.

La definición debe ser general:

```text
Field operation window = inicio de sesión de campo -> cierre/cutoff operativo
```

Métricas derivadas:

```text
Visit attention = SUM(visit_seconds)
Incident time = SUM(incident_seconds)
Transit/wait estimated = SUM(transit_wait_estimated_seconds)
```

Estas definiciones deben servir a cualquier organización con field execution.

---

# 7. Gestores / CRM bajo arquitectura comercial

No acoplar la experiencia a la palabra `Gestor`.

Internamente pensar en un perfil/capacidad CRM.

Fuentes actuales Karaka:

- calls;
- appointments;
- showroom_sessions;
- follow_ups.

Las métricas deben poder usarse en organizaciones que llamen al rol:

- Televentas;
- Inside Sales;
- Asesor;
- Customer Success;
- Ejecutivo CRM.

No asumir que todos tendrán Showroom físico.

Por eso:

```text
CRM core = calls + follow-ups + appointments
Showroom = capability opcional
```

---

# 8. Follow-ups como work queue genérica

`follow_ups` debe tratarse como entidad general de próximas acciones.

No limitarla a llamadas.

Posibles fuentes futuras:

- llamada;
- visita;
- cita;
- prospecto;
- email;
- cobranza;
- tarea manual.

Campos actuales se conservan.

Beta.11 debe evitar introducir un `source_type` exclusivo de Karaka cuando pueda usarse un código de dominio reutilizable.

---

# 9. Notificaciones SaaS-ready

Centro de Alertas beta.11 debe separar:

```text
category
severity
entity_type
entity_id
target
status
```

UI Karaka puede mostrar:

- Jornadas;
- Rutas / Visitas;
- CRM / Seguimientos;
- Agenda / Showroom;
- Calidad de datos;
- Sistema.

Pero los componentes no deben depender de textos localizados para decidir colores, navegación o seguridad.

Futuro:

```text
organization_id
```

será necesario para aislamiento multi-tenant.

No añadirlo de forma parcial dentro de beta.11 sin migración formal.

---

# 10. Filtros y URLs

Query parameters deben utilizar identificadores estables.

Preferir:

```text
channel=field
channel=crm
status=expired
employee=<uuid>
```

Evitar:

```text
canal=CalleKaraka
```

Los labels visibles pueden configurarse posteriormente sin romper URLs guardadas.

---

# 11. Branding beta.11

No es objetivo de beta.11 reemplazar todos los hardcodes Karaka.

Sin embargo, cualquier nuevo componente compartido debe usar tokens existentes:

```text
--brand
--brand-soft
--surface
--border
--text
--text-muted
--success
--warning
--danger
```

No añadir nuevos hexadecimales Karaka repetidos en múltiples componentes si existe token equivalente.

Cuando sea necesario crear un nuevo semantic token, definirlo a nivel de design system.

---

# 12. Moneda y cifras beta.11

La tarjeta `Monto vendido` debe corregirse visualmente y prepararse para moneda configurable.

En beta.11:

- Karaka sigue mostrando DOP/RD$;
- formatter debe tender a recibir `currency/locale` o usar una abstracción común;
- evitar concatenar manualmente `RD$` en componentes nuevos;
- usar cifras tabulares;
- soportar montos largos sin romper layout.

No realizar migración global de locale/moneda dentro de beta.11 si aumenta riesgo.

---

# 13. Timezone beta.11

Karaka continúa usando:

```text
America/Santo_Domingo
```

No cambiar la regla temporal actual.

Pero si beta.11 crea nuevos helpers de fecha/período:

- centralizar la timezone;
- evitar duplicar literales en múltiples componentes nuevos;
- preparar helper para recibir timezone configurable posteriormente.

Regla de jornada sigue siendo estricta.

---

# 14. Territorio beta.11

No modificar la cartografía oficial RD por comercialización.

Los filtros actuales permanecen:

- Región;
- Provincia;
- Municipio.

Para componentes nuevos:

- no asumir que estos labels son universales;
- separar valor/nivel de label visible cuando sea práctico;
- conservar snapshots históricas.

La generalización internacional del motor territorial será un bloque futuro independiente.

---

# 15. Feature capability matrix futura

Beta.11 no implementará planes comerciales, pero los nuevos componentes no deben impedir este modelo:

| Capability | Karaka | Futuro cliente sin CRM | Futuro cliente CRM-only |
|---|---:|---:|---:|
| Field Routes | Sí | Sí | No |
| Field Visits | Sí | Sí | No |
| CRM Calls | Sí | No | Sí |
| Follow-ups | Sí | Opcional | Sí |
| Appointments | Sí | Opcional | Sí |
| Showroom | Sí | No | Opcional |
| Capture | Sí | Opcional | Opcional |
| Official Territory | Sí (RD) | Configurable | Configurable |
| Advanced Reports | Sí | Configurable | Configurable |

Objetivo: módulos opcionales sin forks.

---

# 16. Data / Supabase beta.11

Antes de crear backend nuevo:

1. identificar si la capacidad es universal o Karaka-specific;
2. reutilizar tablas existentes cuando semánticamente correctas;
3. crear vista ejecutiva genérica si varias pantallas requieren la misma métrica;
4. asegurar scoping por empleado actual;
5. documentar cómo se incorporaría organization scoping futuro;
6. evitar columnas `karaka_*` o similares.

Si surge necesidad de cambiar esquema central con impacto en futura multi-tenancy:

**detenerse y advertir antes de aplicar.**

---

# 17. QA adicional por comercialización

Además del QA funcional beta.11, revisar:

- [ ] no se añadieron nuevos hardcodes de empresa innecesarios;
- [ ] componentes nuevos no dependen de nombres de roles visibles;
- [ ] métricas tienen definición reusable;
- [ ] formatters están centralizados cuando se introducen nuevos;
- [ ] estilos usan semantic tokens;
- [ ] módulos opcionales no contaminan otros módulos;
- [ ] filtros usan IDs/códigos estables;
- [ ] deep-links validan permisos;
- [ ] exportaciones reutilizan definiciones del reporte;
- [ ] arquitectura no introduce riesgo de cross-user data leak;
- [ ] cualquier cambio de alto impacto fue previamente aprobado.

---

# 18. Qué sí puede refactorizarse sin cambiar experiencia Karaka

Beta.11 puede introducir refactors internos cuando:

- resultado observable es el mismo;
- build/CI pasa;
- comportamiento por rol se mantiene;
- datos no se pierden;
- reduce acoplamiento;
- facilita reutilización.

Ejemplos:

- extraer `MetricCard`;
- extraer `PeriodSelector`;
- centralizar formatter de duración;
- centralizar currency formatter;
- centralizar helpers de filtros;
- separar query/service de UI.

---

# 19. Qué requiere autorización previa

Durante beta.11 detenerse antes de:

- introducir organization/tenant migration global;
- cambiar Auth;
- cambiar RLS central por organización;
- renombrar/eliminar tablas productivas;
- cambiar significado de KPI existente;
- cambiar estados de negocio;
- cambiar regla temporal de jornada;
- eliminar un módulo;
- cambiar asignación de roles;
- migrar moneda/timezone global;
- alterar territorio oficial histórico.

---

# 20. Definition of Done comercial para beta.11

Beta.11 estará comercialmente mejor preparada cuando:

1. la UI use componentes compartidos para sus nuevos patrones;
2. Calle y CRM estén modelados como capacidades distintas pero coherentes;
3. ninguna métrica nueva dependa de una anomalía de datos específica de Karaka;
4. notificaciones utilicen códigos/categorías estables;
5. filtros/deep-links utilicen IDs/valores estables;
6. los nuevos estilos estén tokenizados;
7. el comportamiento productivo Karaka permanezca intacto salvo mejoras aprobadas;
8. exista una trayectoria clara hacia organization configuration sin tener que reescribir beta.11.

---

# 21. Regla final beta.11

> Beta.11 no es solo un rediseño de Jornadas/Reportes. Es el primer bloque que debe demostrar que el producto puede mejorar para Karaka al mismo tiempo que reduce dependencia arquitectónica de Karaka.

> La comercialización no justifica romper producción ni crear abstracciones innecesarias. Se aplicará de manera progresiva, medible y segura.
