# V0.6.5-beta.12.2.1 — Production deployment status

Date: 2026-08-28

Status: DEPLOYED TO PRODUCTION

Cloudflare Worker:
- URL: https://gestion-de-ventas-diaria.jjriosjose.workers.dev
- Current Version ID: 6debdcae-efc0-4b3f-b389-d2e35f2f32ae

GitHub:
- PR #46: V0.6.5-beta.12.2.1 · Tracking Visual Hotfix
- Merge commit: 06c59e3f8bef143acae0f16cf62a1157f437d7f5
- main version: 0.6.5-beta.12.2.1

Validated before merge:
- TypeScript + Vite build: SUCCESS

Scope of hotfix:
- Fixes oversized checkbox rendering inherited from global styles in Tracking.
- Keeps Ver paradas / Solo ruta seleccionada compact and visually consistent.
- Prevents DISTANT_REGISTRATION events from distorting the operational Recorridos viewport.
- Prevents distant/non-reliable anomalies from being drawn as part of the normal estimated operational route.
- Keeps geographic anomalies intact and visible in Calidad GPS / R ↔ C audit mode.
- No changes to Routes, Visits, Journeys or Supabase schema.

Post-deploy QA pending:
- Validate compact Tracking controls.
- Validate Recorridos zoom centered on operational stops.
- Validate Calidad GPS comparison remains available for distant records.
- Validate playback/timeline remains readable and functional.
