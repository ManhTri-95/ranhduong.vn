# Rành Đường — Brand Color Refinement

23 October 2026. Targeted color refinement on the existing feature checkout. The user requested quick direct changes and explicitly skipped screenshot capture.

## Audit and role decisions

The website uses CSS custom properties and `rd-…` classes; no Tailwind configuration is present. The old root accent, runtime city/season `--accent` override, pale-yellow note/highlight aliases, accent button/chip variants, status badges, selected markers and navigation shared unrelated roles.

| Role | Actual consumers | Resolution |
| --- | --- | --- |
| Brand/editorial | Tokens, homepage highlight/note cards, chapter/trail/compass inherited rust, collection stamps, discovery stamp, header dot | Terracotta #B86B4B for decorative accents; #985337 for readable small editorial text; pale terracotta note/highlight instead of yellow |
| Primary action | Shared buttons, hero/closing, map header, discovery search, collection actions, place/itinerary directions, consent allow | Forest #234E45 / white |
| Secondary | Outline/dashed/ghost and sparse accent variant | Forest outline/ghost; accent buttons use accessible dark terracotta #A45B3E / white |
| Semantic status | Place/field/detail open chips and collection open badge | Existing success foreground/background tokens; preserve open/closed logic and unconfirmed caveats |
| Selected | Category/region/filter navigation, day/view tabs, timeline/carousel ranks, collection list/rank, HTML map pins | Sage / forest, preserving checkmarks, borders/outlines, numbers, glyphs and ARIA |
| Focus | Shared button/icon/chip rings and public default ring | Strong forest; retain existing pale focus on dark/photo sections and visible offsets |
| Seasonal | Runtime city theme, illustration SVG fills, season badges/admin preview | Dynamic --season-accent affects artwork only; readable badge surface remains stable |
| Loading/disabled | Shared buttons and existing page-specific pending/disabled styles | Neutral text/surface/border at full opacity; preserve busy wording and behavior |
| Dependencies | Admin login/import/actions and ticket token parser | Align shared action/selection colors; keep literal base hex tokens parseable; update old ink expectation in existing ticket test |

## Tokens

Existing paper/ink/mist/line become #F7F5F0 / #242C2B / #DCE8E2 / #D6D8CF. Raised paper and cartographic terrain/forest/water/road colors are retained. Add primary/hover/foreground, accent/strong/text/foreground/copper, selected and disabled roles in the same tokens.css. Legacy --accent maps to --brand-accent; route-rust maps to accessible accent text; note/highlight become a restrained terracotta tint. No parallel theme library or new dependency.

## Contrast

Calculated with WCAG sRGB relative luminance; thresholds are evaluated before rounding:

| Pair | Ratio |
| --- | --- |
| White / forest | 9.345:1 |
| White / original terracotta | 4.006:1 — fails normal text, kept decorative |
| Original terracotta / ivory | 3.676:1 — fails small text |
| Copper / ivory | 4.219:1 — decorative, not small text |
| White / accessible dark accent | 5.067:1 |
| Accessible accent text / ivory | 5.313:1 |
| Forest / sage | 7.424:1 |

Reference: [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Calculated token pairs are not a site-wide accessibility certification.

## Yellow retained intentionally

- --status-warn-bg remains #FCEFB4 for warning/recovery states; it is not a brand highlight.
- Validated seasonal data/fixtures/admin defaults may retain #E9B824 for actual wild-sunflower illustrations. These now populate --season-accent and cannot recolor brand actions/statuses.
- Existing ticket data/fixtures retain their city accent field; no database or API contract is changed.
- Map land/road shades are geographic cartography rather than brand-yellow buttons; committed terrain/style/sprites are retained.

## Verification

`pnpm.cmd turbo run lint typecheck test build --output-logs=errors-only`: **20/20 successful tasks**, 8 cached, 1m2.114s. The initial run identified one ticket test expecting the old ink hex; the assertion was updated to the explicitly requested Deep Ink palette. No ticket parser or business behavior was changed.

The [computed contrast report](qa/brand-colors/contrast.json) passes **11/11** normal-text pairings, including hover, accent chip, selected, disabled, success, warning and error; minimum is **4.693875:1**. Decorative raw terracotta/copper are deliberately excluded from normal-text roles. One independent final review found no important actionable issue in selection, disabled/hover, markers, seasonal isolation, ticket-parser compatibility or the color-pass snapshot diffs.

`pnpm.cmd --filter @ranhduong/web test:ssr`: **112/112 passed**, exit 0, 4.17s. Seasonal SSR assertions now verify --season-accent; existing expiry, fallback, public-data and SEO checks remain intact. `git diff --check` passes after UTF-8/LF normalization.

[Color-pass file manifest](qa/brand-colors/modified-files.json). No new screenshots or viewport verification were performed, following the user's request to finish quickly. Prior responsive results do not certify this color pass. Physical phone/Safari/staging remain unverified; no deployment was performed.
