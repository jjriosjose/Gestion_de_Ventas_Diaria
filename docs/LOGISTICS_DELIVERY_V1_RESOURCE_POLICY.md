# Logistics & Delivery V1 — Política de consumo y conservación de recursos

Fecha: 06/09/2026 (RD)

Estado: REGLA DE DISEÑO OBLIGATORIA PARA LOGÍSTICA V1

## Objetivo

Permitir validar la aplicación durante varios meses utilizando Supabase Free sin introducir consumo evitable de Egress, Edge Function invocations, Realtime, Storage o crecimiento innecesario de base de datos.

## 1. Regla principal: NO polling periódico

La experiencia del chofer NO debe consultar Supabase automáticamente cada 10, 15, 20, 30 segundos ni a ningún otro intervalo fijo.

Queda prohibido para Logistics & Delivery V1:

- `setInterval` para refrescar el viaje;
- refresco automático al volver la pestaña a primer plano;
- suscripción Realtime solo para detectar cambios de ruta;
- consultas periódicas de `route_revision`;
- auto-refresh habilitado por defecto.

## 2. Cuándo sí se consulta

El estado del viaje se obtiene únicamente cuando existe una razón funcional concreta:

1. validación inicial del enlace temporal + PIN;
2. el chofer pulsa **Actualizar ruta** manualmente;
3. el chofer registra una acción real, por ejemplo:
   - inicio de ruta;
   - llegada;
   - inicio/fin de descarga;
   - entrega;
   - no entrega/reprogramación;
   - incidencia;
   - retorno/cierre.

Las acciones de escritura ya deben devolver el estado actualizado del viaje; no se debe realizar un segundo refresh redundante después de una acción exitosa.

## 3. Actualizaciones de Torre de Control

Si Torre de Control agrega/corrige una ubicación o modifica datos de una parada mientras el viaje está activo:

- incrementa `route_revision`;
- NO se fuerza una consulta al dispositivo del chofer;
- el chofer obtiene el cambio al pulsar **Actualizar ruta** o al realizar la siguiente acción operativa que devuelva el viaje actualizado;
- si la nueva revisión es mayor a la revisión local, se muestra **Ruta actualizada por Despacho**.

Esto sacrifica sincronización automática por segundos a cambio de un consumo mucho menor y predecible, que es la prioridad durante el período de validación en Free.

## 4. Tracking

Tracking Logístico seguirá siendo basado en eventos GPS, no tracking continuo en background.

No implementar:

- posición cada X segundos;
- geolocalización permanente;
- Realtime de ubicación continuo.

Sí registrar GPS asociado a eventos operativos relevantes.

## 5. Storage / POD

El principal riesgo de crecimiento de Storage no son los refreshes sino fotos y evidencias.

Reglas:

- bucket `delivery-evidence` privado;
- comprimir fotografías antes de subir;
- evitar guardar duplicados;
- una foto por entrega como estándar V1, salvo incidencia justificada;
- firmas digitales optimizadas y vinculadas al POD;
- establecer métricas periódicas de tamaño de Storage durante pruebas.

## 6. Historial

Pantallas de Historial/POD deben usar límites/paginación. No descargar el histórico completo de meses/años en cada entrada al módulo.

## 7. Torre de Control e Incidencias

Por defecto usar actualización manual. No añadir auto-refresh silencioso sin una nueva decisión explícita de producto y revisión de consumo.

## 8. Métricas a vigilar durante la validación

Como mínimo revisar mensualmente:

- Database Size;
- Storage;
- Egress;
- Edge Function invocations;
- MAU;
- Realtime messages/connections;
- tamaño y número de objetos en `delivery-evidence`;
- número de filas en `delivery_events`, `delivery_incidents`, `delivery_proofs` y `delivery_evidence`.

## 9. Principio de escalabilidad

Durante la etapa de validación la prioridad es **eficiencia y control de consumo**, no apariencia de tiempo real.

Cuando el producto se venda o pase a un plan con presupuesto operativo, se podrá reevaluar Realtime, telemetría o polling adaptativo. Ese cambio no debe habilitarse accidentalmente en la versión Free de pruebas.
