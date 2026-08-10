# Spec: Panel de Super Admin

## Objetivo

Darle al `super_admin` (Muller Producciones) una pantalla en `apps/web` para aprobar/rechazar los pagos de paquetes y ver el catálogo — hoy toda esa lógica ya existe en `packages.service.ts` (aprobación manual por transferencia, promoción automática a `franchise_admin`, cupo FIFO), pero no hay ninguna UI que la use. El módulo de paquetes se implementó como spec propia (PR #9) sin frontend; este cambio es el frontend que le faltaba, mismo patrón que `panel-franquicia` con `auth`/`properties`.

## Alcance Fase 1

- `/panel/pagos`: lista de todas las compras de paquete (`GET /packages/purchases`) con comprador, paquete, estado y fecha. Botón para ver el comprobante (`GET /packages/purchases/:id/proof-url`, abre la URL prefirmada). Aprobar/rechazar (`PATCH /packages/purchases/:id/approve` y `/reject`) solo visibles en compras `PENDING`.
- `/panel/catalogo`: lista de paquetes activos (`GET /packages`, ya existe) + formulario para crear un paquete nuevo (`POST /packages`, ya existe): nombre, tipo de facturación (`one_time`/`monthly`), precio, cupo de propiedades, cupo de producciones, máximo de asesores.
- Ambas pantallas solo visibles/accesibles si `role === 'SUPER_ADMIN'` (mismo gate client-side que ya usa `panel/layout.tsx` para franquicia).

## Fuera de alcance Fase 1

- Editar o desactivar un paquete existente — no hay pedido ni endpoint (`packages.service.ts` no tiene `update`/`deactivate`); si hace falta, es una extensión chica del módulo de paquetes con su propio ajuste de spec, no se inventa acá.
- Métricas globales (ventas por período, franquicias activas, etc.) — Fase 2, no hay pedido concreto todavía.
- Flujo de compra del lado del asesor/franquicia (`POST /packages/:id/purchases`, ya soportado por la API) — **no existe ninguna pantalla frontend para comprar un paquete todavía**, ni para el asesor ni para nadie. Se detecta acá como gap real, pero es un módulo aparte (`/panel/comprar-paquete` o similar) con su propia spec; no bloquea este panel — se puede seguir generando compras vía API mientras tanto para probar.

## Gap de backend detectado (a resolver en este cambio)

`findAllPurchases()` en `packages.service.ts` devuelve las filas de `package_purchases` sin relaciones — sin el nombre del paquete ni el comprador, la pantalla no tiene qué mostrar más allá de ids. Se extiende con `include: { package: true, buyer: { select: { fullName: true, email: true } } }`, mismo criterio que `attachMediaUrls`/`assertCanManage` en `properties.service.ts`: el gap se corrige junto con el frontend que lo necesita, no antes.

## Reglas de negocio

- Sesión requerida y rol `super_admin` para `/panel/pagos` y `/panel/catalogo` — ya lo hacen los guards de la API (`@Roles(Role.SUPER_ADMIN)` en `createPackage`, `approvePurchase`, `rejectPurchase`, `findAllPurchases`, `getProofUrl`); el panel solo lo consume.
- Aprobar una compra multi-asesor (`package.maxAdvisors > 1`) promueve al comprador a `franchise_admin` y crea su `Franchise` — comportamiento ya implementado, el panel solo dispara la acción.
- Una compra ya revisada (`APPROVED`/`REJECTED`) no puede volver a aprobarse/rechazarse — regla ya existente en `approvePurchase`/`rejectPurchase` (`BadRequestException`); el panel oculta los botones en ese caso, la API igual lo valida si se llama de todos modos.
- El comprobante nunca se sirve como URL pública directa — siempre a través de `getProofUrl` (URL prefirmada de R2), igual que la media de propiedades.

## Escenarios

**Super admin ve las compras pendientes**
- Given 2 compras `PENDING` y 1 `APPROVED`
- When entra a `/panel/pagos`
- Then ve las 3, con botones de aprobar/rechazar solo en las 2 pendientes

**Super admin revisa el comprobante antes de aprobar**
- Given una compra `PENDING`
- When hace clic en "Ver comprobante"
- Then se abre la imagen/PDF del comprobante en una pestaña nueva

**Super admin aprueba una compra multi-asesor**
- Given una compra `PENDING` de un paquete con `maxAdvisors > 1` de un usuario sin franquicia
- When aprueba la compra
- Then el comprador pasa a `franchise_admin` con su propia franquicia (comportamiento ya implementado)

**Super admin rechaza una compra**
- Given una compra `PENDING`
- When la rechaza
- Then pasa a `REJECTED` y el asesor puede reenviar comprobante (`resendProof`, ya implementado, sin UI propia en este cambio)

**Super admin ve el catálogo y crea un paquete**
- Given el catálogo tiene 2 paquetes activos
- When entra a `/panel/catalogo` y completa el formulario de alta
- Then el paquete nuevo aparece en la lista

**Usuario sin rol super_admin no accede**
- Given un usuario con rol `advisor` o `franchise_admin`
- When intenta entrar a `/panel/pagos` o `/panel/catalogo`
- Then no ve esos links en el nav del panel

## Decisiones confirmadas con Marthin

1. Se elige este módulo (panel de Super Admin) antes que aplicar la paleta de marca a fondo, como siguiente paso — decidido en esta sesión.
2. Se detecta y se deja fuera de alcance el flujo de compra del lado del asesor (no existe frontend) — no se expande el pedido de hoy para cubrirlo, queda anotado para una spec propia cuando toque.
3. Se resuelve el gap de `findAllPurchases` (agregar `include`) como parte de este cambio, mismo criterio que los gaps anteriores (`panel-asesor`, `alta-edicion-propiedad`, `panel-franquicia`).
