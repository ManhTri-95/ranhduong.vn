# S15 Template Editor Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admin composes and validates template itineraries by day, with drag/drop, estimated times, notes, description and phone/Google previews before publication.

**Architecture:** Shared Zod contracts and pure scheduling/validation logic provide identical live admin diagnostics and authoritative API checks. Existing itineraries module owns persistence and calls PlacesService for city-scoped scheduling data. Admin uses three columns on desktop and quick edit controls on mobile; no new dependencies or public route changes (public itinerary page belongs to S16).

**Tech Stack:** Existing Node 24 / pnpm 12.9.1, Zod, Vitest, Vue 3, NestJS/Mongoose.

**Spec:** backlog S15; ui-spec §12; technical-design §3/6/7; ADR 0005/0007/0010/0011/0013.

## Global Constraints

- All form/API/module data types in contracts; strict TypeScript and FSD imports downwards.
- Tests first for domain, validation, services and scheduling. Vietnamese UI, tokens and 44px controls.
- Retain stable generated slugs; separate draft/published. Never use invented actual-place facts.
- Scheduling uses the §12 estimate rounded to 5 minutes, without the future optimizer's 10-minute buffer.
- First weekday is explicit (default Saturday); consecutive days wrap through Sunday. No date-dependent timezone conversion.
- Draft places are warnings per §12, not publication blockers if their other data is valid; hidden/suspected/closed/missing/merged places are errors.
- 1–5 days, max 20 stops/day; duration is an editable planning estimate (place.visitDurationMin or explicit 60-minute default).
- Authorised implementation continues in this checkout; leave changes uncommitted until requested.

## Review Focus

- Opening intervals must cover the whole visit, including overnight intervals; closing exactly at departure is allowed, lunch breaks are not.
- Locked start/end times survive reorder and upstream changes; overlap, travel deficit and overflow past midnight block publication.
- UI cannot bypass server validation, forge travel minutes or reference another city's places.
- Changing route, losing network or session must not silently lose unsaved day/stop edits.
- Empty days, duplicate stop keys and stale data must produce actionable diagnostics rather than broken publication.

### Task 1: Shared contract and scheduling

**Files:** `packages/contracts/src/itinerary-admin{,.test}.ts`, `itinerary-schedule{,.test}.ts`, exports; `packages/geo/src/distance{,.test}.ts`.

**Interfaces:** `TemplateEditInput` (title/description/season/style/transport/pace/startWeekday/SEO/days); days have startTime/stops; stops have key/placeId/kind/note/durationMin?/manualStart?/manualEnd?. `TemplatePlace`, `TemplateIssue`, `TemplateAnalysis` describe city-scoped candidates, scheduled days and warnings/errors. `analyzeTemplate(input, places, travel, now?)` schedules and validates. Geo `estimateTemplateTravelMinutes(a,b)` rounds the raw distance estimate to 5 minutes.

- [x] Write schema and schedule tests; observe RED. Test bounds, immutable inputs, weekday wrapping, manual times, auto cascade, overnight/full interval opening, status/missing refs, stale/photo warnings, meal windows and 21:30 boundary.
- [x] Implement contracts and pure logic; observe GREEN. AC: auto times and §12 error/warning rules.

### Task 2: Admin API and persistence

**Files:** itinerary repository/schema/module; new `template-editor.service.ts`, admin controller and HTTP tests; PlacesService/Repository scheduling projection; AdminMediaService draft-reference protection.

**Interfaces:** admin city template GET/POST, ID GET/PUT; city template-place library GET; POST preview analysis for unsaved input. `AdminTemplate` returns editable input plus id/cityId/slug/status/analysis. API always recomputes times/diagnostics against current city-scoped places and rejects published saves with errors.

- [x] HTTP tests RED: guards/Origin, draft save/edit, ordered days/notes/metadata, preview, publish errors vs warnings, stable concurrent slugs, missing/cross-city refs, no user itinerary access, public home published list integration, protection of referenced drafts.
- [x] Implement repository/service/controller and projections, preserve existing card reads. Store metadata and manual timing alongside scheduled stops; use generated stable slug and unique retry.
- [x] API/contracts tests GREEN. AC: create/edit/publish enforced at API; referenced draft deletion returns CONFLICT.

### Task 3: Editor and previews

**Files:** admin itinerary entity API, editor model/tests, picker/timeline/preview UI components, pages/router/nav.

- [x] Model tests RED for stop add/reorder/move/delete/replace, day resize and local recovery; implement immutable helpers and model.
- [x] Implement searchable/filterable place library (including draft warnings), native desktop drag/drop between library/days/positions, and button alternatives for touch/keyboard. Timeline has per-day start, planned duration, manual arrival/departure reset, kind/note and replacement controls.
- [x] Implement metadata header, warnings/errors by stop/day, explicit save draft/publish, server error details, session/network recovery and local draft restore. Do not allow Enter to publish.
- [x] Phone preview and Google snippet show current unsaved content, generated/stable URL, title/description; metadata fields can be edited. Mobile uses stacked tabs/quick edits; full creation remains usable via buttons.
- [x] Admin tests/typecheck/lint/build GREEN. AC: all editor and preview interactions.

### Task 4: Verification and documentation

- [x] Whole workspace `pnpm turbo run lint typecheck test build`; web SSR suite verifies existing template cards remain compatible.
- [x] Independent read-only final review; fix material findings with regression tests.
- [x] Chrome desktop/390px: drag/drop, alternative buttons, manual-time cascade, publish blocked/errors vs warnings, previews, local restore and session failure; save screenshots.
- [x] Update backlog/decisions/CLAUDE and add runbook; document remaining staging/real-phone/CI/Sentry checks and S16 dependency.

## Execution record

Implementation follows the existing-backlog workflow in CLAUDE.md. Native implementation, one independent final reviewer. No automatic commit/push/merge.

2026-10-10: Shared domain, API HTTP and editor model followed RED→GREEN. Final verification: `pnpm turbo run lint typecheck test build` 20/20 successful; web SSR 37/37. Chrome 1440px/390px verified native mouse drag payload, drop/cross-day movement, button ordering, manual cascade, current unsaved previews, error/warning publication gates, draft/save/route transition, 401 restore, malformed time/invalid duration restore and blocked-storage navigation. Screenshots and usage in `docs/runbooks/template-editor.md`.

Independent review found recovery validation too strict, legacy empty days/missing slug, unsafe concurrent save/delete, and the local preservation flag after discard. Added regressions and fixes (including shared Redis write lease); follow-up review reports no remaining Critical/Important findings. Lease coordination assumes Mongo writes finish within renewed 120-second lease, and diagnostics are save-time snapshots; these limits are documented. CI remote, staging, real-phone use and Sentry observation remain pending; full public itinerary page belongs to S16.
