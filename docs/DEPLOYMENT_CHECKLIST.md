# Checklist de publicación — Gestión de Ventas Diaria

Baseline productivo protegido al 25/09/2026: **0.6.5-beta.16.3.14**.

> Nunca usar este número como única fuente. Antes de cada release verificar `main`, `package.json`, `package-lock.json`, `release/production-baseline.json`, Supabase vivo y Cloudflare.

---

## 1. Antes de desarrollar

- Leer `docs/CHAT_CONTINUATION_CURRENT.md`.
- Verificar `main` real en GitHub.
- Confirmar versión productiva real.
- Verificar Supabase si el cambio toca datos, vistas, funciones, RLS, migraciones o autenticación.
- Crear rama desde `main` estable.
- No modificar directamente `main` para cambios funcionales.
- No reutilizar una rama histórica como base de un cambio nuevo.

Si afecta rutas, visitas, Captación, Auth o RLS, coordinar una ventana segura y evitar pruebas destructivas con usuarios operando.

---

## 2. Validación de desarrollo

Antes del PR:

```bash
npm run release:integrity
npm run build
```

Ambos deben terminar sin error.

El control de integridad protege:

- rutas principales;
- Captación Operativa;
- Tracking de Captación;
- Jornadas;
- Historial de Llamadas;
- módulos logísticos;
- migraciones críticas;
- ausencia de vistas productivas `*_test`.

Para desarrollo local:

```bash
npm run dev
```

Hasta disponer de staging separado, localhost no debe usarse para QA con escritura contra Supabase productivo. Los guards backend deben bloquearlo.

---

## 3. Cambios Supabase

Si NO hay cambios de base de datos, omitir esta sección.

Si hay DDL/migración:

1. inspeccionar objetos reales de Supabase;
2. revisar columnas, constraints, triggers, funciones, vistas y RLS;
3. revisar `supabase_migrations.schema_migrations`;
4. comparar con archivos GitHub;
5. crear solo migración incremental;
6. validar compatibilidad;
7. aplicar de forma controlada;
8. comprobar grants y `security_invoker/security_definer`;
9. comprobar RLS/Storage;
10. documentar resultado.

Nunca hacer replay ciego, recreación destructiva o `db push` masivo por discrepancias de nombres.

Toda tabla pública nueva debe revisar también la protección QA correspondiente.

---

## 4. Pull Request

El PR debe indicar:

- objetivo;
- módulos afectados;
- cambios Supabase;
- cambios RLS/Auth;
- migraciones;
- riesgos;
- pruebas;
- qué debe validar el usuario;
- si requiere ventana operativa.

Antes de merge:

- CI/build SUCCESS;
- `release:integrity` SUCCESS;
- QA funcional cuando corresponda;
- sin secretos ni artefactos temporales;
- confirmar que la rama está basada en `main` actual.

---

## 5. Merge y sincronización local

Después de aprobar:

1. merge a `main`;
2. GitHub Desktop → cambiar a `main`;
3. `Fetch origin`;
4. `Pull origin` si aparece;
5. confirmar working tree limpio.

Equipo Windows observado:

`C:\Users\KARAKA-PC\Documents\GitHub\Gestion_de_Ventas_Diaria`

No restaurar stashes históricos incidentalmente durante un release.

---

## 6. Deploy productivo

Ejecutar únicamente:

```bash
npm run deploy
```

El `predeploy` ejecuta el Production Deploy Guard.

Debe validar automáticamente:

- rama = `main`;
- working tree limpio;
- fetch de `origin/main` exitoso;
- HEAD local = `origin/main`;
- historial contiene el baseline protegido;
- versión no `test`;
- package/lock sincronizados;
- integridad anti-regresión.

Si aparece `DEPLOY BLOQUEADO`, no usar `wrangler deploy` para saltar el control. Resolver primero la causa.

Confirmar después:

- assets cargados;
- `Uploaded gestion-de-ventas-diaria`;
- `Deployed gestion-de-ventas-diaria triggers`;
- URL productiva;
- **Current Version ID**.

URL:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Baseline confirmado previo a nuevos releases:

- versión: **0.6.5-beta.16.3.14**
- Version ID: `9f5528db-cf99-4a17-92b3-4ff85d9e9e98`

---

## 7. Smoke test de producción

Después del deploy:

- abrir URL productiva;
- `Ctrl + F5`;
- comprobar versión visible;
- login;
- Inicio;
- módulo modificado;
- permisos;
- exportaciones si aplican;
- responsive si aplica.

Para cambios operativos validar además:

- no hay visita duplicada;
- ruta correcta;
- no se cierra con actividad incompatible abierta;
- Captación no infla traslado;
- `ended_at` congela la jornada;
- cobertura real no se confunde con cierre operativo.

No ejecutar pruebas destructivas innecesarias.

---

## 8. Cuándo pedir actualización a usuarios

### Cambio visual/frontend normal
- usuarios pueden seguir trabajando;
- al terminar el deploy, actualizar/reabrir.

### Auth/RLS/base/reglas críticas
- coordinar ventana breve;
- evitar operaciones críticas durante el cambio;
- puede requerir logout/login.

### Rutas/visitas/captaciones activas
Evitar cambios profundos mientras existan operaciones críticas abiertas salvo compatibilidad confirmada.

---

## 9. Cierre del release

Después de un release productivo:

- actualizar `docs/CHAT_CONTINUATION_CURRENT.md`;
- actualizar checkpoint fechado;
- actualizar `PROJECT_HANDOFF.md` cuando corresponda;
- actualizar `CHANGELOG.md`;
- registrar versión + Current Version ID;
- registrar migraciones;
- registrar bugs/regresiones conocidas;
- actualizar `release/production-baseline.json` cuando el nuevo release quede validado como baseline estable.

No actualizar el baseline protegido antes de QA productivo exitoso.

---

## 10. Seguridad

Nunca incluir:

- contraseñas;
- tokens;
- service role;
- claves privadas;
- secretos Cloudflare/Supabase;
- archivos maestros de clientes;
- `.env` privados.

Pendientes P0 de seguridad:

- staging/Development Branch;
- reconciliación migrations ↔ Supabase;
- RLS/Storage hardening;
- branch protection de `main`;
- rebuild/disaster recovery.
