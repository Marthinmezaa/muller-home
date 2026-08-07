# Spec: Alta y Edición de Propiedad (panel de asesor)

## Objetivo

Darle al asesor (y al `franchise_admin` de su equipo) la pantalla para cargar una propiedad nueva y editarla — título, datos, fotos/video — desde `apps/web`. Sigue al [[panel-asesor]]: ahí quedó el panel de lectura (ver propiedades/leads), esto agrega el flujo de creación/edición completo. La API ya soporta todo esto de punta a punta (`properties.controller.ts`); falta la UI.

## Alcance Fase 1

- `/panel/propiedades/nueva`: formulario con los mismos campos que `CreatePropertyDto` (título, descripción, tipo de operación, tipo de propiedad, precio, superficie, ambientes, baños, dirección, ciudad, ubicación). Al enviar: `POST /properties` (crea en `draft`) y redirige a `/panel/propiedades/[id]` para seguir cargando media.
- Ubicación: mapa clickeable (confirmado con Marthin — mismo patrón que el resto de portales inmobiliarios), no inputs numéricos. Nuevo componente `PropertyLocationPicker.tsx`: mapa Leaflet con un marcador que se mueve al clickear y setea `lat`/`lng` del formulario — distinto de `PropertyMap.tsx` (ese es de solo lectura, para mostrar varias propiedades a la vez en el buscador). Centro inicial: la ciudad ya cargada si existe, si no el centro de Asunción (mismo fallback que ya usa `PropertyMap.tsx`).
- `/panel/propiedades/[id]`: mismo formulario para editar (`PATCH /properties/:id`), más:
  - Carga de fotos/video: input de archivos con selección múltiple. La API acepta un archivo por request (`POST /:id/media`), así que el frontend los sube uno por uno en secuencia, mostrando progreso por archivo.
  - Galería de lo ya subido (miniaturas con la URL que devuelve la API), con botón de borrar por foto/video y reordenamiento (drag & drop) que además define cuál es la portada (`isCover`) — la primera del orden.
  - Botones de estado según corresponda: Publicar (`PATCH /:id/publish`), Pausar/Reactivar, Cerrar (vendida/alquilada), Pedir baja (`POST /:id/deletion-requests`) — cada uno llama al endpoint que ya existe y refleja el resultado (incluyendo el error de "sin cupo" al publicar, tal cual lo devuelve la API).
- Link "Cargar propiedad" desde `/panel` hacia `/panel/propiedades/nueva`, y cada fila de `/panel` linkea a `/panel/propiedades/[id]` en vez de a la ficha pública (que además 404 en `draft`).

## Fuera de alcance Fase 1

- Aprobar/rechazar solicitudes de baja — eso es panel de franquicia/super admin, no implementado todavía, spec propia.
- Validación de tamaño/tipo de archivo en el cliente antes de subir — la API ya valida (200MB, tipos de imagen/video permitidos), el frontend solo muestra el error tal cual si la rechaza.
- Autocompletar dirección / geocoding (buscar por texto y centrar el mapa ahí) — Fase 2 si hace falta; en Fase 1 el asesor navega el mapa a mano hasta el punto correcto.

## Gaps de backend detectados

**1. Sin detalle completo de una propiedad no publicada.** `GET /properties/:id` (`getPropertyDetail`) filtra por `visibleStatusFilter()` (solo `published`, o `sold`/`rented` en ventana de retención) y devuelve `404` para cualquier otro estado — correcto para el portal público, pero bloquea la pantalla de edición, que necesita ver una propiedad recién creada en `draft`.

Se agrega `GET /properties/:id/manage` (mismo criterio de autorización que editar — `assertCanManage`: dueño, `franchise_admin` del equipo, o `super_admin`), sin el filtro de estado visible, reusando `attachMediaUrls`.

**2. Sin borrar ni reordenar media.** Hoy `POST /:id/media` solo agrega — no hay forma de borrar una foto/video cargado por error, ni de cambiar el orden o la portada. Se agregan dos endpoints en `properties.controller.ts` (mismo guard `assertCanManage` que ya usa `addMedia`):

- `DELETE /properties/:id/media/:mediaId`: borra la fila de `property_media` y el objeto en R2 (nuevo método `deleteObject` en `R2Service`, con `DeleteObjectCommand` — no existe todavía, hoy `R2Service` solo sube y firma URLs). Si la borrada era la portada, la siguiente en `order` pasa a `isCover: true`.
- `PATCH /properties/:id/media/reorder`: recibe el array de `mediaId` en el nuevo orden, actualiza `order` de cada fila y pone `isCover: true` en la primera, `false` en el resto.

## Reglas de negocio

- Autorización de ver/editar/subir media/cambiar estado: la misma que ya rige en `properties.service.ts` (`assertCanManage` — dueño, `franchise_admin` del mismo equipo, o `super_admin`).
- Transiciones de estado: las que ya implementa la API (`draft → published → paused ⇄ published → sold/rented`), sin lógica nueva del lado del frontend más que mostrar el botón que corresponda al estado actual.
- Publicar consume cupo (`packages.service.consumeQuota`) — si no hay cupo, la API responde con error y el formulario lo muestra, sin publicar.
- Subir media no tiene límite de cantidad de archivos del lado de la API — el frontend no agrega uno.

## Escenarios

**Alta crea un borrador**
- Given un asesor logueado
- When completa el formulario de `/panel/propiedades/nueva` y lo envía
- Then se crea la propiedad en `draft` y es redirigido a `/panel/propiedades/[id]`

**Edición de datos**
- Given un asesor dueño de una propiedad en `draft`
- When cambia el precio en `/panel/propiedades/[id]` y guarda
- Then el precio se actualiza (`PATCH /properties/:id`)

**Carga de media**
- Given una propiedad en `draft` sin fotos
- When el asesor selecciona 3 fotos y las sube
- Then las 3 se suben una por una y aparecen en la galería, la primera como portada

**Marcar ubicación en el mapa**
- Given el formulario de alta sin ubicación todavía
- When el asesor clickea un punto del mapa
- Then `lat`/`lng` del formulario quedan seteados con ese punto

**Borrar una foto**
- Given una propiedad con 3 fotos, la primera como portada
- When el asesor borra la portada
- Then esa foto desaparece de R2 y de la galería, y la segunda pasa a ser portada

**Reordenar fotos**
- Given una propiedad con 3 fotos
- When el asesor arrastra la tercera al primer lugar
- Then el nuevo orden se guarda y esa foto pasa a ser la portada

**Publicar sin cupo**
- Given un asesor sin cupo disponible en su paquete
- When intenta publicar una propiedad en `draft`
- Then la API rechaza la operación y el formulario muestra el error, la propiedad sigue en `draft`

**Publicar con cupo**
- Given un asesor con cupo disponible
- When publica una propiedad en `draft`
- Then la propiedad pasa a `published` y consume una unidad de cupo

**Edición bloqueada a quien no gestiona la propiedad**
- Given un asesor que no es dueño ni de la misma franquicia
- When intenta abrir `/panel/propiedades/[id]` de otro asesor
- Then la API responde 403/404 según corresponda y el frontend no muestra el formulario

## Decisiones confirmadas con Marthin

1. Nuevo endpoint `GET /properties/:id/manage`, reusando `attachMediaUrls` y `assertCanManage`.
2. Ubicación: mapa Leaflet clickeable (`PropertyLocationPicker.tsx`, nuevo componente), no inputs numéricos — mismo patrón que el resto de portales inmobiliarios.
3. Borrar y reordenar media sí entran en Fase 1 (no quedan para después): nuevos endpoints `DELETE /properties/:id/media/:mediaId` y `PATCH /properties/:id/media/reorder`, más el método `deleteObject` en `R2Service`.
