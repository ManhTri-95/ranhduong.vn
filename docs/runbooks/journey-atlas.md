# The Journey Atlas — itinerary detail

## Audit

Scope: `/{city}/lich-trinh/{template}`, a published public template, not a private or editable guest itinerary. No screenshot was attached to the request, so the audit used the current implementation. Existing homepage, Place Story and Living Map changes remain intact.

The old page rendered every day as a long continuous text timeline. Although the public contract already exposes `coverKey`, stop cards did not use photography. Sharing and the genuine story-ticket workflow appeared after the entire schedule. The desktop map was only 360px high by default. Scrolling changed `activeKey` and selected day, while explicit map selection used a separate `selectedKey`; a timed scroll hold tried to keep these competing states aligned. Mobile and desktop used separate map component instances. These observations support the brief's hierarchy, map/timeline connection and multi-day navigation concerns. Backend numbers were directly displayed; real public templates normally supply consecutive numbers, but presentation did not protect against gaps.

Reusable pieces: public template/city loaders, `daySpan`, itinerary summary, directions builder, photo variants, category glyphs, existing day bar/carousel/action bar, ticket preview and native-share/clipboard fallbacks. The project uses Nuxt 4 SSR, Vue Composition API, strict TypeScript and CSS tokens. MapLibre 6.13.0 already uses the licensed warm notebook style and actual city bounds. No animation dependency, Tailwind migration, new endpoint or backend change was needed.

## Information architecture and design

1. **Journey cover:** expressive Lora title, real destination, days/stops, transport/pace/season/style, description disclosure, real travel interests and immediate journey/share anchors. A bordered, slightly rotated postcard uses the first actual stop cover. When absent, only Đà Lạt receives the existing licensed city photograph, explicitly captioned as destination photography. Other cities get cartographic artwork with no photo claim.
2. **Invite a friend:** the existing Zalo/Messenger/native sharing, clipboard/manual fallback and real ticket preview near the cover. These controls open the system share chooser; they do not claim a message was sent.
3. **Day overview:** horizontal chapter cards show the saved first/last schedule, count and actual place names. No route distance, aggregate journey duration or editorial day description is invented.
4. **Chapter navigation:** sticky, horizontally scrollable day links. With JavaScript, one day is displayed at a time; all days and real place links are included in SSR and remain visible without JavaScript. Selection is explicit and never follows scrolling. A day fragment restores the chapter on reload without changing the canonical URL.
5. **Journey postcards:** large stable stop numbers, actual photos or honest missing-image states, saved arrival/departure times, category, area, notes and directions. Selected stops expose available address/practical notes. Long notes use native disclosure. Unavailable places retain their schedule slot and number.
6. **Living map:** approximately 49/51 timeline/map on desktop; sticky, taller notebook-map panel. Mobile uses the same map in a native full-screen dialog, with a day selector, close action and swipeable previews with keyboard-selectable number buttons.
7. **The next turn:** authentic city discovery link; no fake personal-copy, edit, visit-progress or offline-navigation feature.

The ivory/forest/rust/yellow palette, paper grain, coordinate typography, compass and SVG route extend the established Rành Đường identity. Layout and styling live under `.rd-atlas`; token definitions and unrelated pages are not rewritten. Compact cover and cards prioritize the schedule on mobile. At 640px the cover and overview become editorial columns; at 1024px the timeline and map split. Short landscape screens reduce map chrome and keep controls accessible.

## State, numbering and maps

`atlasDays` creates presentation copies, assigning 1…N within each day without sorting or mutating API data. Stable backend keys remain the identity in the DOM, map, carousel and selection; unavailable places and repeated visits remain separate slots. API data still feeds original ticket/SEO flows unchanged.

One `{ day, key }` state is validated by `atlasSelection`; the selected stop, day schedule and action mode are derived. A marker focuses the associated desktop heading and scrolls it into view only as needed. A postcard selection updates the marker without recreating markers or resetting the camera. Day selection updates both panels. The chapter heading receives keyboard focus after rendering; the mobile dialog's day selector retains focus.

The existing map module loads on desktop proximity or explicit mobile intent. Imports are deduplicated and guarded after disposal. The single map persists when changing modes/days and resizes on visibility/container changes. Fit-day and focus-selected controls use actual coordinates. Fit padding is bounded to real canvas dimensions and measured toolbar height, with deferred fitting when the map is hidden. This avoids the former fixed-padding failure in a 120px landscape canvas.

No road-routing geometry exists in this contract. The optional dashed connection layer is off by default and explicitly labeled **“Nối thứ tự ghé (không phải đường đi)”**. It does not bridge unavailable stops. Real directions remain external Google Maps links via the existing builder. Per-leg minutes are existing saved planning estimates, labeled “dự kiến”; no total road metrics are calculated. Required provider attribution and style/license links remain beside the map. Failed SDK/style/worker loads retain list/directions alternatives and retry behavior.

## Motion, accessibility and performance

- CSS image/title masks use the existing 420ms reveal token without blocking actions. Day chapters use a 250ms opacity/6px transition; card emphasis uses border/shadow, and photo hover uses a small transform.
- The existing event-driven `observeLivingRoute` draws the decorative SVG cover path and timeline connector on actual scroll. It uses IntersectionObserver and scheduled frames only while needed; content is static and visible by default. It never changes selection or completion.
- Selected marker movement is brief, on its graphic child; camera movement is short and preserves zoom. Reduced motion removes CSS movement and sets camera durations to zero. Observers, listeners and map objects are cleaned up.
- Semantic heading/order structure, named controls, native links/details/dialog, visible focus, 44px tap targets and list-based directions remain available. The mobile modal supplies native focus containment, Escape and focus return, and locks background scrolling.
- Only actual public `coverKey` images appear as place photos. The cover is eager/high-priority; stop images are lazy with responsive WebP variants and reserved dimensions. Broken images use the honest fallback. No per-stop API requests, route calculations, extra dependencies or heavy motion framework were added.
- Dynamic SEO, canonical, structured trip data, ticket OG image, 404/503 behavior and public permissions are preserved by the route.

## Components and files

- `pages/[city]/lich-trinh/[template].vue`: editorial city header, correct city-qualified navigation and page spacing; existing fetch/SEO/error/ticket logic preserved.
- `widgets/itinerary-detail/ui/RdItineraryDetail.vue`: explicit chapters, unified selection, lazy map, desktop/mobile dialog, existing sharing/ticket/action integration. External widget-owned `<style src>` preserves Vite style-request handling.
- New `RdJourneyCover.vue`, `RdJourneyOverview.vue`, `RdJourneyStopCard.vue`, `RdJourneyPhoto.vue`: focused cover, day, postcard and actual-image responsibilities.
- Existing `RdItineraryDayBar.vue`, `RdItineraryStopCarousel.vue`, `RdItineraryActionBar.vue`: adaptive navigation, keyboard/photo previews and meaningful share-focus fallback.
- `features/itinerary-map/ui/RdItineraryMap.client.vue`, `lib/map-data.ts`: persistent-map resizing, fit/focus, optional order layer and bounded padding.
- `features/itinerary-share/ui/RdItineraryShare.vue`: focusable share heading; real share operations unchanged.
- `entities/itinerary/lib/journey-atlas.ts`, colocated tests, `assets/journey-atlas.css`, production SSR regression cases and the implementation plan.

## Verification and remaining QA

Final verification on 2026-10-22: **20 successful workspace lint/typecheck/test/build tasks**, **179 web unit tests in 38 files**, and **97 production SSR tests**, with no whitespace errors from `git diff --check`. Independent review identified the short-canvas fit failure and overview keyboard-focus issue; both were corrected and re-reviewed with no remaining important findings. Self-review also replaced desktop `dialog.show()` with attribute-based nonmodal opening so initial page load cannot autofocus a map control and skip the cover; mobile still uses intentional `showModal()` entry. This adjustment was independently reviewed. New unit cases cover presentation ordering/identity, unavailable slots, repeat visits, day-local selection, empty days, actual cover selection and short-canvas padding. Production SSR covers all-day/no-JavaScript content, genuine schedule/directions/share/ticket behavior, metadata/errors and real-photo versus destination-cover handling.

Local development compiled the widget, cover, stop card, map component, stylesheet and legacy style-request URL with HTTP 200, with no raw SFC source served as CSS. The first sandbox dependency scan hit Windows access restrictions; the identical development command outside the sandbox compiled successfully. Existing Nuxt DevTools Vite-hook warnings remain. An initial probe with an incorrect `/app/` URL returned 404; correct Nuxt module URLs omit that segment. The temporary server is stopped after verification.

No browser is connected (`apps: [], browsers: []`), and no screenshot was supplied. Rendered 375/430/768/1024/1440px layouts, native-dialog focus/touch behavior, real map tiles/controls, screen-reader operation, live reduced-motion switching, long content at 200% zoom, network throttling and measured Core Web Vitals remain unverified. Before release, review those widths plus 568×320 landscape, repeat visits, long Vietnamese titles, 20-stop days, empty/no-coordinate chapters, keyboard-only map entry/Escape/day selection, share cancellation/clipboard denial and map SDK/style/tile failures on a real phone. No staging or real-device completion is claimed.
