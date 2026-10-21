# S36 Itinerary Coverage Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Track verification below.

**Goal:** Give admins a read-only report of itinerary failures and data coverage.

**Architecture:** A pure reporter calls the existing S34–S35 generator for 1–5 days × both paces × seven consecutive departure dates × five individual interests plus no interests (420 cases). A guarded GET loads city-scoped snapshots, published templates and 30-day popularity. The admin page displays failures and counts without saving itineraries.

**Tech Stack:** Existing Zod, NestJS, MongoDB, Vue and Vitest; no new dependencies.

**Spec:** `docs/backlog-slice-2.md`, S36 and §5; `docs/technical-design.md` §7; ADR 0007, 0011, 0014.

## Global Constraints

- English identifiers, Vietnamese UI, strict TypeScript, FSD imports, design tokens and 44px controls.
- Counts require active, verified within 90 days, valid location, known zone, valid opening hours and visit duration. Best time is optional. Category counts include secondary categories; zone totals count a place once.
- Preserve S34–S35 eligibility and its 60-minute fallback; stricter data-readiness counts do not silently change generation.
- Select a starting date (default today in Vietnam), transport (default motorbike) and audience (default friends). Run seven dates beginning there; seasons follow actual dates.
- Missing lunch/dinner is a coverage failure even when generation succeeds. Shortages preserve day, zones and available visits.
- No itinerary writes, no result cache, admin authentication and no-store responses.

## Review Focus

- Empty data and no assignable zone must produce actionable failure rows.
- Expired verification, missing duration and unknown zones must not inflate readiness counts.
- Valid itineraries with missing meals must still fail coverage.
- Departure dates crossing a week/month/year must preserve actual dates, weekdays and season behavior.
- Failed refreshes, expired sessions and late responses must not show results for a different selection.

### Task 1: Contracts and pure coverage report

**Files:** `packages/contracts/src/itinerary-coverage{,.test}.ts`, `index.ts`; `apps/api/src/modules/itineraries/coverage-report/report{,.test}.ts`.

**Interfaces:** `ItineraryCoverageQuery`, `ItineraryCoverageReport`; `buildCoverageReport(input: Omit<PlanInput, 'request'>, query: ItineraryCoverageQuery): Promise<ItineraryCoverageReport>`.

- [x] Write tests for query defaults/validation, complete 420-case enumeration, shortages, missing meals, strict counts and date rollover; run and observe failures.
- [x] Implement schemas and reporter using `generateItinerary`; yield between cases to keep the API responsive.
- [x] Run focused contracts/API tests and confirm green.

### Task 2: Read-only admin API and real snapshots

**Files:** coverage service and tests, admin coverage controller/HTTP tests, itinerary/module/repository, PlacesService and MetricsService.

**Interfaces:** `ItineraryCoverageService.report(citySlug, query, now?)`; GET `/v1/admin/cities/:city/itineraries/coverage`.

- [x] Write failing HTTP tests for authentication, validation, unknown city, city isolation and unchanged itinerary collection; exercise real place mapping and template/popularity reads.
- [x] Add planner snapshots through module services, published template projection and 30-day popularity read. Add guarded controller and no-store header.
- [x] Run API tests and verify no business writes or background jobs from report generation.

### Task 3: Admin page and final verification

**Files:** coverage entity API, report widget/model/tests, page, router and navigation; runbook/backlog/CLAUDE status.

- [x] Write failing model tests for loading, retry, 401 and stale-response rejection.
- [x] Implement `/do-phu-lich-trinh`, explicit run button, report context/totals, zone/category counts, filterable failures, mobile cards and desktop table.
- [x] Verify at 390px and desktop, including errors and empty results; record evidence.
- [x] Run `pnpm turbo run lint typecheck test build` and web SSR tests; review diff and report outstanding staging/real-phone checks accurately.

## Execution Notes

- User requested implementation of the approved backlog story; execute in this session without another design approval.
- Git worktree creation failed because `.git/refs` is read-only in the sandbox. Use the current workspace per using-git-worktrees fallback; do not commit or push.
