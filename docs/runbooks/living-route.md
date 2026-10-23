# The Living Route — Rành Đường

## Creative audit and direction

The preceding homepage had real content and usable routes, but its repeated card grids, rounded panels and similar headings remained conventional. Motion was limited to a title entrance and hover feedback. There was no recurring device linking discovery, place cards, maps and itineraries into a recognizable brand experience.

The new concept is an interactive travel journal: **“Đi một vòng, biết thêm một nơi.”** Seven scenes share a compass, numbered chapter labels, a rust-colored route, postcard edges, paper grain, coordinate labels and handwritten annotations. Large Lora headlines contrast with Be Vietnam Pro interface text, monospaced map labels and the existing Vietnamese-capable Patrick Hand font. The original ivory/forest palette and city/season accent behavior remain; new surface/motion values live in shared tokens.

## Scene architecture

| Scene | Experience | Actual data / action |
| --- | --- | --- |
| 01 — Opening | Cinematic landscape, masked “Rẽ một chút. Hay cả chuyến đi.”, compass stamp and city coordinates | Coordinates come from `City.center`; the original accessible search and GET route remain. Discovery and itinerary anchors are real. |
| 02 — Follow the route | Three staggered photo notes on a drawn SVG line | Uses the original featured place response. Names, images, category, area and notes come from the API. Missing photos have an honest placeholder. The line is explicitly a narrative motif, not navigation. |
| 03 — Find your kind of place | Five directional editorial cards | Café/food/activity use existing categories; nature uses `view-doi`, check-in uses `song-ao`. The food drawing is decorative, not a photograph of an invented place. |
| 04 — Postcard collection | Tilted postcards, scroll separation, handwritten signatures; horizontal swipe on mobile | Reuses `RdPlaceCard` and the original featured query. Real status and owner-confirmation caveats remain. Every card links to its real detail route. |
| 05 — Discovery map | Compass invitation becomes the actual map after a click; list and marker selection stay synchronized | Uses `RdPlaceMap.client.vue`, the same MapLibre provider/style/pins as the full map. Reads four real located places via the existing API on intent. No second projection or schematic marker system remains. Attribution stays visible. |
| 06 — Make it your journey | A journal showing a published itinerary; opening it reveals actual timed stops | Existing template detail endpoint and shared contract. Null/private stops are omitted from this short preview without renumbering; day/time values are never synthesized. Full itinerary link remains available. “Tự tạo lịch trình” is disabled and labeled “Sắp có” because S38/S39 frontend routes do not exist. |
| 07 — Invitation | “Đường còn dài. Cứ đi rồi sẽ biết.”, opening photograph and compass signature | “Đi khám phá thôi” opens the existing full map. |

Weather, rain discovery, zone links, seasonal template promotion, curated lists, SEO metadata, canonical paths, retries and 404/503 behavior remain. The page still performs its original initial requests in parallel. No backend contracts, routes, framework, dependencies or animation libraries were added.

## Motion and progressive enhancement

- `shared/lib/living-route.ts` provides an event-driven observer for visible scenes. Scroll/resize events coalesce into one animation frame; geometry is read before CSS variables are written. There is no continuous frame loop, pinned scrolling or scroll interception.
- Decorative route drawing begins after actual scrolling. Server-rendered content and complete routes remain the default when JavaScript or browser APIs are absent.
- Hero typography reveals through line masks in 650ms with a 100ms second-line offset. The image uses a 1200ms depth/crop entrance, remains eager/high priority and never fades from invisible. This initial hero motion follows the new explicit creative brief; it supersedes the earlier no-initial-motion design rule.
- Desktop postcards separate using transforms, not layout changes. Mobile uses native horizontal scrolling and scroll snapping. Image direction and arrow feedback use 250ms CSS transitions on hover-capable devices.
- A user-requested itinerary preview gathers real stop cards into the timeline with 80ms offsets. It is a read-only preview, with no drag affordance.
- Reduced-motion changes cancel pending work, remove listeners and restore final route state immediately. Keyboard focus finalizes the focused scene so it does not continue moving. Background-tab work pauses. Observers, frames and in-flight preview requests are cleaned up on unmount.

## Accessibility and performance

One H1, clear headings, skip link, semantic navigation and crawlable anchors remain. Compass/route decoration is hidden from assistive technology and never intercepts clicks. Tap targets retain the existing 44px minimum. Search suggestions can overflow the hero; clipping is restricted to imagery and masks. Focus moves after opening a preview only if the trigger still owns focus. API errors retry in place; failed dynamic component imports offer reload recovery.

The map engine, worker, styles, geographic API request and itinerary-detail request are deferred until intent. A production SSR regression check caught Nuxt prefetching the 508KB map worker through a static URL import. Moving that import inside the existing map startup, matching the itinerary map, removed it. The generated homepage dependency manifest was inspected: neither its preload nor prefetch collection includes MapLibre resources. The actual map implementation remains shared with the full map page.

Existing local 400/800/1280 WebP assets, lazy below-fold loading, photo provenance and credits are reused. Original source images remain outside the public build. Dimensions/aspect ratios reserve imagery space; scroll effects only transform painted content. No heavy animation engine, external textures, WebGL decoration or new font download was introduced.

## Verification and release checks

- Required workspace lint/typecheck/test/build: 20 successful tasks.
- Web unit suite: 159 passing tests, including seven route lifecycle/progress cases and two authentic itinerary-preview cases developed red → green. The retired schematic projection and its three tests were removed.
- Production SSR: 89 passing cases, including seven-scene order, actual fixture city coordinates, category/tag routes, honest unavailable creation CTA, real published links, no initial geographic/template-detail requests, no map canvas/worker hints, empty/error recovery, weather/season behavior and SEO.
- Independent review identified search-dropdown clipping and failed dynamic-import recovery; both were fixed and re-reviewed. The premature worker prefetch was fixed after a failing SSR test.
- `git diff --check` is clean. Core contrast pairs retain the previous verified ratios; new rust text measures 6.26:1 against ivory and 6.87:1 against raised paper.

No browser is connected in this session. A connection was requested asynchronously; responsive screenshots, live keyboard/IME interaction, actual map/tile loading, device testing and measured Core Web Vitals remain unverified until a browser/device is available. Before release, exercise 390px/768px/1440px widths, 200% zoom, reduced motion (including changing it live), six search suggestions, touch swiping, map download/API failures, preview selection, published itinerary loading, and back navigation. No staging deployment is claimed.

## Changed building blocks

`RdJourneyFrame`, `RdHomeHero`, `RdHomeRouteStory`, `RdHomeInterests`, `RdHomeMap`, `RdHomeItineraryIntro`, `RdHomeClosing`; `RdChapterLabel`, `RdCompass`; homepage composition/CSS; postcard presentation in `RdFeaturedPlaces`; homepage header/footer motifs; route observer and journal-preview helpers/tests; abort-aware public fetch helpers; lazy worker import in the shared place map. The previous standalone moments composition and schematic pin helper were removed because these scenes replace them.
