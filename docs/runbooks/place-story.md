# The Place Story — Mỗi nơi, một câu chuyện

## Audit and design

The previous detail page preserved useful hours, source credits, contacts, verification warnings, directions and six related places. Its large gallery followed by one long stack made the important questions harder to scan. It had no dedicated map section, fullscreen photo viewer, visiting-moment hierarchy or connection to the homepage's Living Route identity.

This redesign stays inside the existing Nuxt 4/FSD architecture. The route retains the parallel city/detail requests, public contracts, redirects, retries, tracking, SWR behavior and SEO/JSON-LD. No backend changes, new endpoints, dependencies, fonts or unrelated place photographs were introduced.

The visual system extends the homepage: Lora headlines, Be Vietnam Pro interface text, Patrick Hand annotations, compact coordinate labels, paper grain, rust route lines, compass stamps and postcard edges. All colors, fonts, spacing and surfaces use the established shared tokens. Rust text retains 6.26:1 contrast on paper and 6.87:1 on raised paper.

## Chapters and authentic content

| Chapter | Content and behavior |
| --- | --- |
| 01 — Place reveal | Real first place photo, actual category/zone/address/coordinates, one H1, source-credit link, live-hours caveat, verification date and directions. Missing photos use an explicit placeholder. Closed places have their archival notice. |
| 02 — First impression | The existing `practicalNotes` field and stored tags. There is no separate public description field; missing editorial notes have an honest unavailable message. No local voice or story is attributed to a fictional author. |
| 03 — Photo journal | All actual `PlacePhoto` records, responsive WebP sources and complete credit/license/source links. Mobile native swiping and a live counter; desktop asymmetric postcards. Image links work without JavaScript. With native dialog support, they open a fullscreen-style viewer with Escape, arrow keys, previous/next controls and restored trigger focus. Modified clicks retain normal link behavior. |
| 04 — Before you go | Existing opening-hours component, address, relative price level, shelter, vehicle suitability and visit duration. Absent transport modes mean unknown, not inaccessible. Relative prices are never converted into money. Source-neutral wording avoids inferring owner confirmation from `unconfirmed: false`, which also applies to public attractions. Contact links and event attributes remain. |
| 05 — Right moment | Rendered only when a currently active place has stored `bestTime` values. The five-part timeline highlights those values and labels the other periods as having no recorded recommendation. It is explicitly distinct from opening hours and weather. |
| 06 — Find your way | Real address, coordinates, Google Maps directions URL and copy feedback/manual fallback. The existing MapLibre component is dynamically imported only after the user opens the map. It uses the already-fetched real point, existing city bounds/style/worker and attribution, with no second map system or geographic API request. Missing coordinates omit map controls; missing city data preserves the external directions fallback. |
| 07 — Your journey | Visible, disabled “Thêm vào lịch trình — Sắp có” and an explicit availability explanation, plus a working link to published itinerary suggestions. The product has no released add-place operation/selection flow. There is no fake save, success animation or drag interaction. |
| 08 — Next turn | Original API recommendations, three prominent cards and three more inside native details. Real detail links remain in SSR HTML. The existing API supports the nearby relationship; closed-place wording stays source-neutral about similar suggestions. |

Closed places omit visiting recommendations, the map/directions chapter, itinerary invitation and sticky visit actions. Unknown hours, prices, shelter, duration, photos, address and contact data remain explicit. No field is silently filled from an unrelated destination.

## Components and motion

- `pages/[city]/dia-diem/[place].vue`: journal shell, skip link, breadcrumb and optional city data passed to the widget. Metadata, canonical URL and structured data logic remain intact.
- `widgets/place-detail/ui/RdPlaceDetail.vue`: chapter composition, original status/tracking logic, travel notes, stored visiting moments, related cards and mobile actions. It owns the journal stylesheet through an external `<style src>` block.
- `RdPlaceReveal.vue`: image mask/depth entrance, place name, location stamp and real cover image. The image is eager/high priority, never faded from invisible; it has reserved dimensions. Title movement uses the existing 650ms route token; image depth uses 1200ms.
- `RdPlaceDirections.vue`: intent-loaded shared map, import-failure reload recovery, copy-address state and fallback. Focus moves into the map only if the opening trigger still owns focus. Async results are ignored after unmount.
- `entities/place/ui/RdPlaceGallery.vue`: real photo journal and native dialog viewer. Below-fold photos are lazy; the dialog image mounts only on intent. Viewer transitions use transform/opacity. Failed photos retain a readable state. Gallery controls reserve their space before hydration.
- `entities/place/lib/place-story.ts`: conditional presentation of travel notes/moments, actual coordinate formatting and active-place projection into the existing map card type.
- `RdOpeningHours.vue`: its title is now H3 inside the practical-information chapter; hours logic is unchanged.
- `RdCityHeader.vue`: optional `sectionBase` lets the shared editorial navigation target city homepage sections from a detail page. Homepage anchor behavior is preserved.
- `assets/place-story.css`: responsive journal composition and decorative connecting route. Existing `RdChapterLabel`, `RdCompass`, `RdPlaceCard`, media helpers and `observeLivingRoute` are reused.

There is no scroll interception, pinned sequence or continuous animation loop. The shared route observer batches visible-scene reads/writes on scroll, pauses when the tab is hidden, finalizes focused scenes, cleans up on unmount and restores static routes for live reduced-motion changes. CSS reduced-motion rules stop hero/gallery transitions and decorative rotations. Critical content never waits for an observer or animation to become visible.

## Responsive and accessibility behavior

Mobile puts the cover image before the place title, with a compact contents navigation, native photo swiping, two-column travel notes and a safe-area-aware bottom bar for directions/calling plus the visibly unavailable itinerary action. The body retains the original bottom clearance, including after the footer. Essential actions are also present in the reveal. Tablet uses balanced note/gallery grids; desktop places the headline beside the photograph, expands the gallery and lays out the day timeline horizontally. The route thread appears only when the outer gutter has room.

One H1, logical H2/H3 headings, actual links, native details/dialog semantics, keyboard controls, source credits, meaningful image alt text and visible focus outlines remain. Decorative compass/path graphics are hidden from assistive technology. Copying confirms success only after the clipboard promise succeeds; denial/unavailable clipboard shows a selectable address. No “open now” claim is embedded in cacheable SSR HTML.

## Verification and remaining release QA

Final verification: **20 successful workspace tasks** from `pnpm turbo run lint typecheck test build --output-logs=errors-only`; **164 web unit tests** and **92 production SSR tests** passed. `git diff --check` has no whitespace errors. New checks cover unknown practical data, ordered real visiting moments, coordinate hemispheres/zero, excluding closed/unlocated map points, all eight conditional chapters, photo provenance, itinerary availability, city navigation, deferred map resources and missing/closed states. Existing status, redirects, errors, canonical/JSON-LD, contacts and tracking regressions remain in the production SSR suite.

Independent review caught two important issues: detail-page header anchors pointing at absent local sections and an unsupported owner-confirmation claim. Both were corrected and re-reviewed.

Development follow-up: removing the previous scoped style block while Vite retained its old style request let the full Vue source fall through to PostCSS (`Unknown word openStatus`). The widget now owns the external, intentionally unscoped stylesheet via `<style src="../../../assets/place-story.css">`, replacing the page's script import. Verified against the running Nuxt dev server: the component module, new CSS module and legacy scoped-style URL all return 200; neither CSS response contains the TypeScript source. No cache deletion or dependency change is needed.

No browser is connected in this session. Responsive screenshots, real keyboard/touch/clipboard/dialog interaction, live map tiles, 200% zoom and measured Core Web Vitals remain unverified. Before release, check 390/768/1440px layouts, missing/one/many photos, dialog Escape/arrows/focus return, horizontal swiping/counter, live reduced motion, long Vietnamese names, closed/unknown fields, map import/tile failure, copy permission denial and footer clearance on a real phone. No staging deployment or real-device verification is claimed.
