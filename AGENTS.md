# Repository Guidelines

## Project Structure & Module Organization

Ranh Duong is a Da Lat travel guide built as a pnpm/Turborepo monorepo. Read `CLAUDE.md` and `docs/decisions.md` before changing code.

- `apps/web/app/`: Nuxt 4 SSR frontend; layers are `pages`, `widgets`, `features`, `entities`, and `shared`. Import only from lower layers; avoid cross-slice imports within a layer. Assets live in `app/assets/`.
- `apps/api/src/`: NestJS API with `/v1` routes; group business functionality into modules.
- `packages/contracts/src/`: shared Zod schemas and opening-hours utilities.
- `packages/geo/src/`: normalization, slugs, distance, and similarity utilities.
- `packages/ui/src/tokens.css`: design tokens; `packages/config/`: shared TypeScript and ESLint configuration.
- Tests sit alongside source as `*.test.ts`; `.github/workflows/ci.yml` defines CI.

## Build, Test, and Development Commands

Use Node 24 (`.nvmrc`; minimum 22.19) and pnpm 12.9.1.

- `corepack enable` and `pnpm install`: enable pnpm and install dependencies.
- `pnpm infra:up` / `pnpm infra:down`: start/stop Docker MongoDB, Redis, and MinIO.
- `pnpm dev`: start web on port 3000 and API on port 3001; health endpoint is `/v1/health`; the API reads `apps/api/.env`.
- `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`: run workspace tasks.
- `pnpm turbo run lint typecheck test build`: required pre-commit checks; also run in CI.
- `pnpm --filter @ranhduong/geo test`: test one package.

## Coding Style & Naming Conventions

Follow `.editorconfig`: two spaces, UTF-8, LF, final newline, and no trailing whitespace. Use strict TypeScript, single quotes, and semicolons as in existing code. ESLint uses the shared flat config in `packages/config/eslint.mjs` (error-catching rules only); Prettier is not configured.

Use English identifiers, kebab-case filenames, and Vietnamese user-facing text. Name Vue components `Rd…` and reuse `rd-…` classes and design tokens. Define shared API/form/import schemas in `packages/contracts`. Record new dependencies in `docs/decisions.md`.

## Testing Guidelines

Use Vitest with descriptive `describe`/`it` cases in colocated `*.test.ts` files. Test conditional business logic, including opening hours, slugs, and duplicate detection. No numeric coverage threshold is configured; API and web currently have no test scripts.

## Commit & Pull Request Guidelines

Git history is unavailable in this checkout. Follow `CLAUDE.md`: Conventional Commits with story IDs, such as `feat: S05 add place form`; branches like `feat/S05-place-form`. PRs should explain changes, link the story, report checks, and include screenshots for UI changes. Verify acceptance criteria, staging behavior, and real-phone usability.

## Configuration

Use `.env.example` as the configuration reference; keep credentials out of commits. Read API settings through `loadEnv()`. Store GeoJSON coordinates as `[lng, lat]` and timestamps in UTC.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
