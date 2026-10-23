# Journey Atlas Implementation Plan

**Goal:** Turn the published itinerary detail into a practical travel atlas with explicit day chapters and synchronized stop selection.

**Architecture:** Keep the Nuxt page, public template contract, SEO, ticket and sharing operations. The itinerary widget owns one `{ day, key }` selection; its timeline, carousel and existing MapLibre component consume the same normalized presentation days. All days remain available in SSR without JavaScript. One map instance adapts between a sticky desktop panel and a native mobile modal.

**Tech stack:** Nuxt 4, Vue Composition API, strict TypeScript, existing CSS tokens, MapLibre, Vitest. No new dependencies or backend changes.

**Spec:** User brief “The Journey Atlas”, 2026-10-22; no screenshot attached.

## Constraints and review focus

- Preserve backend array order and stable stop keys; display consecutive day-local numbers including unavailable slots.
- Never infer trip completion or change the selected day on scroll.
- Preserve public-template permissions, canonical metadata, social tickets and actual directions links.
- Use only actual place photography; label any destination cover as such.
- Map connections describe stop order, never road geometry. Retain provider attribution.
- Missing places/coordinates, empty days, long Vietnamese names and failed SDK imports need usable alternatives.
- Native mobile map dialog must support Escape, focus return, day changes and viewport resizing.

## Tasks

- [x] Add failing unit tests for day normalization, selection validation, empty days, repeated visits and real cover selection; implement pure helpers.
- [x] Build cover, day overview and stop postcards; refine existing day navigator/carousel. Add external widget-owned CSS to preserve Vite style HMR.
- [x] Replace scrollspy with explicit day chapters, shareable day hashes and one selection. Reuse sharing/ticket features near the cover.
- [x] Adapt the existing MapLibre map with fit/focus controls, optional clearly labeled stop connections, resize handling and cleaned-up listeners. Keep a single map across mobile/desktop modes.
- [x] Verify helper tests and production SSR, lint, strict typecheck and build; request independent code review and address findings.
- [x] Document audit, architecture, motion, real-data limitations and verification, including unavailable visual/device checks.

Final evidence: 20 workspace tasks, 179 web unit tests and 97 production SSR tests passed. Independent review findings on canvas padding and chapter focus were fixed and re-reviewed. Native desktop dialog opening was also corrected to preserve initial page focus. Rendered/device QA remains explicitly unverified because no browser is connected; see the runbook.
