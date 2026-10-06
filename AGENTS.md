# Repository Guidelines

## Project Structure & Module Organization

Ranh Duong is a Da Lat travel guide built as a pnpm/Turborepo monorepo. Read `CLAUDE.md` and `docs/decisions.md` before changing code.

- `apps/web/app/`: Nuxt 4 SSR frontend; layers are `pages`, `widgets`, `features`, `entities`, and `shared`. Import only from lower layers; avoid cross-slice imports within a layer. Assets live in `app/assets/`.
- `apps/api/src/`: NestJS API with `/v1` routes; group business functionality into modules.
- `packages/contracts/src/`: shared Zod schemas and opening-hours utilities.
- `packages/geo/src/`: normalization, slugs, distance, and similarity utilities.
- `packages/ui/src/tokens.css`: design tokens; `packages/config/`: shared TypeScript configuration.
- Tests sit alongside source as `*.test.ts`; `.github/workflows/ci.yml` defines CI.

## Build, Test, and Development Commands

Use Node 24 (`.nvmrc`; minimum 22.19) and pnpm 12.9.1.

- `corepack enable` and `pnpm install`: enable pnpm and install dependencies.
- `pnpm infra:up` / `pnpm infra:down`: start/stop Docker MongoDB, Redis, and MinIO.
- `pnpm dev`: start web on port 3000 and API on port 3001; health endpoint is `/v1/health`.
- `pnpm seed`: build the API and upsert the Đà Lạt city and its 4 zones (safe to re-run).
- `pnpm build`, `pnpm typecheck`, `pnpm test`: run workspace tasks.
- `pnpm turbo run typecheck test build`: required pre-commit checks; also run in CI.
- `pnpm --filter @ranhduong/geo test`: test one package.

## Coding Style & Naming Conventions

Follow `.editorconfig`: two spaces, UTF-8, LF, final newline, and no trailing whitespace. Use strict TypeScript, single quotes, and semicolons as in existing code. ESLint and Prettier are not configured.

Use English identifiers, kebab-case filenames, and Vietnamese user-facing text. Name Vue components `Rd…` and reuse `rd-…` classes and design tokens. Define shared API/form/import schemas in `packages/contracts`. Record new dependencies in `docs/decisions.md`.

## Testing Guidelines

Use Vitest with descriptive `describe`/`it` cases in colocated `*.test.ts` files. Test conditional business logic, including opening hours, slugs, and duplicate detection. No numeric coverage threshold is configured. API tests use Vitest; integration tests need MongoDB (`pnpm infra:up`) and get a throwaway database from `apps/api/src/testing/mongo.ts`. Web has no test script yet.

## Commit & Pull Request Guidelines

Git history is unavailable in this checkout. Follow `CLAUDE.md`: Conventional Commits with story IDs, such as `feat: S05 add place form`; branches like `feat/S05-place-form`. PRs should explain changes, link the story, report checks, and include screenshots for UI changes. Verify acceptance criteria, staging behavior, and real-phone usability.

## Configuration

Use `.env.example` as the configuration reference; keep credentials out of commits. Read API settings through `loadEnv()`. Store GeoJSON coordinates as `[lng, lat]` and timestamps in UTC.
