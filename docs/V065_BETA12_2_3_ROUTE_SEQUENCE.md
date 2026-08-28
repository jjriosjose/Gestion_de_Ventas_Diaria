# V0.6.5-beta.12.2.3 · Route Sequence Clarity

Refinamiento visual y semántico de Tracking posterior al QA productivo de beta.12.2.2.

## Objetivo

Hacer que el modo Recorridos pueda leerse como una verdadera secuencia operativa multi-vendedor sin perder la separación entre planificación, estado de parada, evidencia GPS y auditoría geográfica.

## Cambios

- El número de parada permanece siempre visible, incluso cuando la parada está visitada o en visita.
- El estado pasa a una insignia secundaria: visitado, en visita, no realizado, reprogramado o cancelado.
- La anomalía geográfica sigue siendo una tercera señal independiente y no sustituye la secuencia.
- La línea planificada aumenta contraste y grosor en modo Recorridos.
- Se añaden flechas discretas entre paradas para comunicar dirección de secuencia, sin representar navegación vial.
- Paradas con coordenadas prácticamente coincidentes se separan visualmente alrededor del punto real; la coordenada almacenada no se modifica.
- El KPI `Sin actualización` cambia a `Sin señal reciente` para evitar sugerir ausencia total de registros.
- Calidad GPS y coherencia geográfica se presentan como dos grupos conceptuales distintos.
- Los controles del mapa cambian su etiqueta según el modo Recorridos o Calidad GPS.
- Timeline con señal visual primaria por tipo de evento; la anomalía geográfica queda como badge secundario.
- La leyenda inferior permanece reducida únicamente al semáforo operativo.

## Seguridad / alcance

No modifica:
- Supabase ni migraciones;
- captura GPS;
- reglas de distancia;
- validaciones geográficas;
- permisos;
- Rutas, Visitas o Jornadas;
- historial de pruebas.

La separación visual de puntos coincidentes es exclusivamente de presentación. El mapa y las auditorías continúan usando las coordenadas reales guardadas.
