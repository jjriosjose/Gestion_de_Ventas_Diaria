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
- Versión: **0.6.5-beta.9**.
- PR #38 `V0.6.5-beta.9 · Jornadas, cierre diario y reportes multiperíodo`: **MERGED**.
- Merge commit funcional beta.9: `143bc3b185573a85405feec83b4ece903543893f`.
- Build GitHub Actions del código beta.9: **SUCCESS**.
- Build local previo a deploy: **SUCCESS**.

Documentos de apoyo:

1. `docs/V065C_IMPLEMENTATION_STATUS.md`
2. `docs/V065C_JORNADAS_REPORTES_DESIGN.md`
3. `docs/V065C_DEPLOYMENT_BETA9.md`
4. `docs/REQUIREMENTS_STATUS.md`
5. `docs/V065_FUNCTIONAL_DESIGN.md`

## Supabase

Backend V065C de beta.9 **APLICADO EN PRODUCCIÓN**.

Migraciones remotas verificadas:

1. `v065c_journey_lifecycle_and_reporting`
2. `v065c_expired_journey_admin_resolution`
3. `v065c_route_territory_snapshot`
4. `v065c_official_territory_reporting_view`
5. `v065c_scoped_executive_views`

No hacer replay manual para igualar timestamps del ledger remoto con nombres de archivos locales.

## Cloudflare

**V0.6.5-beta.9 DESPLEGADA EN PRODUCCIÓN Y CARGANDO CORRECTAMENTE.**

- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Cloudflare Current Version ID: `3e1e4435-5236-429d-bcca-a14668424726`
- Wrangler: `4.125.0`
- Build local: `✓ built in 13.68s`
- Assets beta.9 subidos correctamente.
- La advertencia de chunks >500 KB es no bloqueante; queda como deuda de optimización.

Estado real:

```text
GitHub main      = V0.6.5-beta.9
Supabase backend = V0.6.5-beta.9 / V065C aplicado
Cloudflare UI    = V0.6.5-beta.9 desplegada
```

---

# 1. VALIDACIÓN PRODUCTIVA BETA.9

## Administrador — VALIDADO VISUALMENTE

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

## Vendedor — PENDIENTE DE VALIDACIÓN VISUAL FINAL

El backend ya fue probado con scoping de Vendedor y devolvió solamente sus propias jornadas, pero todavía debe completarse la validación visual en navegador autenticado como Vendedor.

Validar específicamente:

- menú Jornadas visible;
- `Mis jornadas` no muestra otros colaboradores;
- Rutas solo permite ejecutar jornada del día actual;
- una jornada anterior nunca muestra `Continuar`;
- pendiente de cierre dirige a revisión/cierre;
- Reportes solo muestran alcance propio;
- campana/Inicio muestran alertas correspondientes.

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

Debe mostrar exclusivamente su alcance:

- jornada del día;
- programadas;
- finalizadas;
- pendientes de cierre;
- cobertura;
- cierre operativo;
- tiempos;
- distancia GPS estimada;
- eventualidades;
- detalle de paradas.

Una jornada vencida jamás ofrece `Continuar`.

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

Actividades no territorializadas como llamadas/showroom/ventas generales no deben fingir precisión territorial inexistente.

---

# 9. BASELINE PREVIO CONSERVADO

Beta.9 conserva:

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
- Calidad geográfica;
- Administración/Configuración.

---

# 10. OBSERVACIONES UX POST-DEPLOY

No bloqueantes; considerar en siguiente parche después de validar Vendedor:

1. En la franja de Jornadas de Inicio conviene añadir **Planificadas / sin iniciar hoy**, para que el estado sea más accionable antes del inicio de ruta.
2. Una ruta pasada que nunca inició debería mostrarse como **`No ejecutada`** o **`Vencida sin iniciar`**, en lugar de `No iniciada`, para evitar ambigüedad histórica.
3. Bundle principal supera 500 KB minificado; pendiente optimización mediante code splitting/lazy loading cuando el bloque funcional esté estabilizado.

No implementar estos ajustes antes de completar la validación visual del perfil Vendedor, salvo que aparezca un bug funcional.

---

# 11. SIGUIENTE PASO OBLIGATORIO

Completar validación productiva con un usuario Vendedor real.

Checklist:

- [ ] Inicio del Vendedor.
- [ ] Jornadas del Vendedor.
- [ ] Rutas del Vendedor.
- [ ] jornada pasada no continuable.
- [ ] Reportes personales.
- [ ] ausencia de datos de otros vendedores.
- [ ] alertas de jornada si corresponde.

Después de esto decidir si beta.9 queda estable o si se crea un parche beta.9.1 con refinamientos UX.

---

# 12. RECUPERACIÓN EN NUEVO CHAT

Leer en este orden:

1. `PROJECT_HANDOFF.md`.
2. `docs/V065C_DEPLOYMENT_BETA9.md`.
3. `docs/V065C_IMPLEMENTATION_STATUS.md`.
4. `docs/V065C_JORNADAS_REPORTES_DESIGN.md`.
5. `package.json` en `main`.
6. commits recientes GitHub.
7. ledger Supabase real.
8. Cloudflare real.

Mensaje recomendado:

> “Continúa Gestión de Ventas Diaria. Lee primero `PROJECT_HANDOFF.md` del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`, luego los documentos V065C. Verifica GitHub main, Supabase y Cloudflare. Beta.9 ya fue desplegada; confirma el estado real antes de modificar código. La validación Admin pasó y falta completar validación visual del perfil Vendedor.”

---

# 13. FUENTE DE VERDAD

1. GitHub `main` = código vigente.
2. Supabase remoto = esquema/datos/políticas reales.
3. Cloudflare = interfaz realmente desplegada.
4. Documentación = decisiones y checkpoints.
5. Conversaciones = contexto, no fuente definitiva.
