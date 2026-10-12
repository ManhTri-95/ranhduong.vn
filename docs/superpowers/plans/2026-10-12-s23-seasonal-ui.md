# S23 Seasonal UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if the user selects that method. Implement task-by-task and track steps with checkboxes.

**Goal:** Admin chỉnh được mùa của thành phố; API trả mùa hiện tại; web đổi màu nhấn và giới thiệu lịch trình đúng mùa theo S23.

**Architecture:** Giữ `City.seasons` trong MongoDB và định nghĩa hợp đồng, thuật toán chọn mùa trong contracts. Module `city-now` ở tầng ngoài cùng gọi CitiesService và ItinerariesService, tránh CitiesModule phụ thuộc ngược vào itineraries. Admin lưu cấu hình qua route có AdminGuard; web nhận dữ liệu SSR và áp dụng theme theo từng thành phố.

**Tech Stack:** Node 24, pnpm 12.9.1, NestJS 12, Mongoose 9, Redis/ioredis hiện có, Zod 4, Nuxt 4, Vue 3, Vitest; không thêm dependency.

**Spec:** `docs/backlog.md` S23 và §6; `docs/ui-spec.md` §2/4/5/7/8/11; `docs/technical-design.md` §3/6; ADR 0005, 0009, 0010, 0011; `CLAUDE.md`.

## Global Constraints

- TypeScript strict; hai dấu cách, single quotes, semicolons, LF; tên code tiếng Anh, giao diện tiếng Việt.
- FSD chỉ import lớp thấp hơn; không import ngang slice. Chỉ repository import model MongoDB.
- `from`/`to` dạng MM-DD; xác định ngày theo `Asia/Ho_Chi_Minh`, bao gồm cả hai đầu khoảng và khoảng qua năm mới.
- `--accent` luôn đi với chữ `--ink`; màu, font, bo góc dùng token; vùng bấm tối thiểu 44×44px; kiểm 390px trước desktop.
- `/now` cache 15 phút. Không thêm phần thời tiết S24; hình minh hoạ SVG nhỏ, lắc nhẹ 4 giây và tắt khi reduced motion.
- Không tự ghi dữ liệu mùa thực tế vào DB hoặc thay cấu hình đã sửa bằng lệnh seed. Khoảng ngày 2026–2027 trong UI spec vẫn cần chủ dự án xác nhận.
- Làm tại checkout hiện có trên nhánh `feat/S23-seasonal-ui`; không tạo thêm worktree khi người dùng chỉ yêu cầu tách nhánh.

## Decisions for Review

- Thêm trường tuỳ chọn `kind: 'flower' | 'rain' | 'other'` vào CitySeason để thể hiện ưu tiên mùa hoa một cách rõ ràng, độc lập với tên/key. Với bản cũ chưa có kind, suy ra flower cho key `da-quy`/`mai-anh-dao`, rain cho `mua-mua`, còn lại other. Mùa flower đứng trước các mùa khác; các mùa cùng nhóm lấy theo thứ tự admin sắp.
- Khoá minh hoạ hỗ trợ `wild-sunflower`, `cherry-blossom`, `rain`, `notebook`; khoá cũ/không biết vẫn được đọc nhưng hiển thị minh hoạ notebook. Không chèn HTML/SVG từ DB.
- Admin `/mua` cho thêm/xoá/sắp mùa và sửa key, loại mùa, ngày, màu, tiêu đề, mô tả, minh hoạ, lịch trình. Các mẫu Đà Lạt chỉ điền màu/loại/minh hoạ và gợi ý tháng; admin nhập ngày cụ thể trước khi lưu.
- Không có mùa: `season: null`, màu mặc định `City.accent`, không có banner mùa và giữ thứ tự lịch trình mẫu hiện có. Repo chưa có số liệu lượt xem lịch trình; yêu cầu “lịch trình nhiều lượt xem nhất” của UI §7 cần thống kê bổ sung ngoài S23, không giả lập số liệu.
- Lịch trình gắn vào mùa phải là template published/public đúng thành phố. Nếu sau đó bị chuyển thành nháp hoặc không còn hợp lệ, không trả liên kết công khai; banner vẫn hiển thị nội dung mùa.
- Theme dùng `/now` trên các trang thành phố, áp dụng qua Nuxt head/root CSS variable có scope theo route. Chuyển sang trang pháp lý hoặc thành phố khác phải dọn theme cũ. Giới hạn cache HTML trang thành phố xuống 900 giây để không giữ màu mùa cũ trong cache 1 giờ/1 ngày; tìm kiếm tiếp tục no-store.

## Review Focus

- Mùa mai anh đào qua 31/12; ngày Việt Nam đã đổi nhưng UTC chưa đổi; từ/to bằng nhau chỉ áp dụng một ngày.
- Hoa và mưa trùng nhau, kể cả mưa nằm trước trong mảng; key trùng và ngày MM-DD không tồn tại.
- Lịch trình nổi bật nằm ngoài 10 mẫu đầu, thuộc thành phố khác, unlisted, nháp hoặc vừa bị thu hồi công khai.
- Cache tạo trước lúc admin lưu hoặc trước nửa đêm; request cũ không ghi đè cấu hình mới; Redis lỗi không làm mất khả năng đọc mùa từ MongoDB.
- SSR rồi hydrate, chuyển route, API /now lỗi, reduced motion và lưu admin khi hết phiên: không lộ dữ liệu riêng tư, không mất input, không giữ màu của route cũ.

## Acceptance Mapping

| Tiêu chí S23 | Bước kiểm |
| --- | --- |
| City.seasons lưu trong DB | Task 1 validation; Task 2 MongoDB integration và hồi quy seed |
| Admin sửa được | Task 2 guard/Origin/PUT; Task 3 form, retry và recovery |
| Endpoint /now trả mùa hiện tại | Task 1 thuật toán; Task 2 HTTP, cache và timezone |
| Token --accent đổi theo mùa | Task 4 SSR, chuyển route, cache và browser computed style |
| Banner trang chủ đẩy lịch trình nổi bật | Task 2 phân giải template theo ID; Task 4 banner, thứ tự và link đúng slug |

### Task 1: Contracts và chọn mùa

**Files:** Modify `packages/contracts/src/city.ts`, `index.ts`; create `city-season.ts`, `city-season.test.ts`, `city-season-admin.ts`, `city-season-admin.test.ts` cùng thư mục.

**Interfaces:**
- `selectCitySeason(seasons: CitySeason[], now: Date, timezone: 'Asia/Ho_Chi_Minh'): CitySeason | null` không mutate input; ưu tiên flower rồi thứ tự cấu hình.
- `CitySeasonSettings = { seasons: CitySeason[]; updatedAt: string }` với updatedAt ISO UTC.
- `CitySeasonEditInput = { seasons: CitySeason[]; updatedAt: string }`, tối đa 24 mùa, key không trùng; chuỗi nội dung trim và có giới hạn hợp lý.
- `CityNow = { accent: string; season: Omit<CitySeason, 'featuredItineraryId'> | null; featuredItinerary: ItineraryCard | null; expiresAt: string }` với HexColor và ISO UTC; DTO công khai không chứa MongoDB ID.

- [x] Viết test trước: rỗng trả null; hai đầu khoảng được chọn; khoảng `12-20`–`02-28` qua năm mới; `from === to` chỉ một ngày; `2026-10-19T17:00:00Z` là ngày 20/10 tại Việt Nam.
- [x] Thêm test hoa thắng mưa với mảng mưa đứng đầu; cùng nhóm giữ thứ tự; input không bị sắp lại; phân loại bản cũ thiếu kind.
- [x] Thêm test input từ chối key trùng, `02-30`, màu sai, ID sai, chuỗi toàn khoảng trắng; cho phép xoá hết mùa và `02-29`.
- [x] Chạy `pnpm --filter @ranhduong/contracts test` và xác nhận các test mới đỏ do contract/helper chưa có.
- [x] Implement các interface trên bằng Zod và Intl.DateTimeFormat; thêm export. Không thay MonthDay bằng parser UTC hoặc regex đơn thuần.
- [x] Chạy lại test contracts; xác nhận xanh rồi chuyển task.

### Task 2: Persistence, admin API và /now

**Files:** Modify city schema/repository/service; `apps/api/src/modules/admin/admin-cities.controller.ts`, `admin.module.ts`; create `admin-city-seasons.service.ts`, `admin-city-seasons.http.test.ts`; create `apps/api/src/modules/city-now/{city-now.module,city-now.controller,city-now.service,city-now.service.test,city-now.http.test}.ts`; modify `apps/api/src/app.module.ts`, itineraries repository/service và các test liên quan.

**Interfaces:**
- CitiesService: `seasonSettings(citySlug: string): Promise<CitySeasonSettings>`; `replaceSeasons(citySlug: string, input: CitySeasonEditInput): Promise<CitySeasonSettings>` dùng findOneAndUpdate với updatedAt; conflict trả 409 CONFLICT.
- `GET /v1/admin/cities/:city/seasons` và `PUT` cùng route dùng shared contracts, AdminGuard và OriginGuard hiện có; admin service kiểm template trước khi gọi replaceSeasons.
- ItinerariesService: `featuredTemplate(cityId: string, id: string): Promise<ItineraryCard | null>`; kiểm kind/status/visibility/city và cấu trúc public thật, không phụ thuộc danh sách giới hạn 10. ID chỉ dùng nội bộ.
- `GET /v1/cities/:city/now` trả CityNow; city-now service gọi service được export; CitiesModule không import ItinerariesModule.

- [x] Viết test đỏ với MongoDB/Redis test helpers: PUT/GET roundtrip, xoá danh sách, conflict hai bản sửa, seed giữ seasons, city tắt/không tồn tại trả 404.
- [x] Viết HTTP test đỏ: chưa đăng nhập 401, ngoài danh sách admin 403, thiếu/sai Origin bị chặn; schema sai 400; template sai city/nháp/unlisted bị từ chối và DB không đổi.
- [x] Viết test /now: chọn theo ngày cố định, base accent khi null, công khai đúng card ngoài limit 10, không trả ID/nháp/unlisted; template thu hồi công khai không được tạo link.
- [x] Viết test cache: TTL tối đa 900 giây và không qua nửa đêm địa phương; cache key có city version/ngày để request cũ không làm sống lại cấu hình cũ; save tạo version mới. Chỉ cache dữ liệu mùa, phân giải quyền công khai của template mỗi request.
- [x] Chạy `pnpm --filter @ranhduong/api test` và xác nhận test mới đỏ; implement repository/service/controller/module đúng interface.
- [x] Redis lỗi đọc tính trực tiếp từ MongoDB, log lỗi cache; thành phố lỗi vẫn trả lỗi chuẩn và no-store. Response thành công có cache header tối đa bằng TTL còn lại; kiểm lại template publish-state trước trả.
- [x] Chạy lại suite API và contracts; kiểm module seed/test không phải nạp cấu hình đăng nhập hoặc city-now.

### Task 3: Admin chỉnh mùa

**Files:** Modify `apps/admin/src/entities/city/api/city.ts`, `app/router.ts`, `app/App.vue`; create `pages/SeasonsPage.vue`, `widgets/season-editor/ui/RdSeasonEditor.vue`, `widgets/season-editor/model/{form,use-season-editor}.ts` và test colocated; thêm style cần thiết ở `packages/ui/src/admin.css`.

**Interfaces:** city API thêm `fetchSeasonSettings(city: string): Promise<CitySeasonSettings>` và `saveSeasonSettings(city: string, input: CitySeasonEditInput): Promise<CitySeasonSettings>` qua shared client; widget nhận citySlug, settings và template options do page tải để tránh import ngang entities.

- [x] Viết test model đỏ: input nhập dở được giữ cục bộ; khi save mới validate contract; key/field lỗi được ánh xạ; template option published/public đúng city; sắp/xoá/thêm mùa không mất ID.
- [x] Viết test lỗi phiên/mạng/409 giữ bản đang sửa; retry tải không ghi đè form dirty; localStorage thất bại hiển thị tình trạng thật và chặn rời trang khi cần.
- [x] Chạy `pnpm --filter @ranhduong/admin test`, xác nhận đỏ; implement form/model và API adapter.
- [x] Thêm route `/mua` và mục “Mùa & giao diện”; chọn lịch trình bằng title với giá trị ID, có lựa chọn không gắn. Nhãn MM-DD rõ; hiển thị preview màu, banner và thứ tự ưu tiên; nút lưu duy nhất.
- [x] Tái sử dụng flow session recovery và form primitives hiện có; bấm Enter không kích hoạt thao tác xoá/thêm. Chạy test/admin typecheck/lint và kiểm UI 390px/desktop.

### Task 4: Theme, banner, promotion và kiểm chứng

**Files:** Create `apps/web/app/entities/city/api/now.ts`, `entities/city/lib/use-city-theme.ts`, `entities/city/ui/RdSeasonIllustration.vue`, `widgets/season-banner/ui/RdSeasonBanner.vue`, `entities/itinerary/lib/promote-itinerary.ts` và test; modify `entities/city/api/city.ts`, homepage, RdMapExplorer, Nuxt routeRules, SSR fixture/tests, UI components CSS; create `docs/runbooks/seasonal-ui.md`, `docs/runbooks/assets/s23-*.png`; update docs/backlog.md, decisions.md, CLAUDE.md sau khi kiểm chứng.

**Interfaces:** `useCityNow(citySlug: string)` dùng useFetch key theo city, timeout 5 giây. `useCity(citySlug: string)` khởi tạo city và now song song, đăng ký theme trước await; trả AsyncData city hiện có cùng thuộc tính `now` chứa AsyncData CityNow, giữ `.data`, `.error`, `.refresh` cho mọi consumer cũ. Homepage đọc `city.now` và refresh cả hai khi retry. `promoteItinerary(items: ItineraryCard[], featured: ItineraryCard | null): ItineraryCard[]` đưa card nổi bật lên đầu, loại trùng slug, giữ thứ tự còn lại và không mutate input.

- [x] Viết test promotion đỏ: null giữ thứ tự, featured đã có không nhân đôi, featured ngoài 10 mẫu vẫn được thêm đầu, input không mutate.
- [x] Viết SSR test đỏ: màu hồng `#E58FA8`, banner title/sub/season chip và link `/{city}/lich-trinh/{slug}` có trong HTML; card nổi bật ở đầu; season null không có banner; lỗi /now dùng base accent và không crash/hydration mismatch.
- [x] Implement theme từ /now có fallback City.accent, scoped Nuxt head style; dọn theme khi route đổi. Loại override `city.accent` cũ trên map nếu nó che theme mùa. Không đổi màu khác trong tokens.css.
- [x] Banner đặt sau intro trước search; viền 2px --ink, tiêu đề Lora, chip “Theo mùa”, mô tả, link khi card hợp lệ; SVG 96×96 bên phải, aria-hidden. Hiệu ứng -2° ↔ 2°, 4 giây, reduced motion tắt.
- [x] Đổi cache HTML các route thành phố sang tối đa 900 giây và cập nhật assertion header tương ứng; không thêm rule `/:city` vốn khớp renderer `/_`. Tìm kiếm và response lỗi tiếp tục no-store.
- [x] Refresh /now khi hết expiresAt và khi tab trở lại; request city cũ không cập nhật theme city mới. Test bằng browser qua ranh giới mùa và đổi route.
- [x] Chạy `pnpm turbo run lint typecheck test build`; sau build chạy `pnpm --filter @ranhduong/web test:ssr`. Không sửa môi trường để bỏ kiểm chữ ký pnpm; lỗi sandbox/network thì xin escalation đúng quy trình.
- [x] Browser: 390px/desktop, ba theme với fixture Giả Lập, no-JS SSR, link nổi bật ngoài limit, map/chi tiết dùng accent mùa, reduced motion, retry /now, admin save/reload/session expiry; chụp ảnh và kiểm console/hydration.
- [x] Review toàn diff đối chiếu acceptance và ADR; ghi runbook về cache/nhập MM-DD/thứ tự mùa/fallback. Cập nhật trạng thái “Code xong” chỉ sau khi checks xanh; staging/điện thoại thật/CI remote/Sentry còn chờ thì ghi rõ.
- [x] Chỉ commit thay đổi S23 sau khi required checks xanh. Không merge/push/deploy tự động; báo nhánh, validation và phần còn chờ.

## Preparation Evidence

- Checkout ban đầu sạch, main ahead origin/main 26 commit; đã tạo và chuyển `feat/S23-seasonal-ui` bằng git switch, sau khi được cấp quyền ghi .git.
- CitySeason và SeasonSchema đã tồn tại; seed dùng $setOnInsert cho seasons/active, cần giữ hồi quy này.
- CitiesModule là tầng nền; ItinerariesModule hiện import CitiesModule. Vì vậy /now không được ghép dependencies ngược vào CitiesModule.
- Public list templates hiện sort theo createdAt và chưa có viewCount; kiểm visibility hiện có cần được siết khi lấy card để banner không lộ template unlisted.
- Node hiện tại v24.20.0; pnpm 12.9.1 đã xác minh sau escalation cho lỗi fetch registry trong sandbox. Kiểm tra baseline `pnpm turbo run test` exit 0, 7/7 task thành công từ cache.
- Plan tự review: đã ánh xạ đủ 5 tiêu chí S23 vào tasks; 5 failure classes đều có bước test hoặc browser check. Người dùng đã duyệt kế hoạch và chọn thực thi trực tiếp.

## Execution Evidence

- Tasks 1–4 đã thực thi tại checkout trên nhánh riêng, không thêm dependency; các test nghiệp vụ mới đã được quan sát RED → GREEN.
- Picker dùng endpoint admin seasons/itineraries bổ sung vì danh sách template cũ thiếu visibility. Theo dõi bằng PowerShell/apply_patch thay helper Bash lỗi đường dẫn Windows; không đổi phạm vi sản phẩm.
- Review độc lập toàn working tree: một Important về bỏ lời nhắc khôi phục cũ làm mất bản nhập mới. Hai test hồi quy đã RED → GREEN, gồm storage thất bại; thêm kiểm Redis lỗi và request cache cũ hoàn tất sau cập nhật. Không có Critical/Minor hoặc mục từ chối đánh giá.
- Kiểm cuối sau sửa review: `pnpm turbo run lint typecheck test build` exit 0, 20/20 task xanh (contracts 338, geo 37, API 361, admin 120, web 87 test); `pnpm --filter @ranhduong/web test:ssr` exit 0, 69/69 test. Chrome 390px/desktop chạy lại trên build mới, gồm bỏ lời nhắc cũ vẫn giữ input mới, không có runtime exception/hydration warning. Ảnh và chi tiết nằm trong `docs/runbooks/seasonal-ui.md`.
- Cấu hình ngày mùa/lịch trình thật, CI remote, staging, điện thoại thật và Sentry 24 giờ vẫn thuộc nghiệm thu sau triển khai.
