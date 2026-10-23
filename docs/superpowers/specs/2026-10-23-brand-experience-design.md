# Rành Đường — Brand Experience Blueprint

23 October 2026 · **Approved by the user and implemented on `feat/brand-experience`.**

Creative direction: **The Art of Wandering — Nghệ thuật của những lần rẽ**

Primary brand line: **Rành Đường — Rẽ một chút. Hay cả chuyến đi.**

The [current experience audit](../../audits/2026-10-23-brand-experience-audit.md) records the original route inventory, evidence and priorities. Fresh local browser coverage was completed before product changes. Implementation, screenshots, verification and release limitations are recorded in the [implementation report](../../runbooks/brand-experience.md).

## Intent, constraints and approach

Build one recognizable travel journal with practical atlas behavior, for independent travelers choosing places and following trips on their phones. Success means a person can find a relevant place, understand what is actually known, and get directions while recognizing the same brand across routes. No measured improvement is claimed in advance.

The user approved this design and instructed implementation: “ok duyệt thiết kế, thực hiện đi”. Work followed incremental changes, existing functionality, honest data, current URLs and mobile utility.

Approaches considered:

| Approach | Benefit | Tradeoff / decision |
| --- | --- | --- |
| Consolidate shared patterns, then improve each current page | Repairs continuity and sparse-content behavior across already distinctive pages; smallest contract/dependency impact | Recommended; requires comparison across all routes during foundation work |
| Refine each page independently in the requested order | Easy page-by-page creative review | Leaves shell/photo/type differences in place longer and increases repeated fixes |
| Introduce a new visual system and page architecture | Maximum freedom to change compositions | Conflicts with the brief's instruction to preserve successful work and avoid an immediate rewrite; excluded |

Keep Nuxt 4/Vue/MapLibre, FSD layering, current API response semantics, city/season tokens, SSR, redirects, canonicals, structured data, filtered noindex and cache/error behavior. No new animation/UI dependency is proposed. `packages/ui` is also consumed outside the public web: additive tokens may be shared, but public-web typography and layout rules must be scoped to avoid changing admin or ticket rendering.

Do not add a creator, saved places, location permission flow, invented neighborhood prose, inferred owner verification, reviews, popularity claims, real route geometry or arbitrary place photographs. Content-owner corrections such as `tesdst` remain editorial work, not automatic database edits.

## Experience principles

1. **An invitation with a useful next step.** Every editorial section ends with a real place, category, area, map or published itinerary action.
2. **Facts are easy to find.** Place name, category, area, status, source caveat and directions stay readable. Handwriting carries optional notes only.
3. **The journal changes pace.** Covers invite; discovery lists scan; collection trails tell a story; itinerary timelines guide; maps stay spatial. Do not impose one card grid everywhere.
4. **The atlas remembers intent.** Filters, selected place/day and Back behavior survive supported transitions. Missing coordinates are stated plainly.
5. **The city is not a stock photograph.** Destination imagery is explicitly destination imagery; place photos belong to that place. Missing media has its own designed state.
6. **Motion responds and settles.** A directional cue communicates a change; reading never depends on movement.

## Visual foundation

Preserve `--paper`, `--paper-raised`, `--ink`, `--ink-soft`, `--mist`, `--line`, `--accent`, `--route-rust`, map tokens and seasonal accents. The suggested palette is reference, not a replacement. Keep high-contrast ink on yellow and existing photo/overlay contrast. Confirm contrast in rendered states before release.

Add semantic type aliases and apply them progressively to public-web components:

| Role | Proposed size / line-height | Font and rule |
| --- | --- | --- |
| Homepage editorial display | `clamp(36px, 7.2vw, 96px)` / 1.16 | Lora 700; two intentional lines may wrap naturally at narrow widths |
| Page title | `clamp(32px, 4.5vw, 64px)` / 1.2 | Lora 700; unrestricted long Vietnamese names wrap |
| Section heading | `clamp(26px, 3.4vw, 44px)` / 1.25 | Lora 700 |
| Place/card title | 19–22px / 1.4 | Lora 700 in editorial cards; existing sans for compact map rows |
| Body / description | 15–16px / 1.65 | Be Vietnam Pro |
| Utility / metadata | 13–14px / 1.5 | Be Vietnam Pro; status/directions never handwriting |
| Cartographic caption | 11–12px / 1.6 | Existing monospace; nonessential codes may be smaller |
| Annotation | 18–22px / 1.35 | Patrick Hand; one short note per composition |

Use the existing Vietnamese-safe serif fallback consistently for public display text. Keep existing external font loading initially; font self-hosting is separate work unless new browser tests demonstrate a blocking problem. Test unavailable web fonts and accented Vietnamese strings.

Retain the 4px spacing base, content max 1200px, 20px phone gutter, existing responsive editorial gutter, postcard radius 4px, normal card radius 16px and pill controls. Add role aliases where helpful rather than a new competing scale. A page's width includes its padding (`box-sizing: border-box`); do not accidentally create nested 1200px-plus-gutter shells. Use `minmax(0, 1fr)` and `min-width: 0` where content can grow.

Use 4:3 real place photography in listing postcards, 16:9 map previews, and the existing place cover composition. No-photo listing panels may be shorter from SSR based on known absence of a key; a failed image keeps its reserved frame to avoid layout shift. The photo-less card still has name, category/area, available note, status and a clear link.

## Reusable component rules

Names below are proposed; builders may adjust names to fit existing conventions without changing behavior.

| Component / location | Design contract |
| --- | --- |
| Existing `RdCompass`, `shared/ui` | Decorative by default, hidden from assistive technology. Accept an explicit orientation/state only when supplied by an action. Wrappers bound sizes: 20–24px utility, 40–56px stamp, at most 80px editorial ornament on phones. No geolocation implication. |
| `RdPlacePhoto`, `entities/place/ui` | One responsive photo and error-state implementation using current media utilities. Category glyph/grid/text when absent or failed. Priority only for actual above-fold image. Place domain stays out of shared. |
| `RdEditorialHeading`, `shared/ui` | Semantic heading level chosen by caller, optional chapter/caption; no hidden layout dependency. Reuse the existing chapter label. |
| `RdDiscoveryStamp`, `shared/ui` | Short label/number for category, area or journal context. Data comes from caller. Decorative numbers are aria-hidden; do not imply verification. |
| Existing filter chips / `RdDiscoveryFilter` | Preserve GET/IME/query/focus logic and tag semantics. Native pressed/active labels, 44px target and clear reset. No new parallel filter system. |
| Small state panel, `shared/ui` | Heading/message plus one actual recovery action or slot, optional small compass. Status announcements on meaningful changes, not every card/image. Reuse `RdErrorBanner` where it fits. |
| Route connector | Initially CSS/presentational SVG within existing page compositions; consistent rust, fine dashed baseline and numbered stops. Extract a component only after two identical uses. Never substitute it for geographic routing. |
| Existing place cards | Share photo and typography, retain compact map rows, listing postcards and curated editorial rows as distinct purposeful layouts. Clickable bodies never overlap neighbors. |

Avoid extracting a universal cover, page template, map controller, or state machine. The existing day/key and selected-slug owners remain authoritative.

## Signature interaction specification

| Signature / vocabulary | Trigger and feedback | State, fallback and acceptance |
| --- | --- | --- |
| Discovery Invitation / Discover | Hover or keyboard focus on a category/map invitation gives a small directional arrow/needle turn | 140–180ms, transform only; activation uses the existing link. Touch needs no hover; reduced motion uses a static selected cue. No random destination or delaying intro. |
| Living Compass / Focus | Map-oriented indicator shows actual north-up direction; compass within an activated discovery control can settle toward its arrow | Distinguish decorative emblem from orientation. No continuous rotation, device-heading claim or location permission. Label controls with actions, not “compass”. |
| Wandering Trail / Trace | Existing chapter lines reveal once in view or mark a chosen collection/itinerary item | Use current observer; reading and links remain visible without JS. Number order follows actual API order; narrative line explicitly is not a navigable road. No scroll hijack. |
| Category Identity / Turn | User chooses another category; active marker, cover tone/glyph and heading update coherently | Retain zone/rain state and current documented reset of category-specific query/tags/cursor. Preserve focus on the active category. 200–250ms; no blanking the results before navigation is ready. |
| Neighborhood Exploration / Turn | User selects a real zone; region label/cover/filter context updates | Preserve supported filters; do not pan an illustrative SVG as if it were geographic data. Existing lazy preview uses actual coordinates. |
| Living Place Postcard / Reveal | Real photo or intentional placeholder and visiting facts appear together | Keep image space, directions and status immediately available; 350–420ms optional frame reveal. Sparse pages stay concise. Gallery retains dialog keyboard/credit behavior. |
| Story Trail / Focus | Select “Trên bản đồ” or a collection marker | One selected slug; matching numbered pin, selected summary and list state. Do not move the reader into another item unexpectedly. Existing coverage/missing-location labels stay. |
| Living Journey Timeline / Focus | Select day, stop or numbered pin | One day/key; matching timeline card, map and directions action. Keep schedule and unavailable slots intact. Reduced motion uses instant camera/focus. |
| Map Discovery / Focus | Select actual result/marker, or explicitly search the new viewport | 250–300ms bounded camera move; viewport search remains opt-in after manual movement. Selection camera does not trigger a second results search. |

Proposed motion aliases: micro 140ms, state/turn 200–250ms, focus-camera 280ms, card reveal 420ms, editorial reveal/trace 600–650ms. Reuse current easings. CSS values and a tiny shared numeric camera constant may coexist; do not parse stylesheet values on every interaction. Hero depth settles within 650ms; the LCP image is visible from first paint. Replace seasonal infinite sway with one finite response and no recurring idle movement. Busy feedback may persist only while genuinely pending, with reduced-motion static text available.

No global page-out transition is required. Nuxt loading feedback remains lightweight. New route-transition experiments are P3, after scroll/context restoration works.

## Navigation and context contracts

- Shared city shell on all ordinary city routes: logo/home, discovery entry, published itineraries, inspirations, map. Map remains visible on mobile; at 320px use two wrapping rows rather than tiny labels or clipping. Header does not become a new sticky overlay.
- Search uses that shell and the existing accessible GET search. Legal/error views may remain compact. Footer keeps city discovery links for validated city pages; fullscreen map keeps its compact footer inside the sheet.
- Back from place to listing must retain existing history snapshot and scroll restoration. Do not replace browser history with an unconditional homepage “Back” action. A direct-entry breadcrumb can still lead to the city; label it as a destination.
- Add a validated optional map focus query `place=<slug>`; it is navigation state, not a filter or API-list parameter. Canonical stays `/[city]/ban-do`; focus URLs use noindex/follow. Tests must cover direct link, router navigation, reload and invalid values.
- Resolve a focused place through the existing public detail endpoint; never treat URL coordinates or cached private records as authority. If active and located, initialize the camera at its real coordinate, select its actual record and show its preview, then load the visible region using existing filters. Do not insert it as a false filter match when filters exclude it: keep the focused record separate from result membership and explain that distinction. A missing/hidden/closed/unlocated place leaves a usable city map and a concise recovery message. Stale requests cannot select the wrong place.
- Map filtering clears an incompatible focus query and selection; selecting another place updates session selection normally. Keep current session restoration for map → place → Back. Do not carry a focused private record or internal error into URLs.
- Collection and itinerary inline maps remain the main context-preserving maps. This iteration does not create a full-map collection/itinerary overlay or pretend a city map preserves an itinerary route. Full-city exits must say they open the city map; directions remain per stop.

## Page-by-page improvement plan

This is the approved experience sequence. The [implementation plan](../plans/2026-10-23-brand-experience.md) records the concrete edits and checks.

| Order / page | Primary goal and controlled change | Signature and acceptance |
| --- | --- | --- |
| 0 — rendered audit gate | Finish fresh views of category, area, place, collection, map, itinerary, search and states. Capture evidence before major code changes. Escalate reproduced P0 above all polish. | Record current failures separately from historical screenshots; no unsupported pass claims. |
| 1 — foundation and shell | Apply shared type roles/fallback, city shell/footer, skip links, photo behavior, bounded compass and finite-motion aliases. | Same useful actions across routes, readable utility text, no admin/ticket typography change. |
| 2 — homepage | Keep slogan/landscape and search; move interest/category entry ahead of duplicate featured storytelling if mobile audit confirms the delay. Remove interactive postcard overlap, shorten no-photo frames and reduce inactive promotion. | Discovery Invitation; choose category, search, map or published itinerary without decorative delay. |
| 3 — category | Keep four covers and query logic; reduce repeated empty-photo weight and make active filters/results easier to scan. | Category Identity; keyboard focus and intended zone/rain continuity survive category switch. |
| 4 — area | Preserve repaired grid/SVG behavior, real regions and filtered map. Tighten generic copy and missing-photo density; use only supplied facts. | Neighborhood Exploration; map entry and region switch retain supported context. |
| 5 — place | Prioritize place identity, concise known facts and directions; collapse duplicate empty gallery/story scaffolding and inactive itinerary section. Implement full-map place focus. | Living Postcard; absent/broken photos and missing coordinates remain honest; closed places do not regain visit actions. |
| 6 — collection | Keep ordered narrative and two-way map selection; use shared media/state styles and compact zero-place experience. | Story Trail; actual order, selection, share fallbacks, photo attribution and related links survive. |
| 7 — map | Integrate place-focus entry, correct orientation, harmonize state/camera feedback and verify mobile sheet/list focus. | Map Discovery Focus; no false result membership, no selection-triggered search, usable list after tile failure. |
| 8 — itinerary | Keep existing day/key architecture and one responsive map; align utility type/media/motion and validate sparse/long/short-height states. | Living Journey Timeline; day/stop/map/directions remain synchronized without scrollspy or invented route geometry. |
| 9 — cross-page QA | Search, legal/error/retry, navigation/Back, all widths, no-JS, keyboard, reduced-motion and failed network pass. | Consistent shell/voice and immediate recovery from real failures. |

## Responsive strategy and verification criteria

390px is the working design; 320px is a required constraint. One-column main flow on phones. Native horizontal scrolling is limited to intentionally bounded category/region/filter/gallery strips with a visible continuation cue; all functionality stays keyboard reachable. No horizontal page scroll or global `overflow-x: hidden`.

| Viewport widths | Layout intent / priority |
| --- | --- |
| 320, 375, 390, 430 | Wrapping two-row shell; full-width search; concise missing-photo rows/cards; 44px controls; directions in existing safe-area bar; readable labels and contained SVGs |
| 768 | Two-column discovery when names and content fit; preserve 1-column story reading order and native strips where appropriate |
| 1024 | Existing desktop map/itinerary split begins here; map canvas measures available space; no narrow schedule columns |
| 1280, 1440 | Three-column discovery with minmax(0,1fr), bounded editorial cover; no animated card collision |
| 1920 | Centered content max; intentional edge space, no stretching paragraphs or map preview assets |

At each width record document width, offending element bounds, intentional scroller boundaries, controls, text wrapping and screenshot. Also test 320×568 and short-height map/modal views; native viewport/keyboard resizing; 200% text/zoom; long Vietnamese names; unavailable web fonts; zero/one/many records; absent/broken photos; loading/empty/error/retry; no JavaScript; reduced motion and mid-session preference change. Confirm keyboard focus is visible and unobscured by bottom controls; image failure must not shift surrounding content.

Fresh QA used an isolated headless Chrome software-test context with no attachment to the user's browser. The connector/native-browser limitation remains part of the historical audit. Current screenshots are separate from archived references. Physical phone and Safari checks remain separate from desktop emulation.

## Implementation priority and release criteria

| Priority | Work | Release rule |
| --- | --- | --- |
| P0 | Any freshly reproduced broken interaction, viewport overflow, clipped essential control or keyboard blocker | Fix before visual changes; give exact reproduction/evidence |
| P1 | A01–A11: shell, mobile map access, context, overlap, truthfulness, image failure, sparse discovery and readable utility | First implementation increment, then route-by-route visual verification |
| P2 | A12–A18: meaningful compass, finite motion, shared placeholder grammar, empty narrative, component/voice consolidation | Apply within each page pass; do not balloon into architecture changes |
| P3 | A20: experimental transitions/discovery | Deferred; not part of this release |
| Content | A19 and authored neighborhood introductions | Owner supplies/approves actual content; no silent edits to stored records |

After implementation run the required `pnpm.cmd turbo run lint typecheck test build --output-logs=errors-only`, then production SSR `pnpm.cmd --filter @ranhduong/web test:ssr`. Use existing meaningful tests for query normalization, stale requests, listing restoration, SEO and itinerary selection; add tests for new focus-state branching before implementing that logic. Styling/content changes use rendered verification rather than tests that mirror CSS.

Final implementation report must give: changes, modified files, actually created shared components, actual motion changes, viewport/state evidence, functional/automated results, failed checks, remaining limitations. Report current command counts rather than earlier runbook counts. No claims of increased conversion, faster discovery, Core Web Vitals, or accessibility conformance without measurement.

## Decisions left to the builder

Local component names, additive token names, exact finite arrow path, and code-edit batching are routine builder choices. Do not add dependencies or change public URLs/backend schemas. Any new real content, broader map/itinerary product flow, or architecture change requires an explicit design update. The first build work follows approval of this document and completion of the outstanding rendered audit gate.

Independent builder check completed before approval. Human approval, implementation and one independent final code review are complete. The implementation report distinguishes current checks from the pre-change baseline and records remaining release checks.
