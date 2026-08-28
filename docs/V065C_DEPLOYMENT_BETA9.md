# V0.6.5-beta.9 — Registro de deployment productivo

Fecha operativa: **27/08/2026 (República Dominicana)**.

## Estado

- GitHub `main`: **V0.6.5-beta.9**.
- Supabase V065C: **aplicado y validado**.
- Cloudflare Workers: **DEPLOY EXITOSO**.
- URL productiva: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Cloudflare Version ID: **`3e1e4435-5236-429d-bcca-a14668424726`**.

## Evidencia del build/deploy local

Build Vite productivo:

- Vite: `v7.3.6`.
- Módulos transformados: **2573**.
- Build completado: **13.68 s**.
- Archivo JS principal aproximado: **2,722.55 kB minificado / 792.87 kB gzip**.
- Advertencia de chunk >500 kB: **no bloqueante**; queda como deuda de optimización futura mediante code splitting/dynamic imports.

Wrangler:

- Wrangler: `4.125.0`.
- Configuración usada: `dist\\wrangler.json`.
- Archivo original: `wrangler.jsonc`.
- Configuración de deployment: `.wrangler\\deploy\\config.json`.
- Archivos leídos desde `dist`: **18**.
- Assets nuevos/modificados subidos: **7**.
- Assets ya existentes: **8**.
- Resultado: `Success! Uploaded 7 files`.
- Worker desplegado: `gestion-de-ventas-diaria`.
- Trigger productivo actualizado correctamente.

## Próximo paso obligatorio

No iniciar otro bloque de desarrollo todavía. Validar beta.9 en producción por rol.

### Administrador

1. Confirmar versión visible `0.6.5-beta.9`.
2. Inicio carga y muestra resumen de Jornadas.
3. Abrir `Jornadas`.
4. Probar período Mes.
5. Probar filtro Vendedor.
6. Probar Estado de jornada.
7. Probar Región / Provincia / Municipio oficial.
8. Abrir detalle de una jornada.
9. Abrir Reportes.
10. Probar Mes + colaborador + estado + territorio oficial.
11. Verificar KPI de cobertura/cierre.
12. Probar Excel y PDF.
13. Revisar alertas de jornadas pendientes.

### Vendedor

1. Confirmar versión visible `0.6.5-beta.9`.
2. Confirmar acceso a `Mis jornadas`.
3. Confirmar que solo aparecen sus propias jornadas.
4. Confirmar que una jornada anterior no ofrece continuar ejecución.
5. Confirmar que una jornada pendiente de cierre es visible sin buscar día por día.
6. Revisar Rutas.
7. Revisar Visitas si existe actividad vencida.
8. Revisar Reportes y confirmar scoping personal.

### Regresión

- Login.
- Clientes.
- Mapa territorial.
- Planificación.
- Rutas.
- Captación.

## Estado del proyecto después del deploy

```text
GitHub main      = V0.6.5-beta.9
Supabase backend = V0.6.5-beta.9 / V065C
Cloudflare UI    = V0.6.5-beta.9
Version ID       = 3e1e4435-5236-429d-bcca-a14668424726
Estado           = desplegado; pendiente validación funcional productiva por rol
```
