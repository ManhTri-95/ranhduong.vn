# Discovery Collection Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan in the current workspace. Preserve all existing uncommitted redesign work; do not commit automatically.

**Goal:** Turn the existing category listing into a distinctive, responsive editorial collection while retaining real data and the existing discovery journey.

**Architecture:** Keep the Nuxt route and public category contract. Share normalized discovery queries, filter UI, postcard cards, pagination and Living Route motion with the Area Guide. Add a category-owned identity configuration, cover/navigation, data-backed mood links, lightweight map invitation and related-category cards in the place-listing widget slice.

**Tech Stack:** Existing Nuxt 4, Vue 3 Composition API, strict TypeScript, CSS tokens, MapLibre route, Vitest. No new application dependencies or backend contracts.

**Spec:** User's Category Discovery / The Discovery Collection brief, plus `docs/runbooks/local-field-guide-responsive-repair.md` for layout constraints.

## Global constraints

- Existing category slugs and PUBLIC_CATEGORIES remain authoritative; no fabricated facts, photographs, totals or itinerary actions.
- Mobile first; test 320/375/390/430/768/1024/1280/1440/1920px. No global horizontal clipping.
- Reuse token typography/colors/motion; constrain SVG parent dimensions and grid minima.
- Canonical URLs, SSR, ItemList, API failure/retry and load-more/Back behavior remain intact.

## Review focus

- Search plus stale cursor must not send an unsupported API combination: query unit tests and SSR.
- Category changes retain area/shelter, reset keyword/tags/pagination: literal URL unit tests and browser navigation.
- Unknown area query must not turn a valid category into a 404: normalize against actual city zones; unit and browser tests.
- Missing imagery and long labels must remain honest and contained: SSR fallbacks and browser geometry/screen captures.
- Shared filter changes must preserve area GET/context/focus behavior: existing tests plus area browser regression.

## Task 1 — Shared discovery context

Files: `entities/place/lib/discovery-query.ts`, `category-guide.ts`, their tests, `area-guide.ts`; `features/place-tag-filter/ui/RdDiscoveryFilter.vue`; existing AreaGuide and PlaceListing consumers.

- [x] Write failing tests for category query normalization, API parameters, pagination URLs, map/area links, category-switch policy and positive metadata-backed moods.
- [x] Run the focused tests and observe missing behavior.
- [x] Extract existing normalization/serialization without changing area semantics. Category route identity fixes category; validate optional area against city data. Reuse one filter UI with optional fixed-category/zone context.
- [x] Run all web tests and existing area query/preview tests.

## Task 2 — Category experience

Files: `pages/[city]/[category].vue`, `widgets/place-listing/ui/RdCategoryGuide.vue`, category hero/navigator components, `assets/discovery-collection.css`; shared field-guide stylesheet.

- [x] Add production SSR checks for crawlable category/area/map links, one H1, no eager map, real photo priority/fallbacks and filtered noindex.
- [x] Verify failure against current production output.
- [x] Implement four category identities from the shared public enum, distinct cover composition, bounded glyphs, shared filters/cards/pagination, optional tag collections, honest illustrative map invitation and three alternative chapters.
- [x] Keep API order; only the first real-photo card may span columns. Keep error/empty and practical data states.
- [x] Preserve native reduced motion, CSS hover/reveal and observer cleanup; refresh observer on appended cards.

## Task 3 — Rendered QA and release evidence

- [x] Capture before/after Chrome screenshots with real local data; all nine widths get geometry checks, required five get full-page captures.
- [x] Exercise tags, search, areas, rain shelter, clear, load more/Back, category/detail/map links, keyboard, empty/error states, motion and no-JavaScript GET.
- [x] Run workspace lint/typecheck/test/build, web tests and production SSR tests; request an independent code review.
- [x] Save audit, files, design/motion decisions, screenshots/results and actual remaining limits in `docs/runbooks/discovery-collection.md`.
