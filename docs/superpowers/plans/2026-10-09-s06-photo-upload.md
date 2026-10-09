# S06 Photo Upload Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Upload attributed JPEG, PNG and WebP files below 8 MiB directly to R2, process them privately, and attach sanitized WebP variants to a place.

**Architecture:** Admin requests a five-minute presigned PUT into a separate private upload bucket. A BullMQ worker in the API codebase validates the actual bytes, auto-orients and strips metadata with sharp, and writes public variants using the existing `photoVariantKey`. The admin polls status and attaches a ready photo through an idempotent places service; media never depends on places.

**Tech Stack:** NestJS, MongoDB, BullMQ/Redis, AWS S3 SDK (R2/MinIO), sharp, shared Zod contracts, Vue 3.

**Spec:** `docs/backlog.md` S06; `docs/technical-design.md` sections 6, 10, 11, 13; `docs/architecture.md` sections 3–5; `docs/data-collection.md` section 7; ADRs 0005, 0011, 0013.

## Global Constraints

- JPEG/PNG/WebP only; strictly below `8 * 1024 * 1024` bytes; URL expires after 300 seconds.
- Public variants: `{key}/400.webp`, `{key}/800.webp`, `{key}/1200.webp`; no original or EXIF in the public bucket.
- Every upload has cityId, placeId, source, credit and license; Creative Commons additionally records a source URL and an allowed commercial license.
- Shared request/response schemas in contracts; API environment through loadEnv; admin/origin guards on writes; English code, Vietnamese UI; token CSS, mobile first.
- Worker uses a separate entrypoint and retries transient failures twice. No deployment, staging claim or real-phone claim in this change.

## Review Focus

- Spoofed MIME, corrupt files, oversized actual bytes, animation and decompression bombs fail before publication (Task 2).
- Private originals stay separate even if processing fails; transient publication failures can retry without attaching partial output (Task 2).
- An upload for another place/admin, expired upload or incomplete processing cannot be attached (Task 2/3).
- Repeated completion/attachment and concurrent uploads never create duplicate photos or overwrite the form (Task 2/3).
- Polling failures, expired sessions and navigation give clear UI feedback without losing unsaved place fields (Task 4).

### Task 1: Contracts and configuration

**Files:** `packages/contracts/src/media.ts`, `media.test.ts`, `index.ts`, photo schemas; API env and tests; package manifests/lockfile.
**Interfaces:** Produces PhotoAttribution, MediaUploadInput/Response/Status, MediaAttachInput, UploadId and shared limits.
- [x] Write tests for MIME/size boundaries, mandatory attribution, CC license/link, private/public bucket separation.
- [x] Run contracts/env tests; expect failing assertions for missing schemas/settings.
- [x] Implement schemas and settings; install AWS SDK, sharp and BullMQ; document dependencies.
- [x] Re-run tests; expect all pass. Covers format, advertised size and required source acceptance criteria.

### Task 2: Private R2 upload and worker

**Files:** `apps/api/src/modules/media/*`, `apps/api/src/worker.ts`, `apps/api/src/modules/admin/admin-media.controller.ts`.
**Interfaces:** MediaService.create(context,input), complete(id,email), status(id,email), readyPhoto(id,placeId); scan(id). Queue `media-scan`, job `media.scan`, three attempts.
- [x] Write real-image tests for all formats, exact output widths, rotated images, GPS removal and invalid inputs; service/storage/HTTP tests for ownership, expiry, bounded reads, signed headers, retries.
- [x] Run tests and confirm RED before implementation.
- [x] Implement storage, upload repository/state, queue, service and worker entrypoint. Preserve module dependency direction.
- [x] Run tests and confirm GREEN. Covers presigned R2, format/actual size, WebP 400/800/1200 and EXIF criteria.

### Task 3: Attach ready photos to places

**Files:** place editor service/repository and tests, AdminMediaService/controller, admin places routes, optional sourceUrl in photo persistence.
**Interfaces:** AdminMediaService.attach(placeId,uploadId,email) checks MediaService.readyPhoto then calls PlaceEditorService.attachPhoto; returns AdminPlace; `POST /admin/places/:id/photos`. PlacesModule remains independent of media configuration for seed/tests.
- [x] Write integration tests: reject pending/foreign uploads, attach source metadata, repeat and concurrent attaches produce one row per key, preserve editable fields.
- [x] Run tests and confirm RED; implement atomic attachment; re-run and confirm GREEN.

### Task 4: Admin uploader and verification

**Files:** admin media entity API, photo-upload feature model/UI and tests, place editor integration, media base config, local setup script/runbook, backlog/decisions.
- [x] Write uploader tests: validate before request, direct PUT without cookies, poll then attach, failures and no form clobber.
- [x] Run RED; implement a file/source/credit/license form, CC URL, upload feedback and preview. Save a new place before uploading; preserve existing unsaved fields on photo changes.
- [x] Run GREEN; exercise MinIO + worker pipeline and mobile/desktop browser where available.
- [x] Run `pnpm turbo run lint typecheck test build`; expect all green. Review the complete diff and update status with staging/real-phone checks still pending.

## Verification evidence (2026-10-09)

- `pnpm turbo run lint typecheck test build --force --output-logs=errors-only`: 20/20 tasks successful, cache disabled.
- Actual S3-compatible storage + API/Mongo/Redis/BullMQ worker: five-minute signed PUT, private originals, public WebP widths/EXIF/cache headers and atomic attachment verified.
- Chrome headless at 375px and desktop: mandatory attribution, successful direct PUT, unsaved name preserved, photo preview and no horizontal overflow.
- Draft deletion cleaned six variants through the worker.
- Independent review found resume across OAuth, final failed status reconciliation and draft cleanup gaps; regression tests failed then passed for all three fixes.
- Local storage verification used RustFS already installed because the configured MinIO registry image returned pull denied. No infrastructure product or production deployment changed.
- Physical phone and R2 staging remain pending; do not claim the full story definition of done yet.
