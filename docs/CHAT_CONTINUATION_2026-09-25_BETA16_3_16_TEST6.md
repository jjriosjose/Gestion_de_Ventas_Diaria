# Continuación — Gestión de Ventas Diaria — 25/09/2026 — beta16.3.16-test.6

> **Checkpoint de desarrollo activo.**
>
> Producción sigue en **0.6.5-beta.16.3.15**.
> Esta prueba **NO está mergeada ni desplegada**.
> Antes de modificar cualquier cosa leer primero `docs/CHAT_CONTINUATION_CURRENT.md` y luego este archivo.

## 1. Estado vivo de referencia

Repositorio:
`jjriosjose/Gestion_de_Ventas_Diaria`

Producción:
- versión: **0.6.5-beta.16.3.15**
- versión visible: **v0.6.5 Beta**
- Cloudflare: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Current Version ID: `d221fada-8015-4840-b01a-5c2ec4d88880`
- baseline protegido: **16.3.15**
- QA productivo PC/teléfono: **APROBADO**

Desarrollo activo:
- rama: `feature/reports-daily-showroom-fix-test`
- PR #94: **OPEN / DRAFT / NO MERGE**
- versión: **0.6.5-beta.16.3.16-test.6**
- head verificado: `ad78ef4bcf780bd18c8b153a45b681950910c6a1`
- Build validation #1301: **SUCCESS**
- release:integrity: **SUCCESS**
- Supabase: **sin cambios**
- migraciones: **ninguna**
- deploy: **NO**

## 2. Objetivo de 16.3.16

Corregir y profesionalizar Reportes pensando en un futuro producto SaaS empresarial, evitando:
- filtros invisibles;
- atribuciones inconsistentes;
- compras con monto pendiente representadas como RD$0;
- tablas comprimidas;
- cientos de tarjetas diarias para períodos largos;
- Excel limitado a una foto resumida del dashboard.

## 3. Correcciones funcionales de Reportes ya implementadas

### Selección invisible eliminada

Problema anterior:
- filtro visible = `Todos los colaboradores`;
- estado interno `selectedEmployee` seleccionaba automáticamente `candidates[0]`;
- Evelyn Ochoa aparecía en DETALLE DIARIO sin estar filtrada.

Corrección:
- Todos los colaboradores => resumen realmente general;
- drill-down de colaborador solo por selección explícita;
- al volver a Todos se limpia la selección;
- botón `Volver al resumen general`.

### Detalle general correcto

Con 25/09/2026 + Todos:
- **5 compras**
- **RD$3,532,014.70** registrados
- UI redondea a **RD$3,532,015**
- **2 montos pendientes**
  - 1 Calle
  - 1 Showroom

El usuario validó visualmente que esto aparece correctamente.

### Compras con monto pendiente

Ya no se interpreta una compra sin importe como una venta de RD$0.

Casos reales del 25/09:
- Evelyn Ochoa: compra Showroom con monto pendiente.
- Rendy Mejías: compra Calle con monto pendiente.

UI:
- muestra `Monto pendiente` cuando corresponde;
- muestra contador de pendientes por canal;
- mantiene las compras contabilizadas.

## 4. Atribución Showroom corregida

Problema anterior:
- columna Showroom acreditaba al gestor responsable;
- compras/ventas Showroom acreditaban a quien realmente atendió;
- la misma fila mezclaba dimensiones.

Nueva regla:
- **Citas** => responsabilidad/asignación.
- **Showroom atendido** => quien realizó la atención.
- **Tiempo Showroom** => quien realizó la atención.
- **Compras Showroom** => quien realizó la atención.
- **Ventas Showroom** => quien realizó la atención.

Validación 25/09:
- Manuel Alcántara: 2 atenciones/compras Showroom; RD$3,466,690.70.
- Eliesel Santana: 1 atención/compra Showroom; RD$65,324.
- Evelyn Ochoa: 1 atención/compra Showroom; 1 monto pendiente.
- José De La Cruz: 0 atenciones realizadas aunque conserve citas/responsabilidad.

## 5. Tabla empresarial mejorada

Problema:
- nombres de gestores se partían en múltiples líneas por exceso de columnas.

Corrección:
- primera columna Gestor/Vendedor con ancho fijo;
- nombre legible;
- columna sticky durante scroll horizontal;
- métricas mantienen ancho y lectura;
- aplicado a Gestores y Vendedores.

Usuario validó visualmente la mejora.

## 6. Detalle temporal adaptativo

Diseñado para escalar a empresas con meses/años de información.

Regla actual:
- rango **<=45 días** => detalle diario;
- rango **>45 días** => resumen mensual;
- cada tarjeta mensual permite `Ver detalle diario`;
- botón `Volver al resumen mensual`;
- selección de colaborador funciona también con el drill-down temporal.

Ejemplo validado:
- rango agosto-septiembre:
  - Agosto 2026
  - Septiembre 2026
- el resumen mensual funcionó correctamente según validación del usuario.

Objetivo:
- evitar 365+ tarjetas visibles en un año;
- mantener análisis jerárquico:
  `período → mes → día → colaborador`.

PDF:
- conserva enfoque ejecutivo de la vista visible.

## 7. Excel analítico multihoja — IMPLEMENTADO Y VALIDADO

El usuario confirmó:
> “el excel quedó muy bien”

Archivo:
`src/lib/roleReportXlsx.ts`

El Excel deja de ser una copia resumida de la pantalla y se convierte en un libro analítico multihoja.

Hojas:
1. `Parametros`
2. `Resumen Vendedores`
3. `Resumen Gestores`
4. `Comercial Diario`
5. `Jornadas Calle`
6. `CRM Diario`
7. `Showroom Detalle`
8. `Visitas Detalle`
9. `Llamadas Detalle`

Características:
- filtros de Excel;
- encabezados congelados;
- primera(s) columna(s) congeladas según hoja;
- importes numéricos;
- tiempos/GPS/métricas exportables;
- usable con Power Query;
- usable con tablas dinámicas;
- usable con Power Pivot;
- pensado para análisis externo empresarial.

Escalabilidad:
- detalle transaccional se obtiene al exportar;
- el dashboard puede seguir cargando resumen;
- el libro no queda acoplado a Karaka;
- diseño tenant-neutral.

## 8. Principio de producto acordado

A partir de esta fase, todo cambio debe evaluarse pensando en que la aplicación se venderá a empresas.

Prioridades:
- multiempresa/tenant-neutral;
- escalabilidad;
- claridad de roles;
- datos exportables;
- reportes reutilizables;
- auditoría;
- seguridad;
- evitar lógica específica de Karaka en componentes generales;
- UX consistente en PC/tablet/teléfono;
- separación entre resumen ejecutivo y detalle analítico.

## 9. Archivos modificados en PR #94

Comparado con `main`:
- `package.json`
- `package-lock.json`
- `src/pages/ReportsV2.tsx`
- `src/styles/report-beta11.css`
- `src/lib/roleReportXlsx.ts`

No contiene:
- SQL;
- migraciones;
- cambios Supabase;
- cambios RLS/Auth.

## 10. Estado que NO debe confundirse

Producción:
- sigue en **16.3.15**.

Prueba:
- **16.3.16-test.6**.

No:
- mergear PR #94 por memoria;
- hacer deploy desde feature;
- actualizar baseline a 16.3.16 antes de QA final;
- considerar 16.3.16 productivo solo porque visualmente se validó parte del módulo.

## 11. Siguiente paso exacto

Al continuar en un nuevo chat:

1. leer `docs/CHAT_CONTINUATION_CURRENT.md`;
2. leer este archivo;
3. verificar GitHub `main`;
4. verificar PR #94 vivo;
5. confirmar que la rama sigue en `0.6.5-beta.16.3.16-test.6`;
6. verificar Build #1301 o el build más reciente;
7. revisar si queda alguna validación de Reportes pendiente;
8. si el usuario aprueba completamente:
   - promover test.6 a `0.6.5-beta.16.3.16`;
   - CI final;
   - sacar PR #94 de Draft;
   - mergear a main;
   - sincronizar PC;
   - `npm run release:integrity`;
   - `npm run deploy`;
   - QA productivo;
   - actualizar baseline/documentación.

Si aparece una nueva solicitud antes de promover:
- continuar sobre la misma rama PR #94;
- mantener versión `test.x`;
- no tocar producción.

## 12. Estado histórico crítico que sigue vigente

- incidente QA del 25/09 y restauración de TIENDA AMARILLA;
- 42 guards QA en Supabase;
- Storage RESTRICTIVE;
- PR #85 QA/staging pausado;
- Captación Programada pendiente;
- Production Deploy Guard activo;
- baseline 16.3.15 protegido.

Para esos detalles leer:
`docs/CHAT_CONTINUATION_2026-09-25_BETA16_3_15.md`.
