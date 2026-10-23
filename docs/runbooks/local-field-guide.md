# The Local Field Guide — area discovery

Scope: `/{city}/khu-vuc/{zone}`. This extends the Living Route, Place Story, Living Map and Journey Atlas work without rewriting their pages. The request did not contain an attached screenshot, so the audit used the current source.

## Audit and reusable functionality

The route already fetched city metadata and a 20-place page concurrently, validated area membership, handled 404/503 responses, supplied canonical/social/ItemList metadata and used 15-minute SWR. Tags already had real counts, GET fallback, client navigation and focus restoration. Load-more already appended in API order, deduplicated existing places, focused the first appended card and restored loaded pages on Back.

The visual weaknesses are in presentation: a plain title, a generic introductory claim, 96px thumbnails in a uniform three-column grid and area navigation after all results. The container was already 1200px; source alone does not establish the screenshot's claimed unusually narrow column. The redesign changes hierarchy and use of that width instead of assuming an unobserved viewport defect.

Important data limits:

- Public city areas expose names/slugs, not neighborhood photography or boundaries. Area ordinal stamps follow the supplied navigation order, not administrative district numbers.
- Place cards expose actual cover keys, category, area, a practical-note excerpt and opening hours. They do not expose tag membership, prices or itinerary/save operations. A photo cannot be assigned to a tag collection simply because both appear in the same page.
- `PlaceListResponse` has no total result count. Displaying 20 loaded cards cannot establish that the area contains exactly 20 places.
- Existing keyword search ranks matches and has no cursor pagination. Combining q and cursor is rejected by the contract.
- The normal repository projection omits location. A geographic query adds real coordinates; the primary area listing must not gain bbox filtering merely to obtain map data.
- The existing MapLibre notebook style and its attribution remain the map implementation. No new animation library or dependency was added.

## Experience and design decisions

1. **Neighborhood cover:** a compact asymmetric editorial introduction with a real area/city H1, travel-journal copy, discovery/map actions and a postcard. The first supplied place cover illustrates an explicitly named place in the area. There is no substituted city or unrelated area photo. Without a cover, a labeled cartographic/category placeholder carries the journal identity.
2. **Top area navigator:** all actual city areas, selected state, journal numbering and horizontal mobile overflow. Changing area preserves committed q/category/tags/rainSafe but clears pagination. The selected link is revealed horizontally; intentional region navigation restores focus there without scrolling the page sideways or stealing initial page focus.
3. **Discovery filters:** keyword search, actual tag chips/counts, category and partial/full rain-shelter filtering. Native details reveals the two secondary controls. GET forms work without JavaScript; client submissions use Nuxt navigation and keep the existing same-path scroll behavior. No unsupported sort or price filter appears. Clear-all and active labels explain the state.
4. **Place collection:** photo-led postcards with category/area, one clamped practical excerpt, genuine opening status and a detail action. The first card spans two columns on wider screens only when it has a cover; this is a deterministic presentation rule, not a fabricated featured recommendation. Backend order and slug identity stay unchanged. No dense CSS grid packing reorders cards.
5. **Discovery moments:** two or three known tags with positive API metadata produce journal-style collection entries. Their links replace the tag selection and clear keyword/cursor, while retaining category/shelter context. Links lead back to the results fragment. Without enough supported tags, the section is omitted. Abstract paper compositions avoid claiming that an unrelated photograph belongs to a collection.
6. **Map entry:** an explicit invitation with authentic place links and a real map on intent. Up to four geographic matches are fetched using the original area/filter context, then the existing map module is loaded only when points exist. The decorative grid/compass is clearly labeled before loading; it is not presented as a geographic preview.
7. **Other neighborhoods:** actual alternative areas near the end, with filter-preserving navigation. No adjacency, distance, boundary or neighborhood-image claim is made.

The palette, typography, paper grain, compass, route path and postcard edge/shadow use existing tokens. Lora display text and Be Vietnam Pro retain Vietnamese support. Other category/search/list consumers keep their existing card layout. Supported save, personal itinerary, social ratings and pricing data were not invented.

## Implementation and data flow

- `pages/[city]/khu-vuc/[zone].vue` retains the public route, city/place loading, canonical, OG cover, breadcrumbs, ItemList, errors and retry. New normalized filters feed the same API. An area-only fetch key includes rainSafe so shelter toggles cannot reuse the wrong response. All non-base supported filters are noindex/follow. The SEO description now explains discovery without implying every place was owner-confirmed.
- `entities/place/lib/area-guide.ts` adapts supported public categories, tags, q and rainSafe; drops cursor for keyword search; builds context-preserving area/map links and data-backed moments. No shared API schema or backend endpoint changes.
- `RdAreaGuide.vue` composes the area presentation inside the existing place-listing widget slice, preserving FSD boundaries. `RdFieldPhoto.vue` and `RdFieldPlaceCard.vue` are opt-in entity components. Actual covers have responsive WebP sources, reserved dimensions and broken-image fallbacks; the hero is eager/high-priority, cards lazy.
- `RdDiscoveryFilter.vue` (generalized from `RdAreaFilter.vue` for the category collection) uses existing tag-chip logic, unique labels, committed URL state and native GET forms. Area mode retains its category controls. Duplicate navigation is guarded. On remount it restores the initiating control; a removed tail tag opens its containing details before focus. Search guards composition submission. Actual live-device IME behavior remains a manual check.
- `RdPlaceListing.vue` keeps its default renderer. The area variant uses contextual pagination, an honest loaded count and live updates. Existing Back snapshots and first-new-card focus remain. Abandoned load-more requests now receive cancellation and cannot update unmounted state.
- `entities/place/api/area-preview.ts` requests bbox from actual city bounds plus area/category/tags/q/rainSafe, clears cursor and caps at four. Response validation and the shared finite/in-city point check keep real API order and discard unavailable points. It never supplies fallback coordinates.
- `RdAreaMapEntry.vue` guards duplicate loading, aborts on disposal and checks request identity. API failure can retry; chunk failure offers reload. Empty geographic results are stated after the request, rather than treating absent list coordinates as proof of no places. Trigger focus remains available while loading and ownership is checked immediately before replacing it. The map and its point-list share one selected slug. Scale/control clearance and attribution remain visible at the intended widths.
- `local-field-guide.css` is owned by an external widget `<style src>` block, retaining development style-request compatibility.

## Responsive behavior, motion and accessibility

Mobile uses a compact cover, horizontal area/interest controls, a 16px search input and a single postcard column. At 640px the cover and grid become two columns; at 1024px a three-column editorial grid gains the first-photo span and map entry becomes a split composition. Region and moment collections allow touch scrolling without gesture-only selection. Filter controls use normal document flow; expanded controls do not cover results or trap focus. A sticky multirow toolbar was deliberately avoided because it would consume a large portion of a small travel viewport.

Hero text/image masks use the existing 650ms route token; state changes use 200–250ms, with a small hover lift/zoom. The shared event-driven Living Route observer draws the cover SVG and applies a slight photo-edge reveal during actual scroll. It runs scheduled frames only when needed, refreshes for appended cards and cleans up on unmount. Content is visible in SSR; no animation gate delays navigation. Reduced motion removes CSS movement and the shared observer finalizes the decorative path.

Semantic headings, ordered/unaltered result links, native forms/details, explicit labels, 44px primary tap targets and visible focus remain. Live status announces loaded counts, filtering and load-more failures. Opening status uses the existing client clock and actual hours, never cached SSR time; missing hours and unconfirmed facts are labeled. The map is supplementary to an accessible list and real detail links. No route geometry, completion status, estimated travel distance or total count is invented.

## Verification and review

Final verification on 2026-10-23: **20 successful workspace lint/typecheck/test/build tasks**, **187 web unit tests across 40 files**, **102 production SSR tests**, and no whitespace errors from `git diff --check`. Tests cover normalized supported filters, search/cursor compatibility, contextual links, indexability, known-tag collections, real geographic preview parameters, absent/out-of-city coordinates, request failures, SSR placeholders/photos, original ordering, filter/map/area/pagination links, empty areas, metadata and existing category/search/detail regressions. SSR also checks that the normal area page performs no geographic preview request before intent.

Independent review caught an incorrect tuple argument and the repository's geographic-only projection, plus hidden-tail-tag and asynchronous-map focus issues. The preview now uses the tested intent request, normal SSR fixtures omit coordinates as production does, and both focus issues were corrected. Re-review found no remaining important issues in these changes.

Development module, card/photo/filter/map-entry and external CSS requests, including a legacy style request, returned HTTP 200 without serving raw Vue source as CSS. Vite compiled the modified components. Nuxt DevTools reported its existing Vite-hook warning. Verification used the established elevated dev command because the earlier sandbox dependency scanner was denied access by Windows. The temporary server was stopped afterward.

At the original implementation verification, no browser was connected (`apps: [], browsers: []`), and no screenshot was attached. A later [responsive repair and rendered QA report](local-field-guide-responsive-repair.md) now records real Chrome verification at nine widths, keyboard/filter/navigation checks, missing-image and error states, and reduced motion. Physical-device touch/IME, 200% zoom, staging, measured Core Web Vitals and unrestricted live map tiles still need release validation. No staging or real-device acceptance is claimed.
