# Rành Đường — Brand Experience Implementation

23 October 2026 · Approved design: **The Art of Wandering — Nghệ thuật của những lần rẽ**

Implemented in the working tree on `feat/brand-experience`. Existing public routes, API contracts, seasonal palette, SSR metadata, canonicals and structured-data behavior are retained. No dependency, stored-content edit, deployment, push or merge was introduced.

Design and preparation: [audit](../audits/2026-10-23-brand-experience-audit.md), [approved blueprint and signature specifications](../superpowers/specs/2026-10-23-brand-experience-design.md), [implementation plan](../superpowers/plans/2026-10-23-brand-experience.md).

## Result by page

| Surface | Implemented change and purpose |
| --- | --- |
| Home | Interest/category entry precedes the second place story; interactive postcards no longer translate over adjacent cards. More restrained hero scale/depth and concise missing-photo frames. Inactive creator promotion becomes a small upcoming-feature note; itinerary links lead to published content. |
| Four categories | Preserve distinct covers, GET filters, actual order and filter history; shared media and compact missing-photo cards make scanning more practical. Body/utility type stays readable. |
| Area | Preserve real zone navigation and geographic context; shared location stamp, media treatment and compact absent-photo cards connect the field guide to the other pages. |
| Place | Concise sparse-content cover and photo note; number only populated story chapters. Replace inactive add-to-itinerary controls with published-itinerary entry. Directions/call remain primary; full-map link selects this actual place. |
| Collection | Nonempty ordered story, selection/map and share remain. Zero-place collections render a useful short journal state and recovery links instead of a large empty story/map scaffold. |
| Itinerary | Existing day/stop/map ownership retained; shared photo fallback, readable utility type, consistent camera timing and reachable mobile map control. |
| Map | Validated optional `place` query resolves through the public detail API. Focused records stay separate from filtered membership/count. Phone focus uses measured sheet/header padding. Selection, camera and sheet survive detail/Back; a real list link works without JavaScript. |
| Search and shell | Shared editorial header, heading, empty state and city footer. Visible phone map entry and search navigation. Consistent keyboard skip links and stable main focus. Error/retry banner wraps at 320px. |

Missing coordinates, photos and facts remain explicit. No unrelated photo, review, verification, travel duration or navigable route is invented. Collection trails continue to describe editorial order, with their existing non-routing caveat.

## Shared foundation and motion

Created components:

- `entities/place/ui/RdPlacePhoto.vue`: real responsive image or category/compass/cartographic fallback; priority/lazy loading, error feedback and reset when the photo changes. The caller owns frame dimensions; failed requests preserve that frame.
- `shared/ui/RdEditorialHeading.vue`: heading/kicker/description hierarchy.
- `shared/ui/RdDiscoveryStamp.vue`: bounded location metadata stamp.
- `shared/ui/RdEmptyState.vue`: concise state with practical recovery slot.
- `shared/ui/RdSkipLink.vue`: real anchor fallback and client focus transfer without a hash-triggered page remount.

Existing photo wrappers now use the same media behavior. New map-focus helpers reuse contract validation and the existing public-card projection. Public-web `html:root` sets the Vietnamese display stack with sufficient specificity; Lora remains primary and Times New Roman is the tested serif fallback. Additive page/section/body/utility/caption tokens preserve the palette and scope public-web typography separately from admin/tickets.

Camera focus is shared at **280ms**, reduced to zero for reduced-motion users. The seasonal response runs once for **650ms** instead of continuously. Existing Reveal/Trace/Turn/Discover interactions and observers are reused; no global route exit, scroll hijacking, new animation dependency or continuous decorative rotation was added. North-up map orientation uses the compass's explicit north state.

## Modified files

The [exact product/test file manifest](qa/brand-experience/modified-files.json) lists **56 files**: 49 modified and 7 created. They cover `apps/web/app`, web SSR tests and additive `packages/ui` styles/tokens. This report, the audit, blueprint, plan, decisions log and QA evidence are the documentation changes.

## Rendered verification

QA used production Nuxt output in a separate local preview with isolated installed Chrome/Playwright. A read-only same-origin proxy connected it to the existing local API; API CORS was unchanged. Existing development services were left running. No user browser profile was attached.

The [fresh baseline](qa/brand-experience/baseline.json) was captured before product changes. [Final layout evidence](qa/brand-experience/layouts.json) covers 13 route/state cases at each required width:

| Width | Cases | Document overflow | Uncontained outside elements | Undersized measured controls | H1 |
| --- | --- | --- | --- | --- | --- |
| 320 | 13 | 0 | 0 | 0 | 1 each |
| 375 | 13 | 0 | 0 | 0 | 1 each |
| 390 | 13 | 0 | 0 | 0 | 1 each |
| 430 | 13 | 0 | 0 | 0 | 1 each |
| 768 | 13 | 0 | 0 | 0 | 1 each |
| 1024 | 13 | 0 | 0 | 0 | 1 each |
| 1280 | 13 | 0 | 0 | 0 | 1 each |
| 1440 | 13 | 0 | 0 | 0 | 1 each |
| 1920 | 13 | 0 | 0 | 0 | 1 each |

The 117 cases include home, four categories, area, place, collection, itinerary, map, search results, empty search and 404. No browser page errors were recorded. The control geometry check measures buttons, inputs, selects and header links; it is not a claim that every inline link is 44px or that the site passes an accessibility standard. Bounded native horizontal strips are intentional; no global overflow masking was introduced.

Screenshots were inspected for representative mobile pages, tablet collection, desktop home/category and sparse/long fixture states. Examples: [desktop invitation](qa/brand-experience/after-home-1440.png), [mobile category](qa/brand-experience/after-cafe-390.png), [mobile place](qa/brand-experience/after-place-390.png), [empty collection](qa/brand-experience/fixture-empty-collection-390.png), [long tablet collection](qa/brand-experience/fixture-long-collection-768.png), [five-day phone itinerary](qa/brand-experience/fixture-five-day-itinerary-320.png).

## Functional and state verification

[Interaction results](qa/brand-experience/interactions.json): **11/11 passed** on the final stable build. They cover keyboard skip/main focus, category append/detail/Back, search/reset, real selected map postcard, zoom/selection restoration, focused pin above the phone sheet, focus outside filters without a false match, missing-focus recovery, no-JS list access, failed API/retry with the same query, and collection marker/card synchronization with clipboard-denied manual sharing.

[State results](qa/brand-experience/states.json) cover failed and loaded photo behavior; empty/long collection, missing/photo place and five-day itinerary at 320/390/768/1440px; day 5/stop/dialog/Escape synchronization at 390×600; unavailable fonts, live reduced-motion change and 200% text-size stress. All 9 state groups passed, including 20 fixture layouts. Failed-image height was **173.75px before and after** the request failure. Test fixtures and diagnostic imagery explicitly say “Giả Lập” or “ẢNH GIẢ LẬP / QA”; they were supplied only through disposable local GET responses and never written to the database.

[Additional checks](qa/brand-experience/loading-legal.json) passed **10/10**: a deliberately held pagination request showed its two bounded skeleton rows and `aria-busy`, then appended results and removed loading feedback at **320×568**; all three legal/source pages retained one H1 and no document overflow at 320/768/1440px.

Map interaction tests use a deterministic local background with actual place coordinates and production selection/camera code. They verify interaction geometry, not successful delivery of external tiles. The retry test explicitly aborts the navigation payload before aborting the client API call; otherwise a successful SSR payload would correctly avoid that client request. Collection marker testing uses “Xem tất cả điểm” before choosing a point outside the previously focused camera.

One intermediate browser run overlapped a rebuild and received missing old chunk files from the previous preview manifest; that run was discarded. The preview was restarted after the build, listing actions wait for their mounted status, and all 11 interactions and 117 layout cases were rerun successfully against the stable output. Final evidence files contain that last run.

One independent final review found four issues, all corrected with regression evidence: initial focus was not immediately persisted for Back; fresh focus skipped mobile padding; a Vietnamese photo note had an encoding error; and the focused-map list action was unavailable without JavaScript. Browser QA additionally caught and fixed skip-link focus loss and undersized search/map controls. No second review loop was used.

## Automated checks

- `pnpm.cmd turbo run lint typecheck test build --output-logs=errors-only`: **20 successful / 20 total**, 8 cached; exit 0, 57.982s on the final run.
- `pnpm.cmd --filter @ranhduong/web test:ssr`: **112 / 112 passed**, exit 0; final run started at 16:22:30 local time, 4.40s.
- Unit suites cover **1,725 tests**: web 205, API 612, contracts 621, geo 38, admin 249. New conditional map-focus and chapter-number logic was observed failing before implementation, then passing.
- SSR coverage includes existing redirects/SEO/public-data behavior and new focused-map canonical/noindex, invalid/array query, closed/missing/unlocated recovery and separation from API filters.

## Remaining release limitations

Google Fonts and OpenFreeMap tile requests failed in the QA environment. The font fallback and usable map/list recovery were tested; successful remote asset delivery and complete live cartography still need an environment with those services reachable. Existing sample collection title `tesdst` remains an editorial-content issue; it was not silently changed.

Physical-phone testing, Safari/VoiceOver, native virtual-keyboard resizing, real browser zoom, staging/production equivalence and remote CI were not verified. The 200% case is explicit text-size stress in Chrome, not a substitute for browser zoom. Core Web Vitals, conversion, discovery speed, full contrast/accessibility conformance and measured performance improvements are not claimed. The repository's staging/real-phone definition of done remains a release follow-up even though local implementation and checks are complete.
