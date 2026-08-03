# Spec: Autenticación y Roles

## Objetivo

Login/registro y autorización por rol para los 3 roles con cuenta (asesor, admin de franquicia, super admin). El visitante navega el portal público sin cuenta.

## Alcance Fase 1

- Registro de asesor (self-service, rol `advisor` por defecto).
- Login / logout con sesión persistente.
- Cambio de contraseña (usuario logueado).
- Reset de contraseña: lo hace el Super Admin manualmente desde su panel (genera una temporal). Sin self-service por email.
- Middleware de autorización por rol en cada endpoint del backend.
- Admin de Franquicia invita asesores a su equipo por email; el invitado completa su registro con `franchise_id` ya asignado.
- Promoción automática a `franchise_admin`: ocurre cuando se aprueba un `package_purchase` de un paquete con `max_advisors > 1`.
- Super Admin: cuenta creada por seed/script, sin registro público.

## Fuera de alcance Fase 1

- Login social (Google, etc.)
- 2FA
- Reset de contraseña self-service por email (requiere elegir proveedor de email — Fase 2)
- Verificación de email obligatoria para poder loguearse

## Mecanismo de autenticación (propuesta)

Sesión server-side: cookie `httpOnly`, `SameSite=Lax`, store de sesión en Postgres (`connect-pg-simple` o equivalente — reutiliza la infra que ya tenemos, sin sumar Redis solo para esto).

Justificación: frontend (Next.js) y API (Express) se sirven detrás del mismo dominio en el VPS, así que no hace falta manejar refresh tokens ni guardar nada sensible en el cliente. Si en el futuro aparece un consumidor externo (app mobile nativa, terceros), ahí se evalúa JWT.

Hashing de contraseña: bcrypt (`bcryptjs`), cost factor 12.

## Reglas de autorización por rol

- **advisor**: CRUD sobre sus propias `properties`, ver sus `leads`, ver sus `package_purchases`.
- **franchise_admin**: todo lo de `advisor` + alta y listado de asesores de su franquicia, métricas agregadas del equipo, compra de paquetes para la franquicia.
- **super_admin**: gestión de `packages`/precios, aprobar/rechazar `package_purchases`, métricas globales, acceso total.

## Escenarios

**Registro de asesor**
- Given un visitante sin cuenta
- When se registra con email + contraseña
- Then se crea un `user` con `role=advisor`, sin `franchise_id`, y queda logueado

**Login con credenciales inválidas**
- Given un email que puede existir o no
- When intenta loguearse con contraseña incorrecta
- Then responde 401 genérico (no revela si el email existe)

**Acceso sin permiso de rol**
- Given un `advisor` autenticado
- When llama a un endpoint reservado a `super_admin`
- Then responde 403

**Promoción a Admin de Franquicia**
- Given un `advisor` con un `package_purchase` pendiente de un paquete con `max_advisors > 1`
- When el Super Admin aprueba esa compra
- Then el `role` del comprador pasa a `franchise_admin`

**Invitación de asesor a franquicia**
- Given un `franchise_admin` autenticado
- When invita a un asesor por email a su equipo
- Then se crea (o vincula) el `user` invitado con `franchise_id` seteado y `role=advisor`, sin necesidad de comprar paquete propio

## Decisiones abiertas — necesitan tu aprobación

1. Sesión con cookie + store en Postgres, no JWT.
2. Reset de contraseña diferido a Fase 2; en Fase 1 lo resuelve el Super Admin manualmente.
3. Promoción a `franchise_admin` automática al aprobarse el paquete (no es una asignación manual del Super Admin).
