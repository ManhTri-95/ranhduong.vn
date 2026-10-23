# Curated Journal implementation plan

The user's Topic Collection Detail brief is the design specification and authorizes implementation in this checkout. Preserve the existing unrelated work in progress; no branch changes or commits.

**Goal:** Turn the topic detail route into an editorial journal while preserving SSR, canonical URLs, published visibility, curated order, and real place data.

**Architecture:** The page owns fetching/status/SEO. A collection-detail widget owns presentation, sharing, one selected slug, and intent-loaded geography. A small MapLibre feature renders numbered collection markers without a route. Reuse existing tokens, media variants, sharing utility, opening status, and living-route observer. No new dependency or API.

**Design:** Asymmetric typographic cover with a real-place postcard and compass seal; compact description shown once; full-width numbered story entries with photo/text composition; intent-loaded map with an accessible list and selected preview; sharing postcard; real related collections. On mobile all content flows in one column. No fictional photo, route, chapter ID, rating, endorsement, or place description.

## Tasks and acceptance checks

- [x] Audit: confirm contract fields, authoritative order, image variants, map integration, sharing and existing tokens. Screenshot mentioned in the brief was not attached; use the current implementation as the reference.
- [x] Geography: test a pure collection/geographic-card join preserves authoritative order and content, excludes unrelated records, tolerates missing locations, and does not mutate inputs.
- [x] Presentation: build photo fallback, story card and journal widget; wire the existing route. Cover handles long/short titles and missing descriptions. Cards preserve notes, categories, areas and current-hours caveats.
- [x] Map: load existing bbox API after intent, join by slug, keep only collection markers, use one selected slug, retain attribution, provide fit-all/retry/list alternative; no route geometry.
- [x] Motion/accessibility: existing observer, restrained CSS entrance/hover, reduced motion, semantic ordered list, visible focus, 44px controls and live share feedback/manual link fallback.
- [x] QA: lint/typecheck/tests/build; production SSR order/SEO/error/empty tests. Browser screenshots at 375/430/768/1024/1440 and overflow checks at all nine required widths if an automation browser is available. Document unavailable tooling and real-device/staging limits.

## Review focus

Long Vietnamese labels and 200-character titles; absent/broken photos; empty and one-place collections; 20–50 places; failed geographic API and map tiles; clipboard denial/native-share cancellation; changing motion preference; no-JS crawlable content.

## Decisions

- Collection cards normally omit location. Fetch the existing city bbox map projection on map intent, then intersect by collection slug. This avoids changing API fields or fetching every place detail.
- The collection seal bears the brand; destination and count remain real metadata; it does not invent a chapter number or editorial verification.
- Only practical notes supplied by the API serve as place descriptions. Missing notes do not get filler text.
- No browser is exposed through the computer-use inventory; the in-app browser creation attempt also reports unavailable. Investigate existing repository QA tooling before recording visual verification limits.

## Completion evidence

20 workspace tasks successful; 201 web unit tests and 107 production SSR tests passed. Chrome verified all nine widths without horizontal overflow, twelve stress layouts, five required full-page screenshots, map selection/retries/missing coordinates, sharing success/fallback/cancellation, reduced-motion changes and no-JS content. Full report: docs/runbooks/curated-journal.md; machine results: docs/runbooks/qa/curated-journal/results.json. Remote production map tiles, staging and real-phone native share remain environment checks.
