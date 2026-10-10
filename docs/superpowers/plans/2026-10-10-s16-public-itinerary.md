# S16 Public Itinerary Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Publish the S15 templates at `/{city}/lich-trinh/{slug}` with daily timelines, numbered maps, directions and sharing.

**Architecture:** Read stored schedules through the existing itineraries module; resolve current active places through PlacesService. Keep unavailable stops as anonymous placeholders so saved times and numbering remain stable. The SSR page composes a timeline widget, a lazy MapLibre feature and a sharing feature, using the existing FSD layers.

**Tech Stack:** Nuxt 4, Vue 3, NestJS, Mongoose, shared Zod contracts, MapLibre/OpenFreeMap, Vitest. No new dependencies.

**Spec:** `docs/backlog.md` S16 and §2/§6; `docs/ui-spec.md` §3–6; `docs/technical-design.md` §11; ADR 0001, 0008, 0010, 0011. S15 data/runbook is the existing authoring interface.

## Global Constraints

- Vietnamese user-facing text, English identifiers, strict TypeScript, design tokens and 44px targets.
- GeoJSON `[lng, lat]`; editorial data only; Google Maps URL directions only.
- Keep S15 changes in this working tree intact. Implement in place because S16 consumes that uncommitted implementation; do not commit unrelated work.
- Only published templates in the requested city are public. No personal itineraries or draft/hidden place facts may escape.
- SSR timeline remains usable without JavaScript; map loads on explicit request and always shows attribution.
- Keep stable public URLs and SWR 86400; error responses use 404/503 and no-store.

## Review Focus

- A stop becomes hidden/closed/deleted or belongs to another city: preserve its slot and number without private facts or directions (Task 1).
- Repeated place visits and a day with no current places: keep independent stop keys and day-local numbers; do not draw lines across missing coordinates (Tasks 1–2).
- A legacy schedule has missing metadata/keys or malformed times: normalize safe defaults, reject corrupt schedules without a 500 (Task 1).
- Clipboard/native share unavailable, rejected or canceled: offer a selectable canonical link; never claim a canceled share succeeded (Task 3).
- Map import/style fails or page navigates during loading: timeline remains visible, retry works and the map is disposed (Tasks 2–4).

### Task 1: Public contract and read endpoint

**Files:** `packages/contracts/src/itinerary-public.ts`, its test and index; itineraries controller/service/repository; places repository/service; `apps/api/src/modules/itineraries/template-detail.http.test.ts`.

**Interfaces:** `ItineraryTemplateDetail` contains metadata and daily stops `{key,number,start,end,travelMinFromPrev,note,kind,place|null}`. `ItineraryStopPlace` contains public names/categories/location/directions fields only. `GET /v1/cities/:city/itineraries/templates/:slug` resolves a published city-scoped template.

- [x] Write contract tests for time validation and HTTP tests for ordering, stored times, metadata, active-only place facts, repeated visits, private/draft/wrong-city templates, legacy and corrupt records.
- [x] Run the tests and observe failures from missing contract/endpoint.
- [x] Implement schemas and endpoint, batch-resolving current public places and retaining anonymous unavailable slots.
- [x] Build contracts and run API/contracts suites. Acceptance: timeline source, per-stop coordinates/direction data, public access policy.

### Task 2: SSR timeline and numbered daily map

**Files:** `apps/web/app/pages/[city]/lich-trinh/[template].vue`; itinerary API/lib; `widgets/itinerary-detail/ui/RdItineraryDetail.vue`; `features/itinerary-map/lib/*`, `features/itinerary-map/ui/RdItineraryMap.client.vue`; `apps/web/nuxt.config.ts`; `apps/web/tests/listing-ssr.test.ts`.

**Interfaces:** Page consumes `useTemplateDetail(citySlug, slug)` and `useCity`. Map takes a city, the selected day's stops and selected stop key; emits selection. Map data uses stop keys, never place slugs, to support repeated visits.

- [x] Add failing map-data tests for numbers, repeated visits, `[lng,lat]` and unavailable-stop gaps; add SSR fixture/tests for two days, directions, canonical/OG, 1-day SWR, empty/error states.
- [x] Run map tests and observe the expected failure.
- [x] Implement timeline with all days rendered in SSR, day links, stop notes, estimated travel labels and directions; implement lazy map with accessible numbered markers, selection and retry.
- [x] Build and run SSR/unit tests. Acceptance: daily timeline, numbered maps and directions; no-JS and 390px usability.

### Task 3: Sharing

**Files:** `features/itinerary-share/lib/share.ts`, its test; `features/itinerary-share/ui/RdItineraryShare.vue`; itinerary detail widget.

**Interfaces:** Share actions pass canonical URL/title to Web Share for the visitor to choose Zalo/Messenger. Without Web Share, copy and show the link with links to open the chosen messaging website. Clipboard failure leaves a selectable readonly link.

- [x] Write failing tests for native share, cancel, unavailable API, clipboard failure and channel fallback.
- [x] Run red, implement sharing, run green. No third-party SDK/App ID required; no automatic messages sent.
- [x] Verify Zalo, Messenger and copy buttons, live status, cancel behavior and fallback in browser. Acceptance: all three sharing options.

### Task 4: Verification and handover

**Files:** `docs/runbooks/public-itinerary.md`, screenshots, `docs/backlog.md`, `docs/decisions.md`, `CLAUDE.md`.

- [x] Run `pnpm turbo run lint typecheck test build`, then production `test:ssr`.
- [x] Use clearly labeled fake data in Chrome at 390px and desktop; verify day/marker selection, map failures/retry, clipboard/native sharing and no-JS timeline. Save screenshots.
- [x] Review the S16 changes and fix material findings; update documentation with actual evidence and remaining staging/real-phone checks.
- [x] Report code complete without marking full Definition of Done complete until CI/staging/real phones/Sentry have been checked.

## Execution evidence

- Task 1 complete: 14 HTTP and 5 contract cases passed. Review regressions for malformed stops/IDs and identifying unavailable notes failed first, then passed after validation/redaction fixes.
- Tasks 2–3 complete: 3 map-data and 8 sharing cases passed; production browser verified map lazy loading (including worker), day selection/repeated visits, focus/scroll, style and component failure recovery, simulated native/clipboard success/cancel/denial, and no-JS operation.
- Task 4 complete: 20 workspace tasks and 45 production SSR cases passed; Chrome 390×844/1440×1000 had no overflow, runtime exceptions or hydration warnings. Four screenshots saved under `docs/runbooks/assets/s16-*`.
- Independent review findings fixed and rechecked. Browser also identified/fixed nested noscript hydration and eager worker preload. No new dependencies, no unrelated S15 edits reverted or committed.
- Remaining rollout checks: CI remote, staging/cache invalidation, actual Android/iPhone messaging and Sentry 24h, as recorded in the runbook. Backlog marks code complete, not full Definition of Done.
