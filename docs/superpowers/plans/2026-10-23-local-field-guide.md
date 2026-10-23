# Local Field Guide Implementation Plan

**Goal:** Redesign the existing area route into a practical editorial discovery guide, preserving real API order, filters, pagination, metadata and Back restoration.

**Architecture:** The page retains city/place fetching and SEO. A new area-specific component inside the existing place-listing widget composes the hero, region links, existing listing controller, real tag moments and intent-loaded MapLibre entry. New entity card/photo variants leave other listing pages visually unchanged. Area query helpers adapt only supported API filters and preserve context in region/map/pagination links.

**Stack:** Nuxt 4 SSR, Vue Composition API, strict TypeScript, existing CSS tokens/MapLibre/Vitest; no new dependencies, contracts, backend operations or invented content.

**Spec:** User brief “The Local Field Guide”, 2026-10-23. No screenshot attached. Audit uses current source; no connected browser is assumed.

## Review focus

- API has no overall result count or neighborhood photo/boundary fields. Display loaded count; use only actual stop photography with captions or branded placeholders.
- Search cannot combine with cursor. Normalize supported public categories/tags/rainSafe/q, clear stale pagination, maintain canonical/noindex rules.
- Area changes retain supported filters but drop pagination; map links retain the zone and filters.
- Preserve backend result order, SSR place links, load-more focus, cached Back pages and failure alternatives.
- Missing data, arbitrary tag URLs, duplicate submissions, route changes during requests, keyboard focus and reduced motion must remain usable.

## Tasks

- [x] Write failing area-query and actual-content tests, then implement query adapters and data-backed moments.
- [x] Build area-only card/photo variants, retaining genuine client-time opening status and honest missing-image states.
- [x] Extend the existing listing with an opt-in editorial renderer, contextual pagination and accessible loaded-count feedback; cancel abandoned loads.
- [x] Build compact hero, top region navigator, GET/client filter controls, supported tag moments, real-map entry and alternative-region footer.
- [x] Wire the route, preserve fetch/error/SEO/structured data and region validity checks.
- [x] Add scoped brand CSS and restrained progressive motion; verify lint/typecheck/build/unit/production SSR and development CSS/HMR.
- [x] Request independent review, fix important findings, and document verification plus unavailable rendered/device checks.

Final evidence: 20 workspace tasks, 187 web unit tests and 102 production SSR tests passed. Review identified the normal list's missing coordinate projection and an incorrect point argument; the preview now makes a tested bounded geographic request only on intent. Hidden-tail-tag and asynchronous focus were corrected and re-reviewed. Rendered browser/device QA remains explicitly unverified because the session has no connected browser or screenshot; see the runbook.
