# S32 — Gu và đi cùng ai cho lịch trình mẫu

Trong admin `/lich-trinh`, mở mẫu hoặc tạo mới tại `/lich-trinh/moi`, mở **Thông tin lịch trình**:

- **Gu**: chọn 0–3 chip trong 5 gu của S31. Đủ 3 thì các gu chưa chọn bị tắt; vẫn bấm lại gu đã chọn để bỏ.
- **Đi cùng ai**: chọn một trong Một mình, Cặp đôi, Nhóm bạn, Gia đình. Bấm lại lựa chọn hiện tại để để trống.
- **Phong cách** vẫn là nội dung tự do riêng, giữ nguyên trong xem trước điện thoại. Gu và đi cùng ai không đổi nội dung xem trước điện thoại hoặc Google.

Các lựa chọn đi theo thao tác Lưu nháp/Công khai hiện có, được giữ trong bản nhập dở trên máy; Bỏ thay đổi trở lại bản đã lưu. Khi đang lưu, toàn bộ nhóm chip bị khoá cùng các trường thông tin khác.

## Hợp đồng và mẫu cũ

`TemplateEditInput`, `TemplateLocalDraft`, `AdminTemplate` dùng chung `tags: TripInterest[]` (mặc định `[]`, tối đa 3, không trùng) và `with?: TripWith`. Không nhận slug thẻ địa điểm như `chill` thay cho gu `chill_cafe`, chuỗi phong cách tự do hoặc mã ngoài enum.

Repository lưu đúng `params.tags` và `params.with`, không chép `style` vào `params.with` nữa. `style` vẫn được lưu riêng. Khi đọc:

1. Thiếu `params.tags` thì trả `[]`.
2. `params.with` hợp lệ được ưu tiên; mẫu cũ có giá trị thiếu/không hợp lệ thì thử `style` bằng đúng enum `solo`, `couple`, `friends`, `family`. Không khớp thì để trống, không đoán từ nhãn/chuỗi tự do.
3. Từ S32, không chọn đối tượng được lưu nội bộ bằng `params.with: null`. Giá trị này ngăn việc suy lại từ `style` sau khi đã chủ động bỏ chọn; DTO admin vẫn bỏ trường `with` khi trống.

Đọc mẫu không ghi/migrate database. Lần lưu tiếp theo ghi định dạng mới, giữ nguyên slug, mô tả, metadata và lịch giờ. Bản localStorage trước S32 được nhận ra bằng trường `tags` còn thiếu và áp dụng cùng quy tắc `style`; bản mới có `tags: []` giữ lựa chọn trống khi tải lại.

Không thêm dependency, biến môi trường, route hoặc index. Triển khai contracts/API/admin cùng phiên bản; giữ S31 là phần phụ thuộc.

## Kiểm chứng trong workspace

- RED→GREEN: 3 test schema, 3 test HTTP, 3 test editor mới ban đầu thất bại vì thiếu trường/validation/action; sau triển khai đạt. Thêm hồi quy bỏ chọn khi `style` trùng enum.
- `pnpm turbo run lint typecheck test build`: **20/20 task đạt**; contracts 594, API 465, admin 222, web 150, geo 37 test.
- `pnpm --filter @ranhduong/web test:ssr`: **84/84 test đạt**, mã thoát 0.
- HTTP dùng Nest/MongoDB/Redis thật với database test riêng: POST/PUT/GET/list giữ gu/đối tượng, xoá lựa chọn, ưu tiên dữ liệu mới, mở/lưu mẫu cũ, validation chặn ghi sai.
- Chrome headless trên bản build với API Giả Lập: 1440×1100 và 390×844; chọn/bỏ, giới hạn, payload, tải lại, hết phiên/khôi phục; không tràn ngang, chip ít nhất 44×44px, không lỗi runtime; nội dung điện thoại/Google không đổi khi thay lựa chọn.
- Review độc lập không có lỗi cần sửa. `git diff --check` đạt.

Ảnh kiểm giao diện: [desktop](assets/s32-template-desktop.png), [390px](assets/s32-template-mobile.png).

Chạy riêng:

```powershell
pnpm --filter @ranhduong/contracts exec vitest run src/itinerary-admin.test.ts
pnpm --filter @ranhduong/api exec vitest run src/modules/admin/admin-templates.http.test.ts
pnpm --filter @ranhduong/admin exec vitest run src/widgets/template-editor/model/use-template-editor.test.ts
```

Chờ commit/merge, CI remote, staging S02, thử iPhone/Android thật và theo dõi Sentry 24 giờ theo definition of done. Chưa gắn gu/đối tượng cho dữ liệu lịch trình thật; admin chọn theo nội dung đã xác nhận.
