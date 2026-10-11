# S20 Legal Pages Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Publish Vietnamese terms, privacy and attribution pages linked from every public page, with visible map and photo credits.

**Architecture:** Static Nuxt routes share a presentational shell and metadata. A global footer uses the same route definitions; the web sitemap adds these web-owned pages. Keep the existing OSM credits beside both maps and make photo credits visible by default.

**Tech Stack:** Nuxt 4, Vue 3, existing design tokens, Vitest production SSR suite. No new dependencies.

**Spec:** `docs/backlog.md` S20 and §6; `docs/ui-spec.md` §2–3/§6; `docs/technical-design.md` §12–13; ADR 0008, 0010, 0012, 0013; actual S18 tracking implementation.

## Global Constraints

- Vietnamese copy, English identifiers, strict TypeScript, existing tokens, 44px targets, mobile 390px first.
- Public content renders without JavaScript or a working API. Preserve all existing public URLs.
- Describe current behavior only: no public accounts, guest IDs, check-ins or future features; no invented operator identity/contact details or legal compliance guarantees.
- Contact email is optional runtime configuration pending the owner's answer; configure a real monitored address before launch.
- Work in the supplied clean checkout. The owner explicitly requested committing S20 and merging locally into `main` after reviewing the implementation; no remote push or publishing was requested.

## Review Focus

- API unavailable: all three legal pages and the footer still render (Task 2).
- JavaScript disabled: legal links, content and photo credits remain usable (Task 2).
- Mobile fixed contact actions: footer links remain reachable and do not cover actions (Task 2).
- Analytics declined or not configured: privacy copy and consent links agree with actual S18 behavior (Tasks 1–2).
- Staging: legal metadata respects noindex and static sitemap entries are omitted (Task 2).

### Task 1: Static content, footer and attribution

**Files:** Create `apps/web/app/shared/lib/legal-pages.ts`, `apps/web/app/shared/ui/RdLegalPage.vue`, `apps/web/app/shared/ui/RdLegalContact.vue`, `apps/web/app/widgets/site-footer/ui/RdSiteFooter.vue`; create routes `dieu-khoan.vue`, `quyen-rieng-tu.vue`, `ghi-nguon.vue`; modify `app.vue`, `error.vue`, `RdAnalyticsConsent.vue`, `RdPlaceGallery.vue`, `nuxt.config.ts`, `.env.example`, `server/utils/sitemap.ts`.

**Interfaces:** `LEGAL_PAGES` holds `{path, title, description, lastmod}` for the three routes, with final content date 2026-10-12. `RdLegalPage` takes `page: typeof LEGAL_PAGES[number]` and a content slot, calls existing `usePageSeo`. `public.legalContactEmail` is empty unless configured with an actual address.

- [x] Add the route definitions and shell, static content, shared contact section and footer. Cover terms of use, limits of travel information, image rights, actual tracking/local storage/admin sessions, third-party requests and privacy choices.
- [x] Add the footer after `NuxtPage`, also to the error page; allow bottom space for mobile contact actions. Link consent to the privacy page and give the settings control a stable fragment ID.
- [x] Open existing photo-credit details by default; show source type, credit, license and source URL, with format/cropping information and a link to the attribution page. Verify existing public map and itinerary map OSM credits remain visible.
- [x] Add runtime contact configuration and append legal pages to the web-owned pages sitemap only when indexable. Preserve existing sitemap failure/cache behavior.
- [x] Run web lint/typecheck and inspect SSR/browser output; UI content/layout does not require unit tests under `CLAUDE.md`.

### Task 2: Verification and launch notes

**Files:** Extend `apps/web/tests/listing-ssr.test.ts`; create `docs/runbooks/legal-pages.md`; update `docs/backlog.md`, `docs/decisions.md`, `CLAUDE.md`.

**Interfaces:** Existing production SSR fixture starts built Nuxt with fake HTTP API; use that fixture to verify degraded API independence, static sitemap ownership and staging metadata.

- [x] Check all legal routes return 200 with content/canonical/footer when the API fails, configured contact is rendered, and only pages sitemap includes legal URLs with real content lastmod. Extend staging test to cover legal metadata/sitemap.
- [x] Run `pnpm turbo run lint typecheck test build` and `pnpm --filter @ranhduong/web test:ssr`; require exit 0.
- [x] Verify Chrome at 390px and desktop, footer navigation, photo credits, fixed contact actions, consent/privacy link, no JavaScript and no horizontal overflow. Save screenshots in `docs/runbooks/assets/`.
- [x] Review the final diff against S20; record validation and pending external checks in the runbook/backlog. Do not claim remote CI, staging or real-device verification.

## Execution Record

- Plan reviewed against S20 and the actual S18 implementation; all acceptance criteria map to Tasks 1–2. No new business logic or dependency is needed.
- Task 1 implemented. Baseline web tests: 78 passed; workspace lint/typecheck/test/build: 20 tasks passed. UI does not require TDD under repository rules.
- Browser regression reproduced: unknown analytics consent covered footer links after following the privacy link. Render the prompt in document flow on legal routes; retain consent and settings. Browser test failed before this fix.
- First SSR run: 60 passed, 4 test assertion failures. Three assumed no Vue scoped attributes on h1; one requested a JSON error response without Accept: text/html. Correct the assertions/request while keeping the intended behavior checks.
- Canonical legal consent regression passes; 64 production SSR tests pass. Trailing-slash privacy URL reproduced the same obstruction; identify legal pages through matched route records to support the router's equivalent URLs.
- Final: web lint/typecheck/test/build (8 tasks), production SSR (64 tests), and Chrome 390/1440 with canonical/trailing-slash privacy before choosing consent all pass. Five screenshots inspected; independent targeted review has no remaining findings. External launch checks remain explicitly listed in the runbook.
