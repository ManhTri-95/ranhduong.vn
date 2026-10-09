# S13 Place Search Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Track steps with checkboxes.

**Goal:** Find accented Vietnamese place names from unaccented queries and suggest places while typing on the public web.

**Architecture:** Extend the existing GET search and `RdSearchForm`. Suggestions reuse `/v1/cities/:city/places?q=&limit=6`; a small controller debounces requests and cancels stale work. Atlas Search optionally supplies candidates, with the existing ranking and current active records determining the public results; local MongoDB keeps the memory search.

**Tech Stack:** Nuxt 4, Vue 3, NestJS, Mongoose, Zod, Vitest; no new dependencies.

**Spec:** `docs/backlog.md` S13; `docs/technical-design.md` sections 3, 6, 11; `docs/ui-spec.md` sections 4–5; ADR 0010 and 0011.

## Global Constraints

- Node 24, pnpm 12.9.1, strict TypeScript, Vietnamese UI text and existing design tokens.
- Preserve public URLs, SSR GET submission, search `no-store` and `noindex, follow`.
- Only active places in the selected city appear; never add real place data as fixtures.
- API input/output remains the existing shared contracts; configure API through `loadEnv()`.
- TDD for conditional logic; browser checks at 390px and desktop for UI.

## Review Focus

- Delayed responses must never replace suggestions for a newer query or reopen a dismissed panel.
- Vietnamese composition must finish before a request or Enter navigation.
- Clearing, Escape, blur, route changes and unmount must cancel pending work.
- Network errors must preserve GET search and offer retry without automatic request loops.
- Atlas index lag must not expose hidden places or another city's places.

### Task 1: Search matching and optional Atlas Search

**Files:** `apps/api/src/modules/places/{place-listing,place-search,places.repository,places.service}.ts`, related tests, `apps/api/src/config/env.ts`, `.env.example`, `apps/api/config/place-search-index.json`.

**Interfaces:** `searchPlaces(places: ListedPlace[], q: string): ListedPlace[]`; `atlasSearchStage(cityId: string, q: string, index: string): PipelineStage | null`; `PlacesRepository.searchSlugs(cityId: string, q: string, index: string): Promise<string[]>`; optional `PLACE_SEARCH_INDEX` environment setting.

- [x] Add failing tests for tag labels/slugs, safe tokenized Atlas prefixes and optional index configuration.
- [x] Run targeted API tests and confirm expected failures.
- [x] Match tags along with names, aliases and both category labels; implement Atlas candidate lookup with city/status filters and post-search validation against current records. Preserve facet counts and ranking.
- [x] Run API tests against throwaway MongoDB databases, including accented/unaccented partial queries and private/cross-city records.

Acceptance: “ca phe may” finds “Cà phê Mây” (fake test fixture), accented queries and prefixes also work, search covers secondary categories and tags.

### Task 2: Suggestions and accessible search form

**Files:** `apps/web/app/features/place-search/lib/search-suggestions{,.test}.ts`, `apps/web/app/features/place-search/ui/RdSearchForm.vue`, `apps/web/app/entities/place/api/places.ts`, home and search pages.

**Interfaces:** `createSearchSuggestions(fetchItems: (q: string, signal: AbortSignal) => Promise<PlaceCard[]>, changed: (state: SearchSuggestionsState) => void)` returns `search(q: string): void` and `cancel(): void`. State contains `items`, `pending`, `failed`. Entity API exports `fetchPlaceSuggestions(apiBase, citySlug, q, signal): Promise<PlaceCard[]>`.

- [x] Write and run failing controller tests: 250ms debounce, minimum two normalized characters, stale requests, clear/dismiss, failure/retry and 100-character input limit.
- [x] Implement the controller and verify unit tests.
- [x] Update `RdSearchForm` with `citySlug`, a combobox/listbox, six suggestions, category/zone labels, arrow keys, Enter selection, Escape, composition handling, focus dismissal, loading/empty/error feedback and retry.
- [x] Pass city context on home/results pages; keep native GET submission when no option is selected and when JavaScript is disabled.
- [x] Verify Vue types, SSR and Chrome at 390px/desktop: mouse/touch selection, keyboard selection, slow/out-of-order requests, IME and error/retry.

Acceptance: suggestions appear during typing, open the selected place, and ordinary search still renders SSR results.

### Task 3: Verification and documentation

**Files:** `apps/web/tests/listing-ssr.test.ts`, `docs/runbooks/place-search.md`, `docs/technical-design.md`, `docs/decisions.md`, `docs/backlog.md`.

- [x] Extend SSR checks for the enhanced form, no initial suggestion request and existing search/cache behavior.
- [x] Run `pnpm turbo run lint typecheck test build` and `pnpm --filter @ranhduong/web test:ssr`; inspect results.
- [x] Review the complete diff and fix substantive findings with regression tests.
- [x] Document Atlas index setup, local behavior and browser evidence; update S13 to code complete with deployment/real-phone/Atlas validation still explicitly pending.

## Execution Notes

- Pre-flight: Task 2 reuses the unchanged PlaceListResponse contract and Task 1 ranking; Task 3 validates both. No shared-interface conflict.
- Execute in the supplied clean checkout. Leave changes reviewable without merging, publishing or rewriting repository history.
- At the user's request, S13 is committed on `feat/S13-place-search`, based on the existing S12 commit `0f916d2` retained on `feat/S12-public-map`; each story has a separate commit.
- Tasks 1–2 implemented. Focus retry regression: Chrome timed out waiting for retry suggestions before the fix; focusing the input before removing Retry restored the request and keyboard control.
- Final review: independent reviewer found missing NFD index normalization and retry focus loss; both fixed. Index regression failed on missing icuNormalizer, then passed; IME Enter guard failed on defaultPrevented=false, then passed on the rebuilt Chrome app.
- Index definition lives in `apps/api/config` so API task caching includes it. Atlas live execution, real Safari/phone and staging validation remain deployment checks in the runbook.
- Final verification: 20/20 workspace tasks, 772 unit/integration tests and 30 production SSR tests passed. Chrome 390px touch and 1440px desktop passed, including retry via touch/keyboard, restored combobox focus, IME guards and native GET without JavaScript; no browser errors. Screenshots and operational checks are in `docs/runbooks/place-search.md`.
