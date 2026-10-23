# Brand Color Refinement Implementation Plan

> Execute inline with superpowers:executing-plans; one final independent review.

**Goal:** Implement the user's specified forest/terracotta color hierarchy while preserving layout, type, motion and behavior.

**Architecture:** Existing CSS tokens/rd classes only; no Tailwind or new dependency. Stable brand roles, independent seasonal artwork, dedicated status colors and sage selected states. Literal base hex tokens remain compatible with ticket rendering.

**Spec:** User's Brand Accent Color Refinement request; later instruction prioritizes quick implementation and skips screenshots.

- [x] Audit accent aliases/runtime overrides/SVG/buttons/badges/filters/maps/focus/loading and shared admin/ticket dependencies.
- [x] Calculate contrast: original terracotta/white fails 4.5:1; use #A45B3E for button fills and #985337 for small text.
- [x] Implement tokens, role-specific consumers and semantic/season separation without changing requests, URLs or interaction logic.
- [x] Run required technical checks; one final independent review; document actual results and visual-QA limitation. Results: 20/20 workspace tasks, 112/112 SSR, 11/11 calculated contrast pairs; no important review findings. Screenshots skipped as requested.

Rulings: user fully specified the design and authorized direct implementation; no further design approval. Continue in existing feature checkout to preserve earlier work. Styling uses visual/static verification per CLAUDE.md; no new business logic/test boilerplate. User requested skipping the screenshot pass, so no new screenshots or viewport certification. No commit/push/deploy requested.
