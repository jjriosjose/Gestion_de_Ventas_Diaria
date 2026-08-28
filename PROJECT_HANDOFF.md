# PROJECT_HANDOFF.md
# Gestión de Ventas Diaria — Almacenes Karaka

> **Documento maestro de continuidad del proyecto.** Leer primero al retomar el desarrollo en otro chat o después de una pausa. GitHub `main`, Supabase y Cloudflare son la fuente de verdad si existiera una discrepancia con conversaciones anteriores.
>
> **Nunca incluir secretos, contraseñas, tokens, service keys ni credenciales sensibles.**

---

# 0. ESTADO ACTUAL — LEER PRIMERO

## Estado dividido posterior al merge de beta.9

Fecha operativa del checkpoint: **27/08/2026 (RD)**.

### GitHub

- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`.
- Rama estable: `main`.
- Versión en `package.json`: **0.6.5-beta.9**.
- PR #38: **MERGED**.
- Merge commit beta.9: **`143bc3b185573a85405feec83b4ece903543893f`**.
- Build TypeScript + Vite del head previo al merge: **SUCCESS**.
- Documento de implementación: `docs/V065C_IMPLEMENTATION_STATUS.md`.
- Diseño funcional/técnico: `docs/V065C_JORNADAS_REPORTES_DESIGN.md`.

### Supabase

El backend V065C de beta.9 **YA ESTÁ APLICADO EN PRODUCCIÓN**.

Migraciones remotas aplicadas y verificadas:

1. `v065c_journey_lifecycle_and_reporting`
2. `v065c_expired_journey_admin_resolution`
3. `v065c_route_territory_snapshot`
4. `v065c_official_territory_reporting_view`
5. `v065c_scoped_executive_views`

Importante: los timestamps del ledger remoto Supabase pueden diferir de los prefijos de los archivos SQL del repositorio. **No hacer replay manual para intentar igualarlos.**

### Cloudflare

**AÚN NO SE HA DESPLEGADO beta.9.**

La interfaz productiva continúa sirviendo la última versión confirmada:

- **V0.6.5-beta.8**.
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- último Cloudflare Version ID confirmado de beta.8: `149a6ff7-2bfb-46ff-9968-d88c6f61d182`.

Por tanto, el estado real actual es:

```text
GitHub main      = V0.6.5-beta.9
Supabase backend = V0.6.5-beta.9 / V065C aplicado
Cloudflare UI    = V0.6.5-beta.8 hasta próximo deploy
```

No asumir que producción visual ya tiene Jornadas/Reportes V2 hasta completar el deploy.

---

# 1. BASELINE FUNCIONAL PREVIO CONSERVADO

Beta.9 se construyó sobre V0.6.5-beta.8 sin reemplazar las funcionalidades estabilizadas.

## Login

- presentación comercial premium;
- autenticación existente preservada;
- recuperación administrada;
- responsive;
- versión visible.

## Mapa territorial

- Región / Provincia / Municipio / Distrito oficial funcionan individualmente y en cascada;
- selección inferior reconstruye jerarquía superior;
- geometrías oficiales enfocan y resaltan correctamente;
- `Maestro comercial` y `División territorial oficial` permanecen separados;
- listado inferior de clientes responde a filtros;
- panel `Análisis territorial` por Región / Provincia / Municipio / Distrito.

## Planificación

- crea rutas de visita;
- Captación permanece en su propio módulo;
- filtros comerciales y territoriales;
- selección lista/mapa/polígono/radio;
- `Disponibles` y `Seleccionados` separados;
- cambiar filtros no borra selección silenciosamente;
- orden por cercanía;
- `route_stops` conserva orden final.

Prueba beta.8 previamente validada: 16 clientes seleccionados -> 16 guardados -> visibles en Rutas.

## Captación

- asignación administrativa territorial;
- captación libre cuando corresponde;
- prospectos con GPS/contexto territorial;
- corrección de casos `sin zona`.

---

# 2. V0.6.5-beta.9 — NUEVO MÓDULO JORNADAS

Ruta: `/jornadas`.

## Vendedor — Mis jornadas

El Vendedor puede consultar:

- jornada de hoy;
- programadas;
- finalizadas;
- pendientes de cierre de días anteriores;
- cobertura;
- cierre operativo;
- tiempos;
- distancia GPS estimada;
- eventualidades;
- detalle de paradas.

Una jornada vencida nunca presenta `Continuar`.

## Admin/Supervisor — Control de jornadas

Incluye:

- filtro de período;
- vendedor;
- estado;
- tipo de cliente;
- Región oficial;
- Provincia oficial;
- Municipio oficial;
- KPI de jornadas;
- planificados;
- visitados;
- cobertura;
- resolución/cierre operativo;
- horas de jornada;
- atención;
- traslado/espera;
- distancia GPS estimada;
- eventualidades;
- detalle individual;
- Excel/PDF.

---

# 3. REGLA TEMPORAL IRREVERSIBLE

Una jornada pertenece a **un solo día operativo**.

```text
session_date == fecha operativa actual America/Santo_Domingo
```

es requisito para continuar ejecución.

Si una `route_session` sigue abierta y `session_date < hoy`:

```text
PENDIENTE_CIERRE
```

No se permite en días posteriores:

- nueva visita;
- continuar una visita como actividad del nuevo día;
- nueva eventualidad operacional;
- continuar secuencia;
- cambiar paradas para seguir ejecutando;
- visita adicional asociada a esa jornada.

Sí se permite:

- revisar historial;
- analizar;
- exportar;
- cierre trazable.

La protección existe en **frontend y backend**.

---

# 4. CIERRE Y REGULARIZACIÓN DE JORNADAS VENCIDAS

## Jornada vencida sin actividad abierta

El Vendedor puede revisar/cerrar su propia jornada vencida.

Las paradas pendientes pasan a resultado administrativo adecuado sin aumentar cobertura.

## Jornada vencida con visita/eventualidad abierta

No se permite al Vendedor resolverla como si la actividad continuara hoy.

Admin/Supervisor dispone de regularización administrativa:

- actividad abierta se corta técnicamente al límite del día operativo;
- parada incompleta queda `NO_VISITADO`;
- nunca se convierte falsamente en `VISITADO`;
- se registra `JORNADA_VENCIDA`;
- se conservan notas/revisión administrativa;
- eventualidad abierta queda marcada para revisión cuando corresponde.

---

# 5. MÉTRICAS DE JORNADA

Definiciones consolidadas:

## Cobertura real

```text
visitados / planificados
```

## Cierre operativo / resolución

```text
resueltos / planificados
```

Una ruta puede tener:

```text
Cobertura baja + Resolución 100%
```

si las paradas restantes fueron resueltas como no visitadas/reprogramadas/canceladas. Esto es correcto y debe conservarse.

## Tiempo

- Jornada = ventana de `route_session`.
- Atención = suma de visitas.
- Eventualidades = suma de incidencias.
- Traslado/espera = residual validado.

Una sesión abierta histórica se limita al final de su día operativo en las nuevas métricas. No seguirá acumulando 24/48/72 horas.

## Distancia

`Distancia GPS estimada` se calcula entre eventos GPS disponibles. No representa odómetro ni ruta vial exacta.

---

# 6. TERRITORIO OFICIAL HISTÓRICO

Beta.9 añade snapshot territorial a `route_stops`:

- `official_region_at_plan`
- `official_province_at_plan`
- `official_municipality_at_plan`

Objetivo: una corrección futura de GPS/maestro no debe reescribir silenciosamente el territorio histórico de una jornada ya planificada.

Backfill validado después de migración:

```text
72/72 paradas con cliente -> Región oficial
72/72 paradas con cliente -> Provincia oficial
72/72 paradas con cliente -> Municipio oficial
```

Vista principal para Jornadas con territorio histórico:

- `executive_route_journeys_v2`.

Se verificaron rutas reales clasificadas correctamente en territorios como Ozama y Valdesia.

---

# 7. SEGURIDAD DE LAS NUEVAS VISTAS

`executive_route_journeys_v2` impone scoping también en Supabase:

```text
Administrador / Supervisor -> todas las jornadas
Otros perfiles              -> solo employee_id propio
```

Pruebas realizadas simulando rol `authenticated`:

- Vendedor: obtuvo únicamente sus propias jornadas.
- Administrador: obtuvo el conjunto global existente.

También existen wrappers scoped para evolución segura de reportería:

- `executive_daily_employee_summary_scoped`
- `executive_daily_route_metrics_scoped`

Mantener frontend + backend como defensa en profundidad.

---

# 8. RUTAS / VISITAS / ALERTAS

## Rutas

Ahora existe integración para:

- detectar jornada abierta independientemente de la fecha seleccionada;
- mostrar `Jornada activa hoy`;
- mostrar `Jornada pendiente de cierre del DD/MM/YYYY`;
- acción `Revisar y cerrar`;
- ocultar ejecución vencida.

## Visitas

Si existe visita abierta ligada a jornada vencida:

- muestra advertencia;
- no debe cerrarse como actividad del nuevo día;
- dirige a Jornadas.

## Campana

`PENDIENTE_CIERRE` se integra como alerta operacional.

---

# 9. INICIO

Inicio sigue siendo el centro de **hoy**, no un histórico.

Beta.9 añade solo resumen accionable de Jornadas:

- activas hoy;
- finalizadas hoy;
- pendientes de cierre;
- cobertura de hoy;
- acceso a Jornadas.

No duplicar Reportes en Inicio.

---

# 10. REPORTES V2 — MULTIPERÍODO

Ruta: `/reportes`.

Filtros implementados:

- Día.
- Semana.
- Mes.
- Rango personalizado.
- Tipo de colaborador.
- Colaborador.
- Estado de jornada.
- Tipo de cliente de ruta.
- Región oficial.
- Provincia oficial.
- Municipio oficial.

El período de desempeño no se extiende automáticamente a fechas futuras.

## Regla matemática

Nunca promediar porcentajes diarios.

```text
Cobertura período = SUM(visitados) / SUM(planificados)
Resolución período = SUM(resueltos) / SUM(planificados)
```

Ejemplo conceptual:

```text
Día 1 = 1/2 = 50%
Día 2 = 90/100 = 90%
Período = 91/102 = 89.2%
```

No 70%.

## Filtros territoriales

Territorio oficial se aplica a las métricas de ruta/jornada.

Llamadas, showroom y ventas generales no poseen actualmente atribución territorial oficial equivalente. Cuando hay filtro de ruta activo, la UI informa esta semántica y limita esas métricas a días/colaboradores coincidentes sin fingir una precisión territorial inexistente.

---

# 11. VALIDACIONES REALES DE BETA.9

## Build

- TypeScript + Vite: **SUCCESS** en head final previo al merge.

## Backend

- cinco migraciones V065C: **SUCCESS**.
- ledger remoto verificado.

## Territorio

- snapshot oficial: **72/72 completo**.

## Scoping

- Vendedor -> solo sus jornadas: **VALIDADO**.
- Administrador -> global: **VALIDADO**.

## Matemática agregada

Consulta real 24–27/08 mostró agregación mediante sumas de numeradores/denominadores; no promedio simple de porcentajes.

---

# 12. ESTADO DE DEPLOY — PRÓXIMO PASO OBLIGATORIO

**No desarrollar otro bloque funcional antes de validar beta.9 en producción**, salvo corrección necesaria para el deploy.

En el equipo local del usuario:

```bash
git fetch
git pull
npm run build
npm run deploy
```

O flujo equivalente desde GitHub Desktop + terminal ya usado previamente.

Después del deploy registrar:

1. commit realmente desplegado;
2. Cloudflare Version ID;
3. hora/fecha;
4. build local exitoso;
5. validación Admin;
6. validación Vendedor.

Pruebas productivas mínimas:

### Admin

- Inicio carga.
- Jornadas abre.
- filtros por Mes/Vendedor/Estado funcionan.
- filtros Región/Provincia/Municipio oficiales funcionan.
- Reportes abre.
- Reportes Mes + colaborador funciona.
- Exportaciones no rompen.

### Vendedor

- solo ve sus jornadas.
- Rutas carga.
- jornada de hoy ejecutable si corresponde.
- jornada anterior no continuable.
- pendiente de cierre visible.
- Reportes solo muestran su alcance esperado.

### Regresión

- Mapa territorial.
- Planificación.
- Captación.
- Clientes.
- Login.

---

# 13. DOCUMENTOS DE CONTINUIDAD

Leer en este orden al iniciar otro chat:

1. `PROJECT_HANDOFF.md`.
2. `docs/V065C_IMPLEMENTATION_STATUS.md`.
3. `docs/V065C_JORNADAS_REPORTES_DESIGN.md`.
4. `docs/REQUIREMENTS_STATUS.md`.
5. `docs/V065_FUNCTIONAL_DESIGN.md`.
6. `package.json` en `main`.
7. commits recientes de GitHub.
8. ledger real Supabase.
9. deploy real Cloudflare.

Mensaje recomendado para otro chat:

> **“Continúa Gestión de Ventas Diaria. Lee primero `PROJECT_HANDOFF.md` y `docs/V065C_IMPLEMENTATION_STATUS.md` del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`. Después verifica GitHub main, ledger Supabase y versión real de Cloudflare. No asumas que Cloudflare ya tiene beta.9: confirma primero el deploy. No modifiques nada hasta explicar el estado real.”**

---

# 14. FUENTE DE VERDAD

Ante cualquier discrepancia:

1. GitHub `main` define el código vigente.
2. Supabase remoto define esquema/datos/políticas reales.
3. Cloudflare define la UI realmente desplegada.
4. Documentación explica decisiones.
5. Conversaciones previas son contexto, no fuente definitiva.

Checkpoint actual:

```text
GitHub main      V0.6.5-beta.9
Merge commit     143bc3b185573a85405feec83b4ece903543893f
Supabase V065C   aplicado y validado
Cloudflare       todavía V0.6.5-beta.8
Próximo paso     pull + build + deploy beta.9 + validación productiva
```
