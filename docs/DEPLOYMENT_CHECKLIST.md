# Checklist de publicación — Gestion de Ventas Diaria

## 1. Supabase — listo

- Proyecto remoto: `Gestion de Ventas Diaria`.
- Esquema operativo, RLS, PostGIS, Storage privado, catálogos y vistas de dashboard creados.
- 11 perfiles de empleados cargados.
- Login por nick + contraseña preparado con activación segura en el primer acceso.
- Las claves iniciales no se almacenan en texto plano en tablas de negocio.
- Importador `master-import` activo con modo vista previa / aplicar.
- Recuperación por WhatsApp implementada pero desactivada hasta configurar Twilio/Twilio Verify.
- La hoja `Hoja2` está excluida explícitamente.

## 2. GitHub — pendiente de publicación del código

Repositorio destino:

`jjriosjose/Gestion_de_Ventas_Diaria`

Antes de subir:

- No incluir el Excel maestro.
- No incluir archivos de clientes, teléfonos o claves.
- No incluir `.env` privado ni secretos Supabase.
- La publishable key de Supabase sí puede estar en el frontend; RLS protege el acceso.

Contenido a publicar: la carpeta fuente de este paquete v0.2.

## 3. Cloudflare

La cuenta ya está vinculada con GitHub. Una vez que el repositorio contenga el código:

1. Cloudflare → **Create app**.
2. Elegir Workers / conexión GitHub.
3. Seleccionar `jjriosjose/Gestion_de_Ventas_Diaria`.
4. Rama de producción: `main`.
5. Build command: `npm run build`.
6. Desplegar.
7. Anotar el dominio `*.workers.dev` asignado o conectar un dominio propio.
8. Después del dominio definitivo, restringir el CORS de las Edge Functions de Supabase a ese origen.

## 4. Primer ingreso

1. Abrir la URL publicada.
2. Ingresar con el nick y la clave inicial de uno de los administradores del maestro.
3. En el primer acceso la cuenta Auth se crea y se vincula automáticamente al perfil del empleado.
4. Cambiar la contraseña desde Configuración si se desea.

## 5. Primera carga oficial de cartera

1. Administración → **Importar cartera**.
2. Seleccionar `Base Cartera(2).xlsx` o el maestro vigente.
3. La aplicación procesa solamente la hoja `cartera` para este flujo.
4. `Hoja2` no se utiliza.
5. Revisar la vista previa:
   - total
   - registros válidos
   - nuevos
   - actualizaciones
   - sin cambios
   - georreferenciados
   - errores
6. Aplicar únicamente si la vista previa es correcta.
7. Confirmar en Dashboard / Clientes que la cartera se visualiza correctamente.

## 6. Piloto funcional

Validar en al menos:

- PC Windows / Chrome o Edge.
- Tablet Android o iPad.
- Teléfono Android.
- iPhone si será parte del uso real.

Pruebas mínimas:

- Login / cierre de sesión.
- Consulta y edición autorizada de cliente.
- Abrir navegación Google Maps.
- Inicio y fin de ruta con GPS.
- Inicio y fin de visita con GPS.
- Registro de resultado de visita.
- Captación de prospecto con cámara / galería.
- Guardado de fotos privadas.
- Llamada y cita de showroom.
- Planificación de ruta.
- Zona de captación dibujada en mapa.
- Dashboard diario global y por empleado.
- Exportación XLSX y PDF.

## 7. WhatsApp para recuperación de contraseña — posterior

Para activar el botón real de recuperación se requiere:

- Cuenta Twilio o Twilio Verify.
- WhatsApp sender aprobado/configurado.
- Configurar el proveedor Phone/WhatsApp en Supabase Auth.
- Activar `auth.recovery_enabled = true` después de probar el envío y validación OTP.

Hasta entonces el login normal por nick + contraseña funciona y la recuperación mostrará que el canal aún no está habilitado.

## 8. Salida a producción

Antes del corte:

- Completar piloto.
- Corregir incidencias.
- Definir dominio final.
- Restringir CORS.
- Verificar Security Advisor de Supabase.
- Confirmar backups del proyecto Supabase.
- Confirmar que Excel/PDF funcionan con filtros reales.
- Comunicar fecha de inicio oficial.

A partir del corte, Gestion de Ventas Diaria será la única fuente operacional nueva. El sistema anterior queda únicamente como consulta histórica.


## Activación de calidad geográfica v0.3

Después del primer despliegue y la carga de cartera:

1. Cargar límites oficiales de Región/Provincia/Municipio en `administrative_areas`.
2. Verificar desde **Calidad geográfica** que el contador de áreas sea mayor que cero.
3. Realizar visitas piloto con GPS.
4. Revisar diferencias antes de aprobar cambios de maestro.
5. Mantener corrección automática desactivada durante el piloto.
