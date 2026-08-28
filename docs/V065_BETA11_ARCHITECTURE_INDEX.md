# V0.6.5-beta.11 — Architecture Index

Fecha: **27/08/2026 (RD)**.

Este archivo existe para evitar interpretaciones parciales durante beta.11.

## Orden obligatorio de lectura

1. `PROJECT_HANDOFF.md`
2. `docs/COMMERCIAL_PRODUCT_ARCHITECTURE.md`
3. `docs/V065_BETA11_COMMERCIALIZATION_ADDENDUM.md`
4. `docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`
5. `docs/V065_BETA10_REFINEMENT_STATUS.md`
6. GitHub `main`
7. Supabase remoto
8. Cloudflare productivo

## Qué gobierna cada documento

### `PROJECT_HANDOFF.md`

Estado real, baseline, reglas irreversibles, versión productiva y recuperación de contexto.

### `COMMERCIAL_PRODUCT_ARCHITECTURE.md`

Principios comerciales/SaaS-ready de largo plazo:

- Karaka como configuración de referencia;
- configuración vs customización;
- futura organization abstraction;
- multi-tenancy futuro;
- design system;
- seguridad;
- feature flags;
- territorio/localización;
- reglas de compatibilidad y riesgo.

### `V065_BETA11_COMMERCIALIZATION_ADDENDUM.md`

Traduce los principios comerciales a decisiones concretas de beta.11.

### `V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`

Especificación funcional/UX de beta.11:

- corrección de tiempos;
- Control Operativo;
- Calle;
- CRM/Showroom;
- follow-ups;
- Reportes;
- Notificaciones;
- filtros;
- drawer;
- QA.

## Regla de precedencia

1. Seguridad/integridad de datos.
2. Reglas irreversibles del handoff.
3. Principio comercial/SaaS-ready.
4. Especificación beta.11.
5. Preferencias visuales de implementación.

Si una implementación beta.11 requiere romper comportamiento productivo para cumplir una abstracción comercial, **no se ejecuta automáticamente**. Se detiene y se solicita autorización.

## Estado al crear este índice

```text
Producción        = V0.6.5-beta.10
Cloudflare ID     = 8d6271ac-79e1-4794-b347-7023919040be
Beta.11           = documentada, código aún no iniciado en este checkpoint
Multi-tenant SaaS = NO implementado
SaaS-ready        = principio obligatorio desde ahora
```
