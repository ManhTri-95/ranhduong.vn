# Homepage editorial redesign — 22 October 2026

This records the first editorial revision. The subsequent creative brief is implemented and documented in [The Living Route](living-route.md); its map integration, motion system and verification supersede the corresponding details below.

## Original UX audit

The city homepage was SSR with working search, category links, weather, seasonal promotion, six featured cafés/restaurants, itineraries, zones and curated lists. Its compact text hero did little to establish the destination. Similar horizontal strips gave the page little visual rhythm; place photos were small thumbnails. The fixed map button occupied mobile space, while itinerary and map discovery were not explained as parts of a journey.

## New information architecture

1. Destination navigation and a full-width photographic hero: a clear H1, the existing accessible search, discovery CTA and a link to available itineraries.
2. Four interest cards linking the four actual public category routes. No unsupported categories were invented.
3. Larger editorial place cards using the original featured query, API images, areas, notes, confirmation caveats and real opening-hours behavior.
4. Travel context: existing `view-doi` and `chill` tags, plus the supported `rainSafe=true` map filter. No sunrise/sunset suitability is inferred.
5. Existing fresh-weather tile, including source, expiry and rain navigation.
6. Lightweight geographic preview and zone links. The initial list links actual featured places. On “Xem trước vị trí”, the existing place-list API fetches up to four located places; the displayed list then corresponds to the numbered markers. The background is explicitly schematic and must not be used for navigation. The full-map CTA opens the existing MapLibre route.
7. Itinerary storytelling, an explicitly upcoming personal-builder preview, and real published templates with existing seasonal promotion.
8. Inspiration through actual curated lists; honest empty/error copy when content is unavailable.
9. Photographic closing CTA, then branding, discovery/itinerary navigation, configured contact, legal links and copyright.

## Design rationale and responsive behavior

The established ivory/forest palette and Be Vietnam Pro/Lora fonts are preserved. Typography, spacing and large photographs supply the editorial character; shared tokens supply colors, radii and new spacing/shadow values. The headline remains Vietnamese and useful links remain prominent.

The layout starts as one column. Interest cards scroll horizontally with snap alignment; place cards stack. Place grids gain two columns at 640px and three at 1024px. At 768px, moments, map preview and itinerary introduction become split compositions. Header navigation expands at 900px. Containers have fluid gutters and text sizes. The footer respects the bottom safe area. There is no floating button obscuring mobile content.

## Components and architecture

- Route orchestration: `apps/web/app/pages/[city]/index.vue`; the original city/now/place/template/list requests remain parallel.
- New widget slice: `widgets/home-discovery/ui/RdHomeHero.vue`, `RdHomeInterests.vue`, `RdHomeMoments.vue`, `RdHomeMap.vue`, `RdHomeItineraryIntro.vue`, `RdHomeClosing.vue`.
- New pure helper: `widgets/home-discovery/lib/preview-pins.ts`, with colocated tests for coordinate orientation, missing/invalid/out-of-bounds data, and limiting results.
- New shared photo component/catalog: `shared/ui/RdDestinationPhoto.vue`, `shared/lib/editorial-photos.ts`.
- Extended existing components: optional editorial header/place-card presentations; homepage featured grid; curated-list empty state; homepage-only expanded footer selected by `app.vue`.
- Page styles: `app/assets/home.css`. Tokens: `packages/ui/src/tokens.css`. Existing presentations on other routes remain the default.
- Photo credits and their sitemap modification date: `pages/ghi-nguon.vue`, `shared/lib/legal-pages.ts`. Only responsive WebP variants ship; raw source files are outside the public build. Asset maintenance script reuses the installed API image processor.

No framework, dependencies, public routes or backend contracts changed. There is no article system, save UI or builder page to wire up; the implementation does not invent those features.

## Motion, accessibility and performance

- CSS-only 420ms title entrance and 200–250ms card feedback; no continuous animation, scroll observer, parallax or animation dependency.
- Reduced-motion users receive static content. Critical content is never gated by an animation or JavaScript reveal.
- One H1, descriptive headings, skip link, semantic navigation and real anchors. Search retains keyboard suggestions, Vietnamese composition support and native GET submission.
- Buttons and navigation targets retain at least 44px hit areas. Focus outlines remain visible; light outlines are used over dark photographic surfaces.
- Preview selection is available from the list and numbered pins, with pressed states and an announced current name. Loading/retry/empty states are explicit; after successful preview loading, keyboard focus moves to the selected pin or empty status only if the visitor remained on the load button.
- Primary imagery is eager with high fetch priority. Below-fold imagery is lazy; all images reserve dimensions and use responsive sources. The largest landscape WebP is 73,092 bytes; mobile may select 36,356 or 11,508 bytes according to viewport and pixel density. Original PNG/JPEG files are not shipped.
- No map engine, worker, tile request or preview API request is required during initial homepage rendering. The full interactive map remains on its existing route.
- Computed WCAG contrast ratios: `ink`/`paper` 11.06:1, `ink-soft`/`paper` 6.97:1, `ink`/`mist` 9.63:1, `paper-raised`/`ink` 12.14:1. Photo overlays improve readability; actual browser contrast/visual audit remains outstanding.
- Existing metadata, canonical paths, breadcrumbs, SSR status handling and weather freshness remain. There are no invented ratings, statistics, authors, prices or distances.

## Verification and remaining release work

Final complete workspace verification after review fixes passed `pnpm turbo run lint typecheck test build --output-logs=errors-only`: 20 successful tasks, 16 cached. Test results: web 153, API 612, contracts 621, admin 249, geo 38. Production SSR covers 88 cases, including homepage navigation, eager responsive hero imagery, absence of map initialization/preview requests, upcoming-feature honesty, empty content and failure/recovery. The source-page sitemap expectation was updated to its actual 22 October modification date. Independent review found and verified fixes for geographic recovery, mobile retry overlap and keyboard focus handling.

The session had no connected browser; attempting to open the in-app browser returned “Browser is not available: iab”. Consequently, no desktop/tablet/mobile screenshots, keyboard browser interactions, real-phone checks, measured Core Web Vitals or staging validation are claimed. Before release, inspect 390px, 768px and 1440px layouts; exercise search/IME, the on-demand preview, route navigation, reduced motion, zoom and slow-network behavior on a real device.

Personal itinerary creation and saving places remain future frontend work. Existing template routes are the usable alternative. Replace archival destination imagery with approved original photography when available; keep source/credit/license metadata and the public attribution current.
