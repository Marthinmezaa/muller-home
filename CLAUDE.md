# Muller Home

Plataforma inmobiliaria multi-rol para Muller Producciones (fotografía/video con drone para propiedades).

## Metodología

- Spec-Driven Development (filosofía Gentle-AI, sin el plugin): spec en `openspec/` aprobada antes de escribir código de cada módulo.
- Ponytail (YAGNI real, nivel `full`): antes de escribir una función, ¿hace falta? ¿la stdlib lo resuelve? ¿una dependencia ya instalada? ¿una línea? Recién ahí, la mínima solución. Sin sacrificar seguridad, manejo de errores ni accesibilidad.
- Clean code: nombres descriptivos, funciones cortas, sin duplicación, comentarios solo donde el código no se explica solo.

## Git / GitHub

- Nunca commitear directo a `main`. Ramas: `feature/<módulo>`, `fix/<lo-que-sea>`.
- `main` protegida: solo Marthin aprueba y mergea PRs.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`...) con la **descripción en castellano** (el tipo se mantiene en inglés porque release-please lo parsea).
- release-please (`.github/workflows/release-please.yml`) versiona automáticamente a partir de los commits.
- devsecops.yml: CodeQL + secret scanning (gitleaks) en cada push/PR a `main`.
- Repo remoto: https://github.com/Marthinmezaa/muller-home.git

## Stack

- Monorepo con npm workspaces (`apps/*`, `packages/*`) — sin Nx/Turborepo hasta que haga falta.
- Backend: Node.js + NestJS + TypeScript. Decisión confirmada con Marthin: dado el objetivo de escalar a plataforma grande (no solo el MVP), los guards/decorators de Nest (`@Roles()`, `RolesGuard`) resuelven el RBAC de 3 roles con menos boilerplate que middlewares a mano en Express, y la estructura de módulos calza con Clean/Hexagonal Architecture sin armarla manualmente.
- Frontend: Next.js + TypeScript + Tailwind CSS (SEO real para fichas de propiedad + optimización de imágenes/video de drone). Decisión no discutida explícitamente con Marthin, es el default razonable — avisar si prefiere otra cosa.
- DB: PostgreSQL. Dev: Neon (serverless, sin Docker). `infra/docker-compose.yml` queda como alternativa local si hace falta. Producción: Postgres propio en el VPS.
- Storage: Cloudflare R2 (API S3) para fotos/video del "locker" de cada asesor.
- Infra producción (futuro): VPS Hostinger, plan KVM 2.

## Roles

1. Visitante — navega, busca, filtra, contacta al asesor (sin login).
2. Asesor individual — compra paquete, publica propiedad, carga material a su locker (R2), ve sus métricas.
3. Admin de Franquicia — compra paquete multi-asesor, da de alta a su equipo, ve métricas agregadas.
4. Super Admin (Muller Producciones) — gestiona paquetes/precios, aprueba pagos, ve métricas globales.

## Modelo de datos (borrador aprobado, Fase 1)

Entidades: `users`, `franchises`, `packages`, `package_purchases`, `properties`, `property_media`, `leads`.

Reglas clave:

- Paquetes: `billing_type` (`one_time` | `monthly`). `one_time` = 1 propiedad. `monthly` = 5 propiedades + 5 producciones.
- Sin motor de suscripción/renovación automática en Fase 1 (aprobación manual por transferencia): "mensual" es comprar de nuevo cada mes → nueva fila en `package_purchases` con su propio cupo.
- `productions_quota` es dato comercial sin tabla de seguimiento (coordinación de producción Fase 1 = link a WhatsApp, sin agenda en el sistema).
- **Confirmado con Marthin:** en franquicia, el cupo de `properties_quota` es compartido por todo el equipo desde la compra del Admin de Franquicia (cada propiedad de cualquier asesor del equipo descuenta del mismo `package_purchase`).

## Identidad visual (provisoria)

Marca actual de Muller Producciones — base para Muller Home hasta que se defina la identidad visual definitiva (Fase 2). Assets en `docs/brand/`.

- Logo: búho (`docs/brand/logo.jpeg`), líneas navy sobre blanco, ojos amarillos.
- Paleta (aproximada a partir de `docs/brand/paleta-referencia.jpeg`, pedir el código exacto si hace falta pixel-perfect): gris claro `#F2F2F2`, amarillo/dorado `#F5C518`, negro `#1A1A1A`, azul navy `#3B3A72`.
- Tipografía del isotipo: sans-serif redondeada.

## Alcance Fase 1 (MVP, 1 mes)

Portal público (buscador/filtros/mapa/ficha/contacto), auth + roles, módulo de paquetes (compra → comprobante → aprobación manual → habilita publicación), panel Asesor, panel Admin Franquicia, panel Super Admin, CRM básico (leads + vistas). Coordinación de producción: solo link a WhatsApp.

Fase 2 (post-validación con cliente): pasarela de pago (Bancard/Pagopar), CRM avanzado, agenda de producción en el sistema, identidad visual definitiva.

Plazos: MVP 1 mes, proyecto completo 3 meses.

## Estado actual

- Estructura de repo y tooling (git, npm workspaces, release-please, devsecops) creados.
- CodeQL pausado en devsecops.yml: falla si no hay código JS/TS que indexar. Reactivar cuando exista código real en apps/api o apps/web.
- Modelo de datos cerrado (cupo de franquicia confirmado como compartido).
- Spec de auth/roles aprobada y **implementada** (openspec/changes/auth-roles/spec.md): módulo de auth completo (register/login/logout/me, invitación de asesor por link, guards de sesión y de rol).
- Spec de paquetes aprobada y **implementada** (openspec/changes/packages/spec.md, PR #9, release 0.3.0): catálogo de paquetes, compra con comprobante a R2, aprobación/rechazo manual de Super Admin, promoción automática a `franchise_admin` en compra multi-asesor, cálculo y consumo de cupo FIFO (`consumeQuota` en `packages.service.ts`, con guarda optimista contra carreras) — queda lista para que el futuro módulo de propiedades la llame al publicar.
- Extensión sobre el modelo cerrado: tabla `invites` (no estaba en el modelo original) — la invitación de asesor a franquicia es por link compartido a mano, no por email, porque no hay proveedor de email elegido.
- DB de desarrollo en Neon: proyecto creado, migraciones corridas (`20260804135828_init`, `20260804144217_add_packages`, `20260805130934_add_properties`, `20260805133221_property_media_cascade_delete`).
- Spec de propiedades aprobada (openspec/changes/properties/spec.md) y **módulo implementado** (`apps/api/src/modules/properties`): buscador público con filtros (ciudad, tipo de operación, tipo de propiedad, precio, ambientes), ficha pública, alta en `draft`, edición, carga de media a R2 (`R2Service.uploadPropertyMedia`, refactor del método antes exclusivo de comprobantes), publicar (consume cupo vía `packages.service.consumeQuota`), pausar/reactivar, cerrar (sold/rented), y solicitud de baja con aprobación de administrador.
- Reglas nuevas de este módulo (no estaban en el modelo original, decisión confirmada con Marthin):
  - Estados `sold`/`rented`: al cerrar una venta/alquiler, la propiedad sigue visible en el buscador y su ficha (con badge) durante una ventana de retención — `RETENTION_DAYS = 30` en `properties.service.ts`, constante fija en Fase 1 (subir a config si hace falta variarla por paquete) — para seguir generando tráfico aunque ya no esté disponible.
  - Eliminación de propiedad vía solicitud: tabla `property_deletion_requests` (mismo flujo `pending`/`approved`/`rejected` que `PackagePurchase`, reusando el enum `PurchaseStatus`). El asesor dueño no borra directo, pide la baja y avisa al admin por WhatsApp (sin notificación automática, Fase 1 no tiene proveedor de email/push); el `franchise_admin`/`super_admin` aprueba (borra, cascade elimina su media y solicitudes) o rechaza.
  - `lat`/`lng` como columnas `Decimal` simples, sin PostGIS — el buscador filtra por ciudad/zona, no por radio en km.
  - Autorización de gestión (editar/publicar/pausar/cerrar): dueño, `franchise_admin` del mismo equipo (mismo `franchiseId`), o `super_admin`. Aprobar/rechazar baja: solo `franchise_admin`/`super_admin` — el dueño nunca aprueba su propia solicitud.
- Nota de infra: `connect-pg-simple` usa una tabla `session` en la misma DB de Neon que **no** está modelada en Prisma (a propósito). Cualquier `prisma migrate diff`/`db push` contra la DB en vivo la va a marcar como "a borrar" — nunca aplicar ese DROP, es la tabla de sesiones activas.
- `apps/web` arrancado con `create-next-app` (Next.js 16, App Router, TypeScript, Tailwind v4). **Next.js 16 trae cambios de breaking respecto a versiones anteriores** (`params`/`searchParams` son `Promise` a awaitear, nuevo modelo opcional "Cache Components" vía `cacheComponents: true` en `next.config.ts`). Decisión: **no** se habilitó Cache Components — queda con el modelo de caching "previo" (fetch sin cache por default, sin exigencia de envolver todo en `<Suspense>`), más simple para el portal público. Antes de tocar código de Next, revisar `node_modules/next/dist/docs/` (su propio `AGENTS.md` lo pide) porque la versión instalada puede no coincidir con lo entrenado.
- Portal público implementado: `/` (buscador con filtros vía form GET nativo, sin JS, + mapa) y `/propiedades/[id]` (ficha con galería, datos, botón de WhatsApp al asesor). Ambas rutas son dinámicas (fetch sin cache contra `apps/api`).
- Mapa: Leaflet + OpenStreetMap (`react-leaflet`, sin API key). `PropertyMap.tsx` es Client Component; se carga desde `PropertyMapLoader.tsx` con `next/dynamic({ ssr: false })` porque Leaflet toca `window` al importarse — Next.js exige que `ssr: false` se llame desde un Client Component, no desde la page (Server Component). Iconos de marcador servidos desde el CDN de unpkg (pineado a la versión instalada) para evitar el problema clásico de bundler con los assets de Leaflet.
- Fix de backend descubierto al construir la ficha: `getPropertyDetail` no incluía el contacto del `owner` (`fullName`/`phone`) y la media se devolvía solo con su `key` de R2 (bucket privado, sin URL usable por el frontend). Se agregó `attachMediaUrls` en `properties.service.ts` (URL prefirmada de 1h, reusa `R2Service`) y el include del `owner`.
- Identidad visual provisoria (logo + paleta de Muller Producciones) documentada arriba, assets en `docs/brand/`. Falta aplicarla en el frontend (hoy usa el navy `#3B3A72` en botones nomás).
- Spec de leads aprobada (openspec/changes/leads/spec.md) y **módulo implementado** (`apps/api/src/modules/leads`): entidad `leads` (`propertyId`, `name`, `phone`, `email` opcional, `message`), `POST /properties/:id/leads` (público, 404 si la propiedad no es visible), `GET /properties/:id/leads` y `GET /leads` (mismo criterio de autorización que `properties`: dueño, `franchise_admin` del equipo, o `super_admin` — `GET /leads` sin filtro para `super_admin`, filtrado por equipo/propiedades propias para el resto). Contador `viewsCount` en `properties`, incrementado en cada `GET /properties/:id`.
- **Decisión confirmada con Marthin:** el contacto desde la ficha es formulario propio + WhatsApp combinados — el visitante completa nombre/teléfono/mensaje, eso crea el lead en el sistema (`LeadForm.tsx`, client component) y el navegador abre WhatsApp con el mensaje precargado. No reemplaza WhatsApp como canal, solo agrega registro en el CRM.
- Bug real encontrado y resuelto al probar el flujo end-to-end: la API no tenía CORS habilitado (`apps/api/src/main.ts`) — nada había hecho fetch desde el navegador contra `apps/api` hasta `LeadForm` (el resto del frontend hace fetch server-side en Next.js). Se agregó `app.enableCors({ origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: true })`; `credentials: true` porque las rutas autenticadas usan cookie de sesión y en algún momento un panel con login va a llamar a la API desde el browser también.
- Spec de panel de asesor aprobada (openspec/changes/panel-asesor/spec.md) y **módulo implementado**: `/login` (form contra `POST /auth/login`) y `/panel` (`apps/web/src/app/panel`) con listado de propiedades propias (vistas, cantidad de leads, estado) y listado de leads (`/panel/leads`), logout incluido. Alta/edición de propiedad (formulario + carga de media) queda fuera, es el siguiente módulo con su propia spec.
- Decisión de arquitectura de este módulo: el panel es **client-side**, no Server Components. La cookie de sesión la pone la API en su propio origen (puerto distinto en dev); el servidor de Next.js no puede leerla, así que login/logout/`auth/me`/`properties/mine`/`leads` se llaman siempre desde el browser con `fetch(..., { credentials: 'include' })` (mismo patrón que ya usaba `LeadForm.tsx`). El gate de sesión (`panel/layout.tsx`) es solo UX — la autorización real la sigue haciendo la API (`SessionAuthGuard`) en cada endpoint.
- Gap de backend encontrado y corregido al escribir la spec: `GET /properties/mine` filtraba solo por `ownerId`, a diferencia de `GET /leads` que ya distinguía `franchise_admin` (todo el equipo) de `advisor` (solo lo propio). Se extendió `findMyProperties` en `properties.service.ts` con el mismo `scopeFilter` que ya tenía `leads.service.ts`, para que el panel de un admin de franquicia muestre las propiedades de todo su equipo, no solo las suyas.
- Spec de alta/edición de propiedad aprobada (openspec/changes/alta-edicion-propiedad/spec.md) y **módulo implementado**: `/panel/propiedades/nueva` y `/panel/propiedades/[id]` en `apps/web`, con formulario compartido (`PropertyForm.tsx`), mapa clickeable para marcar ubicación (`PropertyLocationPicker.tsx`, nuevo — distinto de `PropertyMap.tsx` que es de solo lectura) y gestión de media con drag & drop para reordenar/portada y borrado (`PropertyMediaManager.tsx`).
- Gaps de backend detectados y corregidos al escribir esa spec:
  - No existía forma de traer el detalle completo (datos + media) de una propiedad `draft`/`paused` para su dueño — `GET /properties/:id` está filtrado para el portal público y tira 404 en cualquier estado no visible. Se agregó `GET /properties/:id/manage` (mismo `assertCanManage` que ya usaba `updateProperty`), reusando `attachMediaUrls`.
  - No había forma de borrar ni reordenar media una vez subida. Se agregaron `DELETE /properties/:id/media/:mediaId` (borra de R2 vía el nuevo `R2Service.deleteObject` y promueve la siguiente foto a portada si se borra la actual) y `PATCH /properties/:id/media/reorder` (valida que la lista recibida coincida exactamente con la media existente, si no `400`).
- Spec de panel de franquicia aprobada (openspec/changes/panel-franquicia/spec.md) y **módulo implementado**: `/panel/equipo` (ver asesores del equipo con su cantidad de propiedades, invitar por link con botón copiar) y `/panel/bajas` (aprobar/rechazar solicitudes de baja de propiedad), más `/aceptar-invitacion` (frontend que faltaba para que la invitación funcione de punta a punta — la API la soportaba desde `auth-roles` pero nunca se había construido esa pantalla). Ambos links del nav solo aparecen si `role === 'FRANCHISE_ADMIN'` (`panel/layout.tsx`).
- Gaps de backend detectados y corregidos al escribir esa spec: faltaban `GET /auth/franchise/members` (nuevo, filtra por `franchiseId` del caller) y `GET /properties/deletion-requests` (nuevo, reusa el `scopeFilter` que ya tenía `findMyProperties`/`leads.service.ts`) — sin ellos no había forma de listar equipo ni solicitudes pendientes, aunque las acciones (invitar, aprobar, rechazar) ya existían en la API. De paso, `AuthService.toSafeUser` pasó a genérico (`toSafeUser<T extends User>`) para no perder el `_count` de Prisma al tipar la respuesta.
- Próximo paso: aplicar la paleta de marca más a fondo, o el panel de Super Admin (aprobar pagos de paquetes, gestión de catálogo) — a definir con Marthin.
