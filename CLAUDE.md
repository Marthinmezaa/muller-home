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
- Frontend: Next.js + TypeScript (SEO real para fichas de propiedad + optimización de imágenes/video de drone).
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
- DB de desarrollo en Neon: proyecto creado, migraciones corridas (`20260804135828_init`, `20260804144217_add_packages`, `20260805130934_add_properties`).
- Spec de propiedades aprobada (openspec/changes/properties/spec.md) y **modelo de datos implementado**: `Property`, `PropertyMedia`, `PropertyDeletionRequest` en Prisma. Todavía falta el módulo (`properties.module/service/controller`) — solo está la migración corrida, no hay endpoints ni lógica de negocio.
- Reglas nuevas de este módulo (no estaban en el modelo original, decisión confirmada con Marthin):
  - Estados `sold`/`rented`: al cerrar una venta/alquiler, la propiedad sigue visible en el buscador y su ficha (con badge) durante una ventana de retención — default 30 días desde `closedAt`, configurable — para seguir generando tráfico aunque ya no esté disponible.
  - Eliminación de propiedad vía solicitud: tabla `property_deletion_requests` (mismo flujo `pending`/`approved`/`rejected` que `PackagePurchase`, reusando el enum `PurchaseStatus`). El asesor dueño no borra directo, pide la baja y avisa al admin por WhatsApp (sin notificación automática, Fase 1 no tiene proveedor de email/push); el `franchise_admin`/`super_admin` aprueba (borra) o rechaza.
  - `lat`/`lng` como columnas `Decimal` simples, sin PostGIS — el buscador filtra por ciudad/zona, no por radio en km.
- Nota de infra: `connect-pg-simple` usa una tabla `session` en la misma DB de Neon que **no** está modelada en Prisma (a propósito). Cualquier `prisma migrate diff`/`db push` contra la DB en vivo la va a marcar como "a borrar" — nunca aplicar ese DROP, es la tabla de sesiones activas.
- `apps/web` no existe todavía: cero frontend arrancado.
- Identidad visual provisoria (logo + paleta de Muller Producciones) documentada arriba, assets en `docs/brand/`.
- Próximo paso: implementar el módulo `properties` (service/controller/DTOs) sobre el modelo ya migrado — publicar (con `consumeQuota`), buscador con filtros, carga de media a R2, cerrar (sold/rented), solicitud de baja. Después, leads/CRM básico.
