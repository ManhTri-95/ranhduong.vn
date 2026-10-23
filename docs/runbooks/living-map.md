# The Living Map — Bản đồ biết kể chuyện

## Audit and direction

The existing map already had a good technical base: Nuxt 4 SSR, MapLibre GL JS 6.13, the committed notebook vector style, category sprites, GPU clusters, one selected HTML marker, abort-aware viewport pagination, three sheet snaps, map/list selection and Back restoration. It lacked map-local search, tag/zone controls, an explicit search-this-area action and a recognizable editorial discovery panel. Its full-width desktop toolbar reduced the usable split-screen composition; every camera movement automatically scheduled another request.

The redesign keeps the actual cartography and data flow. The left panel becomes a travel journal, while the map keeps its geographic labels and clear space. Compass details, rust coordinate labels, paper edges, numbered list entries and a directional postcard reveal connect it to the homepage and Place Story. No new dependencies, backend contracts, endpoints, fonts or substitute photos were introduced.

## Desktop and mobile architecture

- Desktop: discovery panel is `clamp(360px, 38vw, 520px)`; the map fills the rest of the viewport. Search/filters stay above one scrollable results region. The map remains visible while browsing. City guide and published-itinerary links sit above the map.
- Mobile/tablet: compact search, destination name, horizontally scrolling categories and an anchored advanced-filter panel. The original sheet keeps collapsed/half/expanded states, direct dragging, pointer capture, resistance and flick settling. Visible buttons provide the same three states; the handle supports arrow keys. The content is inert when collapsed, and safe-area padding remains.
- Short landscape/keyboard viewports: actual `visualViewport` height feeds the root size; a compact, single-row sheet header preserves list space. Expanded compact mode hides the secondary category/tools row while keeping search and city context. CSS media-query fallbacks cover SSR/no JavaScript. Header/attribution measurements reserve space for wrapped credits. Filter dropdown height follows the available viewport and remains internally scrollable.
- Native GET forms and actual place-detail links remain usable without JavaScript. The initial SSR list is limited to 50 entries, with its pagination availability indicated; native scrolling still provides the list alternative. Fullscreen footer/legal/analytics controls remain inside the results region.

## Discovery and URL state

`MapFilters` represents only supported query fields: `q`, category, tags, zone and `rainSafe`. The existing public `/cities/:city/places` endpoint applies them before pagination. Search is debounced 350ms and pauses during Vietnamese IME composition; submit works immediately and closes the keyboard. Timers/listeners are cleaned up. Changing a category or rain mode preserves the other fields. Advanced filters have real city zones and tag labels from API data, a visible active count, Apply and Reset.

The URL carries normalized filters. Keyword input stays within 100 characters without cutting a surrogate pair; tag values are validated, deduplicated, sorted and capped at ten. Repeated GET checkbox values are accepted and serialized into the existing comma-separated API field. Unknown city zones are ignored. Filtered URLs retain the base map canonical and are `noindex, follow`; unfiltered indexability/error behavior is preserved.

Selection, camera and sheet state remain session state for Back navigation. No high-precision user location is added to a URL. A selected place is not promised as part of a shareable filter URL. No geolocation control or permission request was added.

Price, shelter level beyond the existing rain-safe filter, best visiting time and transport filters are omitted because the public map query/card contract does not support them. No frontend inference or invented backend parameter replaces those fields.

## Viewport and request behavior

1. The first actual map viewport loads automatically. Initial fitting uses only finite, real place coordinates inside the city's approved bounds, with sheet/header padding and the existing minimum zoom. Saved camera state takes precedence.
2. User drag, keyboard/zoom controls and cluster expansion mark a changed area. They preserve the previously searched places and offer **Tìm trong khu vực này**, with explicit previous-area copy. An inline equivalent remains available in the expanded list.
3. Selection-driven camera movement does not refetch or dirty the query. Selecting the same place again can request focus without creating a second selection state or repeating an unnecessary camera animation.
4. Applying filters queries the current bounds. Search/filter changes and user viewport changes abort prior requests; request identity, filter identity, cancellation and unmount guards prevent stale responses from publishing.
5. Non-keyword queries fetch all cursor pages within the viewport and deduplicate slugs, preserving the existing repeated-cursor protection. Keyword queries obey the existing maximum of 50 and show the cap when reached. Tag metadata comes from the actual response.
6. API failure keeps previously loaded data and a retry. An empty successful result has a separate state; an unavailable result is not described as zero places. A disappearing search/retry trigger transfers focus to the results heading only when it still owns focus at confirmed completion.

## Marker to postcard / card to map

`selectedSlug` is the authoritative selection. Session fields are restoration copies. Clicking a marker reveals the corresponding postcard and focuses its heading. The mobile sheet opens to a useful level; selecting from the expanded list settles it to half height. Returning to the list restores scroll and focuses the selected row's marker action.

The postcard reuses `RdPlaceCard`: real cover or explicit photo placeholder, category/area, stored note, existing live-hour caveats, actual coordinates, detail link and Google Maps directions. It does not claim an unavailable address, price or rating. The directions event keeps the existing tracking attributes.

“Thêm vào lịch trình” is visibly disabled and labeled **Sắp có**, with an explanation and a working published-itinerary link. There is no released add-place operation in this checkout, so no save count, journey marker, success animation or duplicate-submission fiction is shown. Saved-marker states are not invented.

The selected marker animates its child using a short directional transform/opacity reveal; the SDK positioning transform stays intact. Postcards reveal immediately with the existing 420ms token. CSS handles these transitions without GSAP, WebGL decoration or a continuous animation loop. Reduced motion disables them and camera actions use zero duration when requested.

## Cartography and provider

The existing [notebook map](notebook-map.md), vector tiles, six category sprites, real coordinates, cluster source and attribution remain shared. No road network, geographic source or unrelated map style was replaced. There are no invented route lines between places.

MapLibre's supported [camera API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/) is used for initial bounds and small selection pans. The [metric scale control](https://maplibre.org/maplibre-gl-js/docs/API/classes/ScaleControl/) shows ground scale, not travel distance/time. Implementation was also checked against the installed 6.13 declarations/source. Keyboard and touch rotation are disabled for the north-up journal map, so its compass label remains accurate. Zoom controls keep 44px targets. Retry retains the current camera. A container observer resizes the canvas when the visual viewport/layout changes; map instances are not rebuilt for filters or selection.

OpenStreetMap, OpenMapTiles, OpenFreeMap and source/license links stay visible and keyboard reachable. Their actual rendered height is reserved above the sheet, including narrow widths. All substantive colors, fonts and surfaces use the existing tokens; no extra tile styling download is added.

## Changed files

- `pages/[city]/ban-do.vue`: filter parsing/serialization, initial data, canonical/noindex and widget composition.
- `widgets/place-map/ui/RdMapExplorer.vue`: viewport intent, cancellation, selected state, cached Back restoration, adaptive sheet and focus handling. Owns its stylesheet through an external `<style src>` block, preserving development style-request compatibility.
- `RdMapToolbar.vue`: journal identity, IME-aware map search, native GET filters, advanced controls and reset.
- `RdMapPostcard.vue`: authentic selected-place presentation and actual actions.
- `assets/living-map.css`: split-screen/cartographic journal, mobile sheet, compact-height fallback and motion.
- `features/place-map/ui/RdPlaceMap.client.vue`: optional journal presentation, metric scale, event intent, initial fit, explicit re-focus, retry camera preservation and resize cleanup. Homepage/detail consumers keep their existing defaults.
- `entities/place/api/place-map.ts`, `lib/map-query.ts`: existing query adapter, real metadata and validated URL state.
- `shared/lib/map-camera.ts`, `widgets/place-map/lib/map-sheet.ts`: viewport intent, real-point bounds and measured attribution clearance.
- Colocated tests and `tests/listing-ssr.test.ts`: filters, cancellation, pagination, compact geometry and production regression coverage.

## Verification and remaining QA

Final verification: **20 successful workspace lint/typecheck/test/build tasks**, **174 web unit tests** and **95 production SSR tests**. `git diff --check` has no whitespace errors. New regression cases cover real filter/query preservation, cancellation, cursor/tag metadata, viewport intent, finite-coordinate bounds, compact geometry, GET forms, canonical/noindex, empty results and unavailable data. Existing homepage/detail/SEO/status/redirect tests remain green.

Local development checks compiled the explorer, toolbar, postcard, shared map, external CSS and legacy style-request URL with HTTP 200 and no raw SFC source in CSS. Vite HMR reported the intended component/CSS updates. The initial sandbox-only dev dependency scan hit Windows access restrictions; the same verification outside the sandbox succeeded. Nuxt DevTools emitted its existing Vite-hook warning; no application compile error remained in these requests. The temporary verification dev server was stopped after checking these modules.

Independent review found a zero-height results area on a 320px landscape viewport. The compact sheet/header treatment corrected it and was re-reviewed. Tests model at least 80px of content with the compact header and at least 120px when expanded; this is code/geometry evidence, not a substitute for a rendered device test.

No browser is connected in this session. Rendered desktop/tablet/mobile layouts, touch/flick behavior, real keyboard/IME interaction, live tiles/clusters, system reduced motion, network throttling, 200% zoom and measured Core Web Vitals remain unverified. Before release, exercise 390×844, 768px, 1440px and 568×320, all sheet levels, soft keyboard, map/list re-selection, query races, Back, zero results, partial data, API/style/worker/tile failures and required attribution on a real phone. No staging deployment or real-device verification is claimed.
