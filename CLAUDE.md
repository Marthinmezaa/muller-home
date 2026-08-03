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
- Repo remoto: https://github.com/Marthinmezaa/muller.git

## Stack

- Monorepo con npm workspaces (`apps/*`, `packages/*`) — sin Nx/Turborepo hasta que haga falta.
- Backend: Node.js + NestJS + TypeScript. Decisión confirmada con Marthin: dado el objetivo de escalar a plataforma grande (no solo el MVP), los guards/decorators de Nest (`@Roles()`, `RolesGuard`) resuelven el RBAC de 3 roles con menos boilerplate que middlewares a mano en Express, y la estructura de módulos calza con Clean/Hexagonal Architecture sin armarla manualmente.
- Frontend: Next.js + TypeScript (SEO real para fichas de propiedad + optimización de imágenes/video de drone).
- DB: PostgreSQL (Docker Compose en local).
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

## Alcance Fase 1 (MVP, 1 mes)

Portal público (buscador/filtros/mapa/ficha/contacto), auth + roles, módulo de paquetes (compra → comprobante → aprobación manual → habilita publicación), panel Asesor, panel Admin Franquicia, panel Super Admin, CRM básico (leads + vistas). Coordinación de producción: solo link a WhatsApp.

Fase 2 (post-validación con cliente): pasarela de pago (Bancard/Pagopar), CRM avanzado, agenda de producción en el sistema, identidad visual definitiva.

Plazos: MVP 1 mes, proyecto completo 3 meses.

## Estado actual

- Estructura de repo y tooling (git, npm workspaces, release-please, devsecops) creados.
- CodeQL pausado en devsecops.yml: falla si no hay código JS/TS que indexar. Reactivar cuando exista código real en apps/api o apps/web.
- Modelo de datos cerrado (cupo de franquicia confirmado como compartido).
- Spec de auth/roles aprobada (openspec/changes/auth-roles/spec.md).
- Backend: NestJS scaffolding en `apps/api` + Prisma (User, Franchise, Invite) + módulo de auth (register/login/logout/me, invitación de asesor por link, guards de sesión y de rol).
- Extensión sobre el modelo cerrado: tabla `invites` (no estaba en el modelo original) — la invitación de asesor a franquicia es por link compartido a mano, no por email, porque no hay proveedor de email elegido.
- Pendiente: no se generó la migración inicial de Prisma en este entorno (sin Docker disponible) — Marthin corre `npm run prisma:migrate` la primera vez.
- Diferido a cuando exista el módulo de paquetes: la promoción automática de un asesor a `franchise_admin` (la lógica va del lado de packages, no de auth, cuando se apruebe una compra multi-asesor).
- Próximo paso: levantar Postgres local, correr la migración, probar el flujo de auth end to end. Después, spec del módulo de paquetes.
