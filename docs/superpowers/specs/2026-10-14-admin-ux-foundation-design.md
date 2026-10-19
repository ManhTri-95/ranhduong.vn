# Thiết kế S28: nền UX admin dùng chung và ba trang nhập liệu

14/10/2026. Chủ dự án duyệt từng phần trong buổi brainstorming cùng ngày: lộ trình "nền dùng chung trước", khung trang, danh sách địa điểm, form địa điểm, soạn lịch trình mẫu, giao diện và chuyển động. Story mới S28, chưa có trong backlog; nhánh `feat/S28-admin-ux` tạo sau khi S25 đã commit.

## 1. Mục tiêu

Biến `apps/admin` thành chỗ làm việc nhanh, ít lỗi khi nhập địa điểm và lịch trình mẫu, đồng thời dựng một lớp component dùng lại được cho app chủ quán sau này (`apps/owner`, technical-design mục 2).

**Đo thành công (giai đoạn 1):**

- Nút lưu của form địa điểm và form lịch trình luôn trong màn hình ở 390×844, 1024×768 và 1440×900, không phải cuộn tới cuối trang.
- Từ form địa điểm quay lại danh sách (breadcrumb, thanh bên hoặc Back) giữ đúng tab, bộ lọc, cách xếp và vị trí cuộn.
- Form địa điểm có thể đổi trạng thái (xác minh, ẩn, đã đóng cửa, hiện lại, mở lại, xoá nháp) mà không quay lại danh sách.
- Không cuộn ngang ở 320, 375, 390, 768, 1024, 1280, 1440px; viền focus thấy được ở mọi nền, kể cả thanh bên.
- `pnpm turbo run lint typecheck test build` xanh; test admin hiện có không bị bỏ hay làm yếu.

## 2. Ràng buộc giữ nguyên

- Không đổi API, contract Zod hay route admin. Mọi việc ở giai đoạn 1 và 2 chỉ dùng endpoint đang có. Xoá, sắp xếp, chọn ảnh bìa cần API mới nên tách thành story backend riêng (mục 10).
- Không thêm thư viện: hộp thoại và ngăn trượt dùng `<dialog>` của trình duyệt, hiệu ứng dịch chỗ dùng `TransitionGroup` của Vue, kéo thả dùng HTML5 cộng nút Lên/Xuống.
- Giữ nguyên logic nghiệp vụ: điều kiện kích hoạt (`activationIssues`), kiểm tra lịch trình (`analyzeTemplate`), tự giữ bản đang sửa trên máy (chủ dự án chọn 2026-10-08), giờ tự tính và giờ sửa tay, quy tắc nút chính theo trạng thái (`primaryAction`).
- Ô nhập giữ chữ 16px (decisions 2026-10-08). Vùng bấm tối thiểu 44×44px, cách nhau ít nhất 8px. Chỉ dùng token trong `packages/ui/src/tokens.css`; `--accent` luôn đi với chữ `--ink`.
- Không tự lưu lên máy chủ.
- Test chỉ dùng dữ liệu tên "Giả Lập".

## 3. Lộ trình

| Giai đoạn | Khi nào | Phạm vi | Ước lượng thô |
| --- | --- | --- | --- |
| 1 | Trước ra mắt | Nền dùng chung (mục 4, 5), danh sách địa điểm (mục 6), form địa điểm (mục 7, phần đánh dấu GĐ1), soạn lịch trình (mục 8, phần GĐ1), cập nhật ui-spec §12 | 26–30 giờ |
| 2 | Sau ra mắt | Các mục đánh dấu GĐ2 ở mục 7, 8; chuyển trang Danh sách gợi ý, Báo cáo, Mùa, danh sách Lịch trình sang component; đưa `.rd-seasons*` ra khỏi `packages/ui` | 15–20 giờ |
| 3 | Khi bắt đầu `apps/owner` | Chuyển `shared/ui` và `shared/lib` dùng chung sang `packages/ui` | 2–4 giờ |

Nếu giai đoạn 1 phải giữ dưới 24 giờ, dời sang giai đoạn 2 theo thứ tự: thẻ điện thoại của danh sách (mục 6.3), kiểm lại lỗi khi sửa ô (mục 7.3), link "Xem trên web" (mục 7.5).

Plan triển khai đầu tiên chỉ gồm giai đoạn 1; giai đoạn 2 có plan riêng sau ra mắt. Mục 6 thuộc trọn giai đoạn 1; ở mục 7 và 8, phần không ghi "GĐ2" là giai đoạn 1.

## 4. Kiến trúc lớp dùng chung

### 4.1 Vị trí và quy tắc chuyển đi được

- Component Vue ở `apps/admin/src/shared/ui/`, logic thuần và composable ở `apps/admin/src/shared/lib/`, khung trang ở `apps/admin/src/widgets/admin-shell/`.
- `shared/ui` và `shared/lib` chỉ nhận props, slots, emits; được import `vue`, `vue-router`, `@ranhduong/contracts`, `@ranhduong/geo`; **không** import `@/entities`, `@/features`, `@/widgets`, `@/pages`, `@/shared/api`. Luật ESLint `no-restricted-imports` cho hai thư mục này buộc quy tắc trên, để giai đoạn 3 chỉ là chuyển file.
- Class CSS `rd-admin-…` ở `packages/ui/src/admin.css` (nơi đã chọn ngày 2026-10-08), chỉ có tác dụng trong `.rd-admin` gắn ở khung trang.

### 4.2 Component

| Component | Vai trò | Giao diện chính |
| --- | --- | --- |
| `RdPageHeader` | Đầu trang thống nhất | props `title`, `crumbs?: { label, to }[]`; slots `status`, `meta`, `actions`; H1 có `tabindex="-1"` để nhận focus khi đổi trang |
| `RdStickyActions` | Thanh lưu dính đáy | prop `state` (dòng trạng thái lưu); slot nút; đo chiều cao bằng `ResizeObserver` và đặt `--admin-bar-height` cho `scroll-padding-bottom`; đệm `env(safe-area-inset-bottom)` |
| `RdConfirmDialog` + `useConfirm()` | Hỏi lại thay cho `window.confirm` | `confirm({ title, body, confirmLabel, tone }) → Promise<boolean>`; một hộp thoại dùng chung đặt trong khung trang |
| `RdDataTable` | Bảng có xếp, tiêu đề dính, khung xương, chuyển thành thẻ dưới 768px | props `columns: { key, label, sortable?, width?, hideBelow?: 1024 }[]`, `rows`, `rowKey`, `loading`; `v-model:sort`; slots `cell-{key}`, `card`, `empty` |
| `RdFilterBar` | Khung các ô lọc | slot ô lọc; prop `active: boolean`; emit `clear`; nút "Xoá bộ lọc" chỉ hiện khi `active` |
| `RdEmptyState` | Rỗng, không khớp lọc, lỗi | prop `kind: 'empty' \| 'no-match' \| 'error'`, `title`, `body?`; slot nút |
| `RdSkeleton` | Khung xương | props `rows`, `variant: 'table' \| 'card'`; dùng `.rd-skeleton` đã có |
| `RdFormSection` | Một mục form | props `id`, `title`, `badge?: 'ok' \| 'missing'`, `hint?` ("cần để kích hoạt"), `collapsible?`, `v-model:open` |
| `RdField` | Nhãn, gợi ý, lỗi, bộ đếm | props `label`, `hint?`, `error?`, `required?`, `count?: { value, max }`; slot nhận `{ id, describedBy, invalid }` để gắn vào ô nhập |
| `RdToast` + `useToast()` | Thông báo thành công ở đáy | `toast.show(message)`; một vùng `aria-live="polite"`; tự ẩn sau 4 giây, dừng khi rê chuột hoặc focus |
| `RdDrawer` | Ngăn trượt | `<dialog>` mở bằng `showModal`; prop `side: 'left'`; `v-model:open`; đóng bằng Esc, nền mờ hoặc khi đổi route |

### 4.3 Logic dùng chung

- `useUnsavedGuard({ dirty, kept, flush? })`: gọi `flush()` (nếu có) rồi chỉ hỏi lại khi `dirty && !kept`; dùng `onBeforeRouteLeave` với `useConfirm()` và `beforeunload` của trình duyệt. Thay ba bản tự viết ở `RdTemplateEditor`, `SeasonsPage` và phần còn thiếu ở form địa điểm.
- `listReturn`: lưu `{ query, scrollY }` theo từng danh sách (`places`, `templates`, `lists`) trong `sessionStorage`; đọc lại bằng schema Zod, giá trị lạ thì bỏ. Dùng cho breadcrumb, thanh bên và khôi phục vị trí cuộn sau khi dữ liệu đã tải.
- `activeSection(path)`, `pageTitle(route)` cho khung trang.

## 5. Khung trang và điều hướng

### 5.1 Menu

Nhóm "Nội dung": Địa điểm, Lịch trình mẫu, Danh sách gợi ý. Nhóm "Vận hành": Báo cáo, Mùa & giao diện. Import CSV (S21) thêm vào nhóm "Nội dung" khi làm xong. Mục đang mở: nền sáng 14%, vạch `--accent` 3px bên trái, chữ đậm, `aria-current="page"`; ở trang con (`/dia-diem/:id`) mục cha vẫn được đánh dấu. Email và nút Đăng xuất ở cuối thanh bên. Không có chế độ thu gọn thành dải icon.

### 5.2 Theo độ rộng

| Độ rộng | Điều hướng |
| --- | --- |
| Từ 1280px | Thanh bên 232px (`--admin-sidebar-w`), `position: sticky`, cao 100vh; không có thanh trên cùng |
| Dưới 1280px | Thanh trên 56px, không dính: nút menu 44px (`aria-label="Mở menu"`, `aria-expanded`) và chữ "Rành Đường · Quản trị"; menu trong `RdDrawer` bên trái |

### 5.3 Quy tắc dính và chồng lớp

- Mỗi trang tối đa một vùng dính phía trên chồng lên nội dung chính (tiêu đề bảng) và một vùng dính phía dưới (thanh lưu). Cột phụ dính bên cạnh không chồng lên nội dung chính nên được phép.
- Token `--z-sticky` 10, `--z-drawer` 30, `--z-toast` 40; hộp thoại dùng lớp trên cùng của `<dialog>`.
- Vùng dính đặt `scroll-padding` bằng đúng chiều cao của nó.

### 5.4 Bố cục nội dung

- Lề trang 32px từ 1280px, 24px ở 768–1279px, `--page-gutter` dưới 768px.
- Căn trái. Dưới 1280px trang danh sách rộng tối đa `--admin-content-max` 1280px, trình soạn `--admin-editor-max` 1200px; từ 1280px hai token là `none`, mọi trang (kể cả form danh sách gợi ý) dùng hết bề ngang vùng nội dung (đổi 2026-10-15 theo yêu cầu chủ dự án dùng màn lớn).
- Mọi trang dùng `RdPageHeader`; mỗi trang một nút chính. Breadcrumb dạng `Địa điểm / Quán Giả Lập`, link danh sách lấy query từ `listReturn`; mục thanh bên cũng vậy.

### 5.5 Truy cập khi đổi trang

`document.title` = "{tên trang} · Rành Đường Quản trị". Sau khi chuyển route, focus về H1 của `RdPageHeader`; chỉ đổi query thì giữ focus. Viền focus trong thanh bên và ngăn trượt dùng `--paper-raised`.

## 6. Danh sách địa điểm (`/dia-diem`)

### 6.1 Đầu trang và tab

Tiêu đề "Địa điểm", dòng phụ "{n} địa điểm", nút chính "Thêm địa điểm". Sáu tab trạng thái giữ nhãn và số đếm hiện tại, render bằng `rd-tabs`/`rd-tab` dạng link `?status=` có `aria-current`; điện thoại cuộn ngang.

### 6.2 Thanh lọc

Một hàng trên desktop: ô tìm (giữ cách tìm không dấu theo tên và tên khác), Cụm, Danh mục, Nguồn xác nhận, **Xếp** (Mới sửa, Lâu chưa sửa, Tên A→Z, Tên Z→A, Lâu chưa xác minh, Mới xác minh = `updated`, `-updated`, `name`, `-name`, `verified`, `-verified`; `-updated` mới, để bấm tiêu đề cột Cập nhật lần hai có chiều ngược lại). Nhãn `sr-only`, lựa chọn mặc định ghi rõ nghĩa. Điện thoại: ô tìm hết hàng, bốn ô chọn lưới 2 cột. Bấm tiêu đề cột vẫn xếp và đồng bộ với ô Xếp. "Xoá bộ lọc" xoá `q`, `zone`, `category`, `verify`, giữ tab và cách xếp. Dòng "Đang hiện {x} trong {y}" giữ `aria-live`.

### 6.3 Bảng và thẻ

| Cột | Nội dung | Xếp | Ẩn dưới 1024px |
| --- | --- | --- | --- |
| Địa điểm | Tên (link, cắt "…", `title` gồm tên và tên khác); dòng 2 "{danh mục chính, phụ} · {cụm hoặc Chưa chọn cụm}" | Có | |
| Trạng thái | `statusChip` hiện tại | | |
| Còn thiếu | `missingLabels(activationIssues)`: Vị trí, Giờ mở cửa, Nguồn xác nhận, Nguồn ảnh; rỗng thì "Đủ" kèm chấm `--status-ok` | | |
| Xác minh | Dòng 1 `verifySourceLabel`; dòng 2 `daysAgoText` hoặc "Chưa xác minh" | Có | Có (ở 768px cột Địa điểm cần khoảng 270px; vẫn xếp được bằng ô Xếp) |
| Ảnh | `photoCount` | | Có |
| Cập nhật | Thời gian tương đối từ `updatedAt` | Có | Có |
| Thao tác | Nút chính theo `primaryAction` và nút ⋯ mở `RdPlaceActionsDialog` | | |

- `table-layout: fixed`, khung bảng không cuộn ngang để tiêu đề dính theo trang.
- Rê chuột lên dòng đổi nền `--paper`; không làm cả dòng bấm được.
- Dưới 768px mỗi dòng thành thẻ: tên và chip trạng thái; danh mục · cụm; "Còn thiếu: …"; xác minh · số ảnh; nút chính và ⋯.

### 6.4 Trạng thái trang

Đang tải: `RdSkeleton` 6 dòng (4 thẻ trên điện thoại). Chưa có dữ liệu: "Chưa có địa điểm nào." và "Thêm địa điểm". Không khớp: "Không có địa điểm khớp bộ lọc." và "Xoá bộ lọc". Lỗi: câu lỗi của `listLoadError` với "Thử lại" hoặc "Đăng nhập lại". Tải lại sau hộp thoại giữ nguyên dòng đang hiện. Kết quả thao tác báo bằng `useToast()` thay cho khung báo đầu danh sách.

### 6.5 Không làm

Phân trang (API trả hết, lọc trong trình duyệt; xem lại khi quá khoảng 500 địa điểm), thao tác hàng loạt (chưa có endpoint), ảnh nhỏ trong bảng (danh sách chỉ có `photoCount`).

## 7. Form địa điểm (`/dia-diem/:id`)

### 7.1 Bố cục (GĐ1)

- Đầu trang: breadcrumb, H1 tên địa điểm hoặc "Thêm địa điểm", chip trạng thái, dòng đường dẫn công khai như hiện tại.
- Từ 1024px: form `minmax(0, 720px)` và cột phụ 300px dính `top: 24px`; từ 1280px form `minmax(0, 1fr)` và cột phụ `clamp(300px, 22vw, 400px)`. Dưới 1024px một cột: đầu trang, khung "Còn thiếu {n} điều kiện" có link tới mục, mục 1–7, các khung Xác minh, Trên web, Thông tin, thanh lưu.
- Khung khôi phục bản trên máy và khung báo lỗi giữ vị trí đầu form như hiện tại.

### 7.2 Các mục

1. **Thông tin cơ bản:** Tên\*, cảnh báo nghi trùng, Tên khác, Danh mục\*, Cũng phục vụ, Địa chỉ.
2. **Vị trí** (cần để kích hoạt): `RdLocationPicker`, Cụm và gợi ý cụm. GĐ2: sau khi kéo bản đồ làm ghim dời, hiện "Đã dời ghim · Hoàn tác" (khôi phục toạ độ trước đó) cho tới lần đổi kế tiếp.
3. **Giờ mở cửa** (cần để kích hoạt): ô dán và bảng 7 ngày như hiện tại. GĐ1: khi chưa có ca nào, hiện "Chưa nhập giờ mở cửa: các ngày đang để Đóng." (dữ liệu và cách lưu giữ nguyên). GĐ2: trên desktop mỗi ngày một hàng (ngày, loại, các ca).
4. **Đặc điểm:** Thẻ, Mức giá, Mái che, Thời gian tham quan, Thời điểm đẹp, Đi được bằng.
5. **Ghi chú thực tế:** bộ đếm "{n}/1000".
6. **Liên hệ.**
7. **Ảnh** (cần để kích hoạt): lưới ảnh nhỏ kèm chip "Có nguồn"/"Thiếu nguồn" và dòng nguồn. GĐ2: nút "Thêm ảnh" mở hộp chọn file, chọn xong mới hiện các ô nguồn của `RdPhotoUpload` (cùng ô, cùng kiểm tra).

"Nguồn xác nhận" chuyển sang khung Xác minh ở cột phụ, vẫn là trường của form và lưu bằng PUT.

### 7.3 Trường bắt buộc và lỗi (GĐ1)

- \* là bắt buộc để lưu; đầu form có dòng chú thích. Mục cần để kích hoạt có nhãn ở tiêu đề và chip "Đủ"/"Còn thiếu".
- Mọi ô dùng `RdField`, nên câu lỗi và gợi ý gắn với ô qua `aria-describedby`.
- Lỗi vẫn kiểm khi bấm lưu bằng `formToInput`. Ô đã báo lỗi được kiểm lại khi đổi giá trị bằng `remainingErrors(form, errors)` (gọi lại `formToInput`, chỉ giữ lỗi của các ô đang có lỗi), lỗi mất ngay khi ô đúng. Câu lỗi hiện bằng `rd-fade-up`.

### 7.4 Thanh lưu (GĐ1)

| Trạng thái | Nút |
| --- | --- |
| Nháp | [Bỏ thay đổi] (khi có thay đổi) · [Lưu nháp] · [Kích hoạt] (nền nhấn; tắt khi còn điều kiện thiếu, `aria-describedby` trỏ tới danh sách điều kiện) |
| Khác | [Bỏ thay đổi] (khi có thay đổi) · [Lưu thay đổi] (tắt khi không có thay đổi hoặc còn điều kiện thiếu) |

- Dòng trạng thái: "Có thay đổi chưa lưu (đã giữ trên máy này)", "Có thay đổi chưa lưu", "Đã lưu lúc HH:mm".
- "Bỏ thay đổi" hỏi bằng `useConfirm()` ("Bỏ các thay đổi chưa lưu? Form trở về bản đã lưu lúc HH:mm."), đồng ý thì form về bản đã lưu và xoá bản giữ trên máy.
- Lưu xong báo bằng `useToast()`; lỗi giữ cách hiện tại (khung báo đầu form, focus ô sai đầu tiên). Đang gửi thì tắt các nút.
- `useUnsavedGuard({ dirty, kept: localKept, flush: flushLocal })`.

### 7.5 Cột phụ (GĐ1)

1. **Điều kiện kích hoạt:** `activationChecklist(issues)` trả 4 dòng (Vị trí, Giờ mở cửa, Nguồn xác nhận, Nguồn ảnh) với ✓/✗ và link tới `id` của mục; đủ thì "Đủ điều kiện kích hoạt" (nháp) hoặc "Đủ điều kiện hiển thị".
2. **Xác minh:** ô chọn Nguồn xác nhận; "Xác minh lần cuối: {ngày} ({n} ngày trước)" hoặc "Chưa xác minh"; nút "Đánh dấu đã xác minh".
3. **Trên web:** chip trạng thái và các nút theo `statusActionsFor`/`canVerify` (Ẩn khỏi web, Hiện lại, Đã đóng cửa, Mở lại, Xoá nháp), mở `RdPlaceActionsDialog` qua hàm thuần `toPlaceSummary(place)`. **Các nút trạng thái tắt khi có thay đổi chưa lưu**, kèm dòng "Lưu thay đổi trước". Xong thì tải lại địa điểm; xoá nháp xong thì về danh sách theo `listReturn` và báo "Đã xoá nháp {tên}."
4. **Thông tin:** cập nhật lúc HH:mm ngày; "Xem trên web ↗" khi đang hiển thị, URL từ `VITE_WEB_BASE` (mặc định `http://localhost:3100`) + `/{city}/dia-diem/{slug}`.

## 8. Soạn lịch trình mẫu (`/lich-trinh/:id`)

### 8.1 Đầu trang và thông tin (GĐ1)

- `RdPageHeader`: breadcrumb "Lịch trình mẫu / {tên}", H1 là tên lịch trình (chưa có thì "Lịch trình mới"), chip "Nháp"/"Đang công khai", dòng phụ "{n} ngày · {m} điểm · {phương tiện} · {nhịp độ}", nút "✕ {x} lỗi · ⚠ {y} nhắc" nhảy tới vấn đề đầu tiên (`firstIssueTarget(analysis)`: mở điểm đó, cuộn và focus).
- Khung "Thông tin lịch trình" là `RdFormSection` gập được: lịch trình mới mở sẵn; đã có thì gập, hiện một dòng tóm tắt. Bên trong giữ đủ các ô hiện tại và phần Google.

### 8.2 Bố cục (GĐ1)

- Từ 1024px: hai cột. Trái là lịch trình theo ngày (co giãn); phải là cột 340px (từ 1280px `clamp(340px, 24vw, 440px)`) dính với tab `rd-tabs` Kho địa điểm, Bản đồ (GĐ2), Xem trước. Bỏ bố cục ba cột từ 1200px.
- Dưới 1024px: một cột với tab Lịch trình, Kho, Bản đồ (GĐ2), Xem trước; trên điện thoại chỉ sửa nhanh (ui-spec §12).

### 8.3 Điểm dừng dạng hàng gọn (GĐ1)

- Hàng: số thứ tự, khoảng giờ, tên, "{danh mục} · {phút dừng}'", huy hiệu "✕ {n}" và "⚠ {n}" (có chữ cho trình đọc màn hình), nút mở rộng (`aria-expanded`, `aria-controls`). Giữa hai hàng có dòng "{n} phút di chuyển (ước lượng)".
- Mỗi lần mở một điểm; điểm đang mở có viền `--ink` 2px. Khi mở: giờ đến, giờ đi, thời gian dừng, loại điểm, "Đã sửa tay" và "Tính lại tự động", ghi chú, đổi địa điểm, chuyển ngày, [↑ Lên] [↓ Xuống] [Bỏ điểm], các lỗi và nhắc của điểm.
- Lỗi cấp ngày dưới tiêu đề ngày. Nút chữ "Bỏ ngày {d}" ở tiêu đề ngày (menu ⋯ chỉ có một mục thì không cần), hỏi bằng `useConfirm()` khi ngày còn điểm.
- Sau Lên, Xuống, Chuyển ngày: focus về nút vừa bấm của đúng điểm, vùng `aria-live` báo "Đã chuyển {tên} lên vị trí {n}, ngày {d}".
- Ô "Giờ đi" giữ ô chữ `HH:mm` vì phải nhận `24:00` (runbook template-editor mục 4). GĐ2: thêm gợi ý "HH:mm, nhận 24:00".

### 8.4 Kéo thả (GĐ2)

Chỉ bắt đầu kéo từ tay cầm ⠿ (`aria-hidden`, không focus được); hàng đang kéo mờ 50%; vạch `--ink` 2px chỉ chỗ thả theo nửa trên/dưới của hàng (`dropIndex(pointerY, rowRect, index)`); thả xong các hàng dịch bằng `TransitionGroup` 200ms. Bàn phím và cảm ứng dùng nút. Thứ tự vẫn lưu bằng PUT. Kho địa điểm kéo bằng cùng tay cầm.

### 8.5 Kho địa điểm

GĐ1: bộ lọc giữ nguyên; hàng gọn gồm tên, danh mục, chip trạng thái, thời gian dừng, [Thêm]; chỗ ẩn, nghi ngờ, đã đóng bị tắt kèm lý do. GĐ2: dòng "Đã có ở Ngày {n}" (`addedIn(days, placeId)`).

### 8.6 Bản đồ tuyến (GĐ2)

MapLibre tải khi mở tab Bản đồ; chip "Ngày 1…Tất cả"; ghim đánh số dùng `rd-pin`, nối thẳng bằng nét đứt theo thứ tự; ghi chú "Nối thẳng theo thứ tự, không phải đường đi thật."; bấm ghim mở điểm tương ứng; điểm đang chọn phóng 1.25. Không thêm khoảng cách hay thời gian mới. Điểm không có toạ độ không vẽ và có dòng ghi chú.

### 8.7 Lưu và công khai (GĐ1)

| Trạng thái | Nút trên `RdStickyActions` |
| --- | --- |
| Nháp | [Bỏ thay đổi] · [Lưu nháp] · [Công khai lịch trình] (tắt khi còn lỗi hoặc chưa có tên, kèm lý do "Còn {x} lỗi" hoặc "Chưa có tên") |
| Đang công khai | [Bỏ thay đổi] · [Chuyển về nháp] · [Lưu và công khai] |

- Công khai lần đầu hỏi: "Trang /da-lat/lich-trinh/{slug} sẽ hiện trên web và trong sitemap; slug giữ cố định từ giờ." Chuyển về nháp hỏi: "Lịch trình sẽ thôi hiện trên web." Quyết định có hỏi hay không là hàm thuần `publishConfirm(template, target)`.
- `useUnsavedGuard({ dirty, kept: localKept })` thay đoạn tự viết hiện tại; khung khôi phục ghi giờ đã giữ.
- Enter trong form vẫn không lưu hay công khai.

## 9. Giao diện, chuyển động, truy cập

### 9.1 Nền giao diện (trong `.rd-admin`)

- Chữ: bảng và thông tin phụ 14px/1.5; nhãn 14px/600; gợi ý 13px; H1 Lora 26px (22px dưới 768px); tiêu đề mục 17px/700. Ô nhập 16px.
- Nút: mọi `.rd-btn` cao 44px; chính nền `--ink`; nhấn chỉ cho "Kích hoạt"; viền cho nút phụ; thêm `rd-btn--ghost` (chữ, gạch chân khi rê) cho "Bỏ thay đổi", "Xoá bộ lọc". Mỗi vùng một nút chính.
- Bo góc, viền, bóng: token sẵn có; chỉ toast và ngăn trượt dùng `--shadow-float`.
- Token mới: `--z-sticky`, `--z-drawer`, `--z-toast`, `--admin-sidebar-w`, `--admin-content-max`, `--admin-editor-max`, `--admin-bar-height`.

### 9.2 Chuyển động

| Tương tác | Hiệu ứng | Thời lượng, easing | Giảm chuyển động |
| --- | --- | --- | --- |
| Bấm nút | `scale` 0.98 (đã có) | 140ms `--ease-out` | Tắt |
| Rê chuột nút, dòng, menu (chỉ `hover: hover`) | Đổi nền/viền | 140ms | Đổi ngay |
| Viền focus | Không animate | 0 | — |
| Tab | Màu chữ, gạch chân (đã có) | 200ms | Đổi ngay |
| Ngăn trượt | `translateX(-100%)` → 0; nền mờ `opacity` | 250ms `--dur-panel`; nền 200ms | Hiện ngay |
| Hộp thoại | `opacity` và `scale` 0.98 → 1 bằng `@starting-style`; đóng nhanh hơn | Mở 200ms (`--dur-standard`), đóng 140ms (`--dur-micro`) | Hiện ngay |
| Toast | `translateY(8px)` → 0 và `opacity` | 200ms | Hiện ngay |
| Câu lỗi, khung báo | `rd-fade-up` (đã có) | 200ms | Hiện ngay |
| Mở/gập mục, mở điểm dừng | Nội dung `opacity` và `translateY(6px)`; chiều cao không animate | 200ms | Hiện ngay |
| Đổi chỗ điểm dừng (GĐ2) | `TransitionGroup` move | 200ms `--ease-out` | Nhảy thẳng |
| Kéo (GĐ2) | Hàng kéo `opacity` 0.5; vạch thả `opacity` | Vạch 100ms | Hiện ngay |
| Ghim đang chọn (GĐ2) | `scale` 1.25 | 200ms | Đổi ngay |
| Khung xương | Nhấp nháy (đã có) | 1,6 giây | Đứng yên |

Không có hiệu ứng chuyển trang, dấu ✓ chạy trên nút lưu, hay dòng bảng hiện lần lượt. Tối đa 2 hiệu ứng cùng lúc (ui-spec §8). Công tắc `prefers-reduced-motion` trong `tokens.css` giữ nguyên.

### 9.3 Truy cập

Tương phản WCAG AA; viền focus thấy được ở mọi nền; vùng bấm 44×44px, cách 8px; đúng thẻ HTML, nút chỉ có icon có `aria-label`; hộp thoại và ngăn trượt dùng `<dialog>`, đóng thì trả focus; lỗi gắn với ô qua `RdField`; vùng dính không che ô đang focus; đổi trang đổi `title` và focus H1. Chữ tiếng Việt: line-height từ 1.3 cho chữ có dấu chồng; nhãn nhóm in hoa giãn chữ 0.04em.

## 10. Việc liên quan ngoài S28

- **Story backend ảnh (chưa đánh số):** xoá ảnh, sắp xếp, chọn ảnh bìa cần endpoint và contract mới; hiện ảnh "Thiếu nguồn" nhập từ nguồn khác không sửa hay xoá được trong admin.
- **ui-spec §12** cập nhật trong GĐ1: lịch trình hai cột có tab thay vì ba cột; thanh lưu dính cho cả hai form; cột phụ của form địa điểm; nút trong admin cao 44px (ui-spec §4 ghi nút chính, nút nhấn 52px cho web khách). Bản design system trên claude.ai do chủ dự án cập nhật theo.
- **decisions.md** thêm dòng: vị trí `shared/ui` và luật lint chuyển đi được; mốc 1280px cho ngăn trượt; không thêm thư viện UI hay kéo thả; `VITE_WEB_BASE`.

## 11. Kiểm thử

**Unit test (Vitest, hàm thuần trong `lib`/`model`, viết test trước theo vùng TDD):**

- Khung trang: `activeSection`, `pageTitle`, `listReturn` (đọc, ghi, dữ liệu lạ, vị trí cuộn).
- Lớp chung: quyết định của `useUnsavedGuard` (`shouldConfirmLeave(dirty, kept)`), hàng đợi `useConfirm`/`useToast` (một hộp thoại tại một thời điểm, tự ẩn), cột hiện theo `hideBelow`.
- Danh sách: `missingLabels`, `hasActiveFilters`, `clearFilters`, ô Xếp và tiêu đề cột.
- Form địa điểm: `activationChecklist`, `remainingErrors`, `toPlaceSummary`, tắt thao tác trạng thái khi có thay đổi; GĐ2 trạng thái "Hoàn tác" ghim.
- Lịch trình: `firstIssueTarget`, `stopSummary`, `publishConfirm`; GĐ2 `dropIndex`, `addedIn`.

**Trên trình duyệt** ở 320, 390, 768, 1024, 1280, 1440px, bàn phím và giảm chuyển động: ngăn trượt, focus thanh bên, tiêu đề bảng dính, không cuộn ngang, quay lại danh sách giữ bộ lọc và vị trí cuộn, hai cột form địa điểm, thanh lưu không che ô đang nhập, rời trang khi bộ nhớ trình duyệt bị chặn, thao tác trạng thái trong form, lịch trình hai cột và kéo thật từ kho ở 1024 và 1440px, đổi chỗ bằng bàn phím, công khai và chuyển về nháp có hỏi lại.

**Điều kiện để kiểm trên trình duyệt:** admin cần phiên đăng nhập. Cần một trong hai: Claude in Chrome đã kết nối với phiên admin của chủ dự án, hoặc chủ dự án cho phép tạo phiên thử cục bộ. Chưa có thì báo rõ phần chưa kiểm, không ghi là đã kiểm.

## Phụ lục: kết quả kiểm tra ngày 14/10/2026

Kiểm bằng đọc code, chưa xem trên trình duyệt (lý do ở mục 11). Đường dẫn tính từ `apps/admin/src/`.

| # | Mức | Chỗ | Vấn đề | Bằng chứng | Xử lý |
| --- | --- | --- | --- | --- | --- |
| 1 | P1 | Thanh bên | Viền focus `--ink` trên nền `--ink` | `app/App.vue:46,52` | 5.5 |
| 2 | P1 | Dưới 768px | Thanh bên thành 3–4 hàng 44px phía trên form (suy từ CSS) | `app/App.vue:59-66` | 5.2 |
| 3 | P1 | Quay lại danh sách | Thanh bên không giữ query; form không có link quay lại | `app/App.vue:28`, `RdPlaceEditor.vue:94` | 4.3, 5.4 |
| 4 | P1 | Lịch trình | Nút lưu chỉ ở cuối trang | `RdTemplateEditor.vue:85` | 8.7 |
| 5 | P1 | Lịch trình | Mọi điểm dừng luôn mở hết | `RdTemplateTimeline.vue:27-46` | 8.3 |
| 6 | P1 | Lịch trình 768–1199px | Một panel mỗi lúc, không kéo từ kho được | `RdTemplateEditor.vue:79,103` | 8.1, 8.2 |
| 7 | P1 | Form địa điểm | Không có "Bỏ thay đổi" | `RdPlaceEditor.vue:309-323` | 7.4 |
| 8 | P1 | Form địa điểm | Không chặn rời trang khi không giữ được bản trên máy | so với `SeasonsPage.vue:8` | 4.3, 7.4 |
| 9 | P1 | Form địa điểm | Không thấy ngày xác minh, không có thao tác trạng thái | `place-admin.ts:81` | 7.5 |
| 10 | P1 | Danh sách | `activationIssues` có trong dữ liệu nhưng không hiện | `place-admin.ts:226` | 6.3 |
| 11 | P2 | Danh sách 390px | Bảng 8 cột cuộn ngang, cột thao tác khuất | `RdPlaceList.vue:216` | 6.3 |
| 12 | P2 | Danh sách | Không quay lại được "Mới sửa" | `filters.ts:28`, `RdPlaceList.vue:55` | 6.2 |
| 13 | P2 | Danh sách | Không có "Xoá bộ lọc" | `RdPlaceList.vue:144` | 6.2, 6.4 |
| 14 | P2 | Danh sách | Thông báo ở đầu danh sách, khuất khi đã cuộn | `RdPlaceList.vue` | 6.4 |
| 15 | P2 | Danh sách | Đang tải chỉ là một dòng chữ | `RdPlaceList.vue:135` | 6.4 |
| 16 | P2 | Form địa điểm | 9 mục một cột 720px; danh sách điều kiện chỉ ở cuối | `RdPlaceEditor.vue:327,299` | 7.1, 7.5 |
| 17 | P2 | Giờ mở cửa | Chưa có giờ hiện như đóng cả tuần | `form.ts` `emptyForm` | 7.2 |
| 18 | P2 | Thanh lưu | Cao khoảng 118px trên điện thoại (suy từ CSS), nút 44/52px lẫn lộn | `components.css` `.rd-action-bar` | 7.4, 9.1 |
| 19 | P2 | Bản đồ ghim | Kéo bản đồ dời ghim không hoàn tác được | `geo-view.ts` `locationAfterMove` | 7.2 (GĐ2) |
| 20 | P2 | Ảnh | Form upload luôn mở; không xoá/sắp/chọn bìa (API chưa có) | `admin-media.controller.ts` | 7.2 (GĐ2), mục 10 |
| 21 | P2 | Lịch trình | H1 không phải tên lịch trình | `RdTemplateEditor.vue:56` | 8.1 |
| 22 | P2 | Kéo thả | Cả thẻ kéo được, không có vạch thả | `RdTemplateTimeline.vue:27` | 8.4 (GĐ2) |
| 23 | — | Giờ đi | Rút lại: ô chữ là có chủ ý để nhận `24:00` | runbook template-editor mục 4 | 8.3 |
| 24 | P2 | Lịch trình | `window.confirm` khi bỏ ngày | `RdTemplateEditor.vue:49` | 8.3 |
| 25 | P2 | Lịch trình | Chưa có bản đồ tuyến dù có toạ độ | `itinerary-admin.ts:43` | 8.6 (GĐ2) |
| 26 | P2 | Design system | Không có component admin dùng chung | CSS scoped của ba trang | Mục 4, 9 |
| 27 | P2 | Form địa điểm | Chỉ lỗi ô Tên gắn `aria-describedby` | `RdPlaceEditor.vue` | 7.3 |
