# Estado de capacidad Supabase / decisión Free vs Pro — 20/09/2026

Proyecto: `Gestion de Ventas Diaria` (`ccvzosnhxitfeochnflr`)

Estado: **ACTIVE_HEALTHY**

Plan organización: **Free**

## Consumo actual medido

- Database: **164 MB**.
- Storage: **14 MB**, 18 objetos.
- Auth users: **13**.
- Edge Functions activas: **6**.
- Supabase development branches: **0**.

Storage:
- `karaka-photos`: ~14 MB / 8 objetos.
- `delivery-evidence`: ~160 kB / 10 objetos.

Database:
- `audit_log`: ~101 MB.
- `administrative_areas`: ~32 MB.
- `clients`: ~5.2 MB.

El 23/08 hubo un crecimiento excepcional de audit_log por snapshots geográficos (~92 MB de payload). En los 14 días recientes medidos el payload nuevo de auditoría fue ~846 kB.

## Decisión

**Mantener Free durante desarrollo/hardening. No hay urgencia de upgrade por capacidad.**

Triggers internos recomendados para reevaluar:
- DB: ~350–400 MB.
- Storage: ~600–700 MB.
- Egress: revisar panel de Usage; reevaluar alrededor de 70–80% del límite.
- antes de Go-Live real: migrar a Pro por backups/continuidad/margen.

## Optimización antes de pagar por capacidad

- reducir snapshots geográficos completos en audit_log;
- compresión/redimensionamiento de fotos antes de upload;
- retención/archivo de auditoría;
- staging separado para QA;
- monitoreo semanal de DB/Storage/Egress.

Pro no resuelve por sí mismo RLS, QA, transacciones ni reproducibilidad de migraciones.

