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
- Backend: Node.js + Express + TypeScript (no Nest: RBAC de 3 roles no justifica la ceremonia de DI; arquitectura hexagonal vía carpetas `modules/<dominio>/{routes,use-cases,repository}`).
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
- **Supuesto sin confirmar con Marthin:** en franquicia, el cupo de `properties_quota` es compartido por todo el equipo desde la compra del Admin de Franquicia (cada propiedad de cualquier asesor del equipo descuenta del mismo `package_purchase`). Pendiente de confirmación — si cada asesor necesita paquete propio, hay que separar el cupo por asesor.

## Alcance Fase 1 (MVP, 1 mes)

Portal público (buscador/filtros/mapa/ficha/contacto), auth + roles, módulo de paquetes (compra → comprobante → aprobación manual → habilita publicación), panel Asesor, panel Admin Franquicia, panel Super Admin, CRM básico (leads + vistas). Coordinación de producción: solo link a WhatsApp.

Fase 2 (post-validación con cliente): pasarela de pago (Bancard/Pagopar), CRM avanzado, agenda de producción en el sistema, identidad visual definitiva.

Plazos: MVP 1 mes, proyecto completo 3 meses.

## Estado actual

- Estructura de repo y tooling (git, npm workspaces, release-please, devsecops) creados.
- Modelo de datos en borrador, pendiente confirmación del punto de cupo compartido en franquicias.
- Próximo paso: spec (Gentle-AI/openspec) del módulo de auth y roles.
