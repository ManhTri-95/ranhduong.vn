# S37 Guest itinerary API Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task, with TDD and a final whole-change review.

**Goal:** Create and read guest itineraries with anonymous ownership, fresh planning facts and private accommodation coordinates.

**Architecture:** A guest itinerary module calls the existing S34–S35 planner, the itinerary repository and live public place projection. Places owns a ten-minute snapshot invalidated by repository writes. S18 and guest creation share an atomic Redis sliding-window implementation.

**Tech Stack:** Existing NestJS, Mongoose, Zod, ioredis, Vitest and Nuxt; no new dependencies.

**Spec:** `docs/backlog-slice-2.md:100`, technical-design sections 3, 6, 7, 13; ADR 0009 and 0014.

## Global Constraints

- Strict TypeScript; English identifiers, Vietnamese user-facing copy; shared API schemas in contracts.
- No cached algorithm results; snapshot only. Existing template routes and projections stay compatible.
- `gid`: UUID v4, HttpOnly, SameSite=Lax, one year, domain/secure matching the existing session configuration.
- Creation: valid city-bound request and Origin; shared 10/hour per gid and 60/hour per IP sliding limits.
- Accommodation: each coordinate rounded to 0.005 degrees before planning/storage; never expose it, guestId, ownerId or ticket storage keys.
- User itineraries use random unique base62 shareId, version 1, unlisted visibility; inactive places remain null slots with no private notes.
- Mutation/optimization/copy endpoints belong to later stories; establish one reusable public projector for their responses. A future copy must use public parameters, dropping accommodation and ownership.

## Review Focus

1. First-create errors and malformed cookies must not make a valid guest own another itinerary.
2. Concurrent rate-limit checks must charge both dimensions atomically and hold across midnight.
3. Invalidation during an in-flight snapshot load must not put stale data back into the cache.
4. Hidden, deleted and other-city stop/detour references must never expose place facts or notes.
5. A shareId collision must retry; ObjectId lookup, template shareIds and inactive cities must return 404.

### Task 1: Public contract, identity and rate limits

**Files:** contracts `itinerary-user.ts`, shared HTTP `sliding-window.ts`, guest `guest-identity.ts`, `guest-rate-limit.ts`, their tests; modify metrics store and contracts index.

**Interfaces:** `ItineraryUserDetail`, `ItineraryShareId`, `publicItineraryParams`; `guestIdentity(header, env)` returns id/cookie options; `slidingWindowAllowed(redis, limits, windowMs, now)` checks/charges all keys; `GuestRateLimit.check(gid, ip, now)` throws RATE_LIMITED.

- [x] Write and run failing tests for strict public field allowlisting, stable validated gid, secure/year cookie and exact concurrent/sliding limits.
- [x] Implement and run focused tests, retaining S18's 120/minute behavior.

### Task 2: Place snapshot with write invalidation

**Files:** `places/planning-snapshot.ts`, tests; modify places service, repository and module.

**Interfaces:** `PlanningSnapshot.get(cityId, load, now?)`, `invalidate()`; `PlacesService.planningSnapshot(cityId)` returns planning facts. All successful repository mutations invalidate snapshots.

- [x] Write/run failing tests for ten-minute expiry, city isolation, single-flight loading, rejected loads and invalidation races.
- [x] Implement cache and mutation invalidation; test actual edit/status writes refresh planning facts immediately.

### Task 3: Persistence and guest API

**Files:** itinerary schema/repository; guest module/controller/service and public projector, integration tests; app module.

**Interfaces:** repository `insertUser(input)`, `userByShareId(shareId)`; service `create(citySlug, raw, gid)`, `read(shareId, gid?)`; shared `toUserItinerary` projector.

- [x] Write/run failing persistence tests for unique partial shareId index, version/default flags, rounded stay, UUID keys and detour afterKey mapping.
- [x] Implement persistence and public projector using live city-scoped active place facts.
- [x] Write/run failing HTTP tests for creation/read, ownership/no-store, validation/Origin, rate limits, shortages, inactive slots and forbidden lookups.
- [x] Connect planner with snapshot, current zones/seasons/templates/30-day popularity; run focused integration tests and existing template regressions.

### Task 4: Privacy, documentation and verification

**Files:** privacy page, legal lastmod, runbook, backlog, CLAUDE.md, decisions log.

- [x] Explain gid purpose/duration, optional approximate stay, private storage and sharing in Vietnamese; update lastmod.
- [x] Run `pnpm turbo run lint typecheck test build` and web SSR tests; visually inspect privacy page at 390px and desktop if browser runtime is available.
- [x] Review all changes, fix confirmed issues, record verified results and external checks still pending; do not claim staging/phone/remote CI.

## Execution ledger

- Planning: sources and existing module boundaries read; no new dependencies or changes to planner behavior.
- Ruling: execute in the supplied checkout, leave changes uncommitted. Repository metadata is read-only in this session; source edits and checks fulfill the authorized request without requiring a Git permission flow.
- Ruling: execute directly under the user's implementation request and repository backlog workflow; no extra design approval is needed for this already approved story.
- RED: new identity/rate/snapshot tests failed because implementations were absent; unique-shareId persistence assertion failed (index absent); HTTP creation failed with 404; privacy SSR failed on missing `gid`.
- GREEN: focused identity/rate/snapshot/S18 tests 17 passed; persistence and template regressions passed; guest HTTP 9 passed (including a simulated shareId collision and independent results for repeated parameters).
- Debugging: initial HTTP wiring exposed a wrong assumption that CitySeasonContext contains mapBounds. Typecheck identified the mismatch; switched city-bound validation to CityPublic. API HTTP then passed. Admin test input now parses PlaceEditInput before passing it to the editor.
- Verification: `pnpm turbo run lint typecheck test build` reported 20 successful/20 tasks; API 612 tests, web 150 tests, admin 249 tests. `pnpm --filter @ranhduong/web test:ssr` passed all 85 tests after production build. `git diff --check` passed.
- Independent read-only review (`s37_review`): no important findings; checked ownership, atomic limits, snapshot invalidation, shareId persistence, public privacy and unavailable slots.
- Browser observation returned no connected apps/browsers; no visual inspection claimed. CI remote, staging, Android/iPhone and Sentry 24 hours remain external acceptance checks.
- Ruling: guest API composition follows the existing coverage module pattern, keeping metrics/Redis dependencies out of ItinerariesModule. Snapshot invalidation sits inside places instead of adding a new event framework; single-process deployment has the same immediate refresh semantics.
- Implementation phase left changes uncommitted, with no merge or deployment. Follow-up: the user explicitly requested commit and push; fresh pre-commit checks passed all 20 workspace tasks (20 cached), and origin was fetched before publishing.
