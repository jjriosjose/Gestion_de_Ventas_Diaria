# V0.6.5-beta.11 — Deployment Status

Fecha de despliegue: **28/08/2026 (RD)**.

## Estado

V0.6.5-beta.11 fue fusionada a `main`, compilada localmente y desplegada correctamente en Cloudflare Workers.

### GitHub

- PR: `#42 — V0.6.5-beta.11 · Operational Intelligence & UX Polish`
- Estado: MERGED
- Merge commit: `b1de7c7ae75f49e58b83c4f42b86fee09dd9bfb3`
- `package.json`: `0.6.5-beta.11`
- GitHub Actions `Build validation`: SUCCESS
- GitHub Actions `Generate territorial GeoJSON`: SUCCESS

### Supabase

Backend beta.11 aplicado previamente y validado.

Migraciones beta.11 relevantes:

- `v065_beta11_operational_intelligence`
- `v065_beta11_visit_count_metric`

No ejecutar SQL manual ni repetir migraciones.

### Cloudflare

- Worker: `gestion-de-ventas-diaria`
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Wrangler: `4.125.0`
- Assets leídos: 18
- Assets nuevos/modificados subidos: 7
- Resultado: `Success! Uploaded 7 files (8 already uploaded)`
- **Current Version ID:** `e267fbb6-c544-466f-b37f-b6d5b5e2f8ee`

Estado consolidado:

```text
GitHub main      = V0.6.5-beta.11
Supabase backend = beta.11 aplicado
Cloudflare UI    = V0.6.5-beta.11 desplegada
Version ID       = e267fbb6-c544-466f-b37f-b6d5b5e2f8ee
```

## Validación productiva pendiente

El despliegue técnico está confirmado. Antes de declarar beta.11 estable deben validarse visual y funcionalmente:

### Administrador

- versión visible `0.6.5-beta.11`;
- Inicio sin regresiones;
- Control Operativo tabs Calle / CRM-Showroom;
- Jornadas: Atención clientes, Tiempo en calle, Traslado/espera y drawer;
- Reportes agrupados por dominio y Monto vendido correctamente ajustado;
- Horas Calle coherentes con Jornadas (~22 h 23 min para el período auditado, sujeto a filtros/datos visibles);
- Centro de Alertas categorizado y coloreado;
- deep-links de Jornada, Agenda y follow-ups;
- Excel/PDF.

### Vendedor — Cesar Caba

- aislamiento de datos propio;
- Mis jornadas;
- Atención real en visitas;
- protección de jornadas vencidas;
- alertas propias;
- Reportes scoped.

### Gestor — Evelyn Ochoa

- entrada a Mi gestión CRM;
- llamadas/contactabilidad;
- tiempo de llamadas;
- citas;
- showroom y duración;
- follow-ups activos;
- completar/reprogramar;
- alertas/deep-links;
- ausencia de datos de otros Gestores.

### Regresión

- Login;
- Clientes;
- Mapa;
- Planificación;
- Rutas;
- Captación;
- Visitas;
- Llamadas;
- Agenda / Showroom;
- Recepción.

## Regla

No iniciar nuevas funcionalidades sobre beta.11 antes de completar esta validación productiva, salvo corrección de un blocker detectado durante las pruebas.
