# Estado de requerimientos — Gestión de Ventas Diaria

> Matriz viva para responder rápidamente **qué está terminado, qué está parcial y qué sigue pendiente**. Complementa `PROJECT_HANDOFF.md`; no lo sustituye.
>
> Última auditoría documental: **2026-08-25**. Baseline de aplicación auditado: **V0.6.4**.

## Regla de uso

Antes de modificar el proyecto en un nuevo chat:

1. Leer `PROJECT_HANDOFF.md`.
2. Leer este archivo.
3. Verificar el `main` real de GitHub.
4. Verificar Supabase antes de asumir tablas, funciones, RLS, migraciones o datos.
5. Verificar producción si el cambio depende de la versión desplegada.

Los servicios reales prevalecen si existe alguna discrepancia documental.

---

# 1. Snapshot auditado

Estado observado en Supabase al 2026-08-25:

| Indicador | Valor auditado |
|---|---:|
| Clientes | 1,997 |
| Empleados activos | 12 |
| Clientes CADENA | 135 |
| Clientes REGULAR | 1,862 |
| Clientes con GPS | 929 |
| Clientes sin GPS | 1,068 |
| Áreas administrativas oficiales activas | 593 |

Desglose territorial activo:

- 10 regiones.
- 32 provincias.
- 158 municipios.
- 393 distritos municipales.

Los conteos operativos de visitas, llamadas, citas, rutas y showroom cambian con el uso diario y no deben tratarse como constantes de arquitectura.

---

# 2. Estado por módulo — mismo orden de la aplicación

Leyenda:

- ✅ Terminado / productivo.
- 🟡 Funcional con refinamiento pendiente.
- 🔶 Pendiente funcional priorizado.
- ⚪ Futuro / técnico / depende de decisión externa.

## OPERACIÓN

### Inicio / Dashboard — ✅

Implementado:

- KPIs ejecutivos diarios.
- Planificados, visitados y cobertura real.
- Distancia GPS geodésica estimada y tramos disponibles.
- Compras y ventas de calle + showroom.
- Llamadas, contactos y citas.
- Captaciones.
- Rutas iniciadas/cerradas.
- Gráficos separados Vendedores vs Gestores.
- Rankings separados por naturaleza del trabajo.
- Excel y PDF ejecutivo.

Pendiente de refinamiento, no bloqueo:

- porcentajes de jornada dedicados a atención vs traslado/espera;
- visitas por hora de jornada;
- posible renombre visual `Resolución` → `Cierre operativo`.

### Clientes — ✅

Implementado:

- maestro central en Supabase;
- consulta y filtros;
- edición autorizada;
- Vendedor y Gestor responsables;
- `client_type` normalizado CADENA/REGULAR;
- región/provincia/municipio;
- GPS;
- navegación Google Maps;
- protección de asignaciones manuales frente a importaciones/homologaciones.

### Mapa — ✅

Implementado:

- cartera completa paginada;
- Leaflet + OpenStreetMap;
- filtros comerciales y territoriales;
- maestro comercial vs división territorial oficial;
- Región → Provincia → Municipio → Distrito Municipal;
- coherencia maestro/coordenada/GPS de visita;
- zonas guardadas;
- navegación a cliente;
- vistas de mapa y límites oficiales.

### Planificación — ✅

Implementado:

- planificación por vendedor y fecha;
- ruta VISITAS y tareas CAPTACION;
- filtros CADENA/REGULAR;
- territorio maestro u oficial;
- gestor, empresa, GPS y calidad geográfica;
- disponibilidad y zonas guardadas;
- selección lista/mapa/polígono/radio;
- orden aproximado por cercanía;
- bloqueo de inicio de ruta fuera de la fecha programada.

### Rutas — ✅ V0.6.4

Implementado:

- mapa y secuencia de paradas;
- GPS inicio/final;
- una jornada activa por empleado;
- visitas desde parada;
- Gestor visible por cliente;
- vista Gestor de sus clientes dentro de rutas de Vendedores;
- eventualidades de jornada;
- cobertura real;
- resueltos / cierre operativo;
- cierre normal;
- cierre parcial con motivo obligatorio;
- pendientes pasan a `NO_VISITADO` o `REPROGRAMADO` según motivo;
- cierre transaccional backend;
- `ended_at` congela la jornada;
- ruta finalizada no puede reiniciarse;
- distancia GPS estimada por tramos;
- filtro CADENA/REGULAR visual sin falsear cierre global.

### Captación — ✅

Implementado:

- tareas por vendedor;
- división territorial oficial;
- rango de fechas;
- objetivo;
- sábado opcional;
- navegación por nombre de zona y al centro;
- clientes existentes como referencia de oportunidad;
- registro de prospecto;
- GPS y fotografías;
- prospecto asociado a tarea;
- visibilidad diferenciada por rol.

---

## GESTIÓN

### Cobertura cartera — 🔶 PRIORIDAD V0.6.5

Funcional actualmente:

- metas/frecuencias de visitas y llamadas;
- estados `CUMPLIDO`, `PENDIENTE`, `SIN_META`;
- filtros por responsable, territorio y tipo de cliente;
- jornada libre de vendedor;
- visitas espontáneas desde cartera;
- frecuencia individual y masiva.

Problema semántico confirmado:

- `CUMPLIDO` significa **cumplimiento de meta**, no “tuvo al menos una gestión”.
- un cliente con visita/llamada real y meta 0 puede seguir `SIN_META`.
- por eso filtrar `Cumplidos` no sirve para responder “quién fue gestionado”.

Requerimiento pendiente:

Separar dos dimensiones:

**Actividad**

- Gestionado.
- No gestionado / Nunca gestionado.

**Cumplimiento de meta**

- Cumplido.
- Pendiente.
- Sin meta.

No redefinir `CUMPLIDO` para evitar romper clientes con metas mayores a 1.

### Visitas — ✅

Implementado:

- una sola visita abierta;
- llegada/salida con GPS puntual;
- relación con ruta o jornada libre;
- recibido/no recibido;
- resultado comercial explícito;
- `COMPRO` / `NO_COMPRO` / `PENDIENTE`;
- monto opcional;
- fotos/evidencias;
- observaciones y seguimiento;
- solicitud showroom;
- validación geográfica a partir de GPS real.

### Llamadas — ✅

Implementado:

- CRM de cartera;
- filtros de Vendedor/Gestor/cliente;
- resultado estructurado;
- contacto/no contacto;
- siguiente acción;
- seguimiento;
- intención showroom;
- reportería ejecutiva.

La mejora pendiente pertenece a Cobertura, no al registro de llamadas.

### Agenda / Showroom — ✅

Implementado:

- intención → validación → contacto → confirmación/reprogramación;
- llegada → atención → compra/no compra → salida;
- responsable asignado distinto de quien atendió;
- notificaciones internas;
- una solicitud showroom no se pierde si el cliente aún no tiene Gestor;
- reasignación posterior cuando se asigna Gestor.

### Recepción — ✅

Implementado:

- citas y walk-ins;
- búsqueda de clientes/prospectos;
- llegada física;
- relación con showroom;
- estados de atención;
- gestor opcional según flujo.

---

## INTELIGENCIA

### Reportes — ✅ V0.6.4

Implementado:

- Reporte Ejecutivo Diario;
- reporte personal según permisos;
- vendedores y gestores separados;
- jornada y horario;
- cobertura real;
- resueltos y resolución/cierre operativo;
- atención a clientes;
- promedio por visita;
- traslado/espera estimado;
- distancia GPS estimada y tramos;
- llamadas, contactos, showroom, compras y ventas;
- eventualidades;
- cronología;
- Excel y PDF;
- versión de aplicación visible en PDF.

Definiciones que no deben cambiar sin decisión explícita:

- Cobertura real = visitados / planificados.
- Resolución/cierre operativo = paradas con resultado / planificados.
- Traslado/espera es residual estimado, no conducción pura.
- Distancia GPS es geodésica entre puntos disponibles, no odómetro.

### Calidad geográfica — ✅

Implementado:

- 593 áreas administrativas activas;
- diagnóstico maestro vs coordenada guardada vs GPS real;
- estados de coherencia/inconsistencia;
- aprobación/rechazo administrativo de sugerencias;
- Mapa y Planificación consumen calidad territorial;
- ninguna discrepancia sobrescribe automáticamente maestro o coordenadas.

---

## SISTEMA

### Administración — 🟡

Implementado:

- importar cartera con preview/apply;
- homologación `V-CARTERA` / `G-CARTERA`;
- usuarios;
- perfiles base;
- permisos heredados + overrides;
- activar/desactivar;
- cambio/asignación de contraseña administrada.

Pendiente priorizado V0.6.5:

- 🔶 usuarios conectados / sesiones administrativas;
- login_at;
- last_activity_at;
- logout_at;
- estado conectado/inactivo/desconectado;
- duración de sesión;
- historial de sesiones;
- heartbeat moderado y expiración por inactividad.

No inferir “conectado” únicamente por un token de Supabase Auth.

### Configuración — ✅ / ⚪ externo

Implementado:

- temas Karaka, Claro, Oscuro y Ejecutivo;
- color principal;
- cambio de contraseña;
- perfil de cuenta.

Pendiente externo:

- ⚪ recuperación automática por WhatsApp/OTP necesita proveedor configurado y validación end-to-end.

---

# 3. Requerimientos transversales terminados

- ✅ persistencia central Supabase multiusuario;
- ✅ aplicación responsive;
- ✅ roles/perfiles y permisos;
- ✅ login por nick;
- ✅ versión visible en login/sidebar/PDF;
- ✅ filtro CADENA/REGULAR;
- ✅ mapas y geografía oficial;
- ✅ 593 divisiones administrativas cargadas;
- ✅ no autocorrección geográfica por GPS;
- ✅ bloqueo de ruta fuera de fecha;
- ✅ día operativo alineado a `route_session.session_date`;
- ✅ una visita abierta por empleado;
- ✅ cierre parcial de jornada;
- ✅ congelación de tiempo al cerrar;
- ✅ motivo auditable de pendientes;
- ✅ eventualidades de jornada;
- ✅ distancia GPS estimada;
- ✅ dashboard y reportes por función;
- ✅ PDF ejecutivo corporativo;
- ✅ Service Worker productivo deshabilitado/limpiado en localhost para evitar pruebas con caché vieja.

---

# 4. Roadmap recomendado

## V0.6.5 — prioridad funcional

1. Cobertura: separar **actividad** de **cumplimiento de meta**.
2. Administración: sesiones / usuarios conectados.
3. Refinar productividad:
   - % jornada en atención;
   - % jornada traslado/espera;
   - visitas por hora;
   - promedio por visita con interpretación de calidad.
4. Claridad UX: valorar `Resolución` → `Cierre operativo`.

## Futuro / técnico

- distancia vial real con motor de rutas, diferenciada de distancia GPS geodésica;
- recuperación WhatsApp OTP;
- code splitting / lazy loading del bundle principal;
- auditoría integral `access_profile/permission_overrides` vs `app_role/RLS`;
- CORS restrictivo para Edge Functions al dominio productivo;
- revisión Storage/RLS/SECURITY DEFINER;
- protección formal de `main`;
- lockfile/reproducibilidad si se decide incorporarlo al repositorio.

---

# 5. Regla de continuidad

Cuando este proyecto pase a otro chat, el mensaje mínimo recomendado es:

> Continúa el proyecto Gestión de Ventas Diaria del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`. Lee primero `PROJECT_HANDOFF.md` y después `docs/REQUIREMENTS_STATUS.md`. Verifica `main`, Supabase y producción antes de modificar nada. Dime la versión productiva, qué está terminado y cuál es el siguiente requerimiento pendiente.

No utilizar el historial del chat como única fuente de verdad. GitHub, Supabase y el estado productivo real prevalecen.
