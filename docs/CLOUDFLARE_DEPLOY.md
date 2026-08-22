# Despliegue Cloudflare

El proyecto está preparado para Cloudflare Workers + Static Assets mediante `@cloudflare/vite-plugin` y `wrangler.jsonc`.

Flujo recomendado:

1. El código vive en el repositorio GitHub `jjriosjose/Gestion_de_Ventas_Diaria`.
2. En Cloudflare: **Create app** / Workers Builds / conectar repositorio GitHub.
3. Seleccionar el repositorio y rama `main` cuando la versión haya sido aprobada.
4. Build command: `npm run build`.
5. Cloudflare ejecuta el despliegue al recibir cambios del repositorio.
6. Agregar dominio personalizado cuando se defina.

No se necesita Cloudflare D1 ni Worker API para los datos: Supabase es el backend central.
