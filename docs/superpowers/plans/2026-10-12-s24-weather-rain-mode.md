# S24 Weather and rain mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Show fresh city weather and help visitors find sheltered places when rain is present or likely.

**Architecture:** Extend S23 `/cities/:city/now` with nullable weather, using WeatherAPI Free (chosen by the owner on 2026-10-12). Cache successful observations independently in Redis for at most 15 minutes; never store weather in the season cache. Add an explicit `rainSafe=true` map query, filtered before pagination in MongoDB by `cover: full | partial`.

**Tech Stack:** Existing NestJS, native fetch, ioredis, Zod, Nuxt/Vue and Vitest; no new dependencies.

**Spec:** `docs/backlog.md` S24; `docs/ui-spec.md` sections 4/7/11; `docs/architecture.md` sections 7/9; ADR 0003 and 0011. Owner approved replacing WMO/Open-Meteo with WeatherAPI Free.

## Global Constraints

- Use Node 24 and pnpm 12.9.1, strict TypeScript, shared contracts and the existing FSD boundaries.
- Work on `feat/S24-weather-rain-mode`; preserve existing local files and `.pnpm-store` artifacts.
- Server-only `WEATHERAPI_KEY` through `loadEnv()`. Missing key hides weather; never log provider URLs/errors containing the key.
- Weather timeout 3 seconds; Redis operations for weather have a short deadline. Errors return null and leave seasons/content usable.
- UTC timestamps, city `[lng, lat]` converted to provider `lat,lng`. Forecast spans midnight using two forecast days.
- Four states: fog, sun, cloud, rain. Rain codes or a maximum hourly chance of rain >=60% in the next three hours enable rain mode. Unknown conditions hide the tile.
- WeatherAPI Free requires attribution and an informational-use disclaimer; include both with the tile and source/legal pages.
- An expired tile must disappear immediately while refreshing. Serve city home HTML without SWR so cached HTML cannot extend a weather observation's lifetime; other routes retain their existing cache rules.
- No live weather tests without a user-configured key; fixtures must be clearly artificial.

## Review Focus

- Midnight: request two days and evaluate Unix timestamps across the date boundary.
- Freshness: expired or malformed Redis values and old/future provider observations cannot become fresh by refetching.
- Failure isolation: network, HTTP, malformed data, missing key and Redis failures never fail the page or expose credentials.
- Filters: sheltered results include secondary categories, exclude unknown/none/hidden/other-city, and paginate only the matching set.
- Navigation: rain chip survives category changes, GET submissions without JS, refresh and Back; changing filters cancels stale map requests.

## Acceptance coverage

| S24 requirement | Verification |
| --- | --- |
| Server weather call, Redis 15-minute cache | Task 2 provider/service and Redis tests |
| Four WeatherAPI states (approved replacement for WMO) | Task 1 mapping table and threshold tests |
| Rain link and preselected map chip | Task 3 production SSR and browser checks |
| full/partial cover only | Task 1 query validation; Task 2 MongoDB HTTP tests |
| Hide on errors and expiry | Task 2 failure tests; Task 3 SSR and client expiry checks |

### Task 1: Shared weather and map contracts

**Files:** Create `packages/contracts/src/weather.ts` and `weather.test.ts`; modify `index.ts`, `city-season-admin.ts`, `place.ts`, and their tests.

**Interfaces:** Produce `CityWeather`, `WeatherApiResponse`, `weatherApiState(code: number): WeatherState | null`, and `weatherFromApi(raw: unknown, now: Date): CityWeather | null`. `CityNow.weather` is nullable/optional for backwards compatibility. `CitySeasonContext.center` provides city coordinates. `PlaceListQuery.rainSafe` accepts only string `true` or `false`.

- [x] Write mapping tests for all supported fog/sun/cloud/rain codes and unknown codes; rain threshold 59/60%, past and >3h forecasts, midnight, missing/duplicate hours, malformed probability, stale/future timestamps.
- [x] Run `pnpm --filter @ranhduong/contracts test src/weather.test.ts src/place-map.test.ts` and observe RED.
- [x] Implement schemas and mapping; weather expires at min(fetch time +15m, observation time +30m). Missing forecast coverage hides the tile rather than declaring dry weather.
- [x] Run the contracts tests and build; expect GREEN.

### Task 2: Weather service, /now and sheltered API results

**Files:** Create `apps/api/src/modules/city-now/weather.service.ts` and `.test.ts`; modify city-now module/service/controller and tests, config/env and tests, places repository/service and place-map HTTP tests, `.env.example`.

**Interfaces:** Consume Task 1; produce `WeatherService.current(context: CitySeasonContext, now?: Date): Promise<CityWeather | null>`. Weather cache key includes city id and coordinates; same-process requests share one in-flight fetch. `/now.expiresAt` is min(season expiry, weather expiry); unavailable weather uses HTTP no-store.

- [x] Write tests for URL coordinates/two days, no key, success/cache TTL and expiry, concurrent calls, credential redaction, HTTP/network/invalid body, stuck Redis and timeout. Write `/now` composition tests and sheltered API pagination tests.
- [x] Run targeted API tests and observe RED.
- [x] Implement provider call to fixed `https://api.weatherapi.com/v1/forecast.json`, `days=2`, `aqi=no`, `alerts=no`; abort by deadline, cache validated fresh weather only. Keep season cache independent.
- [x] Add MongoDB `cover: { $in: ['full', 'partial'] }` only when `query.rainSafe` is true, before pagination.
- [x] Run targeted API/Redis/Mongo tests; expect GREEN.

### Task 3: Weather tile and persistent rain filter

**Files:** Create `apps/web/app/widgets/city-weather/ui/RdCityWeather.vue`, entity city weather display helper/tests and map query helper/tests; modify home page, use-city-theme, map page/explorer/fetch adapter, Nuxt config, SSR fixture/tests and source/legal copy.

**Interfaces:** Consume nullable `CityNow.weather`. Rain link is `/{city}/ban-do?rainSafe=true`; only a user action opens the map, with the chip selected. Category and rain filters remain independent. Existing selected pins/list/viewport behavior remains.

- [x] Add display/filter helper tests and production SSR cases for four states, rain URL, expired/missing weather with HTTP 200, no-store fresh HTML, selected rain chip and preserved GET form fields.
- [x] Run helper tests before implementation; expect RED.
- [x] Implement Vietnamese copy, small inline SVG icons, night-specific clear label, source/disclaimer, token styles and 44px actions. Refresh the existing `/now` source at the earliest season/weather expiry; hide stale weather before refresh and on visibility changes.
- [x] Add separate GET forms for category/rain filters so each preserves the other without JavaScript. Explicit `rainSafe` URL controls the filter; manually turning it off remains respected.
- [x] Run helper tests, build and `pnpm --filter @ranhduong/web test:ssr`; expect GREEN. Inspect 390px/desktop and rain navigation, expiry and request failure in Chrome.

### Task 4: Documentation and whole-branch verification

**Files:** Update `docs/ui-spec.md`, `technical-design.md`, `architecture.md`, `decisions.md`, `backlog.md`, `CLAUDE.md`; create `docs/runbooks/weather-rain-mode.md` with configuration and operational checks.

- [x] Record provider choice, native condition codes, quota calculation, cache behavior and source terms. Do not mark staging or real-phone checks complete.
- [x] Run `pnpm turbo run lint typecheck test build`, then production SSR; inspect all results.
- [x] Request one independent whole-change review; fix material findings with reproducing tests.
- [x] Confirm branch/diff and leave a concrete reviewed implementation. Commit/push/merge only if requested.

## Execution record

- Baseline: existing city-now/env tests passed 14/14 before changes. Existing contracts tests also pass in the final 394-test suite.
- Implementation: inline in the existing checkout on the user-requested new branch; no additional worktree.

- Verified: workspace 20/20; contracts 394, geo 37, API 388, admin 120, web 95; production SSR 75; Chrome mobile/desktop/no-JS/rain filters/expiry PASS; independent review clean. See `docs/runbooks/weather-rain-mode.md`.
