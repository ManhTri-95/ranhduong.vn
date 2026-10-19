# S32 Template Trip Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin gắn tối đa 3 gu và một lựa chọn đi cùng ai cho lịch trình mẫu, lưu riêng với phong cách và mở/lưu được mẫu cũ.

**Architecture:** Mở rộng contracts form hiện có bằng enum S31; repository chuyển DTO phẳng `tags`/`with` sang `params`. Khi đọc mẫu cũ, gu mặc định rỗng, ưu tiên `params.with` hợp lệ rồi lấy `style` nếu khớp enum. UI dùng chip design system, không đổi component xem trước.

**Tech Stack:** Vue 3, Zod 4, NestJS/Mongoose, Vitest; không thêm dependency.

**Spec:** `docs/backlog-slice-2.md` S32; `docs/ui-spec.md` §12; `docs/technical-design.md` §3; ADR 0011.

## Global Constraints

- Node 24, pnpm 12.9.1, strict TypeScript; tiếng Việt cho UI, token CSS, vùng bấm tối thiểu 44×44px, màn 390px trước.
- Giữ `style` là metadata riêng; không tự suy gu từ phong cách; không đổi URL hoặc preview điện thoại/Google.
- Giữ thay đổi S31 đang có; làm tại workspace hiện tại để sử dụng phần contracts chưa commit; không commit/gộp thay đổi của người dùng.

## Review Focus

- Mẫu cũ thiếu cả hai trường phải mở/lưu được, không tự gán đối tượng khách.
- `params.with` hợp lệ được ưu tiên hơn `style`; chuỗi tự do không lọt vào enum.
- Gu thứ tư, gu trùng và mã không hợp lệ bị từ chối ở schema API.
- Bản nhập dở cũ và mới khôi phục được sau reload/hết phiên.
- Sau khi chọn ba gu, vẫn bỏ chọn được; chọn lại đối tượng không tích luỹ nhiều giá trị.

### Task 1: Contracts và lưu/đọc API

**Files:** `packages/contracts/src/itinerary-admin.ts`, `packages/contracts/src/itinerary-admin.test.ts`, `apps/api/src/modules/itineraries/itineraries.repository.ts`, `apps/api/src/modules/admin/admin-templates.http.test.ts`.

**Interfaces:** DTO `TemplateEditInput`/`TemplateLocalDraft`/`AdminTemplate` thêm `tags: TripInterest[]` (mặc định `[]`, tối đa 3, duy nhất) và `with?: TripWith`. Database dùng `params.tags`/`params.with`; schema DB hiện có đã chứa hai trường.

- [x] Test trước: schema nhận 0–3 gu và bốn TripWith, mặc định rỗng, từ chối gu thứ tư/trùng/sai enum; API POST/PUT/GET/list giữ hai trường riêng khỏi `style`, xoá lựa chọn, mở/lưu legacy với `style` hợp lệ/không hợp lệ và ưu tiên params mới.
- [x] Chạy `pnpm --filter @ranhduong/contracts exec vitest run src/itinerary-admin.test.ts` và `pnpm --filter @ranhduong/api exec vitest run src/modules/admin/admin-templates.http.test.ts`; xác nhận RED vì chưa có hai trường.
- [x] Bổ sung schema và mapping repository, giữ nguyên metadata/lịch giờ/slug; không đổi dữ liệu cũ khi chỉ đọc.
- [x] Chạy lại hai suite, xác nhận GREEN.

### Task 2: Editor, chip và hồi quy

**Files:** `apps/admin/src/widgets/template-editor/model/use-template-editor.ts`, `apps/admin/src/widgets/template-editor/model/use-template-editor.test.ts`, `apps/admin/src/widgets/template-editor/ui/RdTemplateEditor.vue`; cập nhật fixture dùng DTO nếu typecheck yêu cầu.

**Interfaces:** Dùng DTO Task 1 và enum/nhãn S31. `toggleInterest(interest: TripInterest): void` thêm/bỏ trong giới hạn; `form.with` chọn một/bỏ chọn. Bản cũ localStorage được chuẩn hoá khi khôi phục.

- [x] Test trước: form mới rỗng, giới hạn 3 và bỏ chọn, lưu payload và mở lại, local recovery cả bản cũ/mới, lỗi mạng giữ lựa chọn.
- [x] Chạy `pnpm --filter @ranhduong/admin exec vitest run src/widgets/template-editor/model/use-template-editor.test.ts`; xác nhận RED.
- [x] Thêm trạng thái và action editor; nhóm chip Gu/Đi cùng ai có nhãn, aria-pressed, nút type button, busy/giới hạn, wrap trên màn nhỏ. Giữ component preview.
- [x] Chạy suite GREEN, rồi `pnpm turbo run lint typecheck test build` và `pnpm --filter @ranhduong/web test:ssr`.
- [x] Kiểm trình duyệt 390px/desktop với fixture Giả Lập: chọn/bỏ, giới hạn, lưu/mở lại, preview không đổi; lưu ảnh minh chứng nếu công cụ có sẵn.
- [x] Rà soát diff; cập nhật runbook/trạng thái S32 đúng mức kiểm chứng, ghi rõ phần staging/điện thoại thật chưa thực hiện.

## Execution Record

- Thực hiện trực tiếp theo yêu cầu hoàn thành S32; không thêm vòng xin duyệt cho công việc trong phạm vi đã giao.
- Không tạo worktree vì S32 cần contracts S31 đang sửa trong workspace; không commit tự động.
- Task 1 complete: contracts 3 test mới RED → 5/5 GREEN, HTTP 3 test mới RED → 13/13 GREEN; contracts được build trước khi test app.
- Task 2 complete: editor 3 test mới RED → GREEN, thêm hồi quy lựa chọn trống; toàn workspace 20/20 task và SSR 84/84 đạt, Chrome 390px/desktop đạt, review độc lập không có finding.
- Ruling: `params.with: null` biểu thị chủ động để trống, DTO vẫn `with?: TripWith` — tránh suy lại từ `style` khi mở bản mới đã bỏ chọn. Local dùng sự hiện diện của `tags` để phân biệt nháp cũ.
- Ruling: dùng `exec vitest run <file>` cho test riêng — `test -- <file>` với phiên bản pnpm hiện tại chuyển dấu `--` tới Vitest và chạy cả suite.
- Ruling: kiểm tra pnpm/test ngoài sandbox vì shim bị treo trong sandbox. SSR chuyển stderr vào file làm PowerShell báo mã lỗi dù 84 test xanh; chạy lại trực tiếp xác nhận exit 0. Không đổi code để xử lý lỗi shell.
- Không đánh dấu toàn bộ definition of done: CI remote, staging, iPhone/Android thật và Sentry 24 giờ còn chờ theo runbook.
