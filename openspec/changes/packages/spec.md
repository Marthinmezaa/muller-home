# Spec: Paquetes

## Objetivo

Un asesor o admin de franquicia compra un paquete, sube el comprobante de pago, el Super Admin lo aprueba manualmente, y esa aprobación habilita cupo de publicación (`properties_quota`). Sin pasarela de pago en Fase 1 (transferencia + aprobación manual).

## Alcance Fase 1

- Catálogo de paquetes gestionado por Super Admin (`packages`): nombre, `billing_type` (`one_time` | `monthly`), precio, `properties_quota`, `productions_quota`, `max_advisors`.
- Compra de paquete (`package_purchases`): el usuario elige un paquete, sube el comprobante (imagen/PDF a R2, reutiliza el storage que ya existe para el locker) y queda `pending`.
- Aprobación manual del Super Admin: `approved` o `rejected`. Al aprobar, se habilita el cupo (`properties_quota`) de esa compra.
- Cupo de franquicia compartido: si el paquete tiene `max_advisors > 1`, el cupo de esa compra lo consume cualquier asesor del equipo del comprador (ya confirmado en el modelo de datos).
- Promoción a `franchise_admin`: al aprobarse una compra con `max_advisors > 1`, el comprador pasa de `advisor` a `franchise_admin` (regla ya definida en la spec de auth, la dispara este módulo).
- Recompra mensual: paquetes `monthly` no renuevan solos. Volver a comprar el mes siguiente crea una fila nueva en `package_purchases` con su propio cupo, independiente de compras previas.
- `productions_quota` es dato comercial mostrado en el panel; sin tabla de seguimiento ni descuento automático (coordinación de producción sigue siendo el link a WhatsApp).
- Bloqueo de publicación: publicar una propiedad exige que el comprador (o su franquicia) tenga cupo disponible (`properties_quota` restante > 0) en al menos una compra `approved`.

## Fuera de alcance Fase 1

- Pasarela de pago (Bancard/Pagopar) — Fase 2.
- Renovación/suscripción automática.
- Notificaciones automáticas (email/push) de aprobación o rechazo — el aviso es manual (WhatsApp), como el resto de la coordinación en Fase 1.
- Edición de paquetes ya comprados (cambio de plan a mitad de ciclo).

## Reglas de negocio

- Cupo disponible de un usuario/franquicia = suma de `properties_quota - properties_used` de todas sus compras `approved`. Publicar descuenta 1 de la compra `approved` más antigua con cupo restante (FIFO), para agotar primero el cupo que vence conceptualmente antes.
- Una compra `rejected` no otorga cupo ni dispara la promoción a `franchise_admin`. Puede reenviar un comprobante nuevo sobre la misma compra, que vuelve a `pending` (no se crea una fila nueva).
- El comprador de un paquete `max_advisors > 1` es siempre quien queda como `franchise_admin` del equipo; no hay transferencia de titularidad en Fase 1.
- Un `advisor` ya perteneciente a una franquicia (invitado) no compra paquete propio: consume el cupo compartido de su franquicia.

## Escenarios

**Compra individual aprobada**
- Given un `advisor` sin cupo
- When compra un paquete `one_time`, sube comprobante, y el Super Admin lo aprueba
- Then la compra pasa a `approved` y el asesor tiene 1 `properties_quota` disponible

**Comprobante rechazado**
- Given una compra `pending` con comprobante inválido
- When el Super Admin la rechaza
- Then la compra pasa a `rejected`, sin cupo otorgado

**Reenvío de comprobante**
- Given una compra `rejected`
- When el usuario sube un comprobante nuevo sobre esa misma compra
- Then la compra vuelve a `pending`, a la espera de revisión

**Publicación sin cupo**
- Given un `advisor` sin compras `approved` con cupo restante
- When intenta publicar una propiedad
- Then la operación se rechaza (403 o similar) indicando que no tiene cupo

**Cupo de franquicia compartido**
- Given un `franchise_admin` con una compra `approved` de un paquete `monthly` (5 propiedades)
- When cualquier asesor de su equipo publica una propiedad
- Then se descuenta del mismo cupo compartido, sin importar quién de el equipo publicó

**Recompra mensual**
- Given un `franchise_admin` cuya compra del mes anterior ya agotó su cupo
- When compra el paquete `monthly` de nuevo y el Super Admin lo aprueba
- Then se crea una compra nueva con su propio cupo de 5 propiedades, independiente de la anterior

## Decisiones confirmadas

1. Orden de consumo de cupo: FIFO (compra `approved` más vieja con cupo restante primero).
2. Comprobante de pago: sube a R2, mismo storage que el locker.
3. Comprobante rechazado: se reenvía sobre la misma compra (vuelve a `pending`), no se crea una compra nueva.
