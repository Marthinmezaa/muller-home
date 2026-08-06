# Spec: Leads (CRM básico)

## Objetivo

Capturar el interés de un visitante en una propiedad publicada — sin perder el flujo de WhatsApp que ya usa el asesor — y darle al asesor/franquicia/super admin un panel mínimo para ver esos leads y cuántas vistas tuvo cada propiedad.

## Alcance Fase 1

- Entidad `leads`: `propertyId`, `name`, `phone`, `email` (opcional), `message`, timestamps.
- Formulario de contacto en la ficha pública (`/propiedades/[id]`): nombre, teléfono, mensaje (email opcional). Al enviar:
  1. Se crea el `lead` vía `POST /properties/:id/leads` (público, sin login).
  2. El frontend abre WhatsApp (`wa.me/<telefono del asesor>?text=<mensaje precargado>`) con los datos del formulario, mismo patrón que el botón de WhatsApp que ya existe.
- Contador de vistas: columna `viewsCount` en `properties`, incrementada en cada `GET /properties/:id` (ficha pública). Sin serie temporal ni distinción de visitante único — solo el total.
- Panel de leads: `GET /properties/:id/leads` (dueño, `franchise_admin` del mismo equipo, o `super_admin`) lista los leads de esa propiedad. `GET /leads` devuelve los leads de todas las propiedades del asesor (o del equipo, si es `franchise_admin`/`super_admin`) — mismo criterio de alcance que `findMyProperties`.

## Fuera de alcance Fase 1

- Notificación automática al asesor cuando entra un lead (no hay proveedor de email/push, mismo criterio que el resto del proyecto) — el asesor se entera por WhatsApp cuando el visitante lo contacta, y revisa el panel cuando quiere.
- Series temporales / analytics de vistas (por día, por fuente, etc.) — solo el total acumulado.
- Deduplicación de vistas por visitante único (cookies/sesión) — cada `GET` cuenta, incluido el propio asesor mirando su ficha.
- Estados de seguimiento del lead (contactado / descartado / convertido) — Fase 2 si hace falta CRM más avanzado.
- Anti-spam / rate limiting del formulario — Fase 2 si se vuelve un problema real.

## Reglas de negocio

- Un lead solo se puede crear sobre una propiedad visible públicamente (`published`, o `sold`/`rented` dentro de la ventana de retención) — mismo criterio que expone la ficha pública. Sobre una propiedad `draft`/`paused`/fuera de retención, `404` (no se filtra por estado en un endpoint aparte, se reusa la misma resolución que ya usa `getPropertyDetail`).
- `name`, `phone` y `message` son obligatorios; `email` es opcional.
- Ver los leads de una propiedad requiere ser su `owner`, un `franchise_admin` del mismo equipo, o `super_admin` — mismo criterio de autorización que editar la propiedad.
- El contador de vistas se incrementa en cada acceso a la ficha pública, sin autenticación ni distinción de quién mira.

## Escenarios

**Lead capturado desde el formulario**
- Given una propiedad `published`
- When un visitante completa el formulario y lo envía
- Then se crea un `lead` asociado a la propiedad y el navegador abre WhatsApp con el mensaje precargado

**Lead sobre propiedad no visible**
- Given una propiedad `draft`
- When se intenta crear un lead sobre ella
- Then la operación se rechaza (404)

**Vista incrementa contador**
- Given una propiedad `published` con `viewsCount = 5`
- When se accede a su ficha pública
- Then `viewsCount` pasa a 6

**Asesor ve sus leads**
- Given un asesor dueño de 2 propiedades con leads
- When consulta `GET /leads`
- Then recibe los leads de sus propiedades, no los de otros asesores

**Franquicia ve leads del equipo**
- Given un `franchise_admin` con 3 asesores en su equipo
- When consulta `GET /leads`
- Then recibe los leads de las propiedades de todo el equipo

## Decisiones a confirmar

1. Contacto: formulario propio + apertura de WhatsApp con mensaje precargado (confirmado con Marthin) — no reemplaza WhatsApp como canal de conversación, solo agrega registro en el sistema.
2. Vistas: contador simple acumulado por propiedad, sin serie temporal ni deduplicación por visitante (confirmado, alcance Fase 1 dice "CRM básico").
3. Sin notificación automática de lead nuevo — mismo criterio que el resto del proyecto (Fase 1 no tiene proveedor de email/push).
