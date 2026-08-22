# Edge Functions

Este directorio conserva el código fuente de las funciones ya desplegadas en el proyecto Supabase `Gestion de Ventas Diaria`.

- `login-by-username`: login visible por nick + contraseña y activación segura en primer acceso.
- `master-import`: vista previa y aplicación del maestro `cartera`.
- `admin-users`: administración segura de usuarios/Auth.
- `request-password-reset`: solicitud de OTP por WhatsApp, desactivada hasta configurar Twilio/Twilio Verify.
- `verify-password-reset`: valida OTP y cambia la contraseña.

Las funciones usan secretos administrados por Supabase en runtime. Nunca se deben guardar secret keys o `service_role` en el repositorio.

Antes de producción, sustituir CORS `*` por el dominio definitivo de Cloudflare.
