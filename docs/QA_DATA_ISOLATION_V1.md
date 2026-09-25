# QA Data Isolation V1 — estado pausado

Fecha: 25/09/2026

## Estado actual

La iniciativa de aislamiento QA quedó **PAUSADA** por decisión del usuario.

No se continuará por ahora con:
- Docker/Supabase local;
- configuración `.env.local`;
- frontend 0.6.5-beta.16.3.15-test.1;
- Development Branch de Supabase.

Motivo:
- el usuario prevé activar membresía Supabase la próxima semana;
- en ese momento se evaluará staging/Development Branch de forma oficial.

## Lo que SÍ está vivo en producción

Dos protecciones backend ya fueron aplicadas a Supabase productivo:

- `20260925160308_qa_data_isolation_production_write_guard`
- `20260925160509_qa_data_isolation_storage_guard`

Estas protecciones son parte del estado productivo aunque el frontend experimental esté pausado.

### Guardia de tablas

- detecta localhost / 127.0.0.1 / ::1 / requests QA;
- 42 tablas públicas están protegidas por `zz_qa_write_guard`;
- QA no puede INSERT/UPDATE/DELETE en Supabase productivo.

### Guardia de Storage

Políticas RESTRICTIVE:
- `qa_storage_insert_guard`
- `qa_storage_update_guard`
- `qa_storage_delete_guard`

QA no puede modificar Storage productivo.

## Frontend experimental NO productivo

Rama:
`feature/qa-data-isolation-v1`

Versión:
`0.6.5-beta.16.3.15-test.1`

PR #85:
- CLOSED
- NO MERGED
- NO PRODUCCIÓN

La rama contiene ideas útiles para retomar luego:
- selección automática de entorno;
- banner MODO PRUEBA;
- variables `VITE_SUPABASE_QA_*`;
- deploy guard.

No asumir que esas funciones existen en `main`.

## Regla hasta crear staging

- no ejecutar pruebas funcionales con escritura desde localhost contra producción;
- no desactivar los guards QA sin una razón documentada;
- si una prueba local intenta escribir y recibe `QA_WRITE_BLOCKED`, es comportamiento esperado;
- producción canónica sigue operando normalmente.

## Al retomar

1. Verificar plan Supabase del usuario.
2. Consultar costo/condiciones actuales de Development Branch.
3. Crear staging únicamente con aprobación.
4. Rebasar staging desde producción.
5. Probar migraciones y datos TEST en staging.
6. Reconsiderar qué partes de PR #85 siguen siendo necesarias.
7. Mantener separados código promovible y datos QA.
