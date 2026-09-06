# Supabase Transfer — 06/09/2026

## Objetivo

Aislar `Gestion de Ventas Diaria` del exceso de Egress originado por otro proyecto de la organización Supabase anterior, sin recrear infraestructura ni cambiar el frontend.

## Tipo de operación

Se realizó **transferencia del mismo proyecto Supabase a otra organización**.

No fue:

- clone;
- restore;
- proyecto nuevo;
- migración manual de tablas;
- cambio de Project Ref;
- cambio de API URL;
- cambio de Cloudflare.

## Proyecto transferido

- Nombre: `Gestion de Ventas Diaria`.
- Project Ref: `ccvzosnhxitfeochnflr`.
- API base: `https://ccvzosnhxitfeochnflr.supabase.co`.
- Región: AWS `ca-central-1`.
- PostgreSQL observado: `17.6.1.155` durante la auditoría previa.
- Plan destino observado: Free.

Por seguridad no registrar contraseñas, service role keys, secretos, tokens ni credenciales personales en este documento.

## Motivo de la transferencia

El panel Usage de la organización anterior mostraba aproximadamente:

- Egress total de organización: `10.494 GB / 5 GB`.
- `Gestion de Ventas Diaria`: `0.166 GB`.
- Otro proyecto: `10.328 GB`.

Conclusión: el exceso de Egress no era generado por Gestión de Ventas Diaria, pero el Fair Use se evaluaba a nivel de organización y podía impactar a los proyectos de esa organización.

La estrategia elegida fue aislar el proyecto productivo en otra organización Supabase.

## Precondiciones verificadas

- El proyecto no mostraba repositorio GitHub conectado desde Supabase.
- La cuenta que ejecutó la transferencia tenía acceso suficiente a organización origen y destino.
- La organización destino aparecía en el selector `Transfer project`.
- El proyecto origen y destino estaban en plan Free, por lo que no se esperaba pérdida de funciones por bajar de plan.

## Snapshot PRE-transferencia

Consulta read-only registrada inmediatamente antes de transferir:

| Objeto | Conteo |
|---|---:|
| `clients` | 1,997 |
| `employees` | 12 |
| `auth.users` | 8 |
| `route_plans` | 16 |
| `route_stops` | 160 |
| `route_sessions` | 4 |
| `visits` | 11 |
| `calls` | 28 |
| `appointments` | 7 |
| `follow_ups` | 11 |
| `showroom_sessions` | 1 |
| `reception_entries` | 1 |
| `prospects` | 1 |
| `audit_log` | 4,733 |
| `storage.objects` | 2 |

`pg_database_size`: `167865491` bytes.

## Snapshot POST-transferencia

Se repitió la misma consulta read-only después de transferir.

Resultado: **todos los conteos y el tamaño de la base fueron idénticos** al snapshot PRE.

Esto valida que el proyecto no fue recreado parcialmente ni perdió registros en los conjuntos auditados.

## Edge Functions POST-transferencia

Comprobadas ACTIVE:

| Function | Version | verify_jwt |
|---|---:|---|
| `login-by-username` | 2 | false |
| `master-import` | 3 | true |
| `admin-users` | 3 | true |
| `request-password-reset` | 1 | false |
| `verify-password-reset` | 2 | false |

No modificar `verify_jwt` solo por esta transferencia. Algunas funciones públicas implementan flujos de autenticación propios y deben evaluarse por su diseño real antes de cambiar configuración.

## Validación productiva posterior

Se abrió la URL productiva de Cloudflare en incógnito.

Se confirmó:

- login correcto;
- Inicio cargó correctamente;
- conteo visible de clientes: `1997`;
- módulos visibles correctamente;
- versión mostrada: `0.6.5-beta.12.2.8`.

## Cloudflare

No se movió Cloudflare.

La URL continúa:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Esto es correcto porque `workers.dev` depende de la cuenta/subdominio Cloudflare, no del propietario de la organización Supabase.

No existe requisito técnico de usar el mismo correo o nombre de cuenta en Supabase y Cloudflare.

## Frontend

`src/lib/supabase.ts` continúa apuntando al mismo Project Ref/API URL.

Por lo tanto no fue necesario:

- cambiar código;
- cambiar publishable key por la transferencia;
- hacer build;
- hacer deploy Cloudflare.

No rotar claves solo por cambio de organización. Si en el futuro se decide rotarlas por seguridad, tratarlo como cambio separado con QA.

## Usage después del traslado

En la organización destino el panel mostró inicialmente aproximadamente:

- Egress: `0 / 5 GB` en la captura inicial.
- Database Size: `183 / 500 MB`.
- File storage: cercano a cero.

Los contadores de Usage pueden tardar en actualizar y aumentarán con operación real. Revisar:

1. antes del Go-Live;
2. al final del primer día;
3. diariamente durante la primera semana;
4. si aparece cualquier banner de Fair Use.

## Reglas posteriores

- Mantener temporalmente dos Owners durante la ventana de Go-Live para evitar bloqueo administrativo accidental.
- No eliminar la organización anterior como consecuencia automática de esta transferencia.
- No eliminar el otro proyecto hasta saber qué función cumple y contar con respaldo.
- No crear un segundo proyecto `Gestion de Ventas Diaria` innecesariamente.
- No cambiar Cloudflare por razones de correo/propiedad de Supabase.

## Criterio de éxito

La transferencia se considera técnicamente exitosa porque:

- el proyecto aparece en la organización destino;
- conserva Project Ref;
- conserva tamaño de base;
- conserva conteos críticos;
- conserva Auth users;
- conserva Storage objects;
- conserva Edge Functions ACTIVE;
- producción continúa autenticando y leyendo datos desde Cloudflare.

## Estado

**TRANSFERENCIA VALIDADA — 06/09/2026.**

No equivale a declaración de Go-Live de negocio. Los registros operativos siguen siendo TEST hasta declaración explícita del usuario.
