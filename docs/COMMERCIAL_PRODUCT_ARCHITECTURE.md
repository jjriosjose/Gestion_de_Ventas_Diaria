# Commercial Product Architecture — Gestión de Ventas Diaria

Fecha de decisión: **27/08/2026 (RD)**.

> Documento estratégico y arquitectónico obligatorio para todas las versiones futuras.
>
> La aplicación deja de considerarse un desarrollo exclusivamente interno de Almacenes Karaka y pasa a diseñarse como un **producto de software empresarial comercializable**, adaptable a diferentes organizaciones, industrias y configuraciones operativas.

---

# 1. Principio principal

**Cada actualización debe mejorar el producto sin romper lo que ya funciona y debe aumentar su capacidad para ser comercializado, configurado y adaptado a diferentes clientes.**

La implementación actual de Almacenes Karaka se considera desde este momento la **configuración/cliente de referencia** del producto, no la definición absoluta del producto.

El objetivo no es reemplazar ni alterar la operación actual de Karaka. El objetivo es evolucionar progresivamente el núcleo para que futuras organizaciones puedan utilizarlo sin reconstruir la aplicación.

---

# 2. Reglas obligatorias para cualquier cambio futuro

Toda modificación, actualización, nueva función o mejora debe cumplir simultáneamente:

1. Mantener intacta la lógica y funcionamiento productivo vigente salvo autorización explícita.
2. No eliminar ni alterar funcionalidades existentes sin aprobación.
3. Diseñar nuevas funciones pensando en múltiples tipos de clientes y empresas.
4. Evitar soluciones innecesariamente específicas para una sola organización.
5. Priorizar configurabilidad, escalabilidad, reutilización, personalización controlada y mantenibilidad.
6. Evitar que futuras adaptaciones requieran forks o reconstrucciones completas.
7. Mantener arquitectura, componentes y código organizados para evolución continua.
8. Antes de modificar una función existente, identificar sus dependencias y módulos afectados.
9. Evitar cambios que puedan generar pérdida de información, incompatibilidades, regresiones o problemas de seguridad.
10. Si una solicitud tiene impacto alto o puede cambiar lógica existente, detener la ejecución y advertir antes de aplicar el cambio.
11. Integrar nuevas funciones coherentemente con navegación, permisos, design system y estructura general.
12. Mantener defensa en profundidad en frontend, backend, RLS, exportaciones y vistas ejecutivas.
13. Toda métrica debe conservar definición consistente entre Inicio, Jornadas, Reportes y exportaciones.
14. Toda configuración específica del cliente debe tender a convertirse en dato/configuración, no en lógica duplicada.

---

# 3. Modelo mental del producto

Arquitectura conceptual objetivo:

```text
PRODUCT CORE
│
├── Identity / Access
├── Clients / CRM
├── Territory
├── Planning
├── Routes / Field Execution
├── Journeys / Operational Control
├── Calls / Follow-ups
├── Agenda / Appointments
├── Showroom / Reception
├── Capture / Prospects
├── Notifications
├── Reporting / Analytics
└── Configuration / Administration
        │
        ▼
ORGANIZATION CONFIGURATION
        │
        ├── Branding
        ├── Locale
        ├── Currency
        ├── Timezone
        ├── Terminology
        ├── Territory model
        ├── Enabled features
        ├── Permissions
        └── Business rules
```

Karaka utiliza este núcleo con una configuración propia.

---

# 4. Estrategia SaaS: transición progresiva, no migración destructiva

No se realizará una conversión multi-tenant agresiva durante beta.11.

La estrategia es:

## Fase A — SaaS-ready

Desde ahora:

- nuevos componentes reutilizables;
- evitar nuevos hardcodes Karaka cuando no sean necesarios;
- encapsular branding, moneda, timezone y terminología cuando se modifiquen esas áreas;
- diseñar tablas/vistas nuevas pensando en futura pertenencia a organización;
- evitar dependencias directas que dificulten introducir `organization_id` posteriormente;
- construir feature flags/configuración donde exista beneficio real.

## Fase B — Organization abstraction

En un bloque futuro controlado:

- `organizations`;
- `organization_settings`;
- `organization_branding`;
- `organization_features`;
- `organization_memberships`;
- estrategia de tenant scoping;
- migración de la configuración Karaka a organización de referencia.

## Fase C — Multi-tenant SaaS

Solo cuando la arquitectura esté lista:

- `organization_id` en entidades operativas relevantes;
- RLS obligatoria por organización;
- usuarios con memberships;
- aislamiento de exportaciones, notificaciones, storage y vistas ejecutivas;
- pruebas de cross-tenant data leakage;
- dominio/subdominio/configuración por cliente.

Nunca introducir multi-tenancy parcial que dé una falsa sensación de aislamiento.

---

# 5. Karaka como tenant/configuración de referencia

Karaka debe continuar funcionando exactamente como hoy.

Configuración conceptual actual:

```text
organization.name      = Almacenes Karaka
organization.currency  = DOP
organization.timezone  = America/Santo_Domingo
organization.locale    = es-DO
organization.brand     = Karaka
territory.country      = Dominican Republic
```

Esto no obliga a crear inmediatamente estas tablas/columnas. Define la dirección arquitectónica.

Regla:

> Una refactorización interna es válida cuando mantiene el mismo comportamiento observable para Karaka y reduce acoplamiento específico.

Ejemplo válido:

```text
Antes: formato monetario DOP hardcoded
Después: formatter recibe configuración de moneda; Karaka sigue enviando DOP
```

---

# 6. Branding y white-label controlado

El producto debe evolucionar hacia branding configurable sin permitir que cada cliente destruya el design system.

Configuración futura permitida:

- nombre comercial;
- logo;
- favicon;
- color principal;
- color de acento;
- imágenes de login;
- datos legales/contacto;
- nombre del producto mostrado cuando corresponda.

El sistema conservará:

- tipografía base;
- grid;
- spacing;
- componentes;
- comportamiento;
- accesibilidad;
- estados de interacción;
- patrones UX.

Objetivo:

```text
Producto consistente + identidad del cliente
```

No:

```text
una UI distinta y difícil de mantener por cada empresa
```

---

# 7. Localización, moneda y tiempo

No introducir nuevos hardcodes regionales cuando se desarrollen áreas relacionadas.

Configuraciones objetivo:

- locale;
- idioma;
- moneda;
- símbolo/formato monetario;
- timezone;
- formato de fecha;
- primer día de semana;
- unidades de distancia;
- formatos de teléfono/dirección cuando sea necesario.

## Timezone

La lógica actual de Karaka usa `America/Santo_Domingo`.

Debe mantenerse hasta una migración explícita a configuración organizacional.

Regla futura crítica:

> Toda regla de “hoy”, cierre de jornada, vencimiento, programación y reporte debe resolverse en la timezone de la organización, no en UTC ni en la timezone del navegador de forma implícita.

---

# 8. Terminología configurable

Los nombres funcionales internos deben separarse progresivamente de sus etiquetas visibles.

Ejemplos:

```text
Rol interno       Etiqueta Karaka         Otro cliente
FIELD_SALES       Vendedor                Ejecutivo comercial
CRM_MANAGER       Gestor                  Televentas
SUPERVISOR        Supervisor              Coordinador
RECEPTION         Recepción               Front Desk
```

No cambiar inmediatamente los nombres actuales de Karaka.

Para nuevos componentes, evitar usar etiquetas visibles como identificadores de lógica cuando pueda utilizarse un código estable.

---

# 9. Roles, permisos y perfiles

El modelo comercial debe distinguir:

1. rol/perfil funcional;
2. permisos efectivos;
3. etiqueta visible;
4. alcance de datos;
5. pertenencia organizacional futura.

No basar seguridad solamente en etiquetas de rol.

Los permisos existentes continúan siendo válidos.

La evolución debe permitir:

- perfiles predefinidos;
- overrides;
- roles personalizados en Enterprise cuando se justifique;
- features opcionales sin multiplicar condiciones hardcoded en las páginas.

---

# 10. Feature flags y módulos configurables

No todos los clientes necesitarán todos los módulos.

Arquitectura futura objetivo:

```text
features.routes
features.capture
features.crm
features.showroom
features.reception
features.data_quality
features.advanced_reporting
features.territory_official
```

El menú, permisos y rutas deben poder responder a estas capacidades.

No implementar planes comerciales Starter/Pro/Enterprise todavía; dejar el código preparado para que la habilitación de features no requiera forks.

---

# 11. Territorio: abstraer sin romper RD

La División Territorial Oficial de República Dominicana es un activo funcional validado y no debe eliminarse ni degradarse.

Sin embargo, el core no debe asumir que todos los países utilizan:

```text
Región -> Provincia -> Municipio -> Distrito Municipal
```

Modelo conceptual futuro:

```text
Territory Level 1
Territory Level 2
Territory Level 3
Territory Level 4
```

La configuración del país/organización define etiquetas, jerarquía y fuentes geográficas.

Karaka seguirá mostrando:

- Región;
- Provincia;
- Municipio;
- Distrito Municipal.

Las snapshots históricas territoriales deben mantenerse estables.

---

# 12. Datos históricos y configuraciones cambiantes

Principio:

> Cambiar una configuración maestra no debe reescribir silenciosamente el significado histórico de una operación ya cerrada.

Ejemplos ya aplicados correctamente:

- snapshot territorial en `route_stops`.

Aplicar el mismo criterio cuando sea necesario a:

- monedas/tasas si en el futuro existen múltiples monedas;
- nombres comerciales relevantes en documentos;
- estados de flujo;
- configuración de territorio;
- reglas de SLA;
- versiones de formularios.

No sobredimensionar snapshots donde no exista necesidad de auditoría.

---

# 13. Componentes reutilizables / Design System

Beta.11 debe iniciar una consolidación real de componentes compartidos.

Componentes objetivo:

- `MetricCard`;
- `MetricGroup`;
- `FilterBar`;
- `FilterChip`;
- `StatusBadge`;
- `DataTable`;
- `DetailDrawer`;
- `AlertBanner`;
- `NotificationItem`;
- `EmptyState`;
- `PageToolbar`;
- `SegmentedControl`;
- `PeriodSelector`.

Regla:

> Si dos módulos necesitan el mismo patrón visual/funcional, preferir un componente común configurable antes que duplicar CSS/JSX.

No abstraer prematuramente comportamientos que todavía no se entiendan; consolidar patrones ya probados.

---

# 14. APIs, servicios y capa de datos

Los componentes UI no deben acumular lógica empresarial duplicada.

Dirección objetivo:

```text
UI Components
      ↓
Feature hooks / services
      ↓
Supabase queries / RPC
      ↓
Database / RLS
```

Reglas:

- fórmulas críticas preferiblemente centralizadas;
- queries complejas reutilizadas;
- tipos estables;
- evitar que diferentes pantallas implementen la misma métrica de forma distinta;
- separar datos de presentación;
- operaciones críticas protegidas en backend.

---

# 15. Seguridad SaaS-ready

Antes de comercializar como SaaS compartido será obligatorio demostrar aislamiento por tenant.

Controles objetivo futuros:

- `organization_id` consistente;
- RLS por membership;
- Storage segmentado;
- RPC tenant-aware;
- vistas ejecutivas tenant-aware;
- notificaciones tenant-aware;
- exports tenant-aware;
- jobs/functions tenant-aware;
- índices compuestos por organización cuando corresponda.

Pruebas obligatorias futuras:

```text
Usuario Empresa A no puede leer Empresa B
Usuario Empresa A no puede mutar Empresa B
Exports no mezclan tenants
Search/autocomplete no filtra datos de otros tenants
Notificaciones no filtran datos de otros tenants
URLs/deep-links no permiten IDOR
```

---

# 16. Configuración vs customización

Preferir configuración declarativa.

Ejemplo correcto:

```text
feature.showroom = false
terminology.field_sales = "Ejecutivo"
currency = USD
```

Evitar:

```text
if cliente == X hacer flujo A
else if cliente == Y hacer flujo B
```

Las excepciones específicas solo se admitirán cuando exista una razón empresarial real y deberán encapsularse mediante política/feature/configuración explícita.

---

# 17. Compatibilidad y regresiones

Antes de modificar una función existente se debe construir un mapa de impacto mínimo:

- componentes que la consumen;
- hooks/services;
- tablas/vistas/RPC;
- permisos/RLS;
- exportaciones;
- notificaciones;
- responsive;
- historial;
- otros roles.

Clasificación:

## Impacto bajo

- estilo aislado;
- copy;
- componente reutilizable sin cambio semántico.

Puede implementarse con pruebas normales.

## Impacto medio

- refactor interno;
- nueva vista/RPC;
- filtros compartidos;
- permisos.

Debe aislarse en rama, validar build y pruebas funcionales.

## Impacto alto

- cambio de esquema central;
- autenticación;
- tenant scoping;
- cambio de significado de métricas;
- migración histórica;
- eliminación/alteración de flujo.

**Detenerse y solicitar autorización antes de aplicar.**

---

# 18. Observabilidad y auditabilidad

Un producto comercial necesita poder explicar qué ocurrió.

Dirección futura:

- timestamps confiables;
- actor/usuario;
- estados explícitos;
- motivos de cierre/cancelación;
- regularizaciones identificables;
- errores operativos capturables;
- logs técnicos sin información sensible;
- auditoría de acciones administrativas cuando el producto lo requiera.

No crear un sistema de auditoría completo dentro de beta.11 salvo que sea necesario para una funcionalidad concreta.

---

# 19. Performance y escala

Diseñar pensando en:

- más clientes;
- más empleados;
- más años de histórico;
- múltiples organizaciones futuras;
- más geometrías;
- mayor cantidad de notificaciones y actividad.

Principios:

- paginación/virtualización cuando corresponda;
- índices orientados a queries reales;
- agregación backend para reportes pesados;
- lazy loading/code splitting;
- evitar cargar datasets completos innecesariamente;
- cache solo cuando sea coherente con seguridad/frescura.

La advertencia actual de bundle >500 KB permanece como deuda conocida y debe abordarse después de estabilizar beta.11, salvo impacto real antes.

---

# 20. Exportaciones y documentos

Excel/PDF son parte del producto y deben respetar:

- filtros;
- permisos;
- branding de organización futuro;
- moneda/locale;
- definiciones métricas;
- tenant scoping futuro;
- trazabilidad del período/fecha de generación.

No considerar exportaciones como una función secundaria desconectada del modelo principal.

---

# 21. Notificaciones comerciales

La arquitectura beta.11 del Centro de Alertas debe nacer genérica.

Modelo conceptual:

```text
category
severity
title
message
entity_type
entity_id
target
status
organization_id (futuro)
employee_id / audience
created_at
read_at
```

Categorías visibles pueden configurarse/traducirse, pero los códigos internos deben ser estables.

Deep-links deben resolver el objeto exacto y validar autorización al abrirlo.

---

# 22. Reportería comercial

Los reportes deben diseñarse como capacidades reutilizables y no como una fotografía fija de Karaka.

Separar:

- métricas universales del dominio;
- métricas opcionales por feature;
- labels/configuración;
- filtros válidos según módulo.

Ejemplo:

Un cliente sin Showroom no debe recibir tarjetas vacías permanentemente; el bloque puede ocultarse mediante feature/configuración sin cambiar el código base.

---

# 23. Beta.11 bajo el principio comercial

Beta.11 debe obedecer explícitamente esta arquitectura.

Aplicaciones concretas:

## Control Operativo

Internamente diferenciar capacidades:

```text
FIELD / CALLE
CRM / INDOOR SALES
```

La etiqueta Karaka será:

```text
Calle
CRM / Showroom
```

No acoplar la lógica de métricas al texto mostrado.

## KPI

Los nuevos `MetricCard` y `MetricGroup` deben ser reutilizables y configurables.

## Filtros

`FilterBar`, `PeriodSelector` y chips deben poder usarse en Jornadas y Reportes.

## Gestores

Construir métricas sobre actividad CRM real, no sobre supuestos de una empresa concreta.

## Follow-ups

`follow_ups` se tratará como work queue genérica de actividad pendiente, aunque Karaka inicialmente la utilice principalmente para llamadas/seguimiento comercial.

## Notificaciones

Categoría/severidad/deep-link deben ser genéricos.

## Drawer

El panel lateral será componente reutilizable.

---

# 24. Qué NO se hará dentro de beta.11 solo por esta decisión

Para reducir riesgo, beta.11 NO incluirá automáticamente:

- migración completa multi-tenant;
- `organization_id` masivo;
- cambio de Supabase Auth;
- nueva facturación SaaS;
- planes comerciales;
- marketplace;
- dominio por tenant;
- traducción completa i18n;
- reemplazo masivo de todos los textos Karaka;
- eliminación de cartografía RD;
- reescritura de permisos existentes.

Cualquier uno de esos bloques requiere diseño/migración independiente.

---

# 25. Criterio para considerar una funcionalidad comercial-ready

Una nueva capacidad debe responder afirmativamente, cuando aplique, a:

1. ¿Mantiene compatibilidad con Karaka?
2. ¿Tiene significado claro y estable?
3. ¿Puede utilizarla otra empresa sin reescribir el feature?
4. ¿Las partes específicas son configurables o están encapsuladas?
5. ¿Respeta permisos/scoping?
6. ¿Puede crecer en volumen?
7. ¿Es consistente con el design system?
8. ¿Es responsive/accesible?
9. ¿Tiene exportaciones/deep-links coherentes si aplica?
10. ¿Su lógica crítica está centralizada?
11. ¿Se puede probar sin depender de datos particulares de Karaka?
12. ¿Evita hardcodes nuevos innecesarios?

---

# 26. Protocolo obligatorio para solicitudes futuras

Antes de ejecutar una modificación significativa, clasificar internamente:

```text
Compatibilidad
Reutilización
Configurabilidad
Escalabilidad
Seguridad
Impacto histórico
```

Si el cambio es de alto impacto o modifica comportamiento existente:

> informar al usuario antes de implementarlo.

Si es compatible y de bajo/medio impacto:

> aislar en rama, implementar, validar CI, probar por roles y fusionar solo después de comprobación.

---

# 27. Decisión final

Desde este checkpoint:

> **Gestión de Ventas Diaria es una plataforma empresarial de gestión comercial y operaciones de ventas en proceso de convertirse en producto SaaS configurable. Almacenes Karaka es la implementación de referencia actual.**

Todo desarrollo posterior debe aumentar simultáneamente:

- calidad operacional;
- calidad visual;
- mantenibilidad;
- reutilización;
- seguridad;
- capacidad de comercialización.

Nunca sacrificar estabilidad productiva para conseguir abstracción prematura.
