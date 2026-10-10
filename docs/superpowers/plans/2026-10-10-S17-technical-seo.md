# S17 Technical SEO Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. The user requested implementation in this session on a new branch.

**Goal:** Complete the code and local verification for S17; provide a concrete Search Console setup that can be verified after production deployment.

**Architecture:** Reuse Nuxt SSR, head composables and existing SWR rules. Entity helpers produce structured data; a shared composable manages canonical URLs, metadata and safe JSON-LD. A Nest SEO module composes public sitemap DTOs through exported business services; Nitro serves XML with one-hour SWR.

**Tech Stack:** Nuxt 4.5, NestJS, Zod, MongoDB, Vitest, existing sharp/R2 photo pipeline. No new dependencies.

**Spec:** `docs/backlog.md` S17, `docs/technical-design.md` §11, `docs/architecture.md` §4, ADR 0010/0011.

## Global Constraints

- Preserve all public URL paths and existing 301 redirects.
- Vietnamese copy, strict TypeScript, FSD imports only downwards.
- No invented place facts or Google ratings. Ratings only from platform data with at least 3 reviews.
- Keep one-hour SWR for public pages, one-day SWR for templates; errors and search are no-store; personal URLs noindex/no-store.
- API and inter-module DTOs live in contracts; repositories access only their own collections.

## Review Focus

- Draft/hidden/merged places, private/personal templates and inactive cities never appear in sitemaps.
- Malformed legacy templates that return 404 must be excluded; optional lastmod cannot be fabricated.
- Script-closing strings must remain inert in JSON-LD; absent facts and closed-place opening hours omitted.
- Query variants canonicalize to base paths; filters/search remain noindex.
- Search Console token and staging indexing policy configurable at runtime, including robots and HTTP headers.

### Task 1: Public sitemap source

**Files:** `packages/contracts/src/seo.ts`, repositories/services in cities, places, curated-lists, itineraries; `apps/api/src/modules/seo/{seo.module,seo.controller,seo.service,seo.http.test}.ts`; `apps/api/src/app.module.ts`.

**Interfaces:** `SitemapKind = pages | places | lists | itineraries`; `SitemapEntry = { path, lastmod? }`; `SitemapSource = { slug, updatedAt? }`; services return validated DTOs, SEO service produces `SitemapResponse`.

- [x] Write MongoDB HTTP tests for exact status/city/kind/visibility filtering, real updatedAt, stable paths and invalid kinds; run RED.
- [x] Implement read-only source methods, composition and schema validation; exclude invalid templates by reusing detail validation.
- [x] Run API tests GREEN. Covers sitemap selection and lastmod acceptance criteria.

### Task 2: Metadata and structured data

**Files:** shared SEO helpers/composable, entity SEO helpers, all current public page scripts, Nuxt config/app.

**Interfaces:** `usePageSeo({path,title,description,image?,breadcrumbs,jsonLd?,noindex?})`; pure `placeJsonLd`, `tripJsonLd`, `itemListJsonLd`, `breadcrumbJsonLd`, `serializeJsonLd`.

- [x] Write pure tests for primary/secondary types, coordinate order, weekly/overnight hours, ratings threshold, closed/missing facts, repeated stops and safe serialization; run RED.
- [x] Implement helpers and reactive metadata/JSON-LD for home/category/zone/map/place/list/trip/search pages. Canonical and OG URLs use configured origin without queries.
- [x] Add runtime Search Console token, site URL, staging indexing switch, and robots rules. Covers meta/OG/canonical and all JSON-LD acceptance criteria.
- [x] Run web tests/typecheck GREEN.

### Task 3: Crawl endpoints and cover derivatives

**Files:** Nitro sitemap/robots handlers and XML helpers; API media image/storage/service and backfill script; contracts photo variant helper; `.env.example`.

- [x] Add tests for escaped absolute XML, sitemap index, robots rules and actual 1200×630 WebP output; run RED.
- [x] Serve `/sitemap.xml` and root child maps with one-hour SWR, using internal API and timeout; errors remain no-store.
- [x] Generate `og.webp` during photo processing, remove it during cleanup; provide idempotent backfill for existing 1200px covers and an actual local default OG image.
- [x] Run focused tests GREEN. Covers sitemap index, robots, SWR and OG image dimensions.

### Task 4: Production validation and handoff

**Files:** `apps/web/tests/listing-ssr.test.ts`, `docs/runbooks/technical-seo.md`, backlog/decisions/CLAUDE status.

- [x] Add production HTTP assertions for head tags, parsed JSON-LD, canonical queries, sitemap filtering/lastmod, cached XML, recovery after API failure and staging noindex; verify against a fresh build.
- [x] Run `pnpm turbo run lint typecheck test build`, then `pnpm --filter @ranhduong/web test:ssr`; inspect outputs.
- [x] Review diff and fix material findings. Record results and external verification remaining (Search Console property/token, production/staging, real devices and CI).
- [x] Leave the new branch ready for review without merge, push or deployment.
