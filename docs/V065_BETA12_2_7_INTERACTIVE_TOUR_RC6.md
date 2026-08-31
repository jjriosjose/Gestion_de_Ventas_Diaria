# V0.6.5-beta.12.2.7-rc.6 · Functional Highlight Pass

Estado: **TEST / release candidate**. No desplegado a producción.

## Objetivo
Alinear el recorrido interactivo con el contenido funcional real de cada pantalla. Se evita resaltar únicamente cabeceras cuando la explicación se refiere a indicadores, filtros, tablas o gráficos.

## Ajustes RC6

- **Inicio:** foco principal en el pulso ejecutivo y focos complementarios en KPIs y gráficos visibles de Vendedores/Gestores.
- **Jornadas:** foco principal en indicadores de ejecución/cobertura y focos complementarios en filtros e historial de jornadas cuando están visibles.
- **Calidad geográfica:** foco principal en KPIs de coherencia/anomalías y foco complementario en el diagnóstico geográfico.
- **Reportes:** foco principal en filtros multiperíodo y focos complementarios en Ejecución Calle, CRM/Showroom, Resultado Comercial y gráficos visibles.
- Se mantienen los ajustes previos de Planificación, Rutas, Visitas, Recepción, Tracking y Control Tower.
- Los focos secundarios se recalculan con MutationObserver y solo se dibujan cuando el bloque está realmente visible.

## Protección de alcance

- Sin SQL.
- Sin migraciones ni cambios Supabase.
- Sin cambios de esquema o RLS.
- Sin cambios de lógica operativa de Rutas, Jornadas, Visitas, Llamadas, Agenda, Recepción o Tracking.
- Sin deploy Cloudflare.
- Sin merge a `main` durante QA.

## QA requerido

1. Chrome al 100%.
2. Confirmar versión `0.6.5-beta.12.2.7-rc.6`.
3. Validar especialmente pasos 01, 05, 13 y 14.
4. Confirmar que cada uno resalta contenido funcional y no solo la cabecera.
5. Completar el tour y confirmar que Anterior/Siguiente/Finalizar siguen funcionando.
6. Confirmar que el tour no ejecuta acciones sensibles.

Después de QA manual aprobado se podrá promover a `0.6.5-beta.12.2.7` final.
