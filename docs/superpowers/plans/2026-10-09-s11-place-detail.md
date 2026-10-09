# S11 Place Detail Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Track the steps below.

**Goal:** Render the public place detail page with useful visit information, contacts and nearby places, preserving list navigation.

**Architecture:** Add a public detail contract and a read service inside PlacesModule. Nuxt renders the content on the server and computes current opening/verification status on the client because HTML uses SWR. Existing cards, photo helpers and tokens are reused.

**Tech Stack:** Existing Nuxt 4, NestJS 12, Mongoose 9, Zod 4 and Vitest. No new dependencies.

**Spec:** Backlog S11; ui-spec sections 3–5, 11; technical-design sections 3, 6, 11; ADR 0001, 0010, 0011, 0013; decisions dated 2026-10-07/08 (Back navigation, verification age).

## Global Constraints

- Vietnamese copy, Rd components, rd classes and design tokens; touch targets at least 44px; 390px first.
- SSR public URL `/{city}/dia-diem/{slug}`; old slugs and merged places redirect 301; closed places remain 200 without directions.
- Only real editorial data; fixtures explicitly fake. Photos require source, credit and license.
- Contracts define HTTP data. GeoJSON is `[lng, lat]`; display times in `Asia/Ho_Chi_Minh`.
- Conditional API logic uses tests first. No live deployment or production data changes.

## Review Focus

1. Hidden/draft/suspected places, inactive cities and cross-city merge targets cannot leak via old URLs.
2. Merge cycles or missing targets terminate with 404, rather than redirect loops.
3. Overnight hours, midnight and the exact 90-day boundary use existing tested utilities; current status updates on a page left open.
4. Invalid legacy photo credits/contact URLs are not rendered as public media or unsafe links.
5. Returning to a filtered list restores appended pages and cursor without mixing filters or resetting after a stale API refresh.

### Task 1: Public detail API

**Files:** `packages/contracts/src/place-detail.ts`, `index.ts`, `apps/api/src/modules/places/{place-detail.ts,places.repository.ts,places.service.ts,places.controller.ts}`, colocated tests.

**Interfaces:** `PlaceDetailResponse = { place: PlaceDetail; nearby: PlaceCard[] }`; `PlacesService.detail(citySlug, slug): Promise<PlaceDetailResponse>`; HTTP GET `/v1/cities/:city/places/:slug`.

- [x] Write contract and HTTP tests for complete detail, missing optional data, forbidden states, unknown/inactive city, historical slug, merged chain/cycle/cross-city target, valid credited photos and six distance-sorted active nearby places excluding self and other cities.
- [x] Run targeted Vitest tests and observe failures before implementation.
- [x] Implement explicit public projection, canonical resolution and `$near` lookup using the existing 2dsphere index; nearest six, or three similar places for closed locations. API redirects use 301 and canonical API Location.
- [x] Run the same tests; expected all pass.

Acceptance: all stored S11 data, six nearby places, stable URLs and closed-state behavior.

### Task 2: Detail presentation and links

**Files:** `apps/web/app/entities/place/{api/places.ts,lib/place-detail.ts,ui/RdPlaceGallery.vue,ui/RdOpeningHours.vue}`, `widgets/place-detail/ui/RdPlaceDetail.vue`, `pages/[city]/dia-diem/[place].vue`, `shared/lib/use-client-now.ts`, `nuxt.config.ts`.

**Interfaces:** `usePlaceDetail(citySlug, slug)`; pure `directionHref(place)`, `openingHoursRows(slots)`; gallery consumes `PlacePhoto[]`; detail widget consumes `PlaceDetailResponse`, city slug and client time.

- [x] Test Google Maps URL using coordinates and optional place ID, optional/invalid contacts, multi-slot/all-day/overnight weekly hours and Vietnam date formatting.
- [x] Observe failing tests, then implement helpers and render SSR gallery (responsive WebP, eager cover, lazy remaining), attribution, weekly hours, notes, attributes, contacts and nearby cards.
- [x] Add client status updates every minute and on visibility change; no stale current-state label in cached SSR HTML. Reuse owner-confirmation and verificationStale; show warning after 90 days.
- [x] Implement 404, 503 no-store/retry and 301 canonical navigation; ensure `/da-lat/dia-diem/**` receives SWR 3600 despite the static prefix.
- [x] Run web unit tests, typecheck and lint; expected all pass.

Acceptance: photos/fallback, VN opening status, notes, directions/call/fanpage, stale verification warning, owner-confirmation label; accessible mobile/desktop layout.

### Task 3: Restore loaded listings

**Files:** `apps/web/app/widgets/place-listing/ui/RdPlaceListing.vue`, `app/entities/place/lib/listing-history.ts` and tests.

**Interfaces:** A bounded client-only history cache keyed by fullPath and initial list fingerprint, storing appended items and next cursor.

- [x] Test restoration, different filters, changed first-page data, size bound and absent snapshot.
- [x] Observe failures, implement snapshot helpers and restore before mounted scroll restoration; retry replaces stale first-page state.
- [x] Run unit tests and verify Back after loading multiple pages in browser.

Acceptance: decision explicitly deferred from S10 to S11; list pages, query and scroll position survive detail navigation.

### Task 4: Production verification and documentation

**Files:** `apps/web/tests/listing-ssr.test.ts`, `docs/runbooks/place-detail.md`, backlog/decisions/CLAUDE status.

- [x] Extend production SSR fixture/tests for detail content, 301, 404/no-store, API failure/recovery and SWR without stale current-time labels.
- [x] Run `pnpm turbo run lint typecheck test build` then `pnpm --filter @ranhduong/web test:ssr`; expected exit 0.
- [x] Inspect browser at 390px and desktop, JavaScript disabled, gallery, contacts, current status and list Back. Save screenshots if available.
- [x] Request independent review using the review skill; fix material findings and repeat affected checks.
- [x] Record actual results and untested staging/real-phone items in the runbook/backlog. Do not claim deployment, remote CI or real-device verification.

Acceptance: every S11 criterion mapped above; full local checks, production SSR and review evidence recorded.

## Execution notes

- Native execution in the current checkout on `feat/S11-place-detail`; .git needed sandbox approval for branch creation. No remote or production writes.
- Contract, HTTP and web-helper tests were observed failing before implementation. Targeted test/lint/typecheck passed, followed by all 20 workspace checks and 25 production SSR tests.
- Independent source review found no material issues. Browser verification confirmed restoring 45 list cards and scroll, then exposed partial API failure hydration: Nuxt's initial extracted payload returns 503 and drops successfully loaded city data. Added a failing production regression test and set `experimental.payloadExtraction: 'client'` to inline initial data while preserving payloads for later navigation. No dependency/version change.
- Final verification: all 20 workspace tasks passed (720 unit/integration tests), 26 production SSR tests passed, Chrome 390px/1440px passed including partial failure/retry, JavaScript disabled, Vietnam time changes, strict 90-day boundary and Back restoring 45 cards/scroll. No JavaScript exceptions or hydration warnings. Independent follow-up review approved the payload fix. Documentation only changed after these checks; `git diff --check` is clean. Work remains uncommitted in the feature branch; no merge/push/deploy.
