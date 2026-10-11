# S18 Tracking and Reports Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. The user requested implementation in this session on a new branch.

**Goal:** Count public place views/actions without visitor cookies, aggregate daily metrics reliably and show weekly direction clicks in admin; add consent-controlled traffic analytics.

**Architecture:** Shared Zod contracts define bounded event batches and reports. A metrics module validates public place references through exported services and atomically updates Redis with daily-salted anonymous identities. An API cron at 00:15 Asia/Ho_Chi_Minh follows ADR 0012, catches up pending days and upserts absolute counts into its own place_metrics collection; retry/concurrency cannot double count. Web client batches events without blocking navigation; admin reads authorized weekly totals including live Redis counts. Umami is the default lightweight analytics integration unless the user chooses PostHog.

**Tech Stack:** Existing NestJS/Mongoose/ioredis, Nuxt/Vue, Zod, Vitest; native cron timer, no new dependency.

**Spec:** `docs/backlog.md` S18; technical-design §10/12/13; architecture §4/7; ADR 0005/0009/0011/0012. ADR 0012's API-container cron takes precedence over the generic worker job table.

## Global Constraints

- Batch max 20; 120 requests/minute/IP; Origin guard remains effective; UTC timestamps, Vietnamese day/week boundaries (Monday–Sunday).
- No raw event logs, IP, User-Agent, cookies or persistent visitor identity in MongoDB; daily salt is shared across API instances in Redis.
- Deduplicate place_view atomically per visitor/place/day, count actual action clicks individually; accept only publicly readable places in active cities.
- FSD downward imports, module services/DTOs only, strict TypeScript, Vietnamese UI/design tokens.
- Analytics opt-in, denial/revocation/DNT respected, no names/email/phone/search query/referrer data sent to analytics. Place counters independent of analytics consent.

## Review Focus

- Concurrent view/event batches, Redis/DB failures, repeated and overlapping rollups do not lose or double count data.
- Midnight/week rollover, empty reports and old place statuses remain understandable; absent data shown as zero.
- Clients cannot spoof IP through untrusted forwarding headers or count draft/hidden/cross-city data.
- Click delivery survives external navigation and the last pagehide; analytics requests never happen before consent or after revocation.
- SSR payload/cache remains deterministic and third-party analytics remains absent in staging and unconfigured installs.

### Task 1: Event contracts and anonymous counters

**Files:** contracts metrics schemas/time helpers; API metrics service/Redis store/controller/module/tests; place and city services/repositories for minimal DTO references; Env/proxy config.
**Interfaces:** `EventBatch = {events: PlaceEvent[]}`; `PlaceEvent = {type, placeId, source?}` for place_view/direction_click/call_click/fanpage_click; `MetricsService.record(batch, identity, now?)`; shared `dayKey`, `weekStart`, `MetricCounts`, `MetricPlaceRef`.

- [x] Write failing contract/time and actual Redis/Mongo HTTP tests for limits, allowed sources, Origin, 120/min rate, duplicate/concurrent views, public place filtering and privacy; run RED.
- [x] Implement strict validation, trusted-proxy allowlist, shared daily salt and atomic Lua counting/deduplication/retention/indexing.
- [x] Run targeted tests GREEN; covers POST /events and Redis counter criteria.

### Task 2: Rollup and weekly reporting

**Files:** metrics Mongo schema/repository/cron/time helpers; admin metrics controller; metrics integration tests.
**Interfaces:** `MetricsService.rollup(now?)`, `weeklyReport(citySlug, query, now?)`; `WeeklyMetricsReport` with week boundaries, seven daily totals and sorted per-place counts.

- [x] Write failing tests for repeated/concurrent rollups, interruption/retry, pending-day catch-up, current-day exclusion, exact weekly boundaries, live-plus-persisted totals and admin authorization.
- [x] Implement idempotent absolute upserts using unique place/day index and $max, acknowledge pending days only after successful persistence; native cron 00:15 VN plus startup catch-up.
- [x] Add authenticated/no-store report endpoint and run tests GREEN; covers cron/place_metrics and report data criteria.

### Task 3: Web tracking and consent-controlled analytics

**Files:** shared client batching lib/plugin and analytics lib/plugin; consent UI; place detail/itinerary/map integration; public stop IDs; runtime config/.env.example; web pure/SSR tests.
**Interfaces:** `PlaceEventBuffer` max20/bounded memory; `trackPlace(event)` via Nuxt client injection; safe tracking data attributes and page view observation. Analytics uses only sanitized page paths, constant brand title and anonymous schema IDs.

- [x] Write failing batching/delivery/source/sanitization/consent tests; run RED.
- [x] Track hydrated detail views, selected map places and all displayed directions/call/fanpage actions; add IDs only where needed and preserve current links/SSR.
- [x] Add Umami script loaded only after consent, manual sanitized pageviews and revocation guard; show accessible Vietnamese consent controls with persistent choice.
- [x] Run web tests/typecheck/production SSR; covers traffic integration and client instrumentation.

### Task 4: Admin screen and final verification

**Files:** admin report page/API/model/navigation, tests; runbook/backlog/CLAUDE/decisions.

- [x] Implement weekly selector, daily and per-place direction click totals, totals for view/call/fanpage, zero/loading/error/retry/login states and accessible mobile layout.
- [x] Run `pnpm turbo run lint typecheck test build`, fresh SSR suite and browser checks at 390px/desktop for consent and admin report.
- [x] Request one independent final review, fix material findings with regression tests, record checks and pending real instance/production/CI/phone validation.
- [x] Keep changes on feat/S18-tracking-reports for handoff; no automatic merge/deploy.

## Verification and handoff

- 20/20 workspace tasks passed; contracts320, geo37, API345, admin110, web78 tests. Production SSR59/59 passed after the final UI change.
- Chrome390/1440 production build passed consent deny/grant/revoke/regrant/storage/DNT/staging, detail/contact/itinerary clicks and pagehide, admin weekly navigation/zero/session-expiry/retry; no runtime/hydration errors.
- Independent final review found sliding-window/midnight and cross-tab revocation issues; RED->GREEN regressions plus awaited Mongo unique index address them. Mobile hit-target RED->GREEN caught and fixed settings covering contact actions.
- No new dependencies. Runbook `docs/runbooks/tracking-reports.md` includes actual instance/proxy/deploy/CI/phone/Sentry prerequisites; story is code complete, external acceptance remains pending.
