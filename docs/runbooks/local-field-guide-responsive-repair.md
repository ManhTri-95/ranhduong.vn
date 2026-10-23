# Local Field Guide — responsive repair

Verified on 2026-10-23 against the running Nuxt application and its real local API. This is a targeted repair of `/{city}/khu-vuc/{zone}`; routing, filters, ordering, pagination, metadata, map provider and brand tokens are unchanged.

## Reproduced causes

1. **Grid intrinsic sizing:** the horizontal discovery-moment collection contributed a 775px minimum content width. The implicit `auto` grid track and grid items with `min-width: auto` propagated it to the page. At a 320px viewport, the guide itself measured 775px and the document 847px. The viewport meta tag was already correct.
2. **Hidden filter labels:** absolutely positioned screen-reader count explanations lacked a positioned ancestor inside the chip scroller. After isolating the grid fix, these labels still extended document width to 653px. Positioning the chip list reduced that to 352px, identifying a separate remaining illustration problem.
3. **Compass specificity:** the shared component's scoped `.rd-compass[data-v-…]` selector was stronger than `.rd-field-next li svg`. Its 100% width and height overrode the intended 44px dimensions. The desktop compass measured 350px inside a 392px card and squeezed the adjacent text. Bounded parent wrappers preserve the shared component's intended 100% sizing without specificity overrides.
4. **Map error-state compression:** the invitation was an absolutely positioned flex column inside a fixed 360px surface. At 320px, adding the error message compressed the retry button to 14px. The invitation now participates in normal grid flow; the surface has a minimum height, and the button cannot shrink below 44px. The error surface can naturally grow to approximately 418px.

The first three hypotheses were applied individually in the browser and restored before implementation. Assertions reproduced document overflow and oversized compasses before the fix; a separate failing assertion reproduced the 14px retry target.

## Modified application files

- `apps/web/app/pages/[city]/khu-vuc/[zone].vue`: explicit `minmax(0, 1fr)` page track.
- `apps/web/app/assets/local-field-guide.css`: shrinkable guide/section tracks, positioned chip scroller, bounded illustration wrappers, region-card internals and content-sized map invitation.
- `apps/web/app/widgets/place-listing/ui/RdAreaGuide.vue`: bounded empty-state compass and region cards with heading, description, illustration and exploration footer. Region URLs and filter-preserving click handlers remain intact.
- `apps/web/app/widgets/place-listing/ui/RdAreaMapEntry.vue`: bounded invitation compass; map/data operations are unchanged.
- `apps/web/app/entities/place/ui/RdFieldPhoto.vue`: bounded category/compass wrapper for honest missing-image placeholders.

No global overflow clipping, hidden broken content, new application dependency, backend change or fixed card height was introduced. Region cards remain in API order. Their descriptions are navigation copy, not new geographic claims. Typography, colors, paper/grid textures, route observers and animation tokens remain in use.

## Rendered viewport results

The installed Chrome was exercised in an isolated Playwright context through Node REPL. Full-page and neighborhood-section screenshots were saved at every width. The document width, actual element bounding boxes, intentional horizontal scrollers, control sizes, grid columns and illustration dimensions were inspected; document width alone was not treated as sufficient evidence.

| Viewport | Document before | Document after | Region columns | Compass |
| --- | ---: | ---: | ---: | --- |
| 320px | 847px | 320px | 1 | 80 × 80px |
| 375px | 847px | 375px | 1 | 80 × 80px |
| 390px | 847px | 390px | 1 | 80 × 80px |
| 430px | 847px | 430px | 1 | 80 × 80px |
| 768px | 847px | 768px | 2 | 80 × 80px |
| 1024px | 1050px | 1024px | 3 | 80 × 80px |
| 1280px | 1286px | 1280px | 3 | 80 × 80px |
| 1440px | 1440px | 1440px | 3 | 80 × 80px |
| 1920px | 1920px | 1920px | 3 | 80 × 80px |

There were no uncontained off-viewport elements in the final audit. Primary filter, region and map-entry controls measured at least 44px high. Empty results, expanded advanced filters, missing-photo placeholders, footer wrapping and a temporarily substituted long region label also fit at 320px. The long label was a browser-only QA stress string and was restored immediately; production data was not changed.

Useful image comparisons:

- [Broken mobile page](qa/field-guide-layout/before-320.png), [repaired mobile page](qa/field-guide-layout/after-320.png).
- [Broken desktop region cards](qa/field-guide-layout/before-1440-next.png), [repaired desktop region cards](qa/field-guide-layout/after-1440-next.png).
- [Mobile region cards](qa/field-guide-layout/after-375-next.png), [tablet region cards](qa/field-guide-layout/after-768-next.png).
- [Map invitation error at 320px](qa/field-guide-layout/map-error-320.png), [loaded map fallback at 320px](qa/field-guide-layout/map-preview-320.png).

All nine full-page files follow `qa/field-guide-layout/after-{width}.png`; section files follow `after-{width}-next.png`. Raw evidence includes [before](qa/field-guide-layout/before.json), [after](qa/field-guide-layout/after.json), [DOM audit](qa/field-guide-layout/dom-audit.json), [canonical URL](qa/field-guide-layout/canonical.json), [map error controls](qa/field-guide-layout/map-error-after.json) and [loaded map sizes](qa/field-guide-layout/loaded-map.json).

## Functional and motion checks

- Load more appended 20 → 31 real places, retained ordering and focused the first new card.
- Searching for `Yên` returned the actual Yên Cafe record. Clear, tag filtering and category filtering updated the URL and results; tag focus was restored.
- Region navigation preserved category/tag context and restored focus to the active region. Region cards remained keyboard reachable with a visible 3px outline.
- Place cards opened actual detail routes. The map-entry link preserved the selected area.
- The map preview performed its real bounded geographic request only on intent, returned four real places and maintained a single selected list item.
- A deliberately aborted preview request exercised the application's actual error/retry state. This interception was removed after the check. Error-state controls remained 44px high at all nine widths.
- The actual MapLibre container and canvas matched their surface at 320, 768 and 1440px, including after the normal-flow correction. The small-screen SDK retry action also remained 44px high.
- Default-motion checks retained the 650ms hero reveal and live route progress, with no overflow at all nine widths. Reduced motion computed `animation-name: none` and `0s` duration. No global motion setting was changed.

See [functional results](qa/field-guide-layout/functional.json) and [motion results](qa/field-guide-layout/motion.json).

Nuxt's existing 15-minute HTML cache initially served the old canonical markup even after source/HMR updates. Fresh responses were used for early QA; only the generated cache entry for `/da-lat/khu-vuc/trung-tam` was then removed. The canonical URL was verified with the new card markup at all nine widths. No route-cache policy or other cached page was changed. The temporary public diagnostic HTML was removed. The existing user dev servers were left running.

## Automated verification and limits

- `pnpm.cmd turbo run lint typecheck test build --output-logs=errors-only`: **20 successful tasks** after the final CSS change.
- Web Vitest: **187 passed**, 40 files.
- Production SSR Vitest: **102 passed**.
- Independent review of the initial repair and the map error-state follow-up found no important regressions.

OpenFreeMap tile/font requests were blocked with `net::ERR_NETWORK_ACCESS_DENIED` in the QA environment. The real canvas, markers, controls, list and error feedback were inspected, but a fully loaded geographic background could not be verified. [Network evidence](qa/field-guide-layout/map-network-limit.json) records this limit. Physical-device gestures, Safari, staging and measured Core Web Vitals remain outside this local Chrome verification.
