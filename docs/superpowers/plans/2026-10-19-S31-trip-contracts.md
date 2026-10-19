# S31 Trip Contracts Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Provide shared trip vocabulary, request validation, structured narratives and meal windows for S31.

**Architecture:** Keep framework-free Zod schemas in contracts. A request schema factory binds validation to the selected city's map bounds; dates are checked at parse time in Asia/Ho_Chi_Minh. S15 consumes shared meal windows without changing diagnostics.

**Tech Stack:** TypeScript strict, Zod 4, Vitest; no new dependencies.

**Spec:** docs/backlog-slice-2.md §2/§4 S31; docs/technical-design.md §3/§7; ADR 0011 and ADR 0014.

## Global Constraints

- Days: 1–5; at most 3 interests; Vietnamese user-facing messages.
- Coordinates: GeoJSON [lng, lat], inside City.mapBounds including edges.
- Existing S15 tests must remain green. Rounding/storage and narrative factual checks belong to S37/S43.
- Implement in the supplied workspace; leave changes reviewable without committing, pushing or deploying.

## Review Focus

- Vietnam midnight can precede UTC midnight: reject yesterday at the correct instant.
- Invalid calendar dates and leap days must not normalize silently.
- Duplicate interests must not inflate preference scoring.
- Coordinates on all four bounds are valid; reversed/outside coordinates are rejected.
- Duplicate narrative day numbers or stop keys must not ambiguously attach notes.

### Task 1: Trip vocabulary and meal windows

**Files:** Create `packages/contracts/src/trip.ts`, `trip.test.ts`, `itinerary-meals.ts`; modify `labels.ts`, `index.ts`, `itinerary-schedule.ts`, `itinerary-schedule.test.ts`.

**Interfaces:** Produce TripWith (`solo`, `couple`, `friends`, `family`), TripInterest (`chill_cafe`, `clouds_hills`, `photo_spots`, `nature_adventure`, `breakfast_specialties`), TRIP_INTEREST_TAGS, TRIP_INTEREST_BEST_TIMES, TRIP_WITH_TAGS, TRIP_WITH_LABEL, TRIP_INTEREST_LABEL. Produce MEAL_WINDOWS entries `{ kind, start, end, label }` with minute offsets lunch 690–810 and dinner 1080–1200.

- [x] Write preference contract tests and meal boundary diagnostics (visits exactly outside/overlapping either window).
- [x] Run focused tests; observe missing vocabulary/meal exports fail, preserving existing S15 baseline.
- [x] Implement vocabulary/maps/labels; extract windows and consume them in analyzeTemplate.
- [x] Run contracts tests; require all S15 regression tests green. Checks vocabulary, mappings and meal acceptance criteria.

### Task 2: Itinerary request

**Files:** Create `packages/contracts/src/itinerary-request.ts`, `itinerary-request.test.ts`; export from `index.ts`.

**Interfaces:** Produce ItineraryRequest schema/type with `{ days, startDate, transport, with, tags, pace, stayLocation? }`; `createItineraryRequestSchema(mapBounds: BBox)` returns a city-bound Zod schema. Reuse Task 1 vocabulary and existing TripDays/transport/pace/GeoPoint.

- [x] Write tests for required fields; numeric days 1–5; all enum values; 0–3 distinct interests; invalid/duplicate/four interests; date-only ISO, leap years, before/after Vietnam midnight and parsing the same schema after midnight; optional/invalid coordinates, all edges, outside each edge and invalid bounds.
- [x] Run focused tests and confirm failure because request schema is missing.
- [x] Implement schemas with parse-time Vietnam date and city-bound coordinate validation; validate the factory's bounds via BBox.parse.
- [x] Run focused and contracts suites. Checks every request validation branch.

### Task 3: Narrative and final verification

**Files:** Create `packages/contracts/src/itinerary-narrative.ts`, `itinerary-narrative.test.ts`; modify `index.ts`, backlog status and CLAUDE.md.

**Interfaces:** Produce ItineraryNarrative schema/type `{ intro, days: [{ day, intro, stops: [{ key, note }] }] }`. Reuse TripDays and UUID keys; 1–5 days, 1–20 stops/day; nonempty trimmed intro/note with limits 4000/2000; reject duplicate days/keys and extra narrative properties. Contextual itinerary key membership/fact checks stay in S43.

- [x] Write valid structured narrative and malformed/empty/oversized/duplicate-day/duplicate-key tests.
- [x] Run focused tests; observe missing narrative schema failure.
- [x] Implement schema/refinements and run all contracts tests.
- [x] Run `pnpm turbo run lint typecheck test build`, inspect failures and run regression checks as needed.
- [x] Review diff, update story to code complete with staging/CI caveats, and report actual verification evidence.

## Execution record

- Pre-flight: Task 2 consumes Task 1 enums; Task 3 consumes existing TripDays. No conflicting interfaces.
- Ruling: Execute in the user's supplied checkout with no automatic commits/worktree creation; this keeps the requested result visible and reviewable in the shared workspace.
- Task 1 complete: missing trip/meal modules observed RED; 469 contracts tests GREEN, including existing S15 tests and meal boundary cases.
- Task 2 complete: missing request schema observed RED; 551 contracts tests GREEN. Parse-time date validation tested across Vietnam midnight and New Year.
- Task 3 complete: missing narrative schema observed RED; 591 contracts tests GREEN. Workspace lint/typecheck/test/build: 20/20 successful (4 cache hits), including 462 API tests against local MongoDB/Redis. Web SSR: 84/84 passed, direct command exit 0. `git diff --check` passed.
- Verification correction: the first workspace run caught TS2345 in the new meal-boundary test table (widened string instead of issue-code literals); `as const` fixed the input table, and the full workspace run passed. The first redirected SSR command reported a PowerShell stderr redirection error while all 84 tests passed; rerunning directly exited 0.
- Final review: independent read-only reviewer found no actionable issues. Deferred scope confirmed: S32 admin wiring, S37 rounding/storage/public DTO privacy, S43 narrative membership/facts/cache. These stories remain outside S31; schema structure alone does not provide their guarantees.
- Handoff: backlog/CLAUDE status updated and `docs/runbooks/trip-contracts.md` documents factory use. No dependency changes, commits, deployment or external writes.
