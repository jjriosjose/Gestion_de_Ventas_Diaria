# Configuración geográfica — Gestión de Ventas Diaria

Baseline auditado: **V0.6.4**.

La capa territorial ya no está pendiente de instalación: la aplicación dispone de división administrativa oficial cargada y la utiliza para diagnóstico, Mapa, Planificación y Captación.

---

## Estado actual

Áreas administrativas activas auditadas al 2026-08-25:

| Nivel | Cantidad |
|---|---:|
| REGION | 10 |
| PROVINCIA | 32 |
| MUNICIPIO | 158 |
| DISTRITO_MUNICIPAL | 393 |
| **Total** | **593** |

Tabla principal:

`public.administrative_areas`

La geometría se consume junto con PostGIS para resolver/coherenciar coordenadas con la división territorial.

---

## Fuentes y generación

El repositorio contiene workflow/proceso reproducible para generar la cartografía territorial usada por el proyecto a partir de fuentes geográficas de referencia de República Dominicana.

Durante la evolución se validaron/corrigieron capas oficiales, incluyendo límites provinciales, antes de incorporarlas al flujo operativo.

No sustituir geometrías activas por una fuente nueva sin:

1. identificar fuente y versión;
2. comparar conteos/nombres/códigos;
3. validar topología/GeoJSON;
4. probar Región/Provincia/Municipio/Distrito;
5. validar clientes representativos;
6. comprobar que no se alteren automáticamente datos maestros.

---

## Niveles soportados actualmente

- `REGION`
- `PROVINCIA`
- `MUNICIPIO`
- `DISTRITO_MUNICIPAL`

La app también puede mostrar localidad/datos detectados cuando el flujo geográfico los produce, pero la jerarquía oficial principal cargada corresponde a los cuatro niveles anteriores.

---

## Regla principal de seguridad geográfica

**Nunca corregir automáticamente Región, Provincia, Municipio o coordenadas del cliente únicamente porque el GPS y el maestro no coincidan.**

La aplicación compara tres fuentes conceptuales:

1. territorio maestro comercial;
2. territorio inferido por coordenada guardada;
3. territorio observado a partir del GPS real de una visita.

Una diferencia se considera evidencia para revisión, no autorización automática de sobrescritura.

---

## Estados de diagnóstico

El módulo de Calidad geográfica utiliza estados como:

- `COHERENTE_SIN_VISITA`
- `VERIFICADO_VISITA`
- `PENDIENTE_VISITA`
- `COORDENADA_SOSPECHOSA`
- `TERRITORIO_SOSPECHOSO`
- `INCONSISTENCIA_VISITA`
- `INCONSISTENCIA_GRAVE`
- `FUERA_DIVISION`
- `SIN_CARTOGRAFIA`
- `SIN_GEO`

Interpretación general:

- maestro y coordenada pueden ser coherentes sin haber sido verificados físicamente;
- una visita real aporta evidencia adicional;
- cuando las fuentes contradicen entre sí, la corrección debe revisarse administrativamente.

---

## Revisión administrativa

Desde **Calidad geográfica** puede revisarse evidencia de visitas reales.

Cuando se aprueba una sugerencia territorial, el flujo debe respetar el alcance explícito de la acción. La interfaz actual advierte que una aprobación territorial no equivale a modificar coordenadas automáticamente.

No introducir una opción de “corregir todo automáticamente” sin un diseño nuevo y autorización explícita.

---

## Uso por módulo

### Mapa

- territorio maestro;
- división territorial oficial;
- calidad/coherencia;
- límites y zonas;
- clientes con/sin GPS.

### Planificación

- selector Maestro comercial / División territorial oficial;
- Región → Provincia → Municipio → Distrito Municipal;
- filtros de calidad territorial;
- selección por área/mapa.

### Captación

- tareas asignadas a una división oficial;
- zona oficial como área de trabajo;
- clientes existentes como referencia comercial;
- navegación por nombre de zona o centro.

### Visitas / Calidad geográfica

- GPS puntual genera evidencia territorial;
- la evidencia puede alimentar diagnóstico/revisión;
- no hay tracking continuo obligatorio.

---

## Datos de cartera relacionados

Snapshot 2026-08-25:

- clientes: 1,997;
- con GPS: 929;
- sin GPS: 1,068.

El hecho de que un cliente tenga GPS no implica que su territorio esté “verificado” por una visita real.

---

## Operación futura

Si se actualiza la cartografía oficial:

- crear cambio versionado;
- mantener trazabilidad de fuente;
- evitar DDL/reimportaciones destructivas;
- ejecutar pruebas en Mapa, Planificación, Captación y Calidad geográfica;
- validar que las vistas geográficas sigan funcionando con RLS/`security_invoker` cuando corresponda.

La cartografía ya es parte crítica de la operación y debe tratarse como dato maestro versionado, no como recurso temporal de prueba.
