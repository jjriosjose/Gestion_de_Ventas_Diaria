# Prompt de continuidad — 25/09/2026 — beta16.3.15

Continúa el proyecto **Gestión de Ventas Diaria** del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`.

Antes de modificar cualquier cosa:

1. Lee COMPLETO `docs/CHAT_CONTINUATION_CURRENT.md`.
2. Lee COMPLETO `docs/CHAT_CONTINUATION_2026-09-25_BETA16_3_15.md`.
3. Verifica el estado vivo de GitHub `main`, Supabase y Cloudflare.
4. Verifica PR abiertos.
5. No asumas que una rama experimental está en producción.
6. No ejecutes migraciones por memoria.
7. No hagas limpieza de datos sin validar dependencias, GPS y `audit_log`.

Estado esperado de referencia:
- producción: **0.6.5-beta.16.3.15**;
- versión visible: **v0.6.5 Beta**;
- Cloudflare Current Version ID: `d221fada-8015-4840-b01a-5c2ec4d88880`;
- QA productivo visual de 16.3.15: APROBADO en PC y teléfono;
- Login incluye Logística/TMS y Tracking;
- Mapa/Análisis territorial responsive corregido;
- Captación dentro de Rutas sigue productiva;
- Llamadas 16.3.13 siguen productivas;
- Supabase tiene 42 guards QA + políticas RESTRICTIVE de Storage;
- PR #85 QA/staging: PAUSADO/CERRADO/NO MERGED;
- Production Deploy Guard: ACTIVO EN main por PR #87/#90;
- Captación Programada: pendiente;
- staging/Development Branch: pendiente hasta decisión/membresía Supabase.

Incidente histórico crítico:
- QA local escribió captaciones TEST en producción;
- una limpieza eliminó accidentalmente una visita real de Virmania a TIENDA AMARILLA;
- fue reconstruida desde audit_log;
- nunca limpiar una sesión completa por asociación temporal.

Primero entrega:
- versión real actual;
- commit/main actual;
- estado Cloudflare;
- migraciones Supabase recientes;
- PR abiertos;
- P0/P1;
- siguiente paso exacto.

No hagas merge, deploy ni SQL destructivo antes de verificar el estado vivo.
