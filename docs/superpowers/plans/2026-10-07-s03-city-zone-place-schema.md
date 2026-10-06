# S03 Schema City, Zone, Place và seed Đà Lạt: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Có schema Zod (contracts) và Mongoose (API) cho City, Zone, Place với đủ index, cùng lệnh `pnpm seed` ghi thành phố Đà Lạt và 4 cụm có polygon. Chạy lại lệnh này bao nhiêu lần cũng không tạo bản trùng.

**Architecture:** Kiểu dữ liệu định nghĩa một lần bằng Zod trong `packages/contracts` (ADR 0011). API có hai module theo kiến trúc mục 4: `cities` (City + Zone, tầng Nền) và `places` (tầng Lõi). Mỗi module có schema Mongoose, repository (chỉ lớp này import model), service và module Nest. Seed chạy bằng Nest application context, gọi `CitiesService.applySeed()`: validate bằng Zod, tạo index, rồi upsert theo `slug` / `{cityId, slug}`.

**Tech Stack:** Zod 4.6, Mongoose 9.11, NestJS 12, Vitest 5 (Vite 8/Oxc), MongoDB 8 (docker compose local, service container trên CI), pnpm 12 + Turborepo 2.

**Spec:** `docs/backlog.md` S03 (tiêu chí: *4 zone có polygon; index 2dsphere và {cityId, slug} unique; chạy seed lại không tạo trùng*), `docs/technical-design.md` mục 3 (data model, bảng index), `docs/architecture.md` mục 4 (cấu trúc module), `docs/product-spec.md` mục 4 (4 cụm Đà Lạt), `docs/data-collection.md` mục 5 (slug cụm, định dạng số điện thoại), `docs/ui-spec.md` mục 2 (màu nhấn mặc định `#E9B824`), ADR 0001, 0002, 0005, 0010, 0011, 0013.

## Global Constraints

- TypeScript strict ở mọi package; không tắt `strict`, `noUncheckedIndexedAccess`; không dùng `any`, `@ts-ignore`.
- Toạ độ GeoJSON `[lng, lat]`. Mọi document nghiệp vụ (Zone, Place) có `cityId`.
- Slug không dấu, chữ thường, gạch nối (khớp `slugify` của `packages/geo`); unique theo `{cityId, slug}` (ADR 0010).
- Mọi kiểu dữ liệu qua API, form, import, seed định nghĩa bằng Zod trong `packages/contracts`; API validate bằng đúng schema đó, không định nghĩa lại.
- Không tự bịa dữ liệu thật về địa điểm. Test chỉ dùng dữ liệu giả, tên rõ là giả ("Giả Lập"), toạ độ quanh `[0, 0]`. Không seed địa điểm nào.
- Ảnh phải có `source`, `credit`, `license`. Chỉ lưu `googlePlaceId`, không lưu nội dung Google (ADR 0001).
- Thêm thư viện thì ghi một dòng vào `docs/decisions.md`. Không nâng TypeScript lên 7.
- API đọc biến môi trường qua `loadEnv()`. Riêng helper test (`src/testing/mongo.ts`, không vào build) đọc `MONGODB_TEST_URI`.
- Code, tên biến, tên file bằng tiếng Anh, file kebab-case; chữ hiển thị và comment tiếng Việt được.
- Nhánh `feat/S03-city-zone-place-schema`; commit Conventional Commits có ID story (`feat: S03 …`).
- Trước khi commit: `pnpm turbo run typecheck test build` xanh (turbo.json chưa có task `lint`).

## Review Focus

1. **Hai tiến trình seed chạy cùng lúc** (ví dụ hai container lúc deploy): vẫn đúng 1 thành phố, đủ cụm, không lỗi. Test ở Task 5 ("hai lần seed chạy cùng lúc").
2. **Bỏ hoặc đổi slug một cụm trong file seed:** cụm cũ không bị xoá vì Place có thể đang trỏ tới; cụm đó được báo trong `staleZoneSlugs`. Test ở Task 5 ("cụm bị bỏ khỏi seed").
3. **Admin đã sửa `seasons`/`active` (S23) rồi chạy lại seed:** không bị ghi đè. Test ở Task 5 ("không ghi đè seasons và active").
4. **Nhập toạ độ ngược thứ tự `[lat, lng]`:** bị từ chối ở Zod (kinh độ Việt Nam lớn hơn 90 nên rơi vào vị trí vĩ độ, vượt [-90, 90]) và ở index 2dsphere. Test ở Task 2 (GeoPoint) và Task 4 (MongoDB).
5. **DB đã có bản ghi trùng slug từ trước** (tạo tay): seed dừng với lỗi E11000 khi tạo unique index, không ghi tiếp. Test ở Task 5 ("DB đã có hai thành phố trùng slug").

## Tiêu chí nghiệm thu → bước kiểm

| Tiêu chí S03 | Kiểm ở |
| --- | --- |
| 4 zone có polygon | Task 3 (GeoPolygon, CitySeed), Task 6 Step 5 (`DA_LAT_SEED` đúng 4 cụm, polygon hợp lệ trong MongoDB, không chồng nhau), Task 6 Step 10 (mongosh đếm 4 zone) |
| Index 2dsphere | Task 4 Step 1 (`location_2dsphere` + truy vấn `$near`), Task 5 Step 1 (`area_2dsphere`), Task 6 Step 10 (mongosh) |
| `{cityId, slug}` unique | Task 4 Step 1 (Place trùng slug cùng city bị chặn, khác city thì được), Task 5 Step 1 (Zone), Task 6 Step 10 (mongosh) |
| Chạy seed lại không tạo trùng | Task 5 Step 1 (chạy lại, chạy song song, giữ `_id`), Task 6 Step 5 (`DA_LAT_SEED` hai lần), Task 6 Step 9 (`pnpm seed` hai lần thật) |
| DoD: logic có điều kiện có unit test | Task 2, 3, 6 (contracts, geo); Task 4, 5 (API) |
| DoD: CI xanh | Task 1 (CI có MongoDB), Task 7 |
| DoD: thử trên staging | Chưa làm được vì S02 chưa xong; ghi ở Task 7 |

## Việc của chủ dự án: duyệt ranh giới cụm (trước khi seed staging/production)

Ranh giới dưới đây là bản phác thảo hình chữ nhật, các cụm cách nhau 300–800 m và không chạm nhau. Gán cụm cho địa điểm vẫn chọn tay (data-collection mục 5); polygon dùng để vẽ trên bản đồ và gợi ý. Dán đoạn JSON vào https://geojson.io để xem. Sửa ranh giới thì sửa `ZONES` trong `apps/api/src/seed/da-lat.ts` (Task 6), rồi chạy lại `pnpm seed`.

```json
{"type":"FeatureCollection","features":[
{"type":"Feature","properties":{"slug":"trung-tam","name":"Trung tâm"},"geometry":{"type":"Polygon","coordinates":[[[108.415,11.925],[108.478,11.925],[108.478,11.968],[108.415,11.968],[108.415,11.925]]]}},
{"type":"Feature","properties":{"slug":"phia-nam","name":"Phía Nam"},"geometry":{"type":"Polygon","coordinates":[[[108.395,11.86],[108.48,11.86],[108.48,11.92],[108.395,11.92],[108.395,11.86]]]}},
{"type":"Feature","properties":{"slug":"phia-bac","name":"Phía Bắc"},"geometry":{"type":"Polygon","coordinates":[[[108.36,11.975],[108.48,11.975],[108.48,12.07],[108.36,12.07],[108.36,11.975]]]}},
{"type":"Feature","properties":{"slug":"phia-dong","name":"Phía Đông"},"geometry":{"type":"Polygon","coordinates":[[[108.483,11.83],[108.6,11.83],[108.6,11.968],[108.483,11.968],[108.483,11.83]]]}},
{"type":"Feature","properties":{"name":"Tâm thành phố"},"geometry":{"type":"Point","coordinates":[108.4583,11.9404]}}
]}
```

## Cấu trúc file

```text
packages/contracts/src/
  common.ts            Slug, ObjectIdString, HexColor, MonthDay              (mới)
  geojson.ts           LngLat, GeoPoint, GeoPolygon, BBox                    (mới)
  enums.ts             + PhotoSource, PlaceSource, VipTier                   (sửa)
  city.ts              CitySeason, CityInput, ZoneInput, CitySeed, CitySeedResult (mới)
  place.ts             DEFAULT_CHECKIN_RADIUS_M, PlacePhoto, PlaceContact, PlaceIds, Place (mới)
  index.ts             export thêm các file trên                             (sửa)
  *.test.ts            test cạnh file
packages/geo/src/
  bounds.ts            boundsOf(): khung bao [tây, nam, đông, bắc]            (mới)
apps/api/
  vitest.config.mts                                                          (mới)
  src/testing/mongo.ts           connectTestDb / dropTestDb (chỉ cho test)   (mới)
  src/shared/db/geojson.schema.ts  PointSchema, PolygonSchema (Mongoose)     (mới)
  src/modules/places/            schema, repository, service, module         (mới)
  src/modules/cities/            schema city/zone, repository, service, module (mới)
  src/seed/da-lat.ts             dữ liệu seed Đà Lạt                         (mới)
  src/seed/seed.module.ts, main.ts  lệnh seed                                (mới)
  src/app.module.ts              import CitiesModule, PlacesModule           (sửa)
```

---

### Task 1: Hạ tầng test cho `apps/api` (Vitest + MongoDB)

**Files:**
- Modify: `apps/api/package.json` (devDependencies, script `test`)
- Create: `apps/api/vitest.config.mts`
- Create: `apps/api/src/testing/mongo.ts`
- Test: `apps/api/src/testing/mongo.test.ts`
- Modify: `apps/api/tsconfig.build.json`
- Modify: `turbo.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/decisions.md`

**Interfaces:**
- Consumes: không có.
- Produces: `connectTestDb(): Promise<Connection>` mở database riêng `ranhduong_test_<12 hex>`, tắt `autoIndex`/`autoCreate` (index chỉ có khi code gọi `ensureIndexes()`). `dropTestDb(conn: Connection): Promise<void>` xoá database và đóng kết nối. Lệnh `pnpm --filter @ranhduong/api test`.

- [ ] **Step 0: Tạo nhánh và commit plan**

```bash
git switch -c feat/S03-city-zone-place-schema
git add docs/superpowers/plans/2026-10-07-s03-city-zone-place-schema.md
git commit -m "docs: S03 add implementation plan"
```

- [ ] **Step 1: Thêm Vitest và helper decorator của Oxc**

Vite 8 biên dịch TypeScript bằng Oxc. Code có decorator (NestJS `@Injectable`, `@InjectModel`) sinh ra lệnh import `@oxc-project/runtime/helpers/decorateMetadata`. Thiếu gói này thì test báo `Cannot find module '@oxc-project/runtime/helpers/decorateMetadata'` (đã thử khi lập plan).

```bash
pnpm --filter @ranhduong/api add -D vitest@^5.0.3 @oxc-project/runtime
```

Nếu pnpm từ chối vì `minimumReleaseAge`, chạy `pnpm view @oxc-project/runtime time --json` rồi chọn bản mới nhất đã phát hành quá 1 ngày, ví dụ `pnpm --filter @ranhduong/api add -D @oxc-project/runtime@0.152.0`.

- [ ] **Step 2: Thêm script `test` vào `apps/api/package.json`**

Khối `scripts` sau khi sửa:

```json
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main.js",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
```

- [ ] **Step 3: Tạo `apps/api/vitest.config.mts`**

Đuôi `.mts` để Vite nạp config dạng ESM, vì `apps/api` là package CommonJS.

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Không cần setupFiles cho reflect-metadata: @nestjs/common tự import gói này.
    // Test tích hợp chạy với MongoDB thật; tạo index mất vài trăm ms.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
```

- [ ] **Step 4: Viết test thất bại `apps/api/src/testing/mongo.test.ts`**

```ts
import type { Connection } from 'mongoose';
import { afterAll, describe, expect, it } from 'vitest';
import { connectTestDb, dropTestDb } from './mongo';

describe('connectTestDb', () => {
  const opened: Connection[] = [];
  afterAll(async () => {
    await Promise.all(opened.map((conn) => dropTestDb(conn)));
  });

  it('mỗi lần mở một database riêng, tên bắt đầu bằng ranhduong_test_', async () => {
    const a = await connectTestDb();
    const b = await connectTestDb();
    opened.push(a, b);
    expect(a.name).toMatch(/^ranhduong_test_[0-9a-f]{12}$/);
    expect(a.name).not.toBe(b.name);
  });

  it('ghi và đọc được dữ liệu', async () => {
    const conn = await connectTestDb();
    opened.push(conn);
    await conn.collection('probe').insertOne({ ok: 1 });
    expect(await conn.collection('probe').countDocuments()).toBe(1);
  });
});
```

- [ ] **Step 5: Chạy test, thấy đỏ**

Run: `pnpm infra:up && pnpm --filter @ranhduong/api test`
Expected: FAIL, lỗi kiểu `Failed to load url ./mongo` / `Cannot find module './mongo'`.

- [ ] **Step 6: Viết `apps/api/src/testing/mongo.ts`**

```ts
import { randomUUID } from 'node:crypto';
import mongoose, { type Connection } from 'mongoose';

// Chỉ dùng trong test, không nằm trong build. Local: `pnpm infra:up`; CI: service container mongo.
const TEST_URI = process.env.MONGODB_TEST_URI ?? 'mongodb://localhost:27017';

/**
 * Mở kết nối tới một database riêng, tên ngẫu nhiên, để các file test chạy song song không đụng nhau.
 * Tắt autoIndex/autoCreate: index chỉ có khi code gọi ensureIndexes(), đúng điều test cần kiểm.
 */
export async function connectTestDb(): Promise<Connection> {
  const dbName = `ranhduong_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  try {
    return await mongoose
      .createConnection(TEST_URI, { dbName, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000 })
      .asPromise();
  } catch (err) {
    throw new Error(`Không kết nối được MongoDB test tại ${TEST_URI}. Chạy \`pnpm infra:up\` trước.`, { cause: err });
  }
}

/** Xoá database test và đóng kết nối. */
export async function dropTestDb(conn: Connection): Promise<void> {
  await conn.dropDatabase();
  await conn.close();
}
```

- [ ] **Step 7: Chạy test, thấy xanh**

Run: `pnpm --filter @ranhduong/api test`
Expected: PASS, 2 test.

- [ ] **Step 8: Loại `src/testing` khỏi build**

`apps/api/tsconfig.build.json`:

```json
{ "extends": "./tsconfig.json", "exclude": ["src/**/*.test.ts", "src/**/*.spec.ts", "src/testing/**"] }
```

- [ ] **Step 9: Cho biến `MONGODB_TEST_URI` đi qua Turborepo và thêm MongoDB vào CI**

Turborepo 2 mặc định lọc biến môi trường. `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".output/**", ".nuxt/**"] },
    "dev": { "dependsOn": ["^build"], "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"], "passThroughEnv": ["MONGODB_TEST_URI"] }
  }
}
```

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    services:
      mongo:
        image: mongo:8
        ports: ['27017:27017']
        options: >-
          --health-cmd "mongosh --quiet --eval 'db.runCommand({ ping: 1 })'"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      MONGODB_TEST_URI: mongodb://localhost:27017
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 12.9.1
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run typecheck test build
```

- [ ] **Step 10: Ghi quyết định vào `docs/decisions.md`**

Thêm hai dòng cuối bảng (ngày là ngày làm thực tế):

```markdown
| 2026-10-07 | Test API bằng Vitest; thêm `@oxc-project/runtime` (devDependency của `apps/api`) | Vite 8 biên dịch decorator NestJS bằng Oxc, mã sinh ra import helper `decorate`/`decorateMetadata` từ gói này |
| 2026-10-07 | Test tích hợp API chạy với MongoDB thật: local qua `pnpm infra:up`, CI qua service container `mongo:8`; mỗi kết nối test một database tên ngẫu nhiên | Kiểm được unique index, 2dsphere và upsert thật; không thêm mongodb-memory-server |
```

- [ ] **Step 11: Typecheck, build, commit**

Run: `pnpm turbo run typecheck test build --filter=@ranhduong/api`
Expected: tất cả xanh.

```bash
git add apps/api/package.json apps/api/vitest.config.mts apps/api/tsconfig.build.json apps/api/src/testing pnpm-lock.yaml turbo.json .github/workflows/ci.yml docs/decisions.md
git commit -m "chore: S03 add vitest and mongo test helper to api"
```

---

### Task 2: Contracts, kiểu nền (slug, id, màu, ngày, GeoJSON)

**Files:**
- Create: `packages/contracts/src/common.ts`
- Create: `packages/contracts/src/geojson.ts`
- Test: `packages/contracts/src/common.test.ts`
- Test: `packages/contracts/src/geojson.test.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: không có.
- Produces (export từ `@ranhduong/contracts`):
  - `Slug` (`z.ZodString`, regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`), `ObjectIdString` (24 hex thường), `HexColor` (`#RRGGBB`), `MonthDay` (`MM-DD`, kiểm số ngày của tháng, cho phép `02-29`).
  - `LngLat` (`[number, number]`, lng ∈ [-180, 180], lat ∈ [-90, 90]), `GeoPoint` (`{ type: 'Point'; coordinates: LngLat }`), `GeoPolygon` (`{ type: 'Polygon'; coordinates: LngLat[][] }`, mỗi vòng ≥ 4 điểm và khép kín), `BBox` (`[west, south, east, north]`, west < east, south < north). Mỗi cái export cả schema lẫn type cùng tên.

- [ ] **Step 1: Viết test thất bại `packages/contracts/src/common.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { HexColor, MonthDay, ObjectIdString, Slug } from './common.js';

describe('Slug', () => {
  it('nhận slug không dấu, chữ thường, gạch nối', () => {
    for (const s of ['da-lat', 'doi-che-cau-dat', 'top10', 'a']) expect(Slug.safeParse(s).success, s).toBe(true);
  });
  it('từ chối chữ hoa, dấu, khoảng trắng, gạch nối thừa', () => {
    for (const s of ['', 'Da-lat', 'đà-lạt', 'da lat', '-da-lat', 'da-lat-', 'da--lat', 'da_lat']) {
      expect(Slug.safeParse(s).success, s).toBe(false);
    }
  });
});

describe('ObjectIdString', () => {
  it('nhận 24 ký tự hex thường', () => {
    expect(ObjectIdString.safeParse('0123456789abcdef01234567').success).toBe(true);
  });
  it('từ chối sai độ dài hoặc ký tự lạ', () => {
    for (const s of ['0123456789abcdef0123456', '0123456789abcdef012345678', 'zzzzzzzzzzzzzzzzzzzzzzzz']) {
      expect(ObjectIdString.safeParse(s).success, s).toBe(false);
    }
  });
});

describe('HexColor', () => {
  it('nhận #RRGGBB', () => {
    expect(HexColor.safeParse('#E9B824').success).toBe(true);
  });
  it('từ chối thiếu # hoặc sai độ dài, ký tự', () => {
    for (const s of ['E9B824', '#E9B82', '#E9B8244', '#GGGGGG']) expect(HexColor.safeParse(s).success, s).toBe(false);
  });
});

describe('MonthDay', () => {
  it('nhận MM-DD có thật, kể cả 29/2', () => {
    for (const s of ['01-01', '10-15', '12-31', '02-29']) expect(MonthDay.safeParse(s).success, s).toBe(true);
  });
  it('từ chối tháng, ngày ngoài khoảng, ngày không tồn tại hoặc sai định dạng', () => {
    for (const s of ['00-10', '13-01', '10-00', '10-32', '02-30', '04-31', '1-05', '2026-10-15']) {
      expect(MonthDay.safeParse(s).success, s).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Viết test thất bại `packages/contracts/src/geojson.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { BBox, GeoPoint, GeoPolygon } from './geojson.js';

const ring = (w: number, s: number, e: number, n: number) => [[w, s], [e, s], [e, n], [w, n], [w, s]];

describe('GeoPoint', () => {
  it('nhận toạ độ [lng, lat]', () => {
    expect(GeoPoint.safeParse({ type: 'Point', coordinates: [0.001, 0.001] }).success).toBe(true);
  });
  it('từ chối toạ độ đảo thứ tự [lat, lng] khi kinh độ lớn hơn 90 (mọi điểm ở Việt Nam)', () => {
    expect(GeoPoint.safeParse({ type: 'Point', coordinates: [10, 105] }).success).toBe(false);
  });
  it('từ chối thiếu hoặc thừa phần tử, sai type', () => {
    expect(GeoPoint.safeParse({ type: 'Point', coordinates: [1] }).success).toBe(false);
    expect(GeoPoint.safeParse({ type: 'Point', coordinates: [1, 2, 3] }).success).toBe(false);
    expect(GeoPoint.safeParse({ type: 'point', coordinates: [1, 2] }).success).toBe(false);
  });
});

describe('GeoPolygon', () => {
  it('nhận vòng kín', () => {
    expect(GeoPolygon.safeParse({ type: 'Polygon', coordinates: [ring(0, 0, 1, 1)] }).success).toBe(true);
  });
  it('từ chối vòng chưa khép (điểm cuối khác điểm đầu)', () => {
    const open = ring(0, 0, 1, 1).slice(0, 4);
    expect(GeoPolygon.safeParse({ type: 'Polygon', coordinates: [open] }).success).toBe(false);
  });
  it('từ chối vòng dưới 4 điểm và polygon không có vòng nào', () => {
    expect(GeoPolygon.safeParse({ type: 'Polygon', coordinates: [[[0, 0], [1, 1], [0, 0]]] }).success).toBe(false);
    expect(GeoPolygon.safeParse({ type: 'Polygon', coordinates: [] }).success).toBe(false);
  });
  it('từ chối đỉnh có vĩ độ ngoài [-90, 90]', () => {
    expect(GeoPolygon.safeParse({ type: 'Polygon', coordinates: [ring(0, 0, 1, 95)] }).success).toBe(false);
  });
});

describe('BBox', () => {
  it('nhận [tây, nam, đông, bắc]', () => {
    expect(BBox.safeParse([0, 0, 1, 1]).success).toBe(true);
  });
  it('từ chối tây >= đông hoặc nam >= bắc', () => {
    expect(BBox.safeParse([1, 0, 0, 1]).success).toBe(false);
    expect(BBox.safeParse([0, 1, 1, 0]).success).toBe(false);
  });
});
```

- [ ] **Step 3: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/contracts test`
Expected: FAIL, không tìm thấy `./common.js` và `./geojson.js`.

- [ ] **Step 4: Viết `packages/contracts/src/common.ts`**

```ts
import { z } from 'zod';

/** Slug không dấu, chữ thường, gạch nối: khớp kết quả `slugify` trong packages/geo (ADR 0010). */
export const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm a-z, 0-9 và dấu gạch nối');
export type Slug = z.infer<typeof Slug>;

/** ObjectId của MongoDB dạng chuỗi 24 ký tự hex thường. */
export const ObjectIdString = z.string().regex(/^[0-9a-f]{24}$/, 'ObjectId không hợp lệ');
export type ObjectIdString = z.infer<typeof ObjectIdString>;

/** Màu dạng #RRGGBB. */
export const HexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu phải có dạng #RRGGBB');
export type HexColor = z.infer<typeof HexColor>;

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Ngày trong năm dạng MM-DD, dùng cho mùa trong City.seasons. */
export const MonthDay = z
  .string()
  .regex(/^\d{2}-\d{2}$/, 'Ngày phải có dạng MM-DD')
  .refine((s) => {
    const max = DAYS_IN_MONTH[Number(s.slice(0, 2)) - 1];
    const day = Number(s.slice(3, 5));
    return max !== undefined && day >= 1 && day <= max;
  }, 'Ngày MM-DD không tồn tại');
export type MonthDay = z.infer<typeof MonthDay>;
```

- [ ] **Step 5: Viết `packages/contracts/src/geojson.ts`**

```ts
import { z } from 'zod';

const Lng = z.number().min(-180).max(180);
const Lat = z.number().min(-90).max(90);

/** Toạ độ GeoJSON theo thứ tự [lng, lat] (kinh độ trước). */
export const LngLat = z.tuple([Lng, Lat]);
export type LngLat = z.infer<typeof LngLat>;

export const GeoPoint = z.object({ type: z.literal('Point'), coordinates: LngLat });
export type GeoPoint = z.infer<typeof GeoPoint>;

/** Vòng kín theo chuẩn GeoJSON: ít nhất 4 điểm, điểm cuối trùng điểm đầu. */
const LinearRing = z
  .array(LngLat)
  .min(4, 'Vòng polygon cần ít nhất 4 điểm')
  .refine((ring) => {
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1];
  }, 'Điểm cuối của vòng polygon phải trùng điểm đầu');

export const GeoPolygon = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(LinearRing).min(1, 'Polygon cần ít nhất một vòng'),
});
export type GeoPolygon = z.infer<typeof GeoPolygon>;

/** Khung bản đồ [tây, nam, đông, bắc], dùng làm maxBounds của MapLibre. */
export const BBox = z
  .tuple([Lng, Lat, Lng, Lat])
  .refine(([west, south, east, north]) => west < east && south < north, 'Khung bản đồ cần tây < đông và nam < bắc');
export type BBox = z.infer<typeof BBox>;
```

- [ ] **Step 6: Export trong `packages/contracts/src/index.ts`**

```ts
export * from './common.js';
export * from './enums.js';
export * from './geojson.js';
export * from './opening-hours.js';
```

- [ ] **Step 7: Chạy test, thấy xanh; typecheck, build**

Run: `pnpm --filter @ranhduong/contracts test && pnpm --filter @ranhduong/contracts typecheck && pnpm --filter @ranhduong/contracts build`
Expected: PASS (test cũ của opening-hours vẫn xanh), typecheck và build không lỗi.

- [ ] **Step 8: Commit**

```bash
git add packages/contracts/src
git commit -m "feat: S03 add slug, id and geojson contracts"
```

---

### Task 3: Contracts, City, Zone, CitySeed và Place

**Files:**
- Modify: `packages/contracts/src/enums.ts`
- Create: `packages/contracts/src/city.ts`
- Create: `packages/contracts/src/place.ts`
- Test: `packages/contracts/src/city.test.ts`
- Test: `packages/contracts/src/place.test.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes (Task 2): `Slug`, `ObjectIdString`, `HexColor`, `MonthDay`, `LngLat`, `GeoPoint`, `GeoPolygon`, `BBox`.
- Produces (export từ `@ranhduong/contracts`, schema và type cùng tên):
  - `PhotoSource` = `'self' | 'owner' | 'ctv' | 'user' | 'cc'`, `PlaceSource` = `'admin' | 'ctv' | 'user' | 'owner'`, `VipTier` = `'free' | 'starter' | 'vip'`.
  - `CitySeason` `{ key, from, to, accent, title, sub, illustration, featuredItineraryId? }`.
  - `CityInput` `{ slug, name, center: GeoPoint, timezone: 'Asia/Ho_Chi_Minh', active, accent, mapBounds: BBox, seasons: CitySeason[] (mặc định []) }`.
  - `ZoneInput` `{ slug, name, area: GeoPolygon }`.
  - `CitySeed` `{ city: CityInput, zones: ZoneInput[] }`, tối thiểu 1 cụm; slug cụm không trùng; tâm thành phố và mọi đỉnh của các cụm nằm trong `mapBounds`.
  - `CitySeedResult` `{ cityId: string; cityCreated: boolean; zonesCreated: number; zonesUpdated: number; staleZoneSlugs: string[] }`.
  - `DEFAULT_CHECKIN_RADIUS_M = 100`, `PlacePhoto`, `PlaceContact`, `PlaceIds`, `Place` (dạng lưu trong DB, xem code).

- [ ] **Step 1: Viết test thất bại `packages/contracts/src/city.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { CitySeed } from './city.js';

const square = (w: number, s: number, e: number, n: number) => ({
  type: 'Polygon',
  coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
});

// Thành phố và cụm giả lập quanh [0, 0], tên rõ là giả.
const SEED = {
  city: {
    slug: 'thanh-pho-gia-lap',
    name: 'Thành phố Giả Lập',
    center: { type: 'Point', coordinates: [0.5, 0.5] },
    timezone: 'Asia/Ho_Chi_Minh',
    active: true,
    accent: '#123456',
    mapBounds: [0, 0, 1, 1],
  },
  zones: [
    { slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A', area: square(0.1, 0.1, 0.4, 0.4) },
    { slug: 'cum-gia-lap-b', name: 'Cụm Giả Lập B', area: square(0.6, 0.6, 0.9, 0.9) },
  ],
};

const issuePaths = (input: unknown) => {
  const result = CitySeed.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path);
};

describe('CitySeed', () => {
  it('nhận seed hợp lệ, seasons mặc định rỗng', () => {
    const seed = CitySeed.parse(SEED);
    expect(seed.city.seasons).toEqual([]);
    expect(seed.zones).toHaveLength(2);
  });
  it('từ chối hai cụm trùng slug', () => {
    const zones = [SEED.zones[0], { ...SEED.zones[1], slug: 'cum-gia-lap-a' }];
    expect(issuePaths({ ...SEED, zones })).toContainEqual(['zones', 1, 'slug']);
  });
  it('từ chối tâm thành phố nằm ngoài khung bản đồ', () => {
    const city = { ...SEED.city, center: { type: 'Point', coordinates: [2, 0.5] } };
    expect(issuePaths({ ...SEED, city })).toContainEqual(['city', 'center']);
  });
  it('từ chối cụm có đỉnh nằm ngoài khung bản đồ', () => {
    const zones = [{ ...SEED.zones[0], area: square(0.1, 0.1, 1.5, 0.4) }, SEED.zones[1]];
    expect(issuePaths({ ...SEED, zones })).toContainEqual(['zones', 0, 'area']);
  });
  it('từ chối múi giờ khác Asia/Ho_Chi_Minh và seed không có cụm nào', () => {
    expect(CitySeed.safeParse({ ...SEED, city: { ...SEED.city, timezone: 'Asia/Bangkok' } }).success).toBe(false);
    expect(CitySeed.safeParse({ ...SEED, zones: [] }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Viết test thất bại `packages/contracts/src/place.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_CHECKIN_RADIUS_M, Place } from './place.js';

// Dữ liệu giả, tên rõ là giả; toạ độ quanh [0, 0].
const DRAFT = {
  cityId: '0123456789abcdef01234567',
  slug: 'quan-gia-lap',
  name: 'Quán Giả Lập',
  nameNorm: 'gia lap',
  category: 'cafe',
  location: { type: 'Point', coordinates: [0.001, 0.001] },
  source: 'admin',
};
const FAKE_PHOTO = { key: 'places/gia-lap/1.webp', source: 'self', credit: 'Người Chụp Giả Lập', license: 'Giấy phép giả lập' };

describe('Place', () => {
  it('nháp tối thiểu được nhận và điền giá trị mặc định', () => {
    expect(DEFAULT_CHECKIN_RADIUS_M).toBe(100);
    expect(Place.parse(DRAFT)).toMatchObject({
      status: 'draft',
      checkinRadiusM: 100,
      vipTier: 'free',
      suspicionScore: 0,
      ratingCount: 0,
      slugHistory: [],
      aliases: [],
      tags: [],
      openingHours: [],
      bestTime: [],
      transport: [],
      photos: [],
      contact: {},
      ids: {},
    });
  });
  it('bắt buộc cityId, slug, name, category, location, source', () => {
    for (const key of ['cityId', 'slug', 'name', 'category', 'location', 'source']) {
      const rest: Record<string, unknown> = { ...DRAFT };
      delete rest[key];
      expect(Place.safeParse(rest).success, key).toBe(false);
    }
  });
  it('ảnh phải có nguồn hợp lệ, người giữ bản quyền và giấy phép', () => {
    expect(Place.safeParse({ ...DRAFT, photos: [FAKE_PHOTO] }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, photos: [{ ...FAKE_PHOTO, credit: '  ' }] }).success).toBe(false);
    const { license: _license, ...noLicense } = FAKE_PHOTO;
    expect(Place.safeParse({ ...DRAFT, photos: [noLicense] }).success).toBe(false);
    expect(Place.safeParse({ ...DRAFT, photos: [{ ...FAKE_PHOTO, source: 'google' }] }).success).toBe(false);
  });
  it('số điện thoại phải dạng +84, không khoảng trắng', () => {
    expect(Place.safeParse({ ...DRAFT, contact: { phone: '+84900000000' } }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, contact: { phone: '0900000000' } }).success).toBe(false);
    expect(Place.safeParse({ ...DRAFT, contact: { phone: '+84 900 000 000' } }).success).toBe(false);
  });
  it('mức giá chỉ từ 1 đến 4', () => {
    expect(Place.safeParse({ ...DRAFT, priceLevel: 4 }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, priceLevel: 0 }).success).toBe(false);
    expect(Place.safeParse({ ...DRAFT, priceLevel: 5 }).success).toBe(false);
  });
  it('tags và slugHistory phải là slug', () => {
    expect(Place.safeParse({ ...DRAFT, tags: ['view-doi'] }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, tags: ['View đồi'] }).success).toBe(false);
    expect(Place.safeParse({ ...DRAFT, slugHistory: ['Slug Cu'] }).success).toBe(false);
  });
  it('giờ mở cửa dùng OpeningSlot (ngày 0 = Chủ nhật, tối đa 6)', () => {
    expect(Place.safeParse({ ...DRAFT, openingHours: [{ day: 0, open: '07:00', close: '22:00' }] }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, openingHours: [{ day: 7, open: '07:00', close: '22:00' }] }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/contracts test`
Expected: FAIL, không tìm thấy `./city.js` và `./place.js`.

- [ ] **Step 4: Thêm enum vào cuối `packages/contracts/src/enums.ts`**

```ts
/** Nguồn ảnh: tự chụp, quán gửi, cộng tác viên, người dùng, Creative Commons (ADR 0013). */
export const PhotoSource = z.enum(['self', 'owner', 'ctv', 'user', 'cc']);
export type PhotoSource = z.infer<typeof PhotoSource>;

/** Ai tạo địa điểm. */
export const PlaceSource = z.enum(['admin', 'ctv', 'user', 'owner']);
export type PlaceSource = z.infer<typeof PlaceSource>;

export const VipTier = z.enum(['free', 'starter', 'vip']);
export type VipTier = z.infer<typeof VipTier>;
```

- [ ] **Step 5: Viết `packages/contracts/src/city.ts`**

```ts
import { z } from 'zod';
import { HexColor, MonthDay, ObjectIdString, Slug } from './common.js';
import { BBox, GeoPoint, GeoPolygon, type LngLat } from './geojson.js';

/** Một mùa trong City.seasons (ui-spec mục 7); admin chỉnh ở S23. */
export const CitySeason = z.object({
  key: Slug,
  from: MonthDay,
  to: MonthDay,
  accent: HexColor,
  title: z.string().min(1),
  sub: z.string().min(1),
  illustration: z.string().min(1),
  featuredItineraryId: ObjectIdString.optional(),
});
export type CitySeason = z.infer<typeof CitySeason>;

export const CityInput = z.object({
  slug: Slug,
  name: z.string().min(1),
  center: GeoPoint,
  timezone: z.literal('Asia/Ho_Chi_Minh'),
  active: z.boolean(),
  accent: HexColor,
  mapBounds: BBox,
  seasons: z.array(CitySeason).default([]),
});
export type CityInput = z.infer<typeof CityInput>;

/** Cụm khu vực, định nghĩa thủ công bằng polygon (product-spec mục 4). */
export const ZoneInput = z.object({
  slug: Slug,
  name: z.string().min(1),
  area: GeoPolygon,
});
export type ZoneInput = z.infer<typeof ZoneInput>;

/** Dữ liệu seed một thành phố: thông tin thành phố và các cụm khu vực. */
export const CitySeed = z
  .object({ city: CityInput, zones: z.array(ZoneInput).min(1, 'Cần ít nhất một cụm') })
  .superRefine((seed, ctx) => {
    const [west, south, east, north] = seed.city.mapBounds;
    const inBounds = ([lng, lat]: LngLat) => lng >= west && lng <= east && lat >= south && lat <= north;
    if (!inBounds(seed.city.center.coordinates)) {
      ctx.addIssue({ code: 'custom', path: ['city', 'center'], message: 'Tâm thành phố nằm ngoài khung bản đồ' });
    }
    const seen = new Set<string>();
    seed.zones.forEach((zone, i) => {
      if (seen.has(zone.slug)) {
        ctx.addIssue({ code: 'custom', path: ['zones', i, 'slug'], message: `Trùng slug cụm: ${zone.slug}` });
      }
      seen.add(zone.slug);
      if (!zone.area.coordinates.every((ring) => ring.every(inBounds))) {
        ctx.addIssue({ code: 'custom', path: ['zones', i, 'area'], message: `Cụm ${zone.slug} nằm ngoài khung bản đồ` });
      }
    });
  });
export type CitySeed = z.infer<typeof CitySeed>;

/** Kết quả ghi seed; cụm có trong DB mà không còn trong seed nằm ở staleZoneSlugs (không bị xoá). */
export const CitySeedResult = z.object({
  cityId: ObjectIdString,
  cityCreated: z.boolean(),
  zonesCreated: z.number().int().min(0),
  zonesUpdated: z.number().int().min(0),
  staleZoneSlugs: z.array(Slug),
});
export type CitySeedResult = z.infer<typeof CitySeedResult>;
```

- [ ] **Step 6: Viết `packages/contracts/src/place.ts`**

```ts
import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';
import { BestTime, PhotoSource, PlaceCategory, PlaceSource, PlaceStatus, Transport, VerifySource, VipTier } from './enums.js';
import { GeoPoint } from './geojson.js';
import { OpeningSlot } from './opening-hours.js';

/** Bán kính check-in mặc định cho quán nhỏ (product-spec: khoảng 100m). */
export const DEFAULT_CHECKIN_RADIUS_M = 100;

/** Ảnh chỉ dùng khi có quyền: luôn ghi nguồn, người giữ bản quyền và giấy phép (ADR 0013). */
export const PlacePhoto = z.object({
  key: z.string().min(1),
  source: PhotoSource,
  credit: z.string().trim().min(1, 'Ảnh phải ghi người giữ bản quyền'),
  license: z.string().trim().min(1, 'Ảnh phải ghi giấy phép'),
});
export type PlacePhoto = z.infer<typeof PlacePhoto>;

export const PlaceContact = z.object({
  /** Dạng +84…, ví dụ +84912345678 (data-collection mục 5). */
  phone: z.string().regex(/^\+84\d{9,10}$/, 'Số điện thoại phải có dạng +84…').optional(),
  fanpage: z.url().optional(),
  website: z.url().optional(),
});
export type PlaceContact = z.infer<typeof PlaceContact>;

/** Chỉ lưu định danh, không lưu nội dung của Google (ADR 0001). */
export const PlaceIds = z.object({
  googlePlaceId: z.string().min(1).optional(),
  osmId: z.string().min(1).optional(),
});
export type PlaceIds = z.infer<typeof PlaceIds>;

/**
 * Địa điểm như lưu trong DB (technical-design mục 3). Nháp (OSM, import CSV) chỉ cần các trường bắt buộc;
 * điều kiện kích hoạt (toạ độ, giờ, nguồn xác nhận, ảnh có nguồn) kiểm ở S05/S07.
 */
export const Place = z.object({
  cityId: ObjectIdString,
  zoneId: ObjectIdString.optional(),
  slug: Slug,
  slugHistory: z.array(Slug).default([]),
  name: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)).default([]),
  /** normalizeName(name) của packages/geo, dùng chống trùng; có thể rỗng khi tên chỉ gồm từ chung. */
  nameNorm: z.string(),
  category: PlaceCategory,
  tags: z.array(Slug).default([]),
  location: GeoPoint,
  address: z.string().trim().min(1).optional(),
  checkinRadiusM: z.number().int().positive().default(DEFAULT_CHECKIN_RADIUS_M),
  openingHours: z.array(OpeningSlot).default([]),
  visitDurationMin: z.number().int().positive().optional(),
  bestTime: z.array(BestTime).default([]),
  indoor: z.boolean().optional(),
  priceLevel: z.literal([1, 2, 3, 4]).optional(),
  transport: z.array(Transport).default([]),
  practicalNotes: z.string().trim().min(1).optional(),
  contact: PlaceContact.default({}),
  ids: PlaceIds.default({}),
  photos: z.array(PlacePhoto).default([]),
  status: PlaceStatus.default('draft'),
  mergedInto: ObjectIdString.optional(),
  lastVerifiedAt: z.date().optional(),
  verifySource: VerifySource.optional(),
  suspicionScore: z.number().min(0).default(0),
  source: PlaceSource,
  ownerId: ObjectIdString.optional(),
  vipTier: VipTier.default('free'),
  stampKey: z.string().min(1).optional(),
  /** Chỉ từ đánh giá trên nền tảng, không lấy rating của Google. */
  ratingAvg: z.number().min(1).max(5).optional(),
  ratingCount: z.number().int().min(0).default(0),
});
export type Place = z.infer<typeof Place>;
```

- [ ] **Step 7: Export trong `packages/contracts/src/index.ts`**

```ts
export * from './city.js';
export * from './common.js';
export * from './enums.js';
export * from './geojson.js';
export * from './opening-hours.js';
export * from './place.js';
```

- [ ] **Step 8: Chạy test, thấy xanh; typecheck, build**

Run: `pnpm --filter @ranhduong/contracts test && pnpm --filter @ranhduong/contracts typecheck && pnpm --filter @ranhduong/contracts build`
Expected: PASS, không lỗi kiểu.

- [ ] **Step 9: Commit**

```bash
git add packages/contracts/src
git commit -m "feat: S03 add city, zone, seed and place contracts"
```

---

### Task 4: Module `places`: schema Mongoose và index

**Files:**
- Create: `apps/api/src/shared/db/geojson.schema.ts`
- Create: `apps/api/src/modules/places/schemas/place.schema.ts`
- Create: `apps/api/src/modules/places/places.repository.ts`
- Create: `apps/api/src/modules/places/places.service.ts`
- Create: `apps/api/src/modules/places/places.module.ts`
- Test: `apps/api/src/modules/places/places.repository.test.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `connectTestDb`, `dropTestDb` (Task 1); `PlaceCategory`, `PlaceStatus`, `VerifySource`, `BestTime`, `Transport`, `PhotoSource`, `PlaceSource`, `VipTier`, `DEFAULT_CHECKIN_RADIUS_M` (contracts, Task 3).
- Produces:
  - `PointSchema`, `PolygonSchema` (Mongoose `Schema`, `_id: false`) trong `src/shared/db/geojson.schema.ts`.
  - `PLACE_MODEL = 'Place'`, `PlaceSchema`, `type PlaceDoc`, `type PlaceModel = Model<PlaceDoc>`.
  - `PlacesRepository.ensureIndexes(): Promise<void>`, `PlacesService.ensureIndexes(): Promise<void>`.
  - `PlacesModule` export `PlacesService`.

- [ ] **Step 1: Viết test thất bại `apps/api/src/modules/places/places.repository.test.ts`**

```ts
import { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectTestDb, dropTestDb } from '../../testing/mongo';
import { PlacesRepository } from './places.repository';
import { PLACE_MODEL, PlaceSchema, type PlaceModel } from './schemas/place.schema';

// Dữ liệu giả, tên rõ là giả; toạ độ quanh [0, 0] để không trùng địa điểm thật nào.
function fakePlace(overrides: Record<string, unknown> = {}) {
  return {
    cityId: new Types.ObjectId(),
    slug: 'quan-gia-lap',
    name: 'Quán Giả Lập',
    nameNorm: 'gia lap',
    category: 'cafe',
    location: { type: 'Point', coordinates: [0.001, 0.001] },
    source: 'admin',
    ...overrides,
  };
}

describe('PlaceSchema và PlacesRepository', () => {
  let conn: Connection;
  let places: PlaceModel;

  beforeAll(async () => {
    conn = await connectTestDb();
    places = conn.model(PLACE_MODEL, PlaceSchema);
    await new PlacesRepository(places).ensureIndexes();
  });
  afterAll(async () => {
    await dropTestDb(conn);
  });
  beforeEach(async () => {
    await places.deleteMany({});
  });

  it('ensureIndexes tạo index 2dsphere, {cityId, slug} unique và {cityId, category, status}', async () => {
    const byName = new Map((await places.listIndexes()).map((i) => [i.name, i]));
    expect(byName.get('location_2dsphere')?.key).toEqual({ location: '2dsphere' });
    expect(byName.get('cityId_1_slug_1')).toMatchObject({ key: { cityId: 1, slug: 1 }, unique: true });
    expect(byName.get('cityId_1_category_1_status_1')?.key).toEqual({ cityId: 1, category: 1, status: 1 });
  });

  it('từ chối hai địa điểm cùng slug trong một thành phố', async () => {
    const cityId = new Types.ObjectId();
    await places.create(fakePlace({ cityId }));
    await expect(places.create(fakePlace({ cityId, name: 'Quán Giả Lập Hai' }))).rejects.toMatchObject({ code: 11000 });
  });

  it('cho phép cùng slug ở hai thành phố khác nhau', async () => {
    await places.create(fakePlace());
    await places.create(fakePlace());
    expect(await places.countDocuments({ slug: 'quan-gia-lap' })).toBe(2);
  });

  it('điền giá trị mặc định cho nháp', async () => {
    const doc = await places.create(fakePlace());
    expect(doc.toObject()).toMatchObject({
      status: 'draft',
      checkinRadiusM: 100,
      vipTier: 'free',
      suspicionScore: 0,
      ratingCount: 0,
      slugHistory: [],
      photos: [],
    });
  });

  it('tìm theo khoảng cách nhờ index 2dsphere', async () => {
    const cityId = new Types.ObjectId();
    await places.create([
      fakePlace({ cityId, slug: 'quan-gia-lap-gan', location: { type: 'Point', coordinates: [0.001, 0.001] } }),
      fakePlace({ cityId, slug: 'quan-gia-lap-xa', location: { type: 'Point', coordinates: [0.05, 0.05] } }),
    ]);
    const near = await places
      .find({ location: { $near: { $geometry: { type: 'Point', coordinates: [0, 0] }, $maxDistance: 1000 } } })
      .lean();
    expect(near.map((p) => p.slug)).toEqual(['quan-gia-lap-gan']);
  });

  it('MongoDB từ chối toạ độ đảo thứ tự [lat, lng] (vĩ độ ngoài [-90, 90])', async () => {
    await expect(places.create(fakePlace({ location: { type: 'Point', coordinates: [10, 105] } }))).rejects.toThrow(
      /geo keys/i,
    );
  });

  it('từ chối danh mục, trạng thái, nguồn ảnh ngoài enum của contracts', async () => {
    await expect(places.create(fakePlace({ category: 'bar' }))).rejects.toThrow(/category/);
    await expect(places.create(fakePlace({ status: 'deleted' }))).rejects.toThrow(/status/);
    const photo = { key: 'k', source: 'google', credit: 'Giả lập', license: 'Giả lập' };
    await expect(places.create(fakePlace({ photos: [photo] }))).rejects.toThrow(/source/);
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/api test`
Expected: FAIL, không tìm thấy `./places.repository` và `./schemas/place.schema`.

- [ ] **Step 3: Viết `apps/api/src/shared/db/geojson.schema.ts`**

```ts
import { Schema } from 'mongoose';

/** GeoJSON Point { type: 'Point', coordinates: [lng, lat] }; index 2dsphere khai báo ở schema dùng nó. */
export const PointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

/** GeoJSON Polygon: mảng vòng kín, mỗi vòng là mảng [lng, lat]. */
export const PolygonSchema = new Schema(
  {
    type: { type: String, enum: ['Polygon'], required: true },
    coordinates: { type: [[[Number]]], required: true },
  },
  { _id: false },
);
```

- [ ] **Step 4: Viết `apps/api/src/modules/places/schemas/place.schema.ts`**

```ts
import {
  BestTime,
  DEFAULT_CHECKIN_RADIUS_M,
  PhotoSource,
  PlaceCategory,
  PlaceSource,
  PlaceStatus,
  Transport,
  VerifySource,
  VipTier,
} from '@ranhduong/contracts';
import { Schema, type InferSchemaType, type Model } from 'mongoose';
import { PointSchema } from '../../../shared/db/geojson.schema';

export const PLACE_MODEL = 'Place';

const OpeningSlotSchema = new Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    open: { type: String, required: true },
    close: { type: String, required: true },
  },
  { _id: false },
);

const PhotoSchema = new Schema(
  {
    key: { type: String, required: true },
    source: { type: String, enum: PhotoSource.options, required: true },
    credit: { type: String, required: true },
    license: { type: String, required: true },
  },
  { _id: false },
);

/** Địa điểm (technical-design mục 3); input được validate bằng `Place` của contracts trước khi ghi. */
export const PlaceSchema = new Schema(
  {
    cityId: { type: Schema.Types.ObjectId, required: true },
    zoneId: { type: Schema.Types.ObjectId },
    slug: { type: String, required: true },
    slugHistory: { type: [String], default: [] },
    name: { type: String, required: true },
    aliases: { type: [String], default: [] },
    nameNorm: { type: String, default: '' },
    category: { type: String, enum: PlaceCategory.options, required: true },
    tags: { type: [String], default: [] },
    location: { type: PointSchema, required: true },
    address: { type: String },
    checkinRadiusM: { type: Number, default: DEFAULT_CHECKIN_RADIUS_M },
    openingHours: { type: [OpeningSlotSchema], default: [] },
    visitDurationMin: { type: Number },
    bestTime: { type: [String], enum: BestTime.options, default: [] },
    indoor: { type: Boolean },
    priceLevel: { type: Number, enum: [1, 2, 3, 4] },
    transport: { type: [String], enum: Transport.options, default: [] },
    practicalNotes: { type: String },
    contact: { phone: String, fanpage: String, website: String },
    ids: { googlePlaceId: String, osmId: String },
    photos: { type: [PhotoSchema], default: [] },
    status: { type: String, enum: PlaceStatus.options, required: true, default: 'draft' },
    mergedInto: { type: Schema.Types.ObjectId },
    lastVerifiedAt: { type: Date },
    verifySource: { type: String, enum: VerifySource.options },
    suspicionScore: { type: Number, default: 0 },
    source: { type: String, enum: PlaceSource.options, required: true },
    ownerId: { type: Schema.Types.ObjectId },
    vipTier: { type: String, enum: VipTier.options, default: 'free' },
    stampKey: { type: String },
    ratingAvg: { type: Number },
    ratingCount: { type: Number, default: 0 },
  },
  { collection: 'places', timestamps: true },
);

// Bảng index ở technical-design mục 3.
PlaceSchema.index({ location: '2dsphere' });
PlaceSchema.index({ cityId: 1, slug: 1 }, { unique: true });
PlaceSchema.index({ cityId: 1, category: 1, status: 1 });

export type PlaceDoc = InferSchemaType<typeof PlaceSchema>;
export type PlaceModel = Model<PlaceDoc>;
```

- [ ] **Step 5: Viết repository, service, module**

`apps/api/src/modules/places/places.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PLACE_MODEL, type PlaceModel } from './schemas/place.schema';

/** Lớp dữ liệu của module places: chỉ file này import model Place. */
@Injectable()
export class PlacesRepository {
  constructor(@InjectModel(PLACE_MODEL) private readonly places: PlaceModel) {}

  /** Tạo index khai báo trong schema; không xoá index lạ (khác syncIndexes). */
  async ensureIndexes(): Promise<void> {
    await this.places.createIndexes();
  }
}
```

`apps/api/src/modules/places/places.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PlacesRepository } from './places.repository';

@Injectable()
export class PlacesService {
  constructor(private readonly repo: PlacesRepository) {}

  /** Dùng cho lệnh seed và khởi tạo môi trường mới; CRUD địa điểm thêm ở S05. */
  ensureIndexes(): Promise<void> {
    return this.repo.ensureIndexes();
  }
}
```

`apps/api/src/modules/places/places.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlacesRepository } from './places.repository';
import { PlacesService } from './places.service';
import { PLACE_MODEL, PlaceSchema } from './schemas/place.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: PLACE_MODEL, schema: PlaceSchema }])],
  providers: [PlacesRepository, PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
```

- [ ] **Step 6: Chạy test, thấy xanh**

Run: `pnpm --filter @ranhduong/api test`
Expected: PASS (7 test của places + 2 test của helper).

- [ ] **Step 7: Đăng ký module trong `apps/api/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ENV, loadEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { PlacesModule } from './modules/places/places.module';

const env = loadEnv();

@Module({
  imports: [MongooseModule.forRoot(env.MONGODB_URI), PlacesModule],
  controllers: [HealthController],
  providers: [{ provide: ENV, useValue: env }],
})
export class AppModule {}
```

- [ ] **Step 8: Typecheck, build, commit**

Run: `pnpm turbo run typecheck test build --filter=@ranhduong/api`
Expected: xanh.

```bash
git add apps/api/src
git commit -m "feat: S03 add place schema with 2dsphere and unique slug indexes"
```

---

### Task 5: Module `cities`: schema City/Zone và `applySeed` không tạo trùng

**Files:**
- Create: `apps/api/src/modules/cities/schemas/city.schema.ts`
- Create: `apps/api/src/modules/cities/schemas/zone.schema.ts`
- Create: `apps/api/src/modules/cities/cities.repository.ts`
- Create: `apps/api/src/modules/cities/cities.service.ts`
- Create: `apps/api/src/modules/cities/cities.module.ts`
- Test: `apps/api/src/modules/cities/cities.service.test.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `connectTestDb`, `dropTestDb` (Task 1); `PointSchema`, `PolygonSchema` (Task 4); `CitySeed`, `CitySeedResult`, `CityInput`, `ZoneInput` (contracts, Task 3).
- Produces:
  - `CITY_MODEL = 'City'`, `CitySchema`, `type CityModel`; `ZONE_MODEL = 'Zone'`, `ZoneSchema`, `type ZoneModel`.
  - `CitiesRepository`: `ensureIndexes(): Promise<void>`, `upsertCity(city: CityInput): Promise<{ id: string; created: boolean }>`, `upsertZone(cityId: string, zone: ZoneInput): Promise<{ id: string; created: boolean }>`, `listZoneSlugs(cityId: string): Promise<string[]>`.
  - `CitiesService.applySeed(input: unknown): Promise<CitySeedResult>`.
  - `CitiesModule` export `CitiesService`.

- [ ] **Step 1: Viết test thất bại `apps/api/src/modules/cities/cities.service.test.ts`**

```ts
import { CitySeed } from '@ranhduong/contracts';
import { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectTestDb, dropTestDb } from '../../testing/mongo';
import { CitiesRepository } from './cities.repository';
import { CitiesService } from './cities.service';
import { CITY_MODEL, CitySchema, type CityModel } from './schemas/city.schema';
import { ZONE_MODEL, ZoneSchema, type ZoneModel } from './schemas/zone.schema';

const square = (w: number, s: number, e: number, n: number) => ({
  type: 'Polygon',
  coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
});

const ZONE_A = { slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A', area: square(0.1, 0.1, 0.4, 0.4) };
const ZONE_B = { slug: 'cum-gia-lap-b', name: 'Cụm Giả Lập B', area: square(0.6, 0.6, 0.9, 0.9) };

// Thành phố và cụm giả lập quanh [0, 0], tên rõ là giả.
function fakeSeed(zones: unknown[] = [ZONE_A, ZONE_B]): CitySeed {
  return CitySeed.parse({
    city: {
      slug: 'thanh-pho-gia-lap',
      name: 'Thành phố Giả Lập',
      center: { type: 'Point', coordinates: [0.5, 0.5] },
      timezone: 'Asia/Ho_Chi_Minh',
      active: true,
      accent: '#123456',
      mapBounds: [0, 0, 1, 1],
    },
    zones,
  });
}

describe('CitiesService.applySeed', () => {
  let conn: Connection;
  let cities: CityModel;
  let zones: ZoneModel;
  let service: CitiesService;

  const zoneIds = async () =>
    (await zones.find({}, { slug: 1 }).sort({ slug: 1 }).lean()).map((z) => `${z.slug}:${z._id.toString()}`);

  beforeAll(async () => {
    conn = await connectTestDb();
    cities = conn.model(CITY_MODEL, CitySchema);
    zones = conn.model(ZONE_MODEL, ZoneSchema);
    service = new CitiesService(new CitiesRepository(cities, zones));
  });
  afterAll(async () => {
    await dropTestDb(conn);
  });
  // Mỗi test bắt đầu từ DB trống, chưa có index: applySeed phải tự tạo index.
  beforeEach(async () => {
    await conn.dropDatabase();
  });

  it('lần đầu tạo thành phố, các cụm và index', async () => {
    const result = await service.applySeed(fakeSeed());
    expect(result).toMatchObject({ cityCreated: true, zonesCreated: 2, zonesUpdated: 0, staleZoneSlugs: [] });
    expect(result.cityId).toMatch(/^[0-9a-f]{24}$/);
    expect(await cities.countDocuments()).toBe(1);
    expect(await zones.countDocuments({ cityId: new Types.ObjectId(result.cityId) })).toBe(2);

    const cityIndexes = new Map((await cities.listIndexes()).map((i) => [i.name, i]));
    expect(cityIndexes.get('slug_1')).toMatchObject({ key: { slug: 1 }, unique: true });
    const zoneIndexes = new Map((await zones.listIndexes()).map((i) => [i.name, i]));
    expect(zoneIndexes.get('cityId_1_slug_1')).toMatchObject({ key: { cityId: 1, slug: 1 }, unique: true });
    expect(zoneIndexes.get('area_2dsphere')?.key).toEqual({ area: '2dsphere' });
  });

  it('chạy lại không tạo trùng và giữ nguyên _id (Place.zoneId không gãy)', async () => {
    const first = await service.applySeed(fakeSeed());
    const before = await zoneIds();
    const second = await service.applySeed(fakeSeed());
    expect(second).toEqual({
      cityId: first.cityId,
      cityCreated: false,
      zonesCreated: 0,
      zonesUpdated: 2,
      staleZoneSlugs: [],
    });
    expect(await cities.countDocuments()).toBe(1);
    expect(await zones.countDocuments()).toBe(2);
    expect(await zoneIds()).toEqual(before);
  });

  it('cập nhật tên và polygon của cụm khi file seed đổi', async () => {
    await service.applySeed(fakeSeed());
    await service.applySeed(fakeSeed([{ ...ZONE_A, name: 'Cụm Giả Lập A mới', area: square(0.1, 0.1, 0.3, 0.3) }, ZONE_B]));
    const a = await zones.findOne({ slug: 'cum-gia-lap-a' }).lean().orFail();
    expect(a.name).toBe('Cụm Giả Lập A mới');
    expect(a.area.coordinates[0]?.[2]).toEqual([0.3, 0.3]);
  });

  it('không ghi đè seasons và active đã sửa trong admin', async () => {
    await service.applySeed(fakeSeed());
    const season = {
      key: 'mua-gia-lap',
      from: '01-01',
      to: '01-31',
      accent: '#654321',
      title: 'Mùa giả lập',
      sub: 'Mô tả giả lập',
      illustration: 'gia-lap',
    };
    await cities.updateOne({ slug: 'thanh-pho-gia-lap' }, { $set: { active: false, seasons: [season] } });
    await service.applySeed(fakeSeed());
    const city = await cities.findOne({ slug: 'thanh-pho-gia-lap' }).lean().orFail();
    expect(city.active).toBe(false);
    expect(city.seasons).toMatchObject([season]);
  });

  it('cụm bị bỏ khỏi seed vẫn giữ trong DB và được báo lại', async () => {
    await service.applySeed(fakeSeed());
    const result = await service.applySeed(fakeSeed([ZONE_A]));
    expect(result.staleZoneSlugs).toEqual(['cum-gia-lap-b']);
    expect(await zones.countDocuments()).toBe(2);
  });

  it('seed sai (polygon chưa khép) thì báo lỗi và không ghi gì', async () => {
    const openRing = [[0.1, 0.1], [0.4, 0.1], [0.4, 0.4], [0.1, 0.4]];
    const invalid = { ...fakeSeed(), zones: [{ ...ZONE_A, area: { type: 'Polygon', coordinates: [openRing] } }] };
    await expect(service.applySeed(invalid)).rejects.toThrow(/trùng điểm đầu/);
    expect(await cities.countDocuments()).toBe(0);
  });

  it('hai lần seed chạy cùng lúc vẫn chỉ có một thành phố và đủ cụm', async () => {
    await Promise.all([service.applySeed(fakeSeed()), service.applySeed(fakeSeed()), service.applySeed(fakeSeed())]);
    expect(await cities.countDocuments()).toBe(1);
    expect(await zones.countDocuments()).toBe(2);
  });

  it('cụm trùng {cityId, slug} bị unique index chặn', async () => {
    const { cityId } = await service.applySeed(fakeSeed());
    const duplicate = { cityId: new Types.ObjectId(cityId), slug: 'cum-gia-lap-a', name: 'Bản trùng giả lập', area: square(0.1, 0.1, 0.2, 0.2) };
    await expect(zones.create(duplicate)).rejects.toMatchObject({ code: 11000 });
  });

  it('DB đã có hai thành phố trùng slug thì seed dừng với lỗi E11000, không ghi cụm', async () => {
    await conn.collection('cities').insertMany([{ slug: 'thanh-pho-gia-lap' }, { slug: 'thanh-pho-gia-lap' }]);
    await expect(service.applySeed(fakeSeed())).rejects.toMatchObject({ code: 11000 });
    expect(await zones.countDocuments()).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/api test`
Expected: FAIL, không tìm thấy `./cities.repository`, `./cities.service`, `./schemas/city.schema`, `./schemas/zone.schema`.

- [ ] **Step 3: Viết `apps/api/src/modules/cities/schemas/city.schema.ts`**

```ts
import { Schema, type InferSchemaType, type Model } from 'mongoose';
import { PointSchema } from '../../../shared/db/geojson.schema';

export const CITY_MODEL = 'City';

const SeasonSchema = new Schema(
  {
    key: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    accent: { type: String, required: true },
    title: { type: String, required: true },
    sub: { type: String, required: true },
    illustration: { type: String, required: true },
    featuredItineraryId: { type: Schema.Types.ObjectId },
  },
  { _id: false },
);

/** Thành phố (technical-design mục 3); input được validate bằng `CityInput` của contracts trước khi ghi. */
export const CitySchema = new Schema(
  {
    slug: { type: String, required: true },
    name: { type: String, required: true },
    center: { type: PointSchema, required: true },
    timezone: { type: String, enum: ['Asia/Ho_Chi_Minh'], required: true },
    active: { type: Boolean, required: true, default: false },
    accent: { type: String, required: true },
    /** [tây, nam, đông, bắc] */
    mapBounds: { type: [Number], required: true },
    seasons: { type: [SeasonSchema], default: [] },
  },
  { collection: 'cities', timestamps: true },
);

CitySchema.index({ slug: 1 }, { unique: true });

export type CityDoc = InferSchemaType<typeof CitySchema>;
export type CityModel = Model<CityDoc>;
```

- [ ] **Step 4: Viết `apps/api/src/modules/cities/schemas/zone.schema.ts`**

```ts
import { Schema, type InferSchemaType, type Model } from 'mongoose';
import { PolygonSchema } from '../../../shared/db/geojson.schema';

export const ZONE_MODEL = 'Zone';

/** Cụm khu vực trong một thành phố; polygon dùng để vẽ và tra điểm thuộc cụm nào. */
export const ZoneSchema = new Schema(
  {
    cityId: { type: Schema.Types.ObjectId, required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    area: { type: PolygonSchema, required: true },
  },
  { collection: 'zones', timestamps: true },
);

ZoneSchema.index({ cityId: 1, slug: 1 }, { unique: true });
ZoneSchema.index({ area: '2dsphere' });

export type ZoneDoc = InferSchemaType<typeof ZoneSchema>;
export type ZoneModel = Model<ZoneDoc>;
```

- [ ] **Step 5: Viết `apps/api/src/modules/cities/cities.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { CityInput, ZoneInput } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { CITY_MODEL, type CityModel } from './schemas/city.schema';
import { ZONE_MODEL, type ZoneModel } from './schemas/zone.schema';

interface UpsertResult {
  id: string;
  created: boolean;
}

/** Lớp dữ liệu của module cities: chỉ file này import model City và Zone. */
@Injectable()
export class CitiesRepository {
  constructor(
    @InjectModel(CITY_MODEL) private readonly cities: CityModel,
    @InjectModel(ZONE_MODEL) private readonly zones: ZoneModel,
  ) {}

  /** Tạo index khai báo trong schema; không xoá index lạ (khác syncIndexes). */
  async ensureIndexes(): Promise<void> {
    await Promise.all([this.cities.createIndexes(), this.zones.createIndexes()]);
  }

  /**
   * Upsert theo slug. Seed là nguồn của các trường cố định; seasons và active chỉ đặt khi tạo mới
   * để không ghi đè chỉnh sửa trong admin (S23).
   */
  async upsertCity(city: CityInput): Promise<UpsertResult> {
    const { seasons, active, ...fixed } = city;
    const res = await this.cities.updateOne(
      { slug: city.slug },
      { $set: fixed, $setOnInsert: { seasons, active } },
      { upsert: true },
    );
    if (res.upsertedId) return { id: res.upsertedId.toString(), created: true };
    const existing = await this.cities.findOne({ slug: city.slug }, { _id: 1 }).lean().orFail();
    return { id: existing._id.toString(), created: false };
  }

  /** Upsert theo {cityId, slug}; _id giữ nguyên khi cập nhật để Place.zoneId không gãy. */
  async upsertZone(cityId: string, zone: ZoneInput): Promise<UpsertResult> {
    const filter = { cityId: new Types.ObjectId(cityId), slug: zone.slug };
    const res = await this.zones.updateOne(filter, { $set: { name: zone.name, area: zone.area } }, { upsert: true });
    if (res.upsertedId) return { id: res.upsertedId.toString(), created: true };
    const existing = await this.zones.findOne(filter, { _id: 1 }).lean().orFail();
    return { id: existing._id.toString(), created: false };
  }

  async listZoneSlugs(cityId: string): Promise<string[]> {
    const docs = await this.zones.find({ cityId: new Types.ObjectId(cityId) }, { slug: 1 }).lean();
    return docs.map((d) => d.slug);
  }
}
```

- [ ] **Step 6: Viết `apps/api/src/modules/cities/cities.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { CitySeed, type CitySeedResult } from '@ranhduong/contracts';
import { CitiesRepository } from './cities.repository';

@Injectable()
export class CitiesService {
  constructor(private readonly repo: CitiesRepository) {}

  /**
   * Ghi dữ liệu seed của một thành phố; chạy lại hay chạy song song cũng không tạo trùng.
   * - Validate toàn bộ seed bằng CitySeed trước khi ghi bất cứ thứ gì.
   * - Tạo index trước (unique {slug} cho city, {cityId, slug} cho zone) để upsert đồng thời không sinh bản trùng.
   * - Upsert theo slug nên _id giữ nguyên, Place.zoneId không bị gãy.
   * - Cụm có trong DB mà không còn trong seed không bị xoá (Place có thể đang trỏ tới), chỉ báo trong staleZoneSlugs.
   */
  async applySeed(input: unknown): Promise<CitySeedResult> {
    const seed = CitySeed.parse(input);
    await this.repo.ensureIndexes();
    const city = await this.repo.upsertCity(seed.city);
    let zonesCreated = 0;
    let zonesUpdated = 0;
    for (const zone of seed.zones) {
      const { created } = await this.repo.upsertZone(city.id, zone);
      if (created) zonesCreated++;
      else zonesUpdated++;
    }
    const seedSlugs = new Set(seed.zones.map((z) => z.slug));
    const staleZoneSlugs = (await this.repo.listZoneSlugs(city.id)).filter((slug) => !seedSlugs.has(slug)).sort();
    return { cityId: city.id, cityCreated: city.created, zonesCreated, zonesUpdated, staleZoneSlugs };
  }
}
```

- [ ] **Step 7: Viết `apps/api/src/modules/cities/cities.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CitiesRepository } from './cities.repository';
import { CitiesService } from './cities.service';
import { CITY_MODEL, CitySchema } from './schemas/city.schema';
import { ZONE_MODEL, ZoneSchema } from './schemas/zone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CITY_MODEL, schema: CitySchema },
      { name: ZONE_MODEL, schema: ZoneSchema },
    ]),
  ],
  providers: [CitiesRepository, CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}
```

- [ ] **Step 8: Chạy test, thấy xanh**

Run: `pnpm --filter @ranhduong/api test`
Expected: PASS (9 test của cities + các test trước).

- [ ] **Step 9: Đăng ký module trong `apps/api/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ENV, loadEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { CitiesModule } from './modules/cities/cities.module';
import { PlacesModule } from './modules/places/places.module';

const env = loadEnv();

@Module({
  imports: [MongooseModule.forRoot(env.MONGODB_URI), CitiesModule, PlacesModule],
  controllers: [HealthController],
  providers: [{ provide: ENV, useValue: env }],
})
export class AppModule {}
```

- [ ] **Step 10: Typecheck, build, commit**

Run: `pnpm turbo run typecheck test build --filter=@ranhduong/api`
Expected: xanh.

```bash
git add apps/api/src
git commit -m "feat: S03 add city and zone schema with idempotent seed"
```

---

### Task 6: Seed Đà Lạt và lệnh `pnpm seed`

**Files:**
- Create: `packages/geo/src/bounds.ts`
- Test: `packages/geo/src/bounds.test.ts`
- Modify: `packages/geo/src/index.ts`
- Create: `apps/api/src/seed/da-lat.ts`
- Test: `apps/api/src/seed/da-lat.test.ts`
- Create: `apps/api/src/seed/seed.module.ts`
- Create: `apps/api/src/seed/main.ts`
- Modify: `apps/api/package.json` (script `seed`)
- Modify: `package.json` (script `seed` ở gốc)
- Modify: `docs/decisions.md`

**Interfaces:**
- Consumes: `CitiesService.applySeed`, `CitiesModule`, schema City/Zone (Task 5); `PlacesService.ensureIndexes`, `PlacesModule` (Task 4); `CitySeed`, `DalatZone`, `GeoPolygon` (contracts); `loadEnv` (`src/config/env.ts`).
- Produces: `boundsOf(points: ReadonlyArray<readonly [number, number]>, marginDeg?: number): Bounds` với `Bounds = [west, south, east, north]` (làm tròn 6 chữ số thập phân; mảng rỗng thì ném lỗi). `DA_LAT_SEED: CitySeed`. Lệnh `pnpm seed`.

- [ ] **Step 1: Viết test thất bại `packages/geo/src/bounds.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { boundsOf } from './bounds.js';

describe('boundsOf', () => {
  it('một điểm, không nới: khung suy biến tại điểm đó', () => {
    expect(boundsOf([[1, 2]])).toEqual([1, 2, 1, 2]);
  });
  it('khung bao nhiều điểm, nới đều mỗi phía', () => {
    expect(boundsOf([[1, 2], [3, 0.5], [2, 4]], 0.02)).toEqual([0.98, 0.48, 3.02, 4.02]);
  });
  it('làm tròn 6 chữ số thập phân để tránh sai số dấu phẩy động', () => {
    expect(boundsOf([[108.36, 11.83]], 0.02)).toEqual([108.34, 11.81, 108.38, 11.85]);
  });
  it('ném lỗi khi không có điểm nào', () => {
    expect(() => boundsOf([])).toThrow();
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/geo test`
Expected: FAIL, không tìm thấy `./bounds.js`.

- [ ] **Step 3: Viết `packages/geo/src/bounds.ts` và export**

```ts
/** Khung [tây, nam, đông, bắc] theo độ (lng, lat, lng, lat). */
export type Bounds = [west: number, south: number, east: number, north: number];

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Khung bao các điểm [lng, lat], nới thêm `marginDeg` độ mỗi phía; dùng làm maxBounds của bản đồ. */
export function boundsOf(points: ReadonlyArray<readonly [number, number]>, marginDeg = 0): Bounds {
  if (points.length === 0) throw new Error('boundsOf cần ít nhất một điểm');
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [round6(west - marginDeg), round6(south - marginDeg), round6(east + marginDeg), round6(north + marginDeg)];
}
```

`packages/geo/src/index.ts`:

```ts
export * from './normalize.js';
export * from './distance.js';
export * from './jaro-winkler.js';
export * from './bounds.js';
```

- [ ] **Step 4: Chạy test, thấy xanh; build geo**

Run: `pnpm --filter @ranhduong/geo test && pnpm --filter @ranhduong/geo build`
Expected: PASS, build không lỗi.

- [ ] **Step 5: Viết test thất bại `apps/api/src/seed/da-lat.test.ts`**

```ts
import { DalatZone } from '@ranhduong/contracts';
import { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CitiesRepository } from '../modules/cities/cities.repository';
import { CitiesService } from '../modules/cities/cities.service';
import { CITY_MODEL, CitySchema, type CityModel } from '../modules/cities/schemas/city.schema';
import { ZONE_MODEL, ZoneSchema, type ZoneModel } from '../modules/cities/schemas/zone.schema';
import { connectTestDb, dropTestDb } from '../testing/mongo';
import { DA_LAT_SEED } from './da-lat';

describe('DA_LAT_SEED', () => {
  it('có đúng 4 cụm theo DalatZone', () => {
    expect(DA_LAT_SEED.zones.map((z) => z.slug).sort()).toEqual([...DalatZone.options].sort());
  });

  describe('ghi vào MongoDB', () => {
    let conn: Connection;
    let cities: CityModel;
    let zones: ZoneModel;
    let service: CitiesService;

    beforeAll(async () => {
      conn = await connectTestDb();
      cities = conn.model(CITY_MODEL, CitySchema);
      zones = conn.model(ZONE_MODEL, ZoneSchema);
      service = new CitiesService(new CitiesRepository(cities, zones));
    });
    afterAll(async () => {
      await dropTestDb(conn);
    });

    it('chạy seed hai lần vẫn chỉ có 1 thành phố và 4 cụm có polygon', async () => {
      await service.applySeed(DA_LAT_SEED);
      const again = await service.applySeed(DA_LAT_SEED);
      expect(again).toMatchObject({ cityCreated: false, zonesCreated: 0, zonesUpdated: 4, staleZoneSlugs: [] });
      expect(await cities.countDocuments({ slug: 'da-lat' })).toBe(1);
      expect(await zones.countDocuments({ cityId: new Types.ObjectId(again.cityId), 'area.type': 'Polygon' })).toBe(4);
    });

    it('các cụm không chồng lên nhau (mỗi điểm trên bản đồ thuộc tối đa một cụm)', async () => {
      for (const zone of DA_LAT_SEED.zones) {
        const hits = await zones.find({ area: { $geoIntersects: { $geometry: zone.area } } }, { slug: 1 }).lean();
        expect(hits.map((h) => h.slug), zone.slug).toEqual([zone.slug]);
      }
    });

    it('tâm thành phố nằm trong cụm Trung tâm', async () => {
      const hits = await zones
        .find({ area: { $geoIntersects: { $geometry: DA_LAT_SEED.city.center } } }, { slug: 1 })
        .lean();
      expect(hits.map((h) => h.slug)).toEqual(['trung-tam']);
    });
  });
});
```

- [ ] **Step 6: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/api test`
Expected: FAIL, không tìm thấy `./da-lat`.

- [ ] **Step 7: Viết `apps/api/src/seed/da-lat.ts`**

```ts
import { CitySeed, type DalatZone, type GeoPolygon } from '@ranhduong/contracts';
import { boundsOf } from '@ranhduong/geo';

/** Hình chữ nhật [tây, nam, đông, bắc] thành polygon GeoJSON, vòng ngoài ngược chiều kim đồng hồ. */
function rect(west: number, south: number, east: number, north: number): GeoPolygon {
  return {
    type: 'Polygon',
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
  };
}

/**
 * 4 cụm khu vực theo product-spec mục 4. RANH GIỚI PHÁC THẢO: hình chữ nhật, các cụm cách nhau 300–800 m,
 * không chạm nhau; chủ dự án duyệt trên geojson.io trước khi seed staging/production.
 * Đổi ranh giới thì sửa ở đây rồi chạy lại `pnpm seed` (_id cụm giữ nguyên).
 * Gán cụm cho địa điểm vẫn chọn tay (data-collection mục 5); polygon dùng để vẽ và gợi ý.
 */
const ZONES: { slug: DalatZone; name: string; area: GeoPolygon }[] = [
  // Hồ Xuân Hương, chợ Đà Lạt, ga Đà Lạt
  { slug: 'trung-tam', name: 'Trung tâm', area: rect(108.415, 11.925, 108.478, 11.968) },
  // Tuyền Lâm, Datanla, Trúc Lâm, Prenn
  { slug: 'phia-nam', name: 'Phía Nam', area: rect(108.395, 11.86, 108.48, 11.92) },
  // Langbiang, Lạc Dương, Đankia
  { slug: 'phia-bac', name: 'Phía Bắc', area: rect(108.36, 11.975, 108.48, 12.07) },
  // Trại Mát, Cầu Đất, Trạm Hành
  { slug: 'phia-dong', name: 'Phía Đông', area: rect(108.483, 11.83, 108.6, 11.968) },
];

export const DA_LAT_SEED: CitySeed = CitySeed.parse({
  city: {
    slug: 'da-lat',
    name: 'Đà Lạt',
    // Toạ độ trung tâm đã dùng trong data-collection.md mục 5.
    center: { type: 'Point', coordinates: [108.4583, 11.9404] },
    timezone: 'Asia/Ho_Chi_Minh',
    active: true,
    // Màu nhấn mặc định của Đà Lạt (ui-spec mục 2: vàng dã quỳ).
    accent: '#E9B824',
    // maxBounds cho MapLibre: khung bao 4 cụm, nới 0,02° (khoảng 2 km) mỗi phía.
    mapBounds: boundsOf(ZONES.flatMap((zone) => zone.area.coordinates.flat()), 0.02),
    // Mùa nhập qua admin ở S23; seed chỉ đặt khi tạo mới.
    seasons: [],
  },
  zones: ZONES,
});
```

- [ ] **Step 8: Chạy test, thấy xanh**

Run: `pnpm --filter @ranhduong/api test`
Expected: PASS (4 test của da-lat + các test trước).

- [ ] **Step 9: Viết lệnh seed, chạy hai lần thật**

`apps/api/src/seed/seed.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { loadEnv } from '../config/env';
import { CitiesModule } from '../modules/cities/cities.module';
import { PlacesModule } from '../modules/places/places.module';

const env = loadEnv();

/** Module riêng cho lệnh seed: kết nối DB và các module có dữ liệu seed, không mở HTTP. */
@Module({
  imports: [MongooseModule.forRoot(env.MONGODB_URI), CitiesModule, PlacesModule],
})
export class SeedModule {}
```

`apps/api/src/seed/main.ts`:

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { CitiesService } from '../modules/cities/cities.service';
import { PlacesService } from '../modules/places/places.service';
import { DA_LAT_SEED } from './da-lat';
import { SeedModule } from './seed.module';

/** Ghi thành phố Đà Lạt và 4 cụm; tạo index cho places. Chạy lại bao nhiêu lần cũng không tạo trùng. */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
  try {
    await app.get(PlacesService).ensureIndexes();
    const result = await app.get(CitiesService).applySeed(DA_LAT_SEED);
    console.log(
      `Seed ${DA_LAT_SEED.city.slug}: thành phố ${result.cityCreated ? 'tạo mới' : 'đã có'}, ` +
        `cụm tạo mới ${result.zonesCreated}, cập nhật ${result.zonesUpdated}.`,
    );
    if (result.staleZoneSlugs.length > 0) {
      console.warn(`Cụm có trong DB nhưng không còn trong seed (không xoá): ${result.staleZoneSlugs.join(', ')}`);
    }
  } finally {
    await app.close();
  }
}

main().catch((err: unknown) => {
  console.error('Seed thất bại:', err);
  process.exitCode = 1;
});
```

Script trong `apps/api/package.json` (thêm vào `scripts`; staging/production chạy `node dist/seed/main.js` trong container, biến môi trường lấy từ container):

```json
    "seed": "node --env-file-if-exists=.env dist/seed/main.js",
```

Script trong `package.json` gốc (thêm vào `scripts`):

```json
    "seed": "turbo run build --filter=@ranhduong/api && pnpm --filter @ranhduong/api seed",
```

Run:

```bash
test -f apps/api/.env || cp .env.example apps/api/.env
pnpm infra:up
pnpm seed
pnpm seed
```

Expected: lần chạy thứ hai in `Seed da-lat: thành phố đã có, cụm tạo mới 0, cập nhật 4.` Nếu DB local đang trống thì lần đầu in `thành phố tạo mới, cụm tạo mới 4, cập nhật 0.`

- [ ] **Step 10: Kiểm số lượng và index bằng mongosh, kiểm API vẫn chạy**

```bash
docker compose exec -T mongo mongosh ranhduong --quiet --eval 'printjson({ cities: db.cities.countDocuments({ slug: "da-lat" }), zones: db.zones.countDocuments({ "area.type": "Polygon" }), zonesIdx: db.zones.getIndexes().map(i => i.name), placesIdx: db.places.getIndexes().map(i => i.name), citiesIdx: db.cities.getIndexes().map(i => i.name) })'
```

Expected: `cities: 1`, `zones: 4`, `zonesIdx` gồm `cityId_1_slug_1`, `area_2dsphere`; `placesIdx` gồm `location_2dsphere`, `cityId_1_slug_1`, `cityId_1_category_1_status_1`; `citiesIdx` gồm `slug_1`.

Chạy API từ `apps/api` bằng `node --env-file=.env dist/main.js` (chạy nền), rồi `curl -s http://localhost:3001/v1/health`.
Expected: `{"status":"ok","db":"up",...}`. Tắt tiến trình API sau khi kiểm.

- [ ] **Step 11: Ghi quyết định vào `docs/decisions.md`**

```markdown
| 2026-10-07 | Seed thành phố bằng `pnpm seed` (Nest application context), upsert theo `slug` và `{cityId, slug}`; không xoá cụm đã bỏ khỏi seed | Chạy lại hay chạy song song không tạo trùng; giữ `_id` cụm để `Place.zoneId` không gãy |
| 2026-10-07 | Ranh giới 4 cụm Đà Lạt là hình chữ nhật phác thảo, không chạm nhau; `mapBounds` = khung bao các cụm nới 0,02° | Product spec chỉ định nghĩa cụm bằng tên; gán cụm cho địa điểm vẫn chọn tay; chủ dự án duyệt trước khi seed staging |
```

- [ ] **Step 12: Typecheck, build, commit**

Run: `pnpm turbo run typecheck test build`
Expected: xanh toàn repo.

```bash
git add packages/geo/src apps/api/src/seed apps/api/package.json package.json docs/decisions.md
git commit -m "feat: S03 seed Da Lat city and four zones"
```

---

### Task 7: Cập nhật tài liệu, kiểm tra cuối

**Files:**
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: lệnh `pnpm seed` (Task 6), script `test` của API (Task 1).
- Produces: tài liệu khớp với code.

- [ ] **Step 1: Sửa `CLAUDE.md`**

Trong khối lệnh gốc ở mục "Lệnh", thêm sau dòng `pnpm dev`:

```text
pnpm seed                             # tạo/cập nhật thành phố Đà Lạt và 4 cụm (chạy lại không trùng)
```

Ở mục "Vùng TDD", thay dòng:

```text
- `apps/api` hiện chưa có script `test`. Story đầu tiên viết logic API phải thêm Vitest (công cụ test đã chọn trong `docs/decisions.md`) trước.
```

bằng:

```text
- `apps/api` test bằng Vitest (`pnpm --filter @ranhduong/api test`); test tích hợp cần MongoDB (`pnpm infra:up`), mỗi file test lấy database riêng qua `src/testing/mongo.ts`.
```

Ở mục "Trạng thái", sửa thành:

```text
- Xong: S01 (khung monorepo, CI, health check, trang `/da-lat` tạm), khung `apps/admin` cho S26, S03 (schema City/Zone/Place, `pnpm seed` Đà Lạt; chờ thử trên staging sau S02, ranh giới cụm chờ chủ dự án duyệt).
- Tiếp theo: S02 hạ tầng (`ranhduong.vn`, `api.ranhduong.vn`, `media.ranhduong.vn`), S04 đăng nhập admin.
```

- [ ] **Step 2: Sửa `AGENTS.md`**

Trong "Build, Test, and Development Commands", thêm sau dòng `pnpm dev`:

```text
- `pnpm seed`: build the API and upsert the Đà Lạt city and its 4 zones (safe to re-run).
```

Trong "Testing Guidelines", thay câu `No numeric coverage threshold is configured; API and web currently have no test scripts.` bằng:

```text
No numeric coverage threshold is configured. API tests use Vitest; integration tests need MongoDB (`pnpm infra:up`) and get a throwaway database from `apps/api/src/testing/mongo.ts`. Web has no test script yet.
```

- [ ] **Step 3: Sửa `README.md`**

Trong khối "Chạy local", thêm sau dòng `pnpm infra:up`:

```text
pnpm seed               # thành phố Đà Lạt và 4 cụm khu vực (chạy lại không trùng)
```

- [ ] **Step 4: Kiểm tra cuối toàn repo**

Run: `pnpm turbo run typecheck test build --force`
Expected: mọi task xanh. Lệnh trong CLAUDE.md có `lint` nhưng `turbo.json` chưa có task này; CI chạy `typecheck test build`.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md AGENTS.md README.md
git commit -m "docs: S03 document seed command and api tests"
```

- [ ] **Step 6: Review và hoàn tất nhánh**

Dùng superpowers:requesting-code-review cho toàn nhánh, rồi superpowers:finishing-a-development-branch. Mở PR gồm: link story S03, bảng "Tiêu chí nghiệm thu → bước kiểm" ở trên, kết quả `pnpm seed` hai lần, và hai việc còn mở: (1) thử trên staging sau S02, (2) chủ dự án duyệt ranh giới cụm.
