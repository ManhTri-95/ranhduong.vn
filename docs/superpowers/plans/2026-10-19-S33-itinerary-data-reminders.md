# S33 Itinerary Data Reminders Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Nhắc dữ liệu còn thiếu cho lịch trình trong danh sách địa điểm admin, lọc theo từng loại và không đổi điều kiện kích hoạt.

**Architecture:** Bổ sung thời lượng ghé và thời điểm đẹp vào `AdminPlaceSummary`, projection MongoDB và hai mapper API/admin. Hàm thuần ở entity place tính nhắc tại thời điểm hiển thị; danh sách dùng chung kết quả cho bảng, thẻ điện thoại và bộ lọc URL.

**Tech Stack:** TypeScript strict, Zod 4, NestJS/Mongoose, Vue 3, Vitest; không thêm dependency.

**Spec:** `docs/backlog-slice-2.md` S33 và mục 5; `docs/ui-spec.md` mục 12; `docs/data-collection.md`; ADR 0011, ADR 0013.

## Global Constraints

- Giữ nguyên thay đổi S31 có sẵn trong workspace; không commit thay người dùng.
- Chữ hiển thị tiếng Việt, vùng bấm tối thiểu 44px, kiểm tra 390px và desktop.
- Không sửa `activationIssues`, không đổi route công khai, không ghi dữ liệu thực để kiểm thử.
- Quy ước S33: sắp cần xác minh từ đủ 83 đến hết 90 ngày (còn tối đa 7 ngày); quá 90 ngày dùng `verificationStale` hiện có. Chưa xác minh cũng thuộc cần xác minh lại.
- Trường mới của summary tuỳ chọn để payload cũ vẫn đọc được; thiếu mảng thời điểm đẹp được xem như mảng rỗng.

## Review Focus

- Tại 83 ngày trừ 1 ms, đúng 83 ngày, đúng 90 ngày và 90 ngày cộng 1 ms: nhắc sắp/quá hạn không chồng nhau (Task 2).
- Dữ liệu cũ thiếu trường hoặc cụm đã bị bỏ: danh sách vẫn đọc được và có nhắc (Task 1–2).
- Query nhắc sai, lặp, Back từ form, xoá bộ lọc: giữ hành vi bộ lọc hiện có (Task 2–3).
- Nhắc kết hợp tìm tên, cụm, danh mục, trạng thái: số đếm tab và dòng phải khớp (Task 2).
- Đủ điều kiện kích hoạt nhưng thiếu dữ liệu lịch trình: vẫn có thao tác bình thường, có nhắc ở cả bảng lẫn thẻ (Task 2–3).

### Task 1: Truyền dữ liệu cho nhắc lịch trình

**Files:** `packages/contracts/src/place-admin.ts`, `place-admin.test.ts`; `apps/api/src/modules/places/{place-edit,places.repository}.ts`, `place-edit.test.ts`, `places.repository.test.ts`; `apps/admin/src/entities/place/model/summary.ts`, `summary.test.ts`.

**Interfaces:** `AdminPlaceSummary` thêm `visitDurationMin?: number`, `bestTime?: BestTime[]`; API và mapper form giữ nguyên các giá trị hợp lệ. Dữ liệu cũ chuẩn hoá `bestTime` thành `[]`.

- [x] Viết test RED: schema giữ hai trường mới, payload cũ vẫn hợp lệ; mapper và projection lấy được hai trường; cụm không còn được map thành thiếu.
- [x] Chạy test contracts/API/admin tương ứng, xác nhận đỏ vì thiếu trường.
- [x] Thêm schema, projection và mapper tối thiểu; giữ thông tin legacy hợp lệ.
- [x] Chạy lại các test liên quan, xác nhận xanh.

### Task 2: Tính nhắc và lọc theo nhắc

**Files:** tạo `apps/admin/src/entities/place/model/itinerary-reminders.ts`, `itinerary-reminders.test.ts`; sửa `apps/admin/src/widgets/place-list/model/{filters,filters.test}.ts`.

**Interfaces:** `itineraryReminders(place: Pick<AdminPlaceSummary, 'zone' | 'visitDurationMin' | 'bestTime' | 'lastVerifiedAt'>, now: Date): ItineraryReminder[]`; enum gồm `duration_missing`, `best_time_missing`, `zone_missing`, `verification_stale`, `verification_due`. `ListFilters.reminder` lưu trong query `reminder`.

- [x] Viết test RED cho từng nhắc, dữ liệu đủ/legacy, các biên ngày, không đổi điều kiện kích hoạt.
- [x] Viết test RED cho mỗi giá trị lọc, round-trip URL, query sai/lặp, bộ lọc kết hợp, số đếm, xoá lọc.
- [x] Chạy test admin, xác nhận đỏ; triển khai hàm/nhãn và tích hợp bộ lọc.
- [x] Chạy lại suite admin, xác nhận xanh.

### Task 3: Hiển thị, nghiệm thu và tài liệu

**Files:** `apps/admin/src/widgets/place-list/ui/RdPlaceList.vue`; `docs/runbooks/itinerary-data-reminders.md`; `docs/decisions.md`; danh sách admin trong `docs/ui-spec.md`; trạng thái S33 trong backlog/CLAUDE.

**Interfaces:** Bảng và thẻ dùng cùng `itineraryReminders` và nhãn; dropdown có mọi loại nhắc, xoá và URL theo Task 2.

- [x] Thêm dòng nhắc lịch trình ở cột Còn thiếu và thẻ, dropdown lọc; giải thích mốc 7 ngày và nhắc không chặn kích hoạt.
- [x] Chạy `pnpm turbo run lint typecheck test build`, kỳ vọng mọi task xanh; chạy `pnpm --filter @ranhduong/web test:ssr` sau build.
- [x] Kiểm Chrome 390px và desktop bằng fixture Giả Lập: bảng/thẻ, từng bộ lọc, URL/Back/clear, không tràn ngang; lưu ảnh vào runbook.
- [x] Review diff, cập nhật runbook và trạng thái phản ánh đúng kiểm tra local; staging, điện thoại thật, CI remote ghi là chưa kiểm.

## Execution Record

- Bắt đầu trên nhánh `main`, có thay đổi S31 từ trước. Thực thi ngay theo yêu cầu làm S33; dùng workspace hiện tại để giữ các dependency S31 chưa commit. Không tạo worktree tách bỏ các thay đổi này.
- Tự triển khai tuần tự; review độc lập cuối thay đổi theo skill `requesting-code-review`, không có lỗi cần sửa.
- Task 1 complete: 4 test RED về trường mới; GREEN sau thêm projection/schema/mapper. Test tích hợp đã bắt việc thêm nhầm projection public; sửa đúng `SUMMARY_FIELDS`, giữ projection public nguyên trạng.
- Task 2 complete: RED bộ lọc/nhắc; toàn suite admin GREEN (246 test). Sửa fixture dùng `satisfies` thay `as const` để mảng `bestTime` không thành readonly; typecheck GREEN.
- Task 3 complete: 20 task workspace, 84 SSR, Chrome 1440/390px, ảnh và runbook. Môi trường sandbox không truy cập được xác minh pnpm/khởi động Chrome; dùng lệnh ngoài sandbox đã được duyệt.
- Ruling: giữ workspace và các thay đổi người dùng đã có; không commit do index đang chứa S31 và có thay đổi độc lập ngoài S33. Trạng thái chỉ ghi code xong, còn nghiệm thu triển khai.
