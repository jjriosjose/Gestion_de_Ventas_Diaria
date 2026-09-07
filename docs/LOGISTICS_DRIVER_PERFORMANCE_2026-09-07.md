# Auditoría de rendimiento — Portal del Chofer

Fecha: **07/09/2026 (RD)**

Rama: `feature/logistics-delivery-v1`

Estado: **PENDIENTE OPTIMIZACIÓN / NO BLOQUEAR CON POLLING NI REALTIME**

## Síntoma observado

Durante QA real, el usuario reporta que entre cambios de proceso del chofer cada acción puede tardar varios segundos: salida, llegada, inicio/fin de descarga, entrega, incidencia, retorno y cierre.

## Causa 1 — geolocalización bloqueante antes de cada acción

En `src/pages/ExternalDelivery.tsx`, `getGeo()` usa actualmente:

```ts
{ enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
```

Y se ejecuta antes de casi todas las acciones operativas.

Consecuencia:

- una acción puede esperar hasta 9 s antes de llamar Supabase;
- alta precisión repetida obliga al dispositivo a intentar una lectura nueva aun cuando acaba de obtener GPS hace pocos segundos;
- inicio y fin de descarga pueden pagar el mismo costo aunque ocurran en el mismo cliente y con pocos segundos/minutos de diferencia.

Esta es la causa de latencia percibida con mayor impacto potencial.

## Causa 2 — múltiples operaciones backend por cada acción

Cada invocación a `delivery-access` realiza al menos parte de estos pasos:

1. hash del token;
2. consulta de `delivery_access_links`;
3. validación PIN/estado/expiración;
4. consulta del viaje;
5. update de `first_used_at/last_used_at`;
6. consulta del objeto afectado (viaje/parada/incidencia/documentos);
7. update de estado;
8. insert en `delivery_events`;
9. reconstrucción completa de payload con cuatro consultas paralelas:
   - viaje;
   - paradas;
   - documentos;
   - incidencias.

En entrega/POD hay además:

- update por documento;
- upload de firma;
- upload de foto;
- insert POD;
- relaciones POD-documentos;
- evidencia;
- update de parada;
- evento;
- payload final.

## Objetivo

Reducir el tiempo percibido sin:

- polling;
- Realtime;
- GPS continuo;
- sacrificar los puntos GPS críticos;
- duplicar consultas después de una acción.

Objetivo UX inicial:

- acción simple con GPS reciente: normalmente ~1–2 s;
- acción con lectura GPS fresca: puede tardar algo más, pero no debe esperar repetidamente hasta 9 s;
- entrega con múltiples documentos/foto/POD puede ser más pesada y debe mostrar progreso claro.

## Optimización recomendada — Fase 1 frontend

### Cache GPS en memoria

Guardar el último GPS exitoso con timestamp durante la sesión del viaje.

No significa tracking continuo; solo reutiliza un punto ya obtenido por una acción anterior.

### Clasificar eventos

**GPS fresco recomendado:**

- salida del centro de carga;
- llegada a cliente;
- confirmación de entrega/POD;
- incidencia reportada cuando sea importante ubicarla;
- inicio de retorno;
- llegada a base / cierre.

**Puede reutilizar GPS reciente:**

- inicio de descarga;
- fin de descarga;
- otros cambios intermedios en la misma parada;
- reconocimiento de actualización de ruta.

### Timeout

Reducir el timeout bloqueante de GPS. Propuesta inicial a QA:

- GPS crítico: ~3–4 s máximo;
- evento intermedio: reutilizar fix reciente; si no existe, intento corto ~1.5–2 s;
- si no hay fix, registrar el evento sin GPS antes que congelar la interfaz 9 s.

### Vigencia

Propuesta inicial:

- GPS reciente para eventos intermedios: 60–120 s;
- para entrega/cierre pedir lectura fresca cuando sea posible;
- conservar fallback al último fix reciente solo si la lectura fresca falla y marcar internamente que fue reutilizado si se decide auditarlo.

## Optimización recomendada — Fase 2 Edge Function

### `last_used_at`

No es necesario escribir `last_used_at` en cada acción si acaba de actualizarse. Puede aplicarse throttle, por ejemplo una vez por minuto, manteniendo seguridad y auditoría suficiente.

### Actualizaciones por documento

En `delivery_result`, updates independientes de documentos pueden paralelizarse con `Promise.all` cuando ya se validó toda la conciliación.

### Evidencias

Firma y foto pueden prepararse/subirse en paralelo cuando ambas existen, sujeto a límites de tamaño y manejo de error.

### Payload final

Ya se evita un refresh frontend adicional porque la acción devuelve el estado actualizado. Preservar esta regla.

Revisar posteriormente si algunas respuestas simples necesitan todo el payload o pueden devolver un delta seguro; no implementar esto primero porque aumenta complejidad.

## Orden recomendado de implementación

1. cache GPS + timeout menor;
2. QA comparativo de tiempos;
3. throttle de `last_used_at`;
4. paralelizar operaciones seguras de `delivery_result`;
5. volver a medir;
6. solo después evaluar optimizaciones más profundas.

## Prueba de aceptación

Crear un viaje TEST con una parada y registrar cronómetro aproximado para:

- Iniciar ruta;
- Llegué;
- Iniciar descarga;
- Finalizar descarga;
- guardar entrega sin foto;
- guardar entrega con foto;
- iniciar retorno;
- cerrar viaje.

Comparar antes/después.

Validar además:

- GPS sigue guardándose en eventos críticos;
- cierre conserva hora y punto real de base;
- no aparece polling/Realtime;
- no aumenta de forma anormal Edge Function invocations;
- acciones siguen devolviendo estado actualizado sin pulsar refresh.

## Decisión de release

La latencia no debe ignorarse antes del release de Logística. Tratar como **P0/P1 de UX operacional**, porque el chofer repetirá estas acciones muchas veces por día.

No promover PR #58 hasta realizar al menos la Fase 1 y validar mejora perceptible en móvil real.
