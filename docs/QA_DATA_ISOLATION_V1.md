# QA Data Isolation V1

Fecha: 25/09/2026

## Objetivo

Impedir que pruebas locales, ramas feature o previews escriban datos en Supabase productivo y que los registros QA aparezcan después en la aplicación productiva.

La regla deja de ser "probar y luego borrar". Pasa a ser:

**QA nunca escribe en producción.**

## Capas de protección

### 1. Clasificación del entorno en frontend

`src/lib/supabase.ts` clasifica cada ejecución:

- `production`: únicamente el host canónico `gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- `qa-isolated`: localhost/preview con `VITE_SUPABASE_QA_URL` y `VITE_SUPABASE_QA_PUBLISHABLE_KEY` válidos y distintos del proyecto productivo.
- `qa-readonly-production`: localhost/preview sin base QA configurada.

El cliente añade:
- `x-karaka-environment: production|qa`
- `x-karaka-client-host: <hostname>`

Si una URL QA apunta accidentalmente al proyecto productivo `ccvzosnhxitfeochnflr`, se rechaza y se mantiene producción en solo lectura.

### 2. Guardia de escritura en Supabase productivo

Migración:
`20260925160308_qa_data_isolation_production_write_guard.sql`

La base productiva detecta como QA:
- header explícito QA/test/development/staging;
- `Origin` o `Referer` con localhost, 127.0.0.1 o ::1;
- Workers preview no canónico.

Cuando la base está marcada `production`, una petición QA no puede hacer INSERT / UPDATE / DELETE en tablas públicas de negocio.

La protección se instala como trigger de sentencia `zz_qa_write_guard`.

### 3. Storage productivo protegido

Migración:
`20260925160509_qa_data_isolation_storage_guard.sql`

Políticas RLS restrictivas impiden INSERT / UPDATE / DELETE en `storage.objects` desde QA cuando el backend es producción.

Lectura sigue gobernada por las políticas existentes.

### 4. Modo QA visible

La interfaz muestra un banner:

- **MODO PRUEBA · BASE AISLADA** cuando existe Supabase QA.
- **MODO PRUEBA SEGURO** cuando no existe QA y producción está disponible solo para lectura.

Producción no muestra el banner.

### 5. Deploy productivo protegido

`npm run deploy` ejecuta automáticamente:
`scripts/production-deploy-guard.mjs`

El deploy se bloquea si:
- la rama actual no es `main`;
- existen cambios locales sin commit;
- HEAD local no coincide con `origin/main`;
- la versión contiene `test`.

## Configuración local QA

Crear un archivo local no versionado:

`.env.local`

Contenido:

```env
VITE_SUPABASE_QA_URL=https://<qa-project-ref>.supabase.co
VITE_SUPABASE_QA_PUBLISHABLE_KEY=<publishable-key-qa>
```

Nunca usar `service_role` en el frontend.

## Estado hasta crear Supabase Development Branch

Mientras no exista la base QA separada:

- localhost puede abrir la aplicación y consultar producción;
- cualquier escritura de datos o Storage queda bloqueada;
- por tanto no deben ejecutarse pruebas funcionales que requieran guardar información.

## Activación de una Supabase Development Branch

Después de crearla:

1. aplicar/revisar migraciones;
2. cambiar `private.app_runtime_environment.environment` a `staging` en la rama;
3. obtener URL y publishable key de la rama;
4. guardarlas únicamente en `.env.local`;
5. ejecutar QA desde localhost;
6. promover solo código/migraciones aprobadas; nunca copiar los datos QA a producción.

## Regla permanente

**Código sí se promueve. Datos de prueba no se promueven.**

La aplicación productiva y el entorno QA deben usar bases diferentes.
