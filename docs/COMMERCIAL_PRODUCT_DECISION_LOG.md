# Commercial Product Decision Log

## 27/08/2026 — Producto comercializable / SaaS-ready

### Decisión

Gestión de Ventas Diaria deja de diseñarse exclusivamente como aplicación interna de Almacenes Karaka.

Se adopta oficialmente el principio:

> Cada actualización debe mejorar el producto sin romper lo que ya funciona y debe aumentar su capacidad para ser comercializado y adaptado a diferentes clientes.

### Alcance inmediato

- Karaka permanece sin cambios funcionales por esta decisión.
- Beta.11 será el primer bloque desarrollado explícitamente bajo arquitectura SaaS-ready.
- No se implementa todavía multi-tenancy global.
- No se cambia Auth/RLS central por organización todavía.
- No se elimina branding Karaka.
- No se elimina cartografía RD.
- No se cambia moneda/timezone actual.

### Cambio de disciplina de desarrollo

Toda nueva función debe evaluarse por:

- compatibilidad;
- reutilización;
- configurabilidad;
- escalabilidad;
- seguridad;
- impacto histórico.

Cambios de alto impacto requieren advertencia/aprobación antes de ejecución.

### Documentos asociados

- `PROJECT_HANDOFF.md`
- `docs/COMMERCIAL_PRODUCT_ARCHITECTURE.md`
- `docs/V065_BETA11_COMMERCIALIZATION_ADDENDUM.md`
- `docs/V065_BETA11_ARCHITECTURE_INDEX.md`
- `docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`
