# Brand Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the approved Art of Wandering experience coherent and practical across the existing public website.

**Architecture:** Preserve page compositions and existing query/selection ownership. Consolidate public-web shell, media and typography; add separately validated place-focus navigation to the existing map. Work inline on `feat/brand-experience`, with a final independent review; no product route or backend contract rewrite.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, CSS tokens, MapLibre, Vitest, installed Chrome/Playwright for local QA; no new dependency.

**Spec:** `docs/superpowers/specs/2026-10-23-brand-experience-design.md` (approved by user 23 October 2026).

## Global Constraints

- Keep Nuxt 4/Vue/MapLibre, FSD layering, current API response semantics, city/season tokens, SSR, redirects, canonicals, structured data, filtered noindex and cache/error behavior.
- No new animation/UI dependency is proposed.
- Public-web typography and layout rules must be scoped to avoid changing admin or ticket rendering.
- No horizontal page scroll or global `overflow-x: hidden`.
- 390px is the working design; 320px is a required constraint. Verify 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px.
- No invented data, location permission, route geometry, creator or saved-place behavior. No automatic content/database edits.
- Layout/content changes use visual QA; new conditional focus/query logic uses failing tests first. Preserve all existing meaningful tests.

## Review Focus

- A direct focused-map link whose place is filtered out must show it separately without adding a false match to results (Task 4 helper + browser check).
- Hidden/closed/missing/unlocated focused places and stale requests must leave a usable map (Task 4 tests + SSR/browser failures).
- Photo request failure must retain layout space and show an honest placeholder, including after prop changes (Tasks 2 and 5 browser checks).
- 320px long Vietnamese text, unavailable fonts, zoom and short-height map/dialog controls must remain readable/reachable (Tasks 1 and 6).
- Back from appended listings/maps and reduced-motion changes must retain selection/scroll and avoid decorative movement (Tasks 4 and 6).

### Task 1: Finish current rendered audit

**Files:** evidence under `docs/runbooks/qa/brand-experience/`; update audit and runbook.
**Interfaces:** consumes existing local routes; produces baseline screenshots and route/viewport state report.

- [x] Inspect home, four categories, area, place, collection, itinerary, map, search and 404 in a separate headless Chrome context.
- [x] Capture 390px/1440px introductions and inspect actual screenshots; record additional P0 findings before changes.
- [x] Verify baseline no-photo, empty, real-photo/error and map states using actual data or explicitly named disposable response fixtures.

### Task 2: Shared media, type and shell

**Files:** tokens; `assets/base.css`; `shared/ui/RdCompass.vue`, `RdEditorialHeading.vue`, `RdDiscoveryStamp.vue`, `RdEmptyState.vue`, `RdSkipLink.vue`; `entities/place/ui/RdPlacePhoto.vue`; existing photo wrappers/cards; header/footer/app/search and ordinary city pages.
**Interfaces:** `RdPlacePhoto` accepts `name`, `category?`, `photoKey?`, `priority?`, `sizes?`, `decorative?`, `compact?`; callers own frame dimensions. Shared primitives contain no place-domain import.

- [x] Add additive typography/camera/motion aliases and web-only fallback/layout rules; retain palette.
- [x] Implement common responsive photo/error state and migrate existing wrapper components without changing their outer layout hooks.
- [x] Add bounded compass orientation, reusable heading/stamp/state/skip primitives where actually consumed.
- [x] Make map and search accessible in the phone header; unify search shell and validated city footer. Add consistent skip targets to all ordinary city pages.
- [x] Check 320/390/768/1440px header/footer, missing/error photo frames, font fallback and keyboard focus; run web lint/typecheck.

### Task 3: Page hierarchy and finite motion

**Files:** homepage and home widgets; category/area cards/styles; place detail/reveal/gallery/directions; collection journal; itinerary/map styles; shared camera timing and seasonal motion.
**Interfaces:** consumes Task 2 primitives; preserves query helpers, public anchors, existing day/key and selectedSlug contracts.

- [x] Keep home category entry near the invitation; remove interactive postcard overlap, shorten known no-photo panels, correct verification/rain copy and demote inactive feature promotion.
- [x] Apply readable body/utility roles and compact no-photo discovery cards; retain four category identities, area navigation and actual API order.
- [x] Make sparse place/gallery content concise; number visible chapters; replace inactive itinerary promotion with real published-itinerary action; correct missing-coordinate copy.
- [x] Make zero-place collections one useful empty chapter with recovery/related content; preserve nonempty narrative, map and share behavior.
- [x] Align itinerary utility/media and finite motion; use explicit north orientation on the map. Replace seasonal sway with one finite response and keep reduced-motion end states.
- [x] Check each changed page at 390px and desktop; run web unit/type/lint checks. Existing test assertions for intentionally changed truthful copy are updated to the approved behavior.

### Task 4: Place-to-map focus continuity

**Files:** create `entities/place/lib/map-focus.ts` and `.test.ts`; existing places API, `ban-do.vue`, `RdMapExplorer.vue`, `RdPlaceDirections.vue`; SSR tests.
**Interfaces:** `parseMapFocus(value: unknown): string | undefined`; `placeMapHref(city: string, slug: string): string`; `mapFocusPlace(place: PlaceDetail | null, bounds: BBox): PlaceCard | null`. Focus remains outside `MapFilters` and API-list params; canonical map path unchanged.

- [x] Write failing tests: valid scalar slug/invalid arrays, encoded link, active located conversion, closed/missing/out-of-bounds rejection; run focused Vitest and observe failure.
- [x] Implement helper using existing contracts and real public fields; run focused tests green.
- [x] Resolve focus with existing public detail API on server/client with request cancellation/generation safety; optional focus failure does not make the map unusable. Show noindex for focus URLs.
- [x] Keep focused place separate from filtered result membership; map pins may include it but count/list filters must remain truthful. Camera/selection initialize once from focus and respect insets; filtering clears focus; map/place/Back preserves session.
- [x] Add SSR cases for noindex, canonical, actual focused name, no leaked filter and missing/private/closed focus recovery; browser-test direct entry, reload, route query changes, excluded focus and back.

### Task 5: Loading, empty, error and navigation polish

**Files:** state consumers in search/listing/collection; shared error banner; cross-page CSS and any defects discovered by QA.
**Interfaces:** existing retry actions and browser history remain functional; no fake success state.

- [x] Give empty search/list/collection/map views a concise branded message and practical recovery; keep error recovery clear and wrapping at 320px.
- [x] Check real loading, missing image, failed image, missing place facts, unavailable itinerary stop, failed geographic lookup/tile and retry states.
- [x] Check homepage → category/area, listing → place → Back, collection → place, place → focused map, itinerary selection/map; verify GET/no-JS crawlable links.

### Task 6: Full verification and review

**Files:** runbook `docs/runbooks/brand-experience.md`, QA JSON/screenshots, audit/spec status and `docs/decisions.md`.

- [x] Record nine viewport widths on major route families and inspect mobile/tablet/desktop screenshots; check real element bounds rather than just document width.
- [x] Verify keyboard, focus, motion/reduced-motion, long/short/empty/error content, font failure and representative zoom/short-height cases. Record remote-tile and physical-device limitations explicitly.
- [x] Run `pnpm.cmd turbo run lint typecheck test build --output-logs=errors-only`; expected all tasks exit 0. Run `pnpm.cmd --filter @ranhduong/web test:ssr`; expected all cases pass.
- [x] Dispatch one independent final reviewer as required by executing-plans; fix important findings with regression proof, rerun affected/full checks as needed.
- [x] Produce final changes/files/components/motion/viewport/tests/limitations report. Do not merge, publish, or push as part of this request.

## Execution ledger

- User approved the design and instructed execution; no additional plan-approval checkpoint is needed.
- Worktree ruling: use the existing checkout on a new feature branch, preserving the running local services and approved untracked documents. No separate worktree was requested; a branch avoids direct main edits without extra dependency installation.
- Baseline before product edits: preceding turn web check 8 successful (4 cached), web test log 201 cases; production SSR 107 cases. Current browser baseline is Task 1.
- Commits are deferred: the user requested implementation, not integration. Keep a reviewable working-tree diff and durable checklist instead of modifying git history during each task.
- Implemented shared foundation and all existing page families; no dependency, backend contract, public URL or database change. The [implementation report](../../runbooks/brand-experience.md) contains the file manifest, screenshots, actual checks, review fixes and remaining release limitations.
- Final independent review completed once; all four actionable findings were corrected and covered by regression checks. Physical-phone/Safari/staging/remote CI remain release follow-ups, explicitly outside verified local results.
