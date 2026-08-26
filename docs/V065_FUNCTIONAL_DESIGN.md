# Diseño funcional V0.6.5 — Gestión de Ventas Diaria

> Documento de diseño funcional previo al desarrollo. **No representa funcionalidad ya implementada.**
>
> Baseline productivo al momento de este checkpoint: **V0.6.4**.
>
> Este documento debe leerse junto con `PROJECT_HANDOFF.md` y `docs/REQUIREMENTS_STATUS.md` antes de iniciar V0.6.5.

---

# 0. Objetivo del checkpoint

Congelar por escrito las reglas de negocio y decisiones de UX definidas antes de modificar código, Supabase o producción.

Principios:

1. No duplicar el sistema externo donde Karaka registra pedidos/facturas/ventas reales.
2. La app de Gestión de Ventas Diaria debe registrar **actividad, trazabilidad comercial, atribución y monto**, con la menor digitación manual posible.
3. Una visita planificada y una visita no planificada deben terminar en el **mismo formulario y la misma lógica**.
4. Una ruta planificada no impide que el Vendedor atienda otros clientes durante la misma jornada.
5. La cobertura del plan no se debe inflar con visitas adicionales.
6. La visualización de estados debe usar iconografía empresarial consistente, no depender solo de colores tipo semáforo.
7. La reconstrucción del recorrido se basa en puntos GPS de eventos; no se debe presentar como GPS continuo ni como odómetro.
8. Supabase continúa siendo la fuente central compartida. Caches de lectura pueden optimizar UX, pero nunca sustituir la fuente real.

---

# 1. Modelo comercial Karaka — Vendedor + Gestor

## 1.1 Responsabilidades de cartera

En la mayoría de los casos un cliente mantiene relación con dos responsables:

- **Vendedor asignado**: atiende al cliente principalmente en calle y genera oportunidades/pedidos mediante visitas o contacto directo.
- **Gestor asignado**: atiende CRM/showroom y normalmente procesa en el sistema externo los pedidos originados por el Vendedor o por el propio Gestor.

El sistema debe preservar estas dos asignaciones del cliente y, adicionalmente, registrar quién originó y quién procesó cada resultado comercial.

## 1.2 Regla de atribución

Una operación comercial no debe pertenecer automáticamente a una sola persona.

Debe poder distinguirse:

- **Responsable de cartera — Vendedor**.
- **Responsable de cartera — Gestor**.
- **Originado por**: empleado que generó el pedido/oportunidad concreta.
- **Procesado por**: empleado que registró/procesó el resultado comercial en el sistema externo y confirmó el monto en esta app.

Ejemplo:

```text
Cliente: Ferretería ABC
Vendedor asignado: Eduar
Gestor asignado: Rosmery
Origen: visita de calle
Originado por: Eduar
Procesado por: Rosmery
Resultado: venta confirmada
Monto: RD$125,000
```

Si excepcionalmente otro Vendedor atiende al cliente, no se debe cambiar automáticamente la asignación de cartera. Se conserva el Vendedor oficial y se registra quién realizó/originó la gestión real.

---

# 2. Sistema externo de ventas — regla de mínima digitación

Karaka registra las ventas oficiales en un sistema independiente.

Por tanto, esta app **no debe duplicar**:

- artículos;
- cantidades;
- precios unitarios;
- descuentos;
- impuestos;
- forma de pago;
- factura completa;
- inventario;
- cuentas por cobrar;
- detalle completo del pedido.

## 2.1 Función de esta app

Esta app debe responder principalmente:

- ¿qué gestión originó el pedido/venta?;
- ¿qué cliente fue?;
- ¿quién lo originó?;
- ¿qué Gestor lo procesó?;
- ¿por qué canal se produjo?;
- ¿se confirmó o no?;
- ¿cuál fue el monto confirmado?;
- ¿cuánto tiempo tomó el traspaso/procesamiento?;
- ¿qué actividad estuvo relacionada con el cierre?.

## 2.2 Digitación mínima recomendada

### Vendedor

Al cerrar una visita o registrar una interacción:

```text
¿Esta gestión generó un pedido?
- Sí
- No
- Pendiente / seguimiento
```

Si selecciona Sí, la app crea la solicitud y la asigna al Gestor correspondiente usando los datos ya conocidos.

Observación opcional, solo si hace falta contexto.

### Gestor

Después de procesar el pedido en el sistema externo:

```text
Resultado:
- Venta confirmada
- No concretada
- Cancelada
- Pendiente

Monto confirmado: RD$ ______
Referencia externa: opcional
Observación: opcional
```

No volver a pedir datos que ya conoce la app.

---

# 3. Nuevo concepto funcional: Pedidos / Ventas

No colocar la gestión formal de ventas dentro de Cobertura cartera.

Se recomienda un módulo propio dentro de **Gestión**:

```text
Cobertura cartera
Visitas
Llamadas
Pedidos / Ventas   <- nuevo
Agenda / Showroom
Recepción
```

## 3.1 Objetivo

Crear una bandeja de trazabilidad comercial, no un ERP.

Estados conceptuales mínimos:

```text
PENDIENTE_GESTOR
EN_PROCESO
CONFIRMADA
NO_CONCRETADA
CANCELADA
```

## 3.2 Datos mínimos conceptuales

Entidad propuesta, nombre técnico por definir al implementar:

```text
commercial_sales / commercial_orders
- id
- client_id
- source_type
- source_id
- origin_channel
- originated_by_employee_id
- processed_by_employee_id
- status
- amount
- confirmed_at
- external_reference (opcional)
- notes (opcional)
- created_at / updated_at
```

Antes de crear tabla real se debe revisar el esquema actual y elegir el diseño incremental más seguro.

## 3.3 Canales/orígenes iniciales

- `VISITA_PLANIFICADA`
- `VISITA_ADICIONAL`
- `JORNADA_LIBRE`
- `LLAMADA_ENTRANTE_CLIENTE`
- `LLAMADA_SALIENTE_VENDEDOR`
- `LLAMADA_SALIENTE_GESTOR`
- `SHOWROOM`
- `OTRO`

En pantalla usar nombres amigables.

## 3.4 Dirección de llamadas

El módulo Llamadas debe distinguir:

- Entrante.
- Saliente.

No asumir que `COMPRO` equivale por sí solo a una venta monetaria confirmada.

---

# 4. Nomenclatura gerencial de ventas

La etiqueta actual **Compras** es ambigua desde la perspectiva de Karaka.

Cambios recomendados:

- `Compras` -> **Clientes que compraron** o **Pedidos confirmados**, según contexto.
- `Ventas` -> **Monto vendido**.

En gráficos compactos puede usarse `Compraron`.

En reportería:

```text
Clientes con venta
Pedidos confirmados
Monto vendido total
Monto por origen
```

Separar, cuando haya información:

- Calle / visita planificada.
- Calle / visita adicional.
- Showroom.
- Llamada entrante.
- Llamada saliente Vendedor.
- Llamada saliente Gestor.

---

# 5. Rutas planificadas + visitas adicionales

## 5.1 Regla principal corregida

**Tener una ruta planificada NO bloquea al Vendedor para atender otros clientes el mismo día.**

Una ruta define el compromiso/plan original, pero la realidad comercial puede requerir desvíos.

Ejemplos válidos:

- un cliente llama y solicita visita;
- se detecta una oportunidad comercial;
- seguimiento urgente;
- cliente no incluido en el plan necesita atención.

## 5.2 Visita adicional dentro de ruta activa

Si ya existe una `route_session` activa:

- NO crear una segunda jornada;
- asociar la visita adicional a la misma sesión;
- `planned = false`;
- sin `route_stop_id` del plan original;
- mantener `client_id`, `employee_id`, GPS y timestamps normales;
- guardar motivo/origen de visita adicional con el mínimo esfuerzo posible.

Motivos amigables sugeridos:

- Solicitud del cliente.
- Oportunidad detectada.
- Seguimiento.
- Prioridad comercial.
- Otro.

## 5.3 Cliente fuera de la planificación

El Vendedor debe poder buscar y gestionar otro cliente permitido por sus permisos, aunque no figure en las paradas del plan.

Esto **no cambia automáticamente la asignación de cartera** del cliente.

## 5.4 KPI correcto

Ejemplo:

```text
Planificados: 10
Visitados del plan: 8
Visitas adicionales: 3
Total visitas: 11
Cobertura del plan: 80 %
```

Nunca mostrar 110 % de cobertura.

Visitas adicionales suman a productividad/actividad, pero no alteran el denominador del plan.

---

# 6. Jornada Libre

La lógica ya existe parcialmente en V0.6.4 y debe reforzarse/normalizarse.

## 6.1 Cuándo usarla

Cuando el Vendedor sale a gestionar clientes sin una ruta formal planificada.

La Jornada Libre crea una sesión operacional y permite seleccionar clientes según necesidad.

## 6.2 Regla importante

Una ruta planificada NO impide realizar visitas adicionales dentro de esa ruta.

Por tanto no se debe forzar al Vendedor a elegir entre "ruta" o "gestión adicional" como opciones excluyentes.

- Con ruta activa: adicionales se unen a la misma sesión.
- Sin ruta: Jornada Libre.

## 6.3 Mismo formulario

Visita planificada y no planificada deben usar el mismo formulario de llegada/salida y cierre.

Al implementar, conviene extraer el formulario actual a un componente compartido para evitar divergencias futuras.

---

# 7. Acceso rápido desde Rutas

Dentro de una ruta activa agregar acción visible:

**+ Visita adicional**

Flujo:

1. Buscar cliente.
2. Mostrar Vendedor y Gestor responsables.
3. Elegir motivo mínimo si aplica.
4. Navegar / registrar llegada.
5. Abrir la misma visita estándar.
6. Al finalizar, regresar a la jornada activa.

También pueden existir accesos desde Clientes, Cobertura y Mapa, pero todos deben detectar la sesión activa y reutilizarla.

---

# 8. Histórico de Planificaciones

Los datos de `route_plans` históricos existen; falta una UX dedicada.

## 8.1 Planificación

Agregar vistas:

```text
Nueva planificación | Histórico
```

## 8.2 Filtros históricos

- Desde / Hasta.
- Vendedor.
- Estado.
- Tipo de cliente.
- Tipo de plan.

## 8.3 Resumen histórico sugerido

| Fecha | Vendedor | Planificados | Visitados plan | Adicionales | No realizadas | Reprogramadas | Cobertura | Estado |
|---|---|---:|---:|---:|---:|---:|---:|---|

Al abrir una planificación histórica mostrar:

- mapa;
- secuencia original;
- secuencia ejecutada;
- resultados;
- cobertura;
- cierre;
- eventualidades;
- distancia GPS estimada;
- ventas/pedidos originados cuando V0.6.5 esté disponible.

Función opcional útil:

**Duplicar planificación** a una nueva fecha sin reconstruir cliente por cliente.

---

# 9. Detalle de recorrido por jornada/ruta

Agregar en Rutas un botón profesional:

**Detalle de recorrido**

Preferiblemente abre una pantalla independiente, no un modal pequeño.

## 9.1 Qué puede reconstruirse realmente

Puntos ya disponibles o previstos por eventos:

- inicio de sesión de ruta/jornada;
- llegada a visita;
- salida de visita;
- visita adicional;
- eventualidad con GPS si existe;
- cierre de jornada.

No existe GPS continuo.

## 9.2 Lenguaje obligatorio

Usar:

- **Punto de inicio de jornada registrado**.
- **Trayectoria estimada entre puntos GPS registrados**.
- **Distancia GPS estimada**.

NO usar:

- casa del vendedor;
- recorrido real exacto;
- odómetro;
- ruta vial real.

Si el Vendedor inicia la jornada al salir de su casa, el punto coincidirá con ese lugar por operación real, pero la app no debe etiquetarlo como domicilio.

## 9.3 Pantalla propuesta

Cabecera:

- Vendedor.
- fecha.
- inicio.
- fin / en curso.
- planificados.
- visitados del plan.
- adicionales.
- total visitas.
- cobertura plan.
- distancia GPS estimada.

Mapa grande con eventos numerados.

Cronología lateral clicable.

Pestañas:

- **Recorrido ejecutado**.
- **Plan original**.

## 9.4 Trayectoria

Dibujar línea segmentada/direccional entre eventos, con leyenda visible:

> Trayectoria estimada entre puntos GPS registrados. No representa el recorrido vial exacto del vehículo.

## 9.5 Distancias

Mostrar tramos conceptuales:

```text
Inicio -> visita 1
visita 1 -> visita 2
visita 2 -> visita adicional
...
última visita -> cierre
```

Distancia geodésica, no vial.

## 9.6 Calidad de trazabilidad

Agregar indicador:

```text
Puntos GPS registrados
Tramos estimados
Inicio GPS sí/no
Visitas con GPS x/y
Cierre GPS sí/no
Calidad: COMPLETA POR EVENTOS / PARCIAL
```

---

# 10. Iconografía empresarial de estados

No utilizar únicamente círculos rojo/azul/verde como semáforo.

La forma/icono debe comunicar el estado incluso sin color.

Usar SVG/iconografía consistente (por ejemplo Lucide o equivalente integrado en React), evitando imágenes raster innecesarias.

## 10.1 Estados

### Pendiente

Concepto visual: `MapPin + Clock`.

- tarjeta/fondo normal;
- badge `PENDIENTE`;
- color secundario de apoyo, no señal única.

### En visita

Concepto visual: `MapPin` + actividad/persona.

- anillo/pulso discreto profesional;
- etiqueta fuerte `EN VISITA`;
- debe destacar inmediatamente.

### Gestionado / Visitado

Concepto visual: `MapPinCheck` o `BadgeCheck`.

- check profesional grande;
- fondo verde muy suave;
- borde/acento lateral;
- texto `GESTIONADO`;
- hora de cierre si aplica.

### No realizada

Concepto visual: `MapPinOff` / `LocationOff`.

- etiqueta preferida `NO REALIZADA`;
- mostrar motivo.

### Reprogramado

Concepto visual: `CalendarClock` / `CalendarSync`.

- mostrar nueva fecha cuando exista.

### Visita adicional

Concepto visual: `MapPinPlus`.

- badge `ADICIONAL`;
- mostrar motivo/origen de la visita.

### Inicio / fin / eventualidad

- Inicio: `Navigation` / `MapPinned`.
- Fin: `Flag` / `CircleStop`.
- Eventualidad: `TriangleAlert` con lenguaje visual distinto a una parada.

## 10.2 Consistencia transversal

La misma semántica visual debe utilizarse en:

- Rutas — lista lateral.
- Rutas — mapa.
- Detalle de recorrido.
- Histórico.
- Visitas.
- Cobertura cuando muestre actividad.

---

# 11. Cobertura cartera — actividad vs meta

Mantener dos dimensiones independientes.

## Actividad

- Gestionado hoy.
- Gestionado este mes.
- No gestionado / nunca gestionado.

## Cumplimiento de meta

- Cumplido.
- Pendiente.
- Sin meta.

Un cliente puede estar:

```text
Actividad: GESTIONADO HOY
Meta: SIN META
```

No redefinir `CUMPLIDO` como "tuvo una gestión", porque rompería frecuencias mayores a 1.

Cobertura no debe convertirse en el módulo principal de Pedidos/Ventas.

---

# 12. Rediseño del módulo Visitas

La pantalla actual es demasiado plana y muestra histórico mezclado con poco filtrado.

## 12.1 Comportamiento por defecto

Abrir en **Hoy**.

Accesos rápidos:

- Hoy.
- Ayer.
- 7 días.
- Rango personalizado.

## 12.2 Filtros

- Buscar cliente/código.
- Fecha/rango.
- Vendedor.
- Tipo CADENA/REGULAR.
- Planificada / adicional / Jornada Libre.
- Recibido / no recibido.
- Resultado.
- Con pedido / sin pedido.

## 12.3 KPI sugeridos

- Visitas del período.
- Clientes recibieron.
- No recibidos.
- Atención total.
- Promedio por visita.
- Planificadas.
- Adicionales.
- Pedidos generados.
- Monto confirmado, cuando exista el nuevo flujo comercial.

## 12.4 Tarjetas/tabla

Mostrar claramente:

- cliente;
- Vendedor;
- Gestor;
- fecha/hora;
- duración;
- origen de visita;
- estado visual profesional;
- resultado;
- pedido generado sí/no;
- monto confirmado si aplica.

Permitir abrir detalle completo.

---

# 13. Optimización de Mapa y Planificación

Se confirmó percepción de lentitud y existen causas concretas.

Actualmente Mapa/Planificación cargan varias fuentes grandes y repetidas:

- clientes paginados;
- empleados;
- territorios/zonas;
- diagnósticos geográficos;
- directorio de 593 áreas oficiales;
- geometrías bajo demanda.

## 13.1 Objetivos de V0.6.5

- reducir tiempo de reacción de filtros;
- mostrar feedback inmediato al activar límites;
- evitar volver a descargar datos estables dentro de la misma sesión;
- evitar regenerar más capas de las necesarias;
- conservar Supabase como fuente real.

## 13.2 Cache de lectura en memoria

Evaluar cache compartida temporal para:

- directorio de áreas oficiales;
- empleados;
- geo assessments;
- geometrías oficiales ya consultadas.

No convertir `localStorage` en fuente de verdad operacional.

## 13.3 Geometrías

Mantener directorio ligero sin geometría al inicio, pero:

- cachear cada geometría una vez descargada;
- prefetch de jerarquía/área seleccionada cuando aporte valor;
- mostrar `Cargando límite...` inmediatamente;
- no repetir consultas para el mismo `area_id`.

## 13.4 Límites oficiales

El WMS externo de IDERD puede presentar latencia.

Evaluar servir/renderizar primero geometrías simplificadas disponibles en Supabase para respuesta inmediata, dejando WMS como referencia/fallback cuando sea apropiado.

No alterar la fuente oficial o la lógica geográfica sin validación.

## 13.5 Render de clientes

Revisar:

- reconstrucción completa de capas al filtrar;
- clustering/bucketing actual;
- memoización;
- actualización incremental cuando sea posible;
- evitar `fitBounds` innecesario que produzca sensación de salto/lentitud.

---

# 14. Reportes V0.6.5

La reportería debe separar al menos:

## Planificación

- Planificados.
- Visitados del plan.
- Cobertura real.
- Adicionales.
- Total visitas.

## Comercial

- Pedidos originados.
- Pedidos confirmados.
- Clientes con venta.
- Monto vendido.
- Origen de venta.
- Originado por.
- Procesado por.

## Colaboración Vendedor ↔ Gestor

Permitir futuro análisis:

```text
Vendedor + Gestor
Pedidos originados
Confirmados
Conversión
Monto
Tiempo de traspaso/proceso
```

## Origen

Ejemplo:

```text
Visita planificada
Visita adicional
Jornada libre
Cliente llamó al Vendedor
Vendedor llamó al cliente
Gestor llamó al cliente
Showroom
```

---

# 15. Prioridad de implementación recomendada

No ejecutar todo de forma desordenada.

Orden sugerido:

1. Crear rama funcional desde `main` estable.
2. Auditar esquema Supabase afectado antes de DDL.
3. Diseñar migración incremental de Pedidos/Ventas y campos mínimos relacionados.
4. Unificar/formalizar formulario de visita compartido.
5. Visita adicional dentro de ruta activa.
6. Jornada Libre integrada y coherente con la misma visita.
7. Nuevo módulo Pedidos / Ventas y bandeja Gestor.
8. Integrar llamadas entrantes/salientes con origen de pedido.
9. Integrar showroom al mismo modelo comercial sin doble digitación.
10. Histórico de Planificación.
11. Detalle de recorrido.
12. Iconografía empresarial transversal.
13. Rediseño Visitas.
14. Cobertura actividad vs meta.
15. Optimización Mapa / Planificación.
16. Dashboard / Reportes / PDF / Excel.
17. Pruebas por rol.
18. Build local + CI.
19. Prueba real controlada con usuario.
20. Merge/deploy solo después de validación.
21. Actualizar documentación y handoff con el estado finalmente implementado.

---

# 16. Pruebas mínimas obligatorias antes de producción

## Ruta planificada

- iniciar ruta;
- visitar parada planificada;
- cerrar visita;
- verificar estado y icono;
- cobertura correcta.

## Visita adicional durante ruta

- ruta activa;
- agregar cliente no planificado;
- registrar llegada/salida;
- no crear segunda sesión;
- no aumentar planificados;
- sumar a total visitas;
- reflejar en detalle recorrido.

## Jornada Libre

- iniciar sin ruta;
- visitar varios clientes;
- mismo formulario;
- cerrar jornada;
- reportes sin cobertura ficticia 0/0 interpretada como rendimiento malo.

## Pedido comercial

- Vendedor genera pedido desde visita planificada;
- Vendedor genera pedido desde adicional;
- llamada entrante genera pedido;
- Gestor recibe;
- confirma monto;
- no se solicitan productos/cantidades/factura duplicada;
- atribución originador/procesador correcta.

## Showroom

- compra showroom alimenta el mismo modelo de trazabilidad comercial sin perder responsable/atendido por.

## Histórico

- ver planificación pasada;
- plan original vs ejecución;
- adicionales visibles;
- finalizadas no pueden reabrirse accidentalmente.

## Recorrido

- inicio;
- visitas;
- adicionales;
- eventualidad;
- cierre;
- línea estimada claramente etiquetada;
- distancia geodésica, no odómetro.

## Mapa

- límites reaccionan con feedback inmediato;
- cambio División oficial no bloquea UI;
- cache no devuelve datos incorrectos;
- filtros y geometrías permanecen coherentes.

---

# 17. Lo que NO se debe hacer

- No convertir la app en ERP/facturación paralela.
- No guardar detalle de artículos solo para replicar el sistema externo.
- No cambiar cartera del cliente porque otro Vendedor lo visite.
- No contar adicionales dentro del denominador de cobertura.
- No crear una nueva jornada para cada adicional.
- No duplicar formulario de visita planificada vs espontánea.
- No presentar línea entre puntos GPS como recorrido vial real.
- No etiquetar el punto inicial como casa del Vendedor.
- No usar únicamente color para comunicar estados.
- No hacer migraciones destructivas ni replay ciego.
- No desplegar V0.6.5 hasta validar flujo completo Vendedor ↔ Gestor.

---

# 18. Pendientes que quedan fuera de la primera tanda

A menos que se decida lo contrario, priorizar operación comercial antes de:

- usuarios conectados/sesiones administrativas;
- recuperación WhatsApp OTP;
- distancia vial por motor de rutas;
- code splitting global más profundo;
- mejoras de seguridad no relacionadas que requieran una auditoría propia.

Estos temas siguen siendo válidos, pero no deben distraer del bloque comercial/rutas de V0.6.5.

---

# 19. Instrucción para un nuevo chat

Antes de continuar desarrollo:

1. Leer `PROJECT_HANDOFF.md` para entender baseline productivo V0.6.4, Supabase, deploy y regresiones conocidas.
2. Leer `docs/REQUIREMENTS_STATUS.md` para ver estado terminado/parcial/pendiente.
3. Leer **este documento completo**: `docs/V065_FUNCTIONAL_DESIGN.md`.
4. Verificar `main` real.
5. Verificar Supabase real antes de crear tablas/migraciones.
6. Verificar producción y versión visible.
7. Explicar al usuario qué se va a modificar antes de ejecutar cambios.

Mensaje sugerido:

> Continúa Gestión de Ventas Diaria del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`. Lee primero `PROJECT_HANDOFF.md`, luego `docs/REQUIREMENTS_STATUS.md` y `docs/V065_FUNCTIONAL_DESIGN.md`. Verifica `main`, Supabase y producción. V0.6.4 es el baseline productivo; V0.6.5 todavía debe implementarse siguiendo el diseño funcional documentado. Antes de cambiar código, resume las reglas de Vendedor/Gestor, visitas adicionales, Pedidos/Ventas, histórico, recorrido e iconografía.

---

# 20. Estado de este documento

**DISEÑO APROBADO PARA CONTINUIDAD DOCUMENTAL, NO IMPLEMENTADO TODAVÍA.**

Cualquier diferencia futura entre este documento y una decisión posterior explícita del usuario debe actualizarse aquí antes de producción.