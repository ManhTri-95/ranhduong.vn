# Topic detail — The Curated Journal

The public `/{city}/top/{list}` route now presents a collection as a travel journal: a typographic cover and photographic postcard, a numbered story trail, an optional map, a sharing postcard, and real related collections. The supplied brief referenced an old screenshot, but no screenshot was attached; the previous route implementation was audited directly.

## Data and behavior audit

- `CuratedListsService.detail()` resolves a published collection and projects active cards in saved `placeIds` order. The frontend preserves this array without sorting.
- The existing detail contract provides title, description, slug and `PlaceCard[]`. Cards provide category, optional other categories/area/note/cover key, opening hours and confirmation state. No new API fields or endpoints were introduced.
- A cover uses the first available real `coverKey`. Place photographs use the existing 400/800/1200 WebP variants, responsive sizes, fixed aspect ratios and lazy loading below the cover. Missing or failed photographs display a compass/contour placeholder with an explicit “Ảnh đang cập nhật” caption.
- Short descriptions appear on the cover. Descriptions longer than 170 characters appear once in a separate introduction. Missing descriptions add no empty introduction or fictional copy. Practical notes are the only place descriptions.
- Categories link to existing public category routes; the two categories without public landing pages use the existing category-filtered map. Area names come directly from cards; they are not guessed into area slugs.
- Current hours are computed client-side with the existing clock/status utility, preserving the “Thông tin chưa được quán xác nhận” caveat. No rating, endorsement, completion state, or fabricated chapter number is added.
- Existing SSR fetch, 404/503/retry, canonical/OG/breadcrumb/ItemList metadata, stable URLs, published visibility, and optional related-topic failure behavior remain intact.

## Map and sharing

The site uses MapLibre and its existing notebook style, not Google Maps JS. Normal collection cards omit coordinates. On map intent, the widget requests the existing city-bounds map projection through the existing paginated loader, joins locations by slug, and retains the original collection entries and marker numbers. Geographic data never replaces a collection's title, note, category or order. Missing coordinates remain explicit and accessible in the alternative list.

One `selectedSlug` controls story highlighting, numbered pins, the list and selected-place preview. Opening a story's map action moves focus to the map heading; marker selection does not trigger reciprocal scrolling. Fit-all is available, normal resizing retains one map, and failures expose retry. Two-finger panning preserves page scrolling. Coincident markers have bounded offsets. Attribution remains visible. No route geometry is drawn; the story connector is decorative.

Map navigation links on this page opt out of Nuxt prefetch, including an opt-in `deferMap` prop on the shared editorial header. This avoids fetching the full map route's geographic payload before intent. Other header consumers retain their previous prefetch default.

Sharing reuses `shareItinerary`: native share when available, clipboard fallback, visible cancellation/success feedback, and a selectable canonical URL if copying fails. The sharing panel is HTML, not a generated image feature.

## Motion and responsive design

Existing tokens, Vietnamese-capable display fonts, scoped CSS and `observeLivingRoute` provide the cover entrance, photo reveal, compass seal, hover depth and reading-progress connector. There is no new animation dependency, scroll hijacking, pinned section or sticky mobile overlay. SSR starts readable; keyboard focus and reduced motion finalize the decorative progression. The route observer is disposed on unmount.

Mobile uses stacked cards and a constrained cover illustration. Tablet simplifies spacing and uses wider related-topic columns. Desktop uses an asymmetric cover and aligned photo/text story entries. SVGs and images are bounded locally; no global overflow clipping is used.

## Verification

- Workspace: `pnpm.cmd turbo run lint typecheck test build --output-logs=errors-only` — 20 tasks successful.
- Web unit tests: 43 files, 201 tests, including three location-join cases.
- Production SSR: `node node_modules/vitest/vitest.mjs run --config vitest.ssr.config.ts` from `apps/web` — 107 tests passed. Includes saved order, SEO, SWR, empty/error recovery, single-place/no-description and 22-place/long-description cases.
- Independent source review found no remaining Critical or Important issues. Its gesture, attribution, tap-target and coincident-pin suggestions were addressed.
- Installed Chrome: no horizontal overflow at 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px. Twelve stress layouts cover single-place, empty, 22-place/long-title and broken-photo collections at 320/768/1440px.
- Full-page screenshots at 375, 430, 768, 1024 and 1440px were captured and visually inspected, including image loading, typography, card proportions, map/illustration sizing and footer placement. Additional short/long/empty/error screenshots are retained.
- Browser interaction checks passed: no geography before map intent; API error/retry; original numbered markers; map/card/list/preview selection; one map canvas; fit-all; missing-coordinate number gaps and feedback; map style error/retry; clipboard success and blocked fallback; native-share success/cancellation; reading-progress motion and changing reduced-motion preference; no-JavaScript SSR place links. No runtime or hydration errors were recorded.
- Browser evidence: `docs/runbooks/qa/curated-journal/results.json` and adjacent screenshots. Test harness: `.superpowers/curated-journal-qa.mjs` (local ignored QA workspace).

QA uses explicit “Giả Lập” fixtures and an existing licensed photograph only as a test image; no production place data was inserted or modified. Automated map interactions use a deterministic local MapLibre style. Production remote tiles, staging and real iPhone/Android native share remain to be checked in their respective environments. No connected interactive browser was available; installed Chrome was used for automated viewport QA.
