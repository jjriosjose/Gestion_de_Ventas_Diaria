# Prompt de continuidad — 25/09/2026 — beta.16.3.14

> **PROMPT HISTÓRICO — NO USAR PARA CONTINUIDAD ACTUAL.**
>
> Usar: `docs/CONTINUATION_PROMPT_2026-09-25_BETA16_3_15.md`.

Continúa el proyecto **Gestión de Ventas Diaria** del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`.

Antes de modificar cualquier cosa:

1. Lee COMPLETO `docs/CHAT_CONTINUATION_CURRENT.md`.
2. Lee `docs/CHAT_CONTINUATION_2026-09-25.md`.
3. Verifica el estado vivo de GitHub `main`, Supabase y Cloudflare.
4. No asumas que una rama experimental o PR cerrado está en producción.
5. No ejecutes migraciones por memoria.
6. No hagas limpieza de datos sin validar dependencias, GPS y auditoría.

Estado esperado al 25/09/2026:
- producción: **0.6.5-beta.16.3.14**;
- Cloudflare Version ID: `9f5528db-cf99-4a17-92b3-4ff85d9e9e98`;
- Captación Operativa dentro de Rutas: productiva;
- Tracking muestra detalle completo de captaciones;
- Supabase productivo tiene guards QA activos para tablas y Storage;
- PR #85 `QA data isolation frontend / local staging`: **PAUSADO/CERRADO/NO MERGED**;
- Docker/local Supabase: descartado por ahora;
- el usuario prevé pagar membresía Supabase la próxima semana y entonces evaluar Development Branch/staging;
- Captación Programada completa sigue pendiente.

Incidente importante:
- se eliminaron captaciones QA del 25/09;
- una visita real de Virmania a TIENDA AMARILLA fue eliminada por error y luego reconstruida desde audit_log;
- no volver a limpiar una sesión completa sin validar cada actividad individual;
- secuencia verificada después: TIENDA AMARILLA → EL BOMBAZO → ALMACENES EL ENCANTO (STGO).

Primero resume:
- versión real actual;
- estado de PRs/ramas relevantes;
- migraciones Supabase recientes;
- P0/P1;
- siguiente paso exacto.

No hagas merge, deploy ni SQL destructivo antes de verificar el estado vivo.
