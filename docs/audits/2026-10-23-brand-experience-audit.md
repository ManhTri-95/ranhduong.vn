# Rành Đường — current experience audit

23 October 2026 · Creative direction: **The Art of Wandering — Nghệ thuật của những lần rẽ**

## Scope and evidence

This is the historical pre-implementation audit. Its findings describe the checkout before this brief's product changes. The [blueprint](../superpowers/specs/2026-10-23-brand-experience-design.md) was subsequently approved and implemented; see the [implementation report](../runbooks/brand-experience.md) for current results and limitations.

Reviewed the public Nuxt route tree, its page compositions, shared shell, listing/search/filter behavior, photo implementations, maps, itinerary selection, motion helpers, SEO helper, tokens, relevant tests, `CLAUDE.md`, `docs/decisions.md`, UI specification, and the seven recent experience runbooks.

Evidence labels used below:

- **Source:** behavior directly established by the checked-out implementation; visual impact may still require a fresh render.
- **Observed:** freshly inspected in the existing Chrome window at `http://localhost:3100/da-lat`, including its accessibility tree and two desktop screenshots. The first view was already scrolled to featured places. It showed postcard overlap; a later view showed their separation as scroll progress changed. This is not a measured viewport test.
- **Archived:** checked-in screenshots/JSON from earlier QA. These are useful design evidence, not a new browser test or proof that the current checkout passes.
- **Pending:** requires current rendered, assistive-technology, network, or physical-device verification.

Initial browser limitation: the browser connector exposed no available browser. Native Computer Use could inspect the existing Chrome window, but stopped on attempted category navigation because it could not determine the browser URL confidently enough to enforce policy. No further actions were attempted through that surface. `https://ranhduong.vn` was also inaccessible to the web reader. After approval, an isolated headless Chrome context captured a fresh local baseline before product edits, then verified the rendered implementation. Production equivalence remains unverified.

## Actual public route inventory

All paths below are existing routes, not proposed additions. `[city]` is dynamic; the initial destination is `da-lat`.

| Route | Implementation and purpose | Render coverage in this audit |
| --- | --- | --- |
| `/` | `pages/index.vue`; 302 to `/da-lat` | Source |
| `/[city]` | `pages/[city]/index.vue`; seven-scene invitation, search, featured places, weather, zones, templates and collections | Source + observed local homepage |
| `/[city]/ca-phe`, `/an-uong`, `/tham-quan`, `/hoat-dong` | `[category].vue`; exactly four public category URLs; `RdCategoryGuide`, category identity and shared discovery filters | Source + archived category screenshots |
| `/[city]/khu-vuc/[zone]` | `RdAreaGuide`; actual city zones, category/tag/search/rain filters, lazy map preview | Source + archived neighborhood screenshots |
| `/[city]/dia-diem/[place]` | `RdPlaceDetail`; postcard, gallery, practical facts, directions, related places, closed-place handling | Source; fresh rendering pending |
| `/[city]/top/[list]` | `RdCollectionJournal`; ordered public collection, narrative, sharing, lazy numbered map | Source + archived collection screenshots |
| `/[city]/lich-trinh/[template]` | `RdItineraryDetail`; published template, day chapters, selected stop, synchronized map, ticket/share | Source; fresh rendering pending |
| `/[city]/ban-do` | `RdMapExplorer`; full-screen map, filters, viewport discovery, selected postcard and mobile sheet | Source; fresh rendering pending |
| `/[city]/tim-kiem` | GET search and suggestion combobox; maximum 20 search results; noindex/no-store | Source; fresh rendering pending |
| `/dieu-khoan`, `/quyen-rieng-tu`, `/ghi-nguon` | Static legal/source pages through `RdLegalPage`; API-independent content | Source |
| Unknown paths | `[...slug].vue` and `error.vue`; localized 404/recovery | Source |

There is no public standalone itinerary index or collection index: these entry points are homepage sections. There is no public itinerary creator, saved-place page, or `/l/[shareId]` page in this route tree. Runtime rules and guest APIs do not establish frontend availability. Map filters support six place categories, while public category pages intentionally support four; preserve that distinction.

## What already works and should survive

The requested creative direction is substantially present. `RdCompass`, `RdChapterLabel`, postcard edges, rust trails, paper/grid textures, coordinate captions and page-specific compositions already form a recognizable journal. The problem is consistency and utility, rather than absence of identity.

- `packages/ui/src/tokens.css` already supplies warm paper `#F7F2E8`, forest ink `#1E3A2F`, sage `#DDE5E2`, yellow `#E9B824`, rust `#943F2C`, and city/season accents. A palette replacement would discard established work.
- Category and area filters already share `RdDiscoveryFilter`; query normalization, GET fallbacks, focus restoration, stale-request protection and listing history are real features.
- `RdMapExplorer` keeps one selected slug, camera and sheet state within the app. Manual map movement offers a new geographic search instead of silently replacing the list.
- `RdItineraryDetail` already keeps one day/stop selection, preserves hidden stops, adapts one map between desktop and a mobile dialog, and retains crawlable SSR content.
- Collections preserve API ordering and map only real coordinates. Narrative paths are distinguished from navigable routes.
- Photos use responsive WebP variants, dimensions and lazy loading; the homepage landscape is explicitly credited destination imagery. Photo rights and OSM attribution are preserved.
- `usePageSeo` centralizes canonical, social and structured metadata. Current redirects, filtered noindex rules, SSR and 404/503 handling are valuable constraints.
- Motion is generally progressive enhancement, with focus finalization, reduced-motion support, teardown and event-driven frames rather than a perpetual scroll loop.

## Findings and priority matrix

P0 means broken functionality, a confirmed responsive failure, or an accessibility blocker. **No new P0 is confirmed by the limited fresh browser coverage.** Do not interpret that as a clean accessibility or responsive audit. Reproduce suspected failures before assigning P0. P1 addresses material utility/trust friction; P2 identity and polish; P3 experiments.

| ID | Priority / evidence | Actual implementation and consequence | Recommended change / verification |
| --- | --- | --- | --- |
| A01 | P1 / Source | `RdCityHeader.vue` hides `.header__map` until 900px. The mobile global navigation contains only three homepage anchors; the primary travel utility disappears from the shared header. | Keep an explicit 44px map entry on mobile, with wrapping at 320px. Check every public city route. |
| A02 | P1 / Source | `tim-kiem.vue` calls `RdCityHeader` without `editorial`, unlike the discovery and detail pages. Search loses the compass, discovery navigation and map entry immediately after the hero form submits. | Use the same compact city shell for search. Retain its practical result layout and combobox behavior. |
| A03 | P1 / Source + archived | `app.vue` passes `citySlug` to `RdSiteFooter` only when the path is exactly the city homepage. Category, area, place, collection and itinerary pages therefore end with the minimal legal footer and lose discovery exits. | Pass validated city context on city pages; preserve the compact map-sheet/legal/error footer. Check near fixed action bars. |
| A04 | P1 / Source | `RdPlaceDirections.vue` links to bare `/[city]/ban-do`; `parseMapFilters` has no place-focus input. A traveler leaves a place and reaches an unselected city map. Existing map session restoration only covers returns within a previous map session. | Add a validated place-focus link independent of API filters, resolve the actual public place, and fit its real coordinate. Test direct entry, reload, missing/private places and Back. |
| A05 | P1 / Observed + Source | `RdFeaturedPlaces.vue:14,43` translates outside columns inward by up to 64px while rotating cards. The first observed desktop screenshot showed adjacent postcards covering edge text/signatures; a later scroll state separated them. | Keep the collage treatment on noninteractive frames; remove translation across neighboring interactive card bounds. Test scrolling and pointer/keyboard focus at 1024–1920px. |
| A06 | P1 / Source + observed | Homepage SEO says “Quán nào cũng được hỏi lại trước khi lên đây,” while the same observed page includes unconfirmed places. `RdCityWeather.vue` says “gần bạn” although its link only applies `rainSafe` and the app has no user-location flow here. | Use truthful city-level wording. Preserve explicit owner-confirmation and weather caveats. No new verification/popularity claims. |
| A07 | P1 / Source + archived | `RdPlaceCard.vue` and `RdHomeRouteStory.vue` have no image-error fallback, unlike `RdFieldPhoto`, `RdCollectionPhoto`, `RdJourneyPhoto`, gallery and place cover. A present but broken image key behaves differently by route. | Reuse one entity-level place-photo behavior for real images, absent images and failed images. Test actual failed requests, not just absent keys. |
| A08 | P1 / Source + archived | Every area uses the same `RdAreaGuide` introduction; ordinary list responses do not promise geographic/editorial neighborhood descriptions. The archived mobile page presents 20 large repeated empty photo areas before later discovery content. | Preserve real region navigation, reduce placeholder height in no-photo listing cards, and prioritize names, notes and status. Use zone names and known data; defer authored neighborhood prose until supplied. |
| A09 | P1 / Source + archived | Essential links often use 10–12px type: header nav 11px, journal map/detail links 11px, mobile area description 12px, footer links 10–11px. Older neighborhood map-error imagery also shows Vietnamese fallback accent spacing; Vietnamese-safe display fallback is applied only in some newer page styles. | Centralize 15–16px body, 13–14px utility text and a shared Vietnamese-safe display fallback. Test font request failure and text zoom. Small type is a usability finding, not a claimed WCAG minimum-size violation. |
| A10 | P1 / Source | Homepage/place pages promote disabled personal-itinerary actions, including a full place chapter and an extra disabled bottom-bar control (`RdPlaceDetail.vue:85,93`). Labels are honest, but unavailable work competes with directions and published itineraries. | Make the existing published-itinerary link primary in this section; retain one concise availability note. Prioritize directions/call in fixed controls. Do not invent an add/save action. |
| A11 | P1 / Source | Skip links exist on home, place and map, but are absent from category, area, collection, itinerary and search. Repeated shell controls precede content on each navigation. | Add one consistent skip target per page; verify visible focus and destination focus. Legal/error pages need sensible semantic landmarks. |
| A12 | P2 / Source | `RdCompass.vue` is purely decorative, uses width/height 100%, and fixes needles at -25°. `RdMapExplorer` displays the same graphic beside “BẮC ↑”. The brand ornament and orientation control do not have distinct semantics. | Retain a decorative compass with bounded wrappers; add explicit direction/state only where meaningful. The north-up map indicator must point north or use an unambiguous north arrow. |
| A13 | P2 / Source | Motion vocabulary is split: tokens define 140/200/250/420/650/1200ms, map cameras hard-code 250/280/300ms, pins use 700ms, and `components.css` runs seasonal sway infinitely while visible after scroll. | Keep useful camera feedback; centralize its timings and replace seasonal sway with one finite response. Shorten the hero depth effect. Review paint cost before claiming a performance benefit. |
| A14 | P2 / Source + archived | Placeholder styles diverge: blank sage + glyph in home, field grid/glyph, contour/compass in collection, compact itinerary glyph, large place cover/gallery. In the observed homepage all six featured cards lacked images, making repeated empty panels dominate. | One recognizable category/grid/stamp grammar with context-specific density. Keep honest “Ảnh đang cập nhật”; avoid repeating a large compass on every card. |
| A15 | P2 / Source + archived | Empty collection still renders a full cover, trail/end-of-story structure, map invitation and share postcard for zero places (`RdCollectionJournal.vue`). It offers recovery, but the amount of editorial scaffolding exceeds the content. | One compact empty chapter, one map/discovery recovery, and optional related collections. Avoid a large empty narrative and promotional share surface. |
| A16 | P2 / Source | The place page always reserves full story/gallery/practical/journey chapters even with little content. Conditional best-time content leaves chapter numbers jumping; `RdPlaceDirections` says “Một điểm ghé đã có vị trí” even when coordinates are missing. | Collapse absent-photo and sparse-story sections, use conditional copy and number only visible editorial chapters, while retaining stable anchors and essential unknown-data labels. |
| A17 | P2 / Source | `RdCollectionPhoto` and `RdJourneyPhoto` duplicate responsive image loading/error state; stamps, eyebrow headings, dividers and route SVGs are restyled in several large page styles. | Extract only demonstrably shared photo/state/heading/stamp behavior. Keep page layout and map ownership local. Avoid a universal page template. |
| A18 | P2 / Source | `RdPlaceReveal` exposes “PLACE STORY”; `RdMapToolbar` exposes “THE LIVING MAP”. Headers/footer favor “Đi một vòng…” while the hero/collection use the requested core phrase. | Use Vietnamese utility labels and “Rẽ một chút. Hay cả chuyến đi.” as the primary brand line; keep other lines as supporting editorial copy. |
| A19 | P2 / Observed data | The local homepage exposes a collection named `tesdst` with description `cccccc`. This is existing content, not a frontend rendering defect or evidence of production content quality. | Record an editorial publishing check for the content owner. Do not rewrite, delete or suppress real records in UI code. |
| A20 | P3 / Pending | Full-page transition choreography, surprise discovery, and authored neighborhood storytelling are not prerequisites for current task utility. | Defer until the shared shell, state handling and current rendering are verified. No new animation library. |

## Per-page assessment

| Page role | Recognition / hierarchy / emotional engagement | IA, interaction and practical use | Responsive, accessibility, motion and performance |
| --- | --- | --- | --- |
| Home — invitation | Strong slogan and seven journal scenes; duplicate first-three featured places in route story and featured grid lengthen discovery. Missing photos weaken the collage. | Search/category/map/itinerary paths exist. Keep category choice close to the invitation; reduce competing inactive actions. | Fresh desktop overlap is actionable. Mobile hero/search and swipe discoverability need fresh review. Preserve eager LCP photo, no blocking intro and focus-safe suggestions. |
| Category — collection | Four actual identities, deliberate editorial cover, good heading progression. Repeated photo-less 4:3 cards dominate the archived mobile sequence. | Shared filters, exact active category, real tag counts, API order, load-more and Back support are strong. Sibling category reset is explicit, not accidental state loss. | Archived nine-width data is encouraging; current render not rerun. Preserve contained scrollers and keyboard focus when swapping category. |
| Area — field guide | Real zone names/navigation but identical introductions; no fabricated geography. Large no-photo listings reduce neighborhood distinction. | Region switching preserves filters; preview is intent-loaded and links to the correct filtered full map. | Existing minmax/min-width/bounded-compass repair should be retained. Archived font fallback and dense vertical length deserve attention; no newly confirmed overflow. |
| Place — postcard | Strong dedicated cover and practical information, but too much journal scaffolding when facts/photos are absent. | Directions and call remain real. Full-map context is lost; inactive add action competes with utility. Preserve closed-place behavior and verification status. | Mobile action bar clearance is already modeled. Test long names, zero photos, missing coordinates, gallery dialog focus and font failure. Keep lazy map and responsive images. |
| Collection — story | Ordered trail and cover differ appropriately from listings. Actual collection descriptions are shown once. Empty narrative should be shorter. | Real-order selection, map coverage count, sharing fallbacks and related collections exist. No false route line. | Archived normal/long/empty/broken-photo states available. Current map camera/list synchronization, keyboard focus and error layout remain fresh QA requirements. |
| Itinerary — journey | Day chapters, overview and schedule already provide a distinct role. Preserve rather than replace this composition. | Single day/key selection synchronizes card, pin and directions. Hash restores chapter; no personal creator UI exists. | Keep one responsive map and modal semantics. Verify 320px/short-height dialogs, unavailable stops, 5 days/long names, rapid selection and ticket fallback. No fresh defect claimed. |
| Map — explorer | Notebook tiles, branded markers, journal panel and preview already express an atlas. Orientation uses an ambiguous decorative needle. | Explicit region search, stale-request protection, filters and one selected slug are strong. Deep-link place focus is absent. | Existing sheet resize, safe-area and keyboard snap logic should survive. Test selection occlusion, keyboard/viewport resize, attribution, tile failure and list fallback. No fresh tile success claimed. |
| Search / legal / errors | Search looks like the older site; legal/error remain deliberately simpler. | Search combobox already handles IME, cancellation, keyboard selection and retry. Error page has recovery but always routes to root. | Unify search shell/skip link; preserve GET/noindex/no-store. Verify error banner wrapping at 320px before diagnosing overflow. |

## Responsive evidence and outstanding checks

Inspected archived `discovery-collection/cafe-390.png`, `cafe-1440.png`, `empty-320.png`; `field-guide-layout/after-320.png`, `map-error-320.png`; `curated-journal/journal-375.png`, `rong-gia-lap-320.png`. The neighborhood and category long screenshots visibly emphasize how much space missing-photo cards occupy. The compact collection screenshot demonstrates a useful existing editorial direction.

| Width | Checked-in evidence | Fresh audit status |
| --- | --- | --- |
| 320 | Category, area and collection JSON; category/area/empty images inspected | Not rerun |
| 375 | All three families; collection image inspected | Not rerun |
| 390 | Category/area records; category image inspected | Not rerun |
| 430 | Category/area/collection records | Not rerun |
| 768 | Category/area/collection records | Not rerun |
| 1024 | Category/area/collection records | Not rerun |
| 1280 | Category/area/collection records | Not rerun |
| 1440 | Category/area/collection records; category image inspected | Not rerun |
| 1920 | Category/area/collection records | Not rerun |

Archived field-guide runbook reports earlier overflow fixed at all nine widths, and blocked map tile/font requests. Those are historical results. Do not reintroduce old fixed-width SVG or grid problems, or claim they remain broken today. SVG child path bounds in collection JSON do not establish document overflow when their container clips them.

## Component reuse and motion conclusions

Retain `RdCompass`, `RdChapterLabel`, `RdCategoryGlyph`, `RdDiscoveryFilter`, listing-history helpers, photo URL/srcset utilities, `observeLivingRoute`, query helpers and existing map selection ownership. Consolidate place photography at `entities/place`, neutral compass/stamp/heading/state primitives at `shared/ui`, and the shell in existing widgets. FSD imports must remain downward; do not put place-category imports in shared components.

Use Reveal for brief editorial entrances, Trace for nongeographic chapter lines, Focus for actual selected places, Turn for category/day changes, and Discover for acknowledged actions. Preserve static SSR and reduced-motion end states. Avoid adding route transitions before navigation restoration is verified. Infinite seasonal illustration sway is the clearest departure from the new finite-motion brief; busy skeleton feedback is a separate functional case.

## Pre-implementation delivery boundary

At this audit's original delivery, the source review and proposed design were ready; fresh route coverage and implementation were still pending. The [implementation report](../runbooks/brand-experience.md) now records the completed local work and current verification. Staging, physical-phone testing, measured performance and accessibility conformance remain unverified. Archived pass counts below describe the original baseline.

## Current baseline verification

- `pnpm.cmd turbo run lint typecheck test build --filter=@ranhduong/web --output-logs=errors-only`: exit 0; **8 successful tasks, 4 cached**, 28.641s. This is scoped to web and its required dependencies, not the entire workspace. The web test task log reports 201 tests across 43 files; cached execution is not represented as a forced fresh run.
- `pnpm.cmd --filter @ranhduong/web test:ssr`: exit 0; **107 tests passed**, 1 file, 3.79s. These are production SSR fixtures, not a substitute for browser interaction or real production data.
- Both initial sandboxed pnpm invocations failed during registry/version-signature fetching. The same commands succeeded with approved network access; no signature-check bypass or package-manager setting change was used.
- The two original Markdown documents passed local-link, trailing-whitespace and final-newline validation. Product source files were unchanged at that baseline.
- A fresh independent builder review of the design reported “nothing important left.” This checks planning clarity, not visual quality or implementation correctness.
