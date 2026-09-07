# Continuación actual — Gestión de Ventas Diaria

Fecha: **07/09/2026 (RD)**

> **LEER PRIMERO EN EL PRÓXIMO CHAT.** GitHub `main`, Supabase y Cloudflare son la fuente de verdad. Verificar estado real antes de escribir o desplegar.

## Documento prioritario

Leer completo:

**`docs/CHAT_CONTINUATION_2026-09-07_FINAL.md`**

Después leer:

**`docs/LOGISTICS_DRIVER_PERFORMANCE_PHASE1_2026-09-07.md`**

## Producción estable

- `main` sigue en **0.6.5-beta.12.2.8**.
- Producción: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Logística NO ha sido mergeada ni desplegada a producción.
- Datos siguen siendo **TEST** hasta declaración explícita de Go-Live.

## Rama de Logística

Trabajar únicamente en:

**`feature/logistics-delivery-v1`**

PR:

**#58 — OPEN + DRAFT + NO MERGE**.

Verificar el head actual al comenzar el próximo chat, porque los commits finales de documentación modifican el SHA de la rama sin cambiar la lógica funcional.

## Estado funcional

Logística está implementada y con QA E2E avanzado:

- Transportistas / Choferes / Vehículos;
- Excel + `entregas.xlsx` + carga manual;
- viajes, paradas, documentos y múltiples facturas por parada;
- Torre de Control / mapas / división territorial;
- acceso temporal de chofer link + PIN;
- llegada, descarga, entrega y conciliación por documento;
- POD/foto/firma base;
- incidencias y resolución por chofer;
- retorno a base separado del cierre;
- cierre con GPS/hora;
- viaje finalizado en solo lectura.

## Performance — Fase 1 YA aplicada

No repetir esta implementación.

Existe:

`public/delivery-geo-optimizer.js`

cargado desde `index.html` antes de la app y limitado a `/entrega/`.

Hace:

- cache GPS para eventos intermedios;
- timeout ~1.8 s para intento intermedio;
- timeout máximo ~3.5 s para GPS fresco crítico;
- sin polling;
- sin Realtime;
- sin GPS continuo;
- sin llamadas Supabase adicionales.

Aunque `ExternalDelivery.tsx` conserve el `getGeo()` original con `timeout: 9000`, el optimizador intercepta la geolocalización en el portal del chofer. No concluir que la Fase 1 falta solo por ver ese código original.

Build validation de la Fase 1 y head funcional posterior: **verde** (#804 y #806 conocidos).

### Siguiente prueba

Realizar **QA móvil comparativo de latencia**. Si sigue lento, Fase 2 backend:

- throttle de `last_used_at`;
- paralelización segura de updates por documento;
- paralelización segura de evidencia;
- medir GPS vs Edge Function vs tiempo total.

## P0 pendientes antes de producción

1. **Reintentos / saldos pendientes con trazabilidad**:
   - activo bloquea;
   - `DELIVERED` bloquea;
   - `NOT_DELIVERED`, `RESCHEDULED`, `CANCELLED` permiten reintento;
   - `PARTIAL` solo reintenta bultos retornados;
   - mantener intento #N / referencia al documento anterior.
2. **Firma/POD en dos etapas**:
   - conciliación primero;
   - después pantalla grande dedicada a firma;
   - no guardar definitivamente antes de confirmar la firma.
3. **QA móvil de Performance Fase 1**.

## P1 pendiente

**Historial por Viaje**:

- `Documentos | Viajes`;
- mapa grande;
- timeline de eventos;
- tiempos de salida/llegada/descarga/entrega/retorno/cierre;
- trayectoria estimada entre eventos;
- NO tracking continuo de fondo.

## Orden exacto del próximo chat

1. Leer `docs/CHAT_CONTINUATION_2026-09-07_FINAL.md`.
2. Verificar PR #58, rama y CI reales.
3. Verificar Supabase/Edge Function antes de cambios.
4. QA móvil Performance Fase 1.
5. Fase 2 backend solo si hace falta.
6. Reintentos/saldo pendiente.
7. Firma/POD dos etapas.
8. Historial por Viajes.
9. QA E2E final.
10. Auditoría final y decidir GO/NO-GO.

## Reglas

- NO tocar `main` todavía.
- NO mergear PR #58 todavía.
- NO deploy de Logística todavía.
- NO repetir migraciones.
- NO limpiar TEST.
- NO introducir polling/Reatime.
- En Windows del usuario usar GitHub Desktop + CMD/PowerShell; no depender de `git` CLI.
- Dar pasos sensibles de uno en uno.

> El próximo chat debe continuar desde este checkpoint, no reconstruir Logística desde cero.