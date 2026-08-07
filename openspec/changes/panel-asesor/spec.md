# Spec: Panel de Asesor

## Objetivo

Darle al asesor (y al `franchise_admin` de su equipo) una pantalla logueada en `apps/web` para ver sus propiedades, sus leads y métricas básicas — hoy la API ya expone esos datos (`GET /properties/mine`, `GET /leads`) pero no hay ninguna UI que los consuma, ni login en el frontend.

## Alcance Fase 1

- Página de login (`/login`): formulario email + contraseña contra `POST /auth/login` (cookie de sesión `httpOnly`, ya la pone la API).
- Rutas protegidas bajo `/panel`: si no hay sesión válida (`GET /auth/me` devuelve 401), redirige a `/login`.
- `/panel` (dashboard): lista de propiedades propias (`GET /properties/mine`) — título, estado (`draft`/`published`/`paused`/`sold`/`rented`), `viewsCount`, cantidad de leads.
- `/panel/leads`: lista de leads (`GET /leads`) — nombre, teléfono, mensaje, propiedad asociada, fecha.
- Botón de logout (`POST /auth/logout`).
- Un asesor ve solo lo suyo; un `franchise_admin` ve lo de todo su equipo (mismo dato, alcance más amplio) — sin pantallas separadas por rol, la API ya devuelve el conjunto correcto según quién pide.

## Fuera de alcance Fase 1

- Alta y edición de propiedades desde el panel (formulario, carga de media a R2, publicar/pausar/cerrar) — la API ya lo soporta, pero es una pantalla grande aparte (upload de fotos/video). Spec propia cuando toque.
- Métricas agregadas de franquicia (comparativas entre asesores del equipo, totales por período) — Fase 1 es "ver mis leads/propiedades", no un dashboard analítico.
- Panel de Super Admin (aprobar pagos, gestionar paquetes) — spec propia.
- Recuperar contraseña self-service, "recordarme", rate limiting de login — mismo criterio que `auth-roles`, no hay proveedor de email en Fase 1.

## Gap de backend detectado

`GET /properties/mine` (`properties.service.ts:146`) filtra solo por `ownerId` — a diferencia de `GET /leads`, que ya distingue `advisor` (solo lo propio) de `franchise_admin` (todo el equipo, vía `scopeFilter` en `leads.service.ts`). Sin ese ajuste, un `franchise_admin` entra al panel y ve leads del equipo pero propiedades solo suyas — inconsistente. Este spec incluye extender `findMyProperties` con el mismo `scopeFilter` que ya existe en `leads.service.ts` (reusar el patrón, no reinventarlo).

## Reglas de negocio

- Sesión requerida para toda ruta bajo `/panel/*`; sin sesión, redirect a `/login`.
- Alcance de datos por rol (ya resuelto en la API, el panel solo lo consume):
  - `advisor`: sus propias propiedades y leads.
  - `franchise_admin`: propiedades y leads de todo su equipo (mismo `franchiseId`).
  - `super_admin`: no es el foco de este panel (tiene el suyo propio, fuera de alcance) — si entra, ve todo (la API ya lo permite), sin pantalla especial.
- Logout invalida la sesión server-side (ya implementado en `auth.service.ts`) y redirige a `/login`.

## Escenarios

**Login exitoso**
- Given un asesor con cuenta activa
- When ingresa email y contraseña correctos en `/login`
- Then queda logueado y es redirigido a `/panel`

**Acceso sin sesión**
- Given un visitante sin cookie de sesión
- When intenta entrar a `/panel`
- Then es redirigido a `/login`

**Asesor ve sus propiedades y leads**
- Given un asesor dueño de 2 propiedades
- When entra a `/panel`
- Then ve sus 2 propiedades con `viewsCount` y cantidad de leads, no las de otros asesores

**Franquicia ve el panel del equipo**
- Given un `franchise_admin` con 3 asesores en su equipo
- When entra a `/panel`
- Then ve las propiedades y leads de las 3 cuentas del equipo, no solo las propias

**Logout**
- Given un usuario logueado en `/panel`
- When hace clic en "Cerrar sesión"
- Then la sesión se invalida y vuelve a `/login`

## Decisiones confirmadas con Marthin

1. Alta/edición de propiedad y carga de media quedan fuera de este spec — se arranca con el panel de lectura (propiedades, leads, métricas básicas) y la edición es el siguiente módulo, con su propia spec.
2. Se extiende `findMyProperties` para que `franchise_admin` vea el equipo completo, igual que ya hace `GET /leads` (la autorización para *editar* propiedades del equipo ya existía en el módulo de `properties`; esto solo pone el panel de lectura al mismo nivel).
3. Sin panel de métricas agregadas (comparativas por asesor) en Fase 1 — solo listados con sus contadores.
