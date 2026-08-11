# Spec: Comprar paquete (panel)

## Objetivo

Pantalla para que un asesor o admin de franquicia compre un paquete desde el panel: elegir paquete del catálogo, subir comprobante, y ver el estado de sus compras. La API ya soporta todo el flujo (`packages` module) desde la spec de paquetes; falta el frontend.

## Alcance

- `/panel/comprar`: catálogo de paquetes activos (`GET /packages`) con botón "Comprar" por paquete → formulario con input de archivo (comprobante, imagen o PDF) → `POST /packages/:id/purchases` (multipart, campo `proof`).
- Misma pantalla, sección "Mis compras": `GET /packages/purchases/mine`, cada fila con paquete, estado (badge, mismo estilo que `/panel/pagos`), cupo usado/total, fecha.
- Compra `REJECTED`: botón "Reenviar comprobante" → nuevo input de archivo → `POST /packages/purchases/:id/proof`.
- Nav (`panel/layout.tsx`): link "Comprar paquete" visible si `role === 'FRANCHISE_ADMIN'` o (`role === 'ADVISOR'` y `franchiseId === null`) — un asesor ya invitado a una franquicia no compra paquete propio (`assertCanBuy` ya lo bloquea en la API; se oculta el link para no ofrecer una acción que va a devolver 403).

## Fuera de alcance

- Mostrar cupo disponible agregado (`GET /packages/quota`) en el home del panel — queda para un paso aparte.
- Pasarela de pago, edición/cancelación de una compra ya creada.

## Gap de backend a corregir

- `findMyPurchases` (`packages.service.ts`) no incluye `package` — sin eso la pantalla no tiene nombre/tipo de paquete para mostrar. Se agrega `include: { package: true }`, mismo patrón que `findAllPurchases`.

## Decisión de UI

Reusa el estilo ya establecido en `/panel/pagos` y `/panel/catalogo` (mismos `STATUS_STYLES`, mismas clases Tailwind) — sin componentes nuevos compartidos, es la primera pantalla del lado comprador y no hay todavía una tercera para justificar extraer nada.
