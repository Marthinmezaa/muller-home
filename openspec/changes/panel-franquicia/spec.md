# Spec: Panel de Admin de Franquicia

## Objetivo

Darle al `franchise_admin` una pantalla en `apps/web` para gestionar su equipo (ver asesores, invitar) y resolver las solicitudes de baja de propiedad pendientes — hoy la API ya expone `POST /auth/franchise/invite` y `PATCH /properties/deletion-requests/:id/approve|reject`, pero no hay ninguna UI que los use, ni endpoints de listado para saber qué invitar/aprobar, ni pantalla donde el asesor invitado aterrice.

## Alcance Fase 1

- `/panel/equipo`: lista de asesores del equipo (nombre, email, cantidad de propiedades) vía nuevo `GET /auth/franchise/members`. Botón "Invitar asesor" que llama `POST /auth/franchise/invite` (ya existe) y muestra el link (`{WEB_URL}/aceptar-invitacion?token=...`) para copiar y compartir a mano — mismo criterio que el resto de invitaciones en Fase 1, sin envío de email.
- `/aceptar-invitacion`: página pública, lee `token` de la query string, formulario de registro (nombre, email, contraseña) que llama `POST /auth/accept-invite` (ya existe). Sin esta página el link que genera `/panel/equipo` no tiene dónde aterrizar.
- `/panel/bajas`: lista de solicitudes de baja pendientes del equipo vía nuevo `GET /properties/deletion-requests`, con botones aprobar/rechazar contra `PATCH /properties/deletion-requests/:id/approve` y `/reject` (ya existen).
- `/panel/equipo` y `/panel/bajas` solo visibles/accesibles si `role === 'franchise_admin'` (gate client-side en `panel/layout.tsx`, mismo patrón ya usado; la autorización real la siguen haciendo los guards de la API).

## Fuera de alcance Fase 1

- Métricas agregadas de franquicia (comparativas por asesor, totales por período) — ya estaba fuera de alcance en `panel-asesor`, se mantiene.
- Panel de Super Admin (aprobar pagos de paquetes, gestión de catálogo) — spec propia, pendiente.
- Revocar invitaciones sin usar o reenviar/expirar manualmente — el token ya expira solo (`INVITE_TTL_MS`), sin pedido de gestión adicional.
- Sacar a un asesor del equipo (borrar cuenta, transferir sus propiedades) — sin pedido, no se inventa.

## Gaps de backend detectados (a resolver en este cambio)

1. No existe `GET /auth/franchise/members` — el `franchise_admin` no tiene forma de listar su equipo. Se agrega en `auth.controller.ts`/`auth.service.ts`, guard `@Roles(Role.FRANCHISE_ADMIN)`, filtra `users` por `franchiseId` igual al del caller.
2. No existe `GET /properties/deletion-requests` — no hay forma de listar las solicitudes pendientes para poder aprobarlas/rechazarlas desde una UI (hoy solo se podría operar con el `id` a mano). Se agrega en `properties.controller.ts`/`properties.service.ts`, reusando el mismo `scopeFilter` que ya filtra por equipo. Guard `@Roles(Role.FRANCHISE_ADMIN, Role.SUPER_ADMIN)`.
3. No existe ninguna página en `apps/web` que consuma `POST /auth/accept-invite` — el flujo de invitación está incompleto de punta a punta (la API lo soporta desde `auth-roles`, nunca se construyó el frontend). Se agrega `/aceptar-invitacion`.

## Reglas de negocio

- Sesión requerida y rol `franchise_admin` para `/panel/equipo` y `/panel/bajas`.
- `GET /auth/franchise/members` y `GET /properties/deletion-requests`: alcance limitado al `franchiseId` del caller (mismo patrón de `scopeFilter` ya usado en `properties.service.ts`/`leads.service.ts`); si un `super_admin` llama al endpoint directo lo puede ver todo, pero no tiene pantalla propia acá (fuera de alcance).
- Aprobar una solicitud de baja borra la propiedad (cascade a media y otras solicitudes) — comportamiento ya implementado, el panel solo dispara la acción.
- El dueño de la propiedad no puede aprobar su propia solicitud — regla ya existente, no se toca.
- Invitación: el link generado incluye el token en query string, expira según `INVITE_TTL_MS`, y crea la cuenta con rol `advisor` en el `franchiseId` de quien invitó — comportamiento ya implementado en `acceptInvite`.

## Escenarios

**Franquicia ve su equipo**
- Given un `franchise_admin` con 3 asesores en su equipo
- When entra a `/panel/equipo`
- Then ve los 3 asesores con su email y cantidad de propiedades

**Franquicia invita a un asesor**
- Given un `franchise_admin` logueado en `/panel/equipo`
- When hace clic en "Invitar asesor"
- Then se genera un link con token y lo puede copiar

**Asesor acepta la invitación**
- Given un link de invitación válido (no expirado)
- When el invitado completa el formulario en `/aceptar-invitacion`
- Then queda registrado como `advisor` del `franchiseId` del link y logueado

**Franquicia ve solicitudes de baja pendientes**
- Given 2 solicitudes de baja pendientes de propiedades del equipo
- When entra a `/panel/bajas`
- Then ve ambas solicitudes con la propiedad y quién la pidió

**Franquicia aprueba una baja**
- Given una solicitud de baja pendiente
- When hace clic en "Aprobar"
- Then la propiedad se borra y la solicitud desaparece de la lista

**Franquicia rechaza una baja**
- Given una solicitud de baja pendiente
- When hace clic en "Rechazar"
- Then la propiedad sigue existiendo y la solicitud pasa a `rejected`

**Asesor sin rol franquicia no accede**
- Given un usuario con rol `advisor`
- When intenta entrar a `/panel/equipo` o `/panel/bajas`
- Then no ve el link a esas pantallas en el panel

## Decisiones confirmadas con Marthin

1. Se agregan los dos endpoints de listado (`GET /auth/franchise/members`, `GET /properties/deletion-requests`) como parte de este cambio — sin ellos el panel no tiene qué mostrar, mismo criterio que los gaps detectados en specs anteriores (`panel-asesor`, `alta-edicion-propiedad`).
2. Se agrega `/aceptar-invitacion` en este cambio — es el eslabón que faltaba para que "invitar asesor" funcione de punta a punta; no tiene sentido dar de alta el botón de invitar sin la página que recibe el token.
3. Métricas agregadas y panel de Super Admin quedan afuera, sin fecha definida — se retoma cuando haga falta.
