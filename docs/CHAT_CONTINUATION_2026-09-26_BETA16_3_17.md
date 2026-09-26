# Continuación — 0.6.5-beta.16.3.17 PRODUCTIVO

Fecha: **26/09/2026 (RD)**

## Fuente de verdad

Orden obligatorio:
1. GitHub `main`
2. Supabase vivo
3. Cloudflare productivo
4. documentación actual
5. historial del chat

Antes de modificar código, SQL, merge o deploy, verificar estado vivo.

## Estado productivo confirmado

Repositorio:
`jjriosjose/Gestion_de_Ventas_Diaria`

GitHub `main`:
- versión: **0.6.5-beta.16.3.17**
- merge funcional Reportes: PR #94
- merge trazabilidad visual: PR #96
- commit funcional/versionado de referencia: `082cc66c104375d4367b1a7335f6d33b3519e231`
- Build validation #1313: **SUCCESS**

Cloudflare:
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- versión productiva: **0.6.5-beta.16.3.17**
- versión visible validada: **v0.6.5 · 16.3.17**
- Current Version ID: `e8789ba6-3d3a-4c33-9d43-0206b56339a2`
- QA productivo: **APROBADO por el usuario**

Baseline protegido:
- `release/production-baseline.json`
- versión: **0.6.5-beta.16.3.17**
- Cloudflare Version ID: `e8789ba6-3d3a-4c33-9d43-0206b56339a2`

Supabase:
- este release no realizó cambios SQL;
- no hubo migraciones;
- no hubo cambios RLS/Auth/Storage;
- conservar los QA guards existentes.

## Reportes V2 productivos

Validado:
- resumen general sin selección invisible;
- drill-down solo por selección explícita;
- Showroom atribuido a quien realizó la atención;
- citas por responsabilidad;
- montos pendientes separados Calle / Showroom;
- tablas Gestor/Vendedor legibles con columna sticky;
- períodos <=45 días: detalle diario;
- períodos >45 días: resumen mensual + drill-down diario;
- PDF conserva vista ejecutiva;
- Excel analítico multihoja conserva detalle granular.

Hojas Excel:
- Parametros
- Resumen Vendedores
- Resumen Gestores
- Comercial Diario
- Jornadas Calle
- CRM Diario
- Showroom Detalle
- Visitas Detalle
- Llamadas Detalle

## Regla de versionado visible

A partir de 16.3.17, la versión visible incluye el build para trazabilidad operativa.

Ejemplo:
- comercial: `v0.6.5`
- visible de release: `v0.6.5 · 16.3.17`
- técnica: `0.6.5-beta.16.3.17`

Cada ajuste futuro que llegue a producción debe incrementar el build y quedar identificable visualmente.

## Principio de producto SaaS

Toda decisión futura debe diseñarse pensando que la aplicación será vendida a empresas como sistema comercial:
- tenant-neutral;
- configurable por empresa;
- segura por roles/RLS;
- auditable;
- escalable en volumen y años de datos;
- responsive;
- mantenible;
- preparada para branding, timezone, locale y moneda por tenant;
- exportaciones gobernadas por permisos;
- sin acoplamientos innecesarios a Karaka.

## Deuda arquitectónica identificada, NO bloqueante

Antes de onboarding de una segunda empresa:
- timezone `America/Santo_Domingo` → configuración por tenant;
- locale `es-DO` → configuración por tenant;
- moneda DOP → configuración por tenant;
- branding/metadata de exportación → configuración por tenant;
- permisos/auditoría específicos para exportaciones sensibles;
- estrategia de exportación para grandes volúmenes evitando cargar todo el XLSX en memoria del navegador.

No ampliar releases funcionales ya validados con estas refactorizaciones sin una fase separada.

## Workflow obligatorio

`feature branch → CI/build → QA aislado → PR → aprobación → merge → deploy con npm run deploy → QA producción → actualizar baseline`

No usar `wrangler deploy` directamente.

## Próximo paso

Antes de una nueva funcionalidad:
1. verificar `main`, Cloudflare y Supabase;
2. crear una rama nueva;
3. mantener 16.3.17 como baseline de retorno;
4. diseñar cualquier cambio con criterio SaaS/comercial;
5. si requiere escritura QA, usar staging/Development Branch cuando esté disponible.
