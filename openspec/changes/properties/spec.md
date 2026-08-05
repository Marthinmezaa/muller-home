# Spec: Propiedades

## Objetivo

Portal público de propiedades para visitantes sin login (buscador, filtros, mapa, ficha) y publicación de propiedades por asesores/franquicias con bloqueo de cupo (ya resuelto por `packages.service`) y carga de fotos/video a su locker en R2.

## Alcance Fase 1

- Entidad `properties`: título, descripción, tipo de operación (`sale` | `rent`), precio, tipo de propiedad (casa/departamento/terreno/local/oficina — enum fijo), m2, ambientes/dormitorios/baños, dirección, ciudad/zona, `lat`/`lng` (columnas simples, sin PostGIS), estado (`draft` | `published` | `paused` | `sold` | `rented`), `closedAt` (fecha de cierre de venta/alquiler), `ownerId` (asesor que la publicó), timestamps.
- Entidad `property_media`: `propertyId`, tipo (`photo` | `video`), `key` de R2 (mismo bucket/patrón que los comprobantes de paquetes), orden, `isCover` (foto de portada).
- Buscador público: filtros por ciudad/zona, tipo de operación, tipo de propiedad, rango de precio, ambientes mínimos. Resultado en lista + mapa (pines por `lat`/`lng`). Incluye, sin distinción de filtro, las propiedades `sold`/`rented` dentro de su ventana de retención (con badge "Vendido"/"Alquilado").
- Ficha de propiedad: galería de fotos/video, datos completos, contacto directo del asesor (teléfono/WhatsApp) — visible sin login. Sigue accesible mientras la propiedad esté `sold`/`rented` dentro de la ventana de retención.
- Publicación (asesor/franquicia autenticado): crear propiedad en `draft`, cargar media al locker R2, pasar a `published` — este último paso llama a `packages.service.consumeQuota(ownerId)` y falla si no hay cupo.
- Edición de una propiedad ya publicada (datos y media), sin volver a consumir cupo.
- Pausar / reactivar una propiedad publicada (se oculta del buscador sin liberar el cupo ya consumido).
- Cerrar una propiedad (asesor marca `sold` o `rented` según su tipo de operación): queda visible en buscador y ficha, marcada con badge, durante una ventana de retención configurable (default 30 días desde `closedAt`) para seguir generando tráfico.
- Entidad `property_deletion_requests`: `propertyId`, `requestedById` (el asesor), estado (`pending` | `approved` | `rejected`), `reviewedById`, `reviewedAt`, timestamps — mismo patrón que `package_purchases`.
- Solicitud de baja: el asesor dueño pide eliminar su propiedad (crea una `property_deletion_request` en `pending`) y avisa al admin por fuera del sistema (WhatsApp), como el resto de la coordinación en Fase 1 — sin notificación automática. El `franchise_admin`/`super_admin` la aprueba (borra la propiedad) o la rechaza desde su panel.

## Fuera de alcance Fase 1

- Formulario de contacto / captura de lead — módulo de leads (próximo). La ficha solo expone WhatsApp/teléfono directo, mismo patrón que la coordinación de producción.
- Métricas de vistas por propiedad — módulo de leads/CRM (próximo).
- Paneles de gestión (Asesor / Admin Franquicia / Super Admin) — módulos separados.
- Búsqueda por radio en km (PostGIS) — el filtro es por ciudad/zona, no por distancia geográfica.
- Catálogo de tipos de propiedad editable por Super Admin — fijo en código en Fase 1.
- Auto-eliminación por el asesor — solo puede pausar/editar/cerrar; el borrado definitivo requiere administrador.

## Reglas de negocio

- Publicar (`draft` → `published`) exige cupo disponible: llama a `consumeQuota` sobre el holder de cupo (el propio asesor o su franquicia, según `resolveQuotaHolderId` ya implementado). Sin cupo, la operación se rechaza (`ForbiddenException`).
- El cupo se consume una única vez, al publicar. Editar o pausar/reactivar no vuelve a tocar cupo.
- Solo el `owner` de la propiedad, o un `franchise_admin`/`super_admin` de su equipo, puede editarla o pausarla.
- Una propiedad `draft` no aparece en el buscador público ni tiene ficha pública accesible.
- Una propiedad `paused` desaparece del buscador pero conserva el cupo ya consumido (no se devuelve).
- Cerrar (`sold`/`rented`) NO libera cupo ni la oculta: sigue visible en buscador y ficha, con badge, hasta que venza la ventana de retención desde `closedAt`. Vencida la ventana, se oculta automáticamente del buscador y de la ficha pública (el registro no se borra).
- El `advisor` dueño no elimina directamente: solo puede crear una solicitud de baja (`property_deletion_request`). Únicamente un `franchise_admin` (de su propio equipo) o un `super_admin` aprueba la solicitud y borra la propiedad, o la rechaza.
- Una solicitud `rejected` queda como historial; si el asesor insiste, crea una `property_deletion_request` nueva sobre la misma propiedad (no reabre la rechazada).

## Escenarios

**Publicación exitosa**
- Given un asesor con cupo disponible
- When crea una propiedad en `draft`, sube fotos, y la publica
- Then la propiedad pasa a `published`, aparece en el buscador, y se descuenta 1 del cupo

**Publicación sin cupo**
- Given un asesor sin cupo disponible
- When intenta publicar una propiedad en `draft`
- Then la operación se rechaza (403), la propiedad queda en `draft`

**Búsqueda con filtros**
- Given propiedades publicadas en distintas ciudades y tipos
- When un visitante filtra por ciudad y tipo de operación
- Then el buscador devuelve solo las propiedades `published` que matchean, con sus pines en el mapa

**Pausar propiedad**
- Given una propiedad `published`
- When el asesor la pausa
- Then desaparece del buscador público, pero el cupo consumido no se libera

**Edición sin recupo**
- Given una propiedad `published`
- When el asesor edita el precio y agrega una foto
- Then los cambios se reflejan sin afectar el cupo consumido

**Cierre de venta mantiene tráfico**
- Given una propiedad `published` de tipo `sale`
- When el asesor la marca como `sold`
- Then sigue apareciendo en el buscador y su ficha, con badge "Vendido", hasta 30 días desde el cierre

**Expiración de la ventana de retención**
- Given una propiedad `sold`/`rented` cuyo `closedAt` supera los 30 días
- When se cumple la ventana de retención
- Then deja de aparecer en el buscador público y su ficha deja de ser accesible, sin borrarse el registro

**Solicitud de baja aprobada**
- Given un asesor dueño de una propiedad
- When crea una solicitud de baja y el `franchise_admin`/`super_admin` la aprueba
- Then la propiedad se elimina y la solicitud queda `approved`

**Solicitud de baja rechazada**
- Given una solicitud de baja `pending`
- When el `franchise_admin`/`super_admin` la rechaza
- Then la propiedad sigue existiendo, la solicitud queda `rejected`, y el asesor puede crear una solicitud nueva

**Eliminación directa rechazada**
- Given un `advisor` dueño de una propiedad
- When intenta eliminarla directamente (sin pasar por una solicitud aprobada)
- Then la operación se rechaza (403)

## Decisiones a confirmar

1. Geolocalización: `lat`/`lng` simples en Postgres, sin PostGIS (confirmado con Marthin).
2. Contacto/lead: fuera de esta spec — la ficha muestra WhatsApp/teléfono directo, igual que la coordinación de producción.
3. Catálogo de tipos de propiedad: enum fijo en código, no editable por Super Admin en Fase 1.
4. Ventana de retención tras cierre (`sold`/`rented`): 30 días por default, valor configurable (no hardcodeado como constante mágica) — Marthin puede pedir extenderla más adelante.
5. Qué pasa al vencer la ventana: ocultamiento automático (buscador + ficha), sin borrar el registro (confirmado con Marthin).
6. Eliminación: flujo de solicitud (`property_deletion_request`), igual que la aprobación de comprobantes en `packages`. El aviso de "te mandé una solicitud" es manual, por WhatsApp — sin notificación automática en el sistema (no hay proveedor de email/push en Fase 1, mismo criterio que el resto del proyecto).
