# The Discovery Collection — category discovery

Scope: `/{city}/{category}`. Implemented and verified locally on 2026-10-23. No reference screenshot was attached to this turn; the audit used the actual source and before screenshots of the running application.

## Original experience and data audit

The Nuxt 4 SSR route already validated the four public category slugs, loaded city/place data, supplied canonical/social/ItemList metadata and used 15-minute SWR. The category enum includes secondary-category matches, so a café collection can legitimately contain a place whose primary category is food or sightseeing. Existing tag metadata supplies real counts; place lists have cursors but no authoritative total count.

The rendered page had a plain heading, small tab navigation, basic tag controls and dense cards with 96px thumbnails, repeated metadata and handwritten excerpts. Its introductory copy claimed every place had been checked with its owner, while actual cards included unconfirmed places. Category personality and the map entry were weak. The live dataset supplied no covers for the audited category pages; substituting stock photography would have misrepresented the places.

The existing Area Guide already supplied useful foundations: responsive postcard cards, bounded category/compass placeholders, GET/router filtering, load-more/Back snapshots, opening status, image variants and the Living Route observer. The installed stack is Nuxt 4, Vue 3, TypeScript, token-based CSS and MapLibre. Tailwind and GSAP are not installed. No animation or application dependency was added.

## Experience architecture

1. **Category cover:** an editorial chapter number, real category/city H1, category-specific voice and a composed illustration or a real supplied place cover. The first available cover is explicitly captioned with its place name. Missing photography is labeled as illustration. Coffee, food, sightseeing and activities have distinct copy, glyphs and token accents while retaining the same visual grammar.
2. **Category navigator:** public contract categories, contextual glyphs, active underline/state and horizontal mobile scrolling. The active item is revealed and focus restored after deliberate navigation. Changing category keeps area/rain shelter and clears keyword/tags/cursor; the copy explains that policy. The current category link returns to its unfiltered collection.
3. **Discovery filters:** a full-width mobile search, real interest tags/counts, actual city areas and supported partial/full rain shelter. Native GET forms work without JavaScript; client navigation retains focus, composition guards, pending/error feedback and clear-all. The route determines category, so the filter cannot silently switch it through a query parameter.
4. **Place collection:** shared photo-led postcards, actual primary category/area, one short note, honest practical/verification state and detail link. API order is unchanged. Only the first card with a real cover can span columns. The count is explicitly the number currently displayed, not an invented category total.
5. **Mood collection:** shown only when at least two known tags have positive metadata counts. Links replace the tag selection and clear keyword/cursor, retaining area/shelter. No place photo is assigned to a mood without supporting data. The count's scope is explained.
6. **Map invitation:** a deliberately labeled journal illustration and a genuine map link carrying category/q/tags/area/rainSafe. There is no pretend geographic preview, invented coordinate or second map system. No MapLibre module is initialized here. Actual area links retain the category and supported interest context.
7. **Other chapters:** three alternative public categories, each with a bounded symbol, editorial annotation and clear exploration action. Cards use one/two/three columns and natural content height.

Colors, paper grain, cartographic details and motion use existing tokens. Lora remains the primary display font. Windows QA revealed that its existing Georgia fallback gave `ố` an approximately 32px advance at 32px font size when web fonts were unavailable. The new `--font-display-vietnamese` token uses Times New Roman as the fallback only inside this category experience; the same character then measured approximately 15px and rendered correctly. Other pages' font stacks are unchanged. [Font evidence](qa/discovery-collection/vietnamese-fallback.json).

## Components and contracts

- `pages/[city]/[category].vue`: stable route validation, normalized filters, real city-zone membership, reactive place query/key, errors/retry and existing SEO. City metadata precedes the optional area query so an unknown area cannot turn a valid category into a 404. The query is captured per keyed page; recovering city metadata can still update its effective area. This adds a metadata dependency to the initial request sequence; no timing/Core Web Vitals claim is made.
- `widgets/place-listing/ui/RdCategoryGuide.vue`: category composition, real-data selection, mood/map/area/related links and one cleaned-up route observer.
- `RdCategoryCover.vue` and `RdCategoryNavigator.vue`: focused cover/navigation presentation, within the existing widget slice to preserve FSD boundaries.
- `entities/place/lib/category-guide.ts`: identity configuration and route/category-specific context policies. `PUBLIC_CATEGORIES` and `CATEGORY_URL_SLUG` remain authoritative; category strings are not duplicated as a second source of routing truth.
- `entities/place/lib/discovery-query.ts`: shared normalized q/category/zone/tags/rainSafe/cursor state. Existing area helpers delegate to it without changing their route semantics. Keyword search always drops cursor.
- `features/place-tag-filter/ui/RdDiscoveryFilter.vue`: the former area filter generalized for both contexts, replacing `RdAreaFilter.vue`. Category mode fixes category and offers actual zones; area mode retains its category selector. Other consumers of the older `RdTagFilter.vue` are unchanged.
- `RdPlaceListing.vue`: shared card rendering, loaded counts, order, cursors, snapshots, focus and notices; now accepts the common discovery filter and first-page pending state. `RdFieldPlaceCard.vue` and `RdFieldPhoto.vue` are reused directly.
- `widgets/place-listing/lib/use-listing-request.ts`: request cancellation, generation/readiness ownership and scope cleanup. It protects against stale completions and duplicate submissions.
- `entities/place/api/places.ts`: existing helper accepts reactive Nuxt query/key inputs; URLs and backend contracts are unchanged.
- `assets/discovery-collection.css`: category composition and responsive/motion rules. `local-field-guide.css` provides the shared foundations for both roots. `packages/ui/src/tokens.css` adds only the Vietnamese-safe fallback token.

No price, rating, suitability, verification status or itinerary operation was invented. Save/add-to-itinerary controls were not exposed because the existing listing contract does not support those operations.

## Async correctness and independent review

Review identified a city-recovery race: an unfiltered load-more request could finish after the area-filtered first page replaced it. Nuxt also retains the previous data while a changed fetch key is pending, leaving a window where the old cursor could be used with new filters.

Both cases are covered now. Effective parameter changes clear the retained cursor and close pagination until the matching first page arrives. Pending first-page refreshes gate the link/handler and expose busy/status feedback. Requests abort and invalidate on context/data/readiness changes or disposal. Results and delayed focus are accepted only by the current generation; history writes use the original page fingerprint. A stale completion cannot clear another request's loading state. Independent re-review found no remaining important issue.

Five focused Vue effect-scope tests cover changed parameters, changed first-page data, transports ignoring abort, loading ownership, duplicates/disposal and requests attempted before first-page readiness. The last readiness case was observed failing against the first implementation before being corrected.

## Responsive, motion and accessibility verification

Real installed Chrome was driven in an isolated browser context. The default and reduced-motion experiences were checked. All four categories passed the nine-width geometry checks, and the Area Guide passed its shared-component regression checks at the same widths.

| Width | Place columns | Related chapters | Unintended document overflow |
| --- | ---: | ---: | --- |
| 320px | 1 | 1 | None |
| 375px | 1 | 1 | None |
| 390px | 1 | 1 | None |
| 430px | 1 | 1 | None |
| 768px | 2 | 2 | None |
| 1024px | 3 | 3 | None |
| 1280px | 3 | 3 | None |
| 1440px | 3 | 3 | None |
| 1920px | 3 | 3 | None |

The audit checked actual DOM boxes as well as document width. No uncontained off-viewport elements were found. Intentional tab/chip scrollers remain usable. Related glyphs stay 72×72px, map compass 80×80px, navigation glyphs 28×28px and hero glyphs scale within explicit bounds. Primary controls measure at least 44px high. The footer, long real place names, expanded filters, missing images and empty results were inspected.

The 650ms headline/image mask and short symbol/text stagger are CSS enhancements. Hover feedback uses the existing 200ms transitions, image zoom and small card lift. The shared observer updates visible scene progress, refreshes for appended cards and disposes on unmount. Reduced motion computes no animation and zero duration; essential SSR content remains visible. Keyboard focus is visible with a 3px outline. The selected category glyph inherits its light foreground correctly instead of keeping the entity glyph's dark default.

Hero covers use the existing 400/800/1200 WebP variants, responsive sizes and eager/high-priority loading. Card images remain lazy with reserved aspect ratios and broken-image fallbacks. The map invitation has no initial SDK, tile or geographic-query cost. There is no animation framework, scroll hijacking or global overflow clipping.

## Functional QA results

- Category load more: **20 → 28** real places, no duplicates, focus on the first appended card.
- Place detail and Back: real detail route opened; all **28** results and exact **11848px** scroll position were restored in that check.
- Keyword `Yên`: actual Yên Cafe result; tags, area and rain shelter updated real results and URL state.
- Switching category preserved area/shelter, cleared interests and restored navigation focus. Map and area links carried the intended context.
- JavaScript disabled: native tag and search GET submissions preserved area/tag inputs. SSR links and content remained accessible.
- Empty search: honest empty state with clear action, no overflow at 320px.
- Controlled load-more failure: first **20** results remained; retry loaded **28**. Two user clicks during a deliberately delayed response produced one request and a busy state.
- Shared Area Guide: category context transferred correctly; clearing it and loading more produced **31** real results with no overflow at all nine widths.
- Keyboard/reduced motion and all four category identities were exercised. Interaction checks waited for the mounted live notice; an earlier click before hydration correctly used the native GET fallback.
- Final direct checks confirmed all four canonical category URLs return HTTP 200 with the new collection markup and exactly one H1. Only their exact generated HTML cache entries were refreshed; the 15-minute cache policy remains unchanged. The local API became unavailable during final checks, correctly producing 503/error UI, and was restarted on port 3101 before confirming those responses. The web and API are left available for local review.

## Evidence and automated checks

Before: [desktop](qa/discovery-collection/before-1440.png), [mobile](qa/discovery-collection/before-390.png).

Final full-page screenshots: [375px](qa/discovery-collection/cafe-375.png), [430px](qa/discovery-collection/cafe-430.png), [768px](qa/discovery-collection/cafe-768.png), [1024px](qa/discovery-collection/cafe-1024.png), [1440px](qa/discovery-collection/cafe-1440.png). All nine café widths follow `qa/discovery-collection/cafe-{width}.png`. Related-card screenshots add `-next`; other categories have 375/1440px full-page/cover captures.

Raw results: [DOM geometry](qa/discovery-collection/layouts.json), [36 category/viewport checks](qa/discovery-collection/category-variants.json), [functional checks](qa/discovery-collection/functional.json), [motion/keyboard](qa/discovery-collection/motion-keyboard.json), [Area Guide regression](qa/discovery-collection/area-regression.json).

Final verification after the changes:

- `pnpm.cmd turbo run lint typecheck test build --output-logs=errors-only`: **20 successful tasks**.
- Web unit tests: **198 passed** across **42 files**.
- Production SSR tests: **105 passed**.
- `git diff --check`: no whitespace errors; existing CRLF conversion warnings remain in unrelated earlier files.
- Package manifests and lockfile unchanged. No commit, deployment or production/staging action was performed.

## Remaining validation

Physical-device touch/IME, Safari, staging and measured Core Web Vitals remain unverified. The QA environment blocked external font/tile resources; the category page's fallback typography was explicitly verified, while a fully loaded geographic background belongs to the existing map route's remaining network validation. Some live dataset records still lack licensed photography. Supplying genuine covers through the existing content workflow will replace labeled placeholders automatically.
