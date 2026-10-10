# S14 Curated Lists Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Admin creates and edits titled, described, ordered place lists; visitors read them at `/da-lat/top/{slug}`.

**Architecture:** A curated-lists Nest module owns its collection and calls CitiesService/PlacesService for references and public cards. Shared Zod contracts validate forms and HTTP; Vue admin edits lists; Nuxt renders public lists and links from the city home. Slugs are generated once and remain stable; drafts stay private, published lists expose only currently active places.

**Tech Stack:** Existing Node 24, pnpm 12.9.1, NestJS, Mongoose, Zod, Vue 3, Nuxt 4, Vitest. No new dependencies.

**Spec:** `docs/backlog.md` S14; `docs/technical-design.md` sections 3, 6, 11; `docs/ui-spec.md` sections 3–5, 12; ADR 0005, 0010, 0011, 0013.

## Global Constraints

- Business documents have cityId; public reads resolve active cities.
- API contracts live in packages/contracts. Vietnamese copy; strict TypeScript; FSD imports downwards.
- Preserve public routes and slugs. Public SSR success uses SWR 3600; 404/503 use no-store.
- Tokens only, controls at least 44px; verify mobile 390px and desktop.
- Fake fixtures only; do not create invented production places or lists.

## Review Focus

- References from another city or missing/merged places cannot be saved.
- A place hidden after publication must disappear while remaining active places retain their order.
- Concurrent equal titles must produce distinct stable URLs.
- Session expiry/network failure must retain the editor and expose a retry/login action.
- Invalid slugs, missing lists and API outages must preserve HTTP status and avoid caching errors.

### Task 1: Contracts and API

**Files:** Create `packages/contracts/src/curated-list.ts` and `.test.ts`; create module/repository/service/schema/controller under `apps/api/src/modules/curated-lists`; create `apps/api/src/modules/admin/admin-curated-lists.controller.ts` and `.http.test.ts`; modify contracts exports, AppModule/AdminModule, PlacesRepository/PlacesService.

**Interfaces:** `CuratedListEditInput { title, description, placeIds, status }`; `AdminCuratedList { id, cityId, slug, title, description, placeIds, status }`; `CuratedListDetail { slug, title, description, places }`; `CuratedListSummary { slug, title, description, placeCount, coverKey? }` and list responses.

- [x] Write schema tests: trim text, bound 200/2000 characters and 50 unique IDs, allow empty drafts, reject empty published lists.
- [x] Write HTTP tests: protected reads/writes and Origin; ordered create/read/update, stable slug, collisions/concurrent create, city isolation, private drafts, inactive members filtered, invalid references/IDs and 404s.
- [x] Run the new tests and observe RED, then implement contracts, indexed persistence, reference validation, public projections and routes.
- [x] Run contracts/API suites and verify GREEN. Acceptance: title, description and order persist and public API serves the same order.

### Task 2: Admin editor and list

**Files:** Create admin curated-list entity API, `widgets/curated-list-editor/{model,ui}`, pages; modify router and App.vue navigation.

**Interfaces:** Entity methods list/get/create/update using existing credentialled api client; editor receives list ID (`moi` creates), calls fetchPlaces for the city picker.

- [x] Write model tests for adding once, moving up/down with bounds, removal and accent-insensitive candidate filtering; observe RED.
- [x] Implement list/new/edit pages, labelled title/description fields, active place picker, numbered selected places, 44px reorder/remove buttons, save draft/publish controls, failures and login recovery without losing values.
- [x] Run admin tests, lint, typecheck and build. Acceptance: admin can create/edit title, description and place order, on mobile.

### Task 3: Public SSR and verification

**Files:** Create web curated-list entity API, list strip widget, `pages/[city]/top/[list].vue`; modify city home, nuxt.config.ts, SSR fixtures/tests; add `docs/runbooks/curated-lists.md` and update backlog/decisions.

- [x] Add production SSR tests for ordered cards, title/description/canonical, home links, SWR 1h, missing city/list 404 no-store and partial outage 503 retry/no-store.
- [x] Implement route with existing city header/cards, numbered semantic list, empty state, retry, metadata/canonical; link published summaries on home.
- [x] Run `pnpm turbo run lint typecheck test build`, then web `test:ssr`.
- [x] Review the complete change independently and fix material findings with regression tests.
- [x] Inspect admin/public mobile and desktop in browser if tooling is available; record evidence and remaining staging/real-phone checks. Acceptance: `/da-lat/top/{slug}` SSR presents the saved list in the saved order.

## Execution record

- Work in the supplied checkout; preserve existing changes. User requested committing S14 after review; branch `feat/S14-curated-lists`, commit `feat: S14 add curated lists`.
- Backlog story is authorized for implementation; CLAUDE.md skips brainstorming for existing stories.
- Task 1: complete. Contracts 3 new tests; HTTP 7 new tests RED→GREEN with MongoDB/Redis. Full API suite: 42 files / 302 tests passing.
- Task 2: complete. Order/picker 3 tests RED→GREEN; recovery/save 4 tests, including incomplete-title recovery RED→GREEN. Admin suite: 19 files / 101 tests passing.
- Task 3: complete. Production SSR 7 new tests RED→GREEN; full SSR suite 37/37. Workspace lint/typecheck/test/build: 20/20 tasks successful.
- Final review: independent read-only reviewer. Implicit Enter publication reproduced in Chrome (1 request instead of 0), fixed by explicit button action, browser regression GREEN. Expired-list login recovery also reproduced RED and fixed in the same pass.
- Final browser verification: 390×844 and 1440×1000; draft/publish/order, expired session/local recovery, public order and no-JavaScript SSR pass; no horizontal overflow or runtime errors. Screenshots in docs/runbooks/assets/s14-*.png.
- Review scope: complete SEO structured data remains S17; immediate cache invalidation is outside the one-hour SWR requirement; staging/real-phone/Sentry/CI remote remain unverified. No deferred code findings.
