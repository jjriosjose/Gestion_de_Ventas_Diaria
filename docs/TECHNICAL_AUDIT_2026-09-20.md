# Auditoría técnica consolidada — 20/09/2026

Este documento resume hallazgos técnicos confirmados mediante inspección de GitHub y Supabase productivo. **No sustituye al estado vivo**; siempre verificar nuevamente antes de ejecutar cambios.

## Severidad inmediata

### P0 / P1

1. **Fuente de verdad frontend**: producción 16.3.9 estaba adelantada frente a main 16.3.8. Reconciliado el 20/09/2026 mediante merge PR #67; main quedó en `9d5497a59d8a91a3c8bb956b5285a79a57bcd715`.
2. **Reproducibilidad DB**: historial remoto contiene migraciones que no están representadas uno-a-uno por archivos de GitHub. Requiere schema diff/rebuild test.
3. **Staging inexistente**: no hay branch Supabase de desarrollo. QA local puede apuntar a producción.
4. **RLS/confidencialidad**: varias tablas permiten SELECT demasiado amplio para authenticated.
5. **Storage**: fotos privadas a Internet, pero políticas internas deben limitarse por rol/propiedad/operación.
6. **Showroom concurrente**: suma de duración por sesión sobrecuenta tiempo cuando un Gestor atiende varios clientes simultáneamente.
7. **Venta no canónica**: Calls/Visits/Showroom pueden contar touchpoints separados de una misma venta.
8. **Atomicidad**: finalización Showroom, Visita y master import requieren transacciones/RPC/idempotencia.
9. **QA**: no existe suite automatizada suficiente.
10. **DevOps**: main sin protección; deploy Cloudflare manual.
11. **Auditoría**: cobertura de audit trail inconsistente y audit_log demasiado pesado.
12. **Geo performance**: consultas geográficas son el principal hotspot observado.

## Advisors Supabase 20/09/2026

Security:
- 4 Security Definer Views de Tracking.
- 2 funciones privadas con mutable search_path.
- 5 SECURITY DEFINER RPC ejecutables por anon.
- 7 SECURITY DEFINER RPC ejecutables por authenticated.
- leaked-password protection deshabilitado.

Performance:
- 44 FKs sin índice de cobertura.
- 47 índices reportados como no usados.
- 4 casos de múltiples políticas RLS permisivas.

**No interpretar estos contadores como instrucciones de crear/borrar todo.** Cada cambio necesita análisis de uso, EXPLAIN y pruebas de autorización.

## Integridad verificada

La auditoría previa encontró sin anomalías generalizadas:
- duplicados críticos de clientes/usuarios;
- empleados activos sin Auth;
- sesiones activas duplicadas;
- visitas activas duplicadas;
- visitas con fin anterior al inicio;
- jornadas activas sin plan;
- inconsistencias básicas compra/outcome de Showroom;
- coordenadas fuera de rango.

## Prioridad recomendada

1. Reproducibilidad DB y staging.
2. Security/RLS con tests por rol.
3. Atomicidad de flujos críticos.
4. Venta canónica + Showroom grupal.
5. Auditoría/performance.
6. Escalabilidad frontend.

