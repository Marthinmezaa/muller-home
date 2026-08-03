# Muller Home

Plataforma inmobiliaria multi-rol para **Muller Producciones** (fotografía y video con drone para propiedades). Portal donde compradores/inquilinos buscan propiedades, asesores inmobiliarios las publican tras comprar un paquete de producción, y franquicias gestionan equipos de asesores.

> Estado: en fase de diseño (specs y modelo de datos cerrados). Todavía sin código de aplicación.

## Roles

- **Visitante** — busca y filtra propiedades, contacta al asesor. Sin cuenta.
- **Asesor** — compra un paquete, publica propiedades, carga fotos/video a su locker, ve sus métricas.
- **Admin de Franquicia** — compra paquete multi-asesor, da de alta a su equipo, ve métricas agregadas.
- **Super Admin** (Muller Producciones) — gestiona paquetes/precios, aprueba pagos, ve métricas globales.

## Stack

- **Backend**: Node.js + NestJS + TypeScript
- **Frontend**: Next.js + TypeScript
- **DB**: PostgreSQL (Docker Compose en local)
- **Storage**: Cloudflare R2 (API S3) para fotos/video
- **Infra**: monorepo con npm workspaces

## Metodología

Spec-driven: cada módulo se especifica en [`openspec/changes/`](./openspec/changes) y se aprueba por PR antes de implementarse. Filosofía Ponytail (YAGNI real) para evitar sobre-ingeniería. Detalle completo de decisiones y contexto en [`CLAUDE.md`](./CLAUDE.md).

## Flujo de trabajo

- Ramas `feature/<módulo>` / `fix/<lo-que-sea>` / `docs/<lo-que-sea>` — nunca commits directos a `main`.
- Conventional Commits, descripción en castellano.
- `main` protegida: merge solo vía PR.
- Versionado automático con [release-please](.github/workflows/release-please.yml).
- CodeQL + secret scanning (gitleaks) en [devsecops.yml](.github/workflows/devsecops.yml).
