# PROJECT_HANDOFF.md
# Gestión de Ventas Diaria — Almacenes Karaka

> **Documento maestro de continuidad del proyecto.** Leer primero al retomar el desarrollo en otro chat o después de una pausa. GitHub `main`, Supabase y Cloudflare son la fuente de verdad si existiera discrepancia con conversaciones anteriores.
>
> Nunca incluir secretos, contraseñas, tokens, service keys ni credenciales sensibles.

---

# 0. ESTADO ACTUAL — LEER PRIMERO

Fecha operativa del checkpoint: **27/08/2026 (RD)**.

## GitHub

- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`.
- Rama estable: `main`.
- Versión: **0.6.5-beta.10**.
- PR #38 `V0.6.5-beta.9 · Jornadas, cierre diario y reportes multiperíodo`: **MERGED**.
- PR #39 `V0.6.5-beta.10 · Horas por gestión y refinamientos de Jornadas`: **MERGED**.
- Merge commit funcional beta.10: `74c214e9dd94275a052f3d1c55827753feeb4c33`.
- GitHub Actions TypeScript + Vite de beta.10: **SUCCESS**.
- Build local previo a deploy: **SUCCESS**.

Documentos de apoyo:

1. `docs/V065_BETA10_REFINEMENT_STATUS.md`
2. `docs/V065C_IMPLEMENTATION_STATUS.md`
3. `docs/V065C_JORNADAS_REPORTES_DESIGN.md`
4. `docs/V065C_DEPLOYMENT_BETA9.md`
5. `docs/REQUIREMENTS_STATUS.md`
6. `docs/V065_FUNCTIONAL_DESIGN.md`

## Supabase

Backend V065C de beta.9 **APLICADO EN PRODUCCIÓN** y reutilizado por beta.10 sin nuevas migraciones.

Migraciones remotas verificadas:

1. `v065c_journey_lifecycle_and_reporting`
2. `v065c_expired_journey_admin_resolution`
3. `v065c_route_territory_snapshot`
4. `v065c_official_territory_reporting_view`
5. `v065c_scoped_executive_views`

No hacer replay manual para igualar timestamps del ledger remoto con nombres de archivos locales.

## Cloudflare

**V0.6.5-beta.10 DESPLEGADA EN PRODUCCIÓN.**

- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Cloudflare Current Version ID: `8d6271ac-79e1-4794-b347-7023919040be`
- Wrangler usado en la línea de despliegue: `4.125.0`.
- 7 assets nuevos/modificados fueron subidos correctamente en el deploy beta.10.
- La advertencia de chunks >500 KB es no bloqueante; queda como deuda de optimización.

Estado real:

```text
GitHub main      = V0.6.5-beta.10
Supabase backend = V0.6.5-beta.9 / V065C aplicado (sin cambios beta.10)
Cloudflare UI    = V0.6.5-beta.10 desplegada
```

---

# 1. VALIDACIÓN PRODUCTIVA

## Beta.9 — Administrador VALIDADO VISUALMENTE

Capturas productivas del usuario Administrador confirmaron:

- versión visible `0.6.5-beta.9`;
- menú `Jornadas` disponible;
- Inicio carga correctamente;
- franja superior de Jornadas en Inicio;
- módulo `Control de jornadas` carga;
- filtros de Período, Mes, Vendedor, Estado, Tipo cliente, Región oficial, Provincia oficial y Municipio oficial;
- KPI de Jornadas, Cobertura real, Cierre operativo, Pendientes de cierre, Finalizadas, Horas de jornada, Distancia GPS y Eventualidades;
- tabla de jornadas con detalle por Vendedor/Fecha;
- Reportes V2 multiperíodo carga;
- filtros por colaborador/estado/territorio visibles;
- gráficos de Plan vs ejecución y Cobertura diaria;
- tabla de desempeño por colaborador;
- detalle diario;
- exportaciones Excel/PDF visibles.

Datos productivos de prueba observados en agosto 2026 mantienen correctamente la diferencia entre cobertura y cierre operativo.

## Beta.9 — Vendedor Cesar Caba VALIDADO VISUALMENTE

Capturas productivas autenticadas como Cesar Caba confirmaron:

- menú `Jornadas` visible;
- `Mis jornadas` muestra exclusivamente sus propias jornadas;
- no aparecen jornadas de Eduar Ceballos ni otros vendedores;
- Rutas muestra su planificación asignada;
- scoping visual coincide con el scoping backend previamente probado;
- la versión visible era `0.6.5-beta.9`.

La regla temporal sigue siendo backend-driven: una jornada de un día anterior no puede continuar aunque se intente evadir la interfaz.

## Beta.10 — PENDIENTE VALIDACIÓN VISUAL FINAL

Beta.10 ya está desplegada. Validar solamente los refinamientos:

- versión visible `0.6.5-beta.10`;
- Inicio muestra `Planificadas` además de Activas/Finalizadas/Pendientes;
- una planificación histórica nunca iniciada aparece como `No ejecutada`;
- Reportes muestra `Horas gestión calle`;
- Reportes muestra `Horas gestión showroom / CRM`;
- `Tiempo operativo total` continúa como referencia general;
- filtros por tipo/colaborador continúan afectando correctamente las nuevas tarjetas.

---

# 2. REGLA TEMPORAL IRREVERSIBLE

Una jornada pertenece exclusivamente a su fecha operativa.

```text
session_date == fecha operativa actual America/Santo_Domingo
```

es requisito para continuar ejecución.

Si una `route_session` permanece abierta con `session_date < hoy`:

```text
PENDIENTE_CIERRE
```

No se permite en días posteriores:

- iniciar otra visita dentro de esa sesión;
- finalizar una visita como actividad del nuevo día;
- registrar eventualidad nueva;
- continuar secuencia;
- cambiar paradas para seguir ejecutando;
- agregar visita adicional asociada a esa jornada.

Sí se permite revisión, análisis, exportación y cierre trazable.

La protección existe en frontend y backend.

---

# 3. JORNADAS

Ruta: `/jornadas`.

## Vendedor — Mis jornadas

Muestra exclusivamente su alcance:

- jornada del día;
- programadas;
- finalizadas;
- no ejecutadas;
- pendientes de cierre;
- cobertura;
- cierre operativo;
- tiempos;
- distancia GPS estimada;
- eventualidades;
- detalle de paradas.

Una jornada vencida jamás ofrece `Continuar`.

El código técnico histórico `NO_INICIADA` se presenta en UI como **`No ejecutada`** cuando su fecha ya pasó, para evitar sugerir que todavía puede iniciarse.

## Admin/Supervisor — Control de jornadas

Incluye:

- Día / Semana / Mes / Rango;
- Vendedor;
- Estado;
- Tipo cliente;
- Región / Provincia / Municipio oficial;
- jornadas planificadas/iniciadas/finalizadas;
- pendientes de cierre;
- planificados/visitados/resueltos;
- cobertura/cierre operativo;
- horas de jornada/atención/traslado;
- distancia GPS estimada;
- eventualidades;
- detalle individual;
- Excel/PDF.

---

# 4. CIERRE Y REGULARIZACIÓN

## Jornada vencida sin actividad abierta

Puede cerrarse de forma trazable sin incrementar cobertura.

## Jornada vencida con visita/eventualidad abierta

El Vendedor no puede continuarla al día siguiente.

Admin/Supervisor puede usar regularización administrativa:

- corta técnicamente la actividad al límite del día operativo;
- parada incompleta queda `NO_VISITADO`;
- no aumenta cobertura;
- registra `JORNADA_VENCIDA`;
- conserva notas y revisión administrativa.

---

# 5. MÉTRICAS

## Cobertura real

```text
visitados / planificados
```

## Cierre operativo / resolución

```text
resueltos / planificados
```

No son equivalentes.

## Tiempo

- Jornada = ventana de `route_session`.
- Atención = visitas.
- Eventualidades = incidencias.
- Traslado/espera = residual validado.
- Tiempo operativo total = tiempo operativo acumulado de los colaboradores incluidos en el filtro ejecutivo.
- Horas gestión calle = `operational_seconds` de colaboradores tipo Vendedor.
- Horas gestión showroom / CRM = `operational_seconds` de colaboradores tipo Gestor; incluye la gestión registrada en llamadas/showroom según las vistas ejecutivas vigentes.

Sesiones históricas abiertas se limitan al fin del día operativo y no acumulan 24/48/72 horas indefinidamente.

## Distancia

`Distancia GPS estimada` se calcula con eventos GPS disponibles; no equivale a odómetro ni ruta vial exacta.

---

# 6. TERRITORIO OFICIAL HISTÓRICO

`route_stops` conserva snapshot al planificar:

- `official_region_at_plan`
- `official_province_at_plan`
- `official_municipality_at_plan`

Backfill verificado:

```text
72/72 Región oficial
72/72 Provincia oficial
72/72 Municipio oficial
```

Vista usada por Jornadas/Reportes: `executive_route_journeys_v2`.

Objetivo: correcciones futuras del GPS/maestro no deben reescribir silenciosamente el territorio de una jornada histórica.

---

# 7. SEGURIDAD / SCOPING

`executive_route_journeys_v2` aplica alcance en Supabase:

```text
Administrador / Supervisor -> todas las jornadas
Otros perfiles              -> solo employee_id propio
```

Pruebas realizadas simulando `authenticated`:

- Vendedor -> solo sus propias jornadas: VALIDADO.
- Administrador -> conjunto global: VALIDADO.

Además, el perfil real de Cesar Caba fue validado visualmente en producción mostrando solamente sus jornadas.

Mantener defensa en profundidad frontend + backend.

---

# 8. REPORTES V2

Ruta: `/reportes`.

Filtros implementados:

- Día;
- Semana;
- Mes;
- Rango personalizado;
- Tipo colaborador;
- Colaborador;
- Estado jornada;
- Tipo cliente ruta;
- Región oficial;
- Provincia oficial;
- Municipio oficial.

Regla matemática:

```text
Cobertura período = SUM(visitados) / SUM(planificados)
Resolución período = SUM(resueltos) / SUM(planificados)
```

Nunca promediar porcentajes diarios directamente.

Beta.10 agrega en KPI:

- `Horas gestión calle`.
- `Horas gestión showroom / CRM`.
- conserva `Tiempo operativo total`.

Exportaciones beta.10 agregan:

- canal de gestión (`Calle` / `CRM / Showroom`);
- horas de gestión.

Actividades no territorializadas como llamadas/showroom/ventas generales no deben fingir precisión territorial inexistente.

---

# 9. INICIO

La franja superior de Jornadas en beta.10 debe mostrar:

```text
Planificadas · Activas · Finalizadas · Pendientes cierre · Cobertura hoy
```

Ejemplo con la planificación observada:

```text
1 planificada · 0 activas · 0 finalizadas · 0 pendientes cierre · 0% cobertura hoy
```

Objetivo: distinguir claramente entre trabajo preparado pero aún no iniciado y ausencia total de actividad.

---

# 10. BASELINE CONSERVADO

Beta.10 conserva todo el baseline de beta.9:

- Login premium y responsive;
- Clientes;
- Mapa territorial oficial;
- filtros Región/Provincia/Municipio/Distrito individual y en cascada;
- análisis territorial;
- Planificación con `Disponibles` / `Seleccionados`;
- radio/polígono;
- orden por cercanía;
- Captación centralizada;
- Cobertura;
- Visitas;
- Llamadas;
- Agenda/Showroom;
- Recepción;
- Jornadas;
- Reportes multiperíodo;
- Calidad geográfica;
- Administración/Configuración.

---

# 11. DEUDA TÉCNICA / SIGUIENTES MEJORAS

No bloqueantes:

1. Bundle principal supera 500 KB minificado; pendiente optimización mediante code splitting/lazy loading cuando el bloque funcional esté estabilizado.
2. Revisar más adelante si conviene agregar comparativos de horas Calle vs CRM/Showroom por colaborador/período en gráficos dedicados.
3. Mantener validación de responsive en móvil/tablet a medida que crezcan los KPI de Reportes.

No mezclar optimización de bundle con correcciones funcionales urgentes salvo que exista impacto real de rendimiento.

---

# 12. SIGUIENTE PASO OBLIGATORIO

Validar visualmente beta.10 en producción.

Checklist:

- [ ] versión `0.6.5-beta.10` visible.
- [ ] Inicio: `Planificadas` visible y conteo correcto.
- [ ] Jornadas: histórico `No ejecutada` visible.
- [ ] Reportes: `Horas gestión calle` visible.
- [ ] Reportes: `Horas gestión showroom / CRM` visible.
- [ ] Reportes: `Tiempo operativo total` sigue visible.
- [ ] filtros por Vendedor/Gestor afectan correctamente los KPI de horas.

Después de esta comprobación, beta.10 puede considerarse estable para continuar con el siguiente bloque funcional.

---

# 13. RECUPERACIÓN EN NUEVO CHAT

Leer en este orden:

1. `PROJECT_HANDOFF.md`.
2. `docs/V065_BETA10_REFINEMENT_STATUS.md`.
3. `docs/V065C_DEPLOYMENT_BETA9.md`.
4. `docs/V065C_IMPLEMENTATION_STATUS.md`.
5. `docs/V065C_JORNADAS_REPORTES_DESIGN.md`.
6. `package.json` en `main`.
7. commits recientes GitHub.
8. ledger Supabase real.
9. Cloudflare real.

Mensaje recomendado:

> “Continúa Gestión de Ventas Diaria. Lee primero `PROJECT_HANDOFF.md` del repositorio `jjriosjose/Gestion_de_Ventas_Diaria` y después `docs/V065_BETA10_REFINEMENT_STATUS.md`. Verifica GitHub main, Supabase y Cloudflare. Beta.10 ya fue desplegada con Cloudflare Version ID `8d6271ac-79e1-4794-b347-7023919040be`; el backend V065C de beta.9 sigue vigente. Admin y el scoping real de Cesar Caba ya fueron validados; falta confirmar visualmente los refinamientos de beta.10.”

---

# 14. FUENTE DE VERDAD

1. GitHub `main` = código vigente.
2. Supabase remoto = esquema/datos/políticas reales.
3. Cloudflare = interfaz realmente desplegada.
4. Documentación = decisiones y checkpoints.
5. Conversaciones = contexto, no fuente definitiva.
