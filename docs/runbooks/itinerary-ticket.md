# S30: Vé lịch trình dạng ảnh

Nhánh `feat/S30-itinerary-ticket`. Mỗi lịch trình mẫu có một vé dạng ảnh kiểu vé tàu theo Spec UI mục 9: ảnh story 1080×1920 để lưu hoặc gửi, ảnh OG 1200×630 làm ảnh xem trước khi dán link. Lịch trình của khách (`/l/{shareId}`) dùng lại phần này ở S39.

## Luồng sinh vé

1. Web gọi `GET /v1/cities/{city}/itineraries/templates/{slug}/ticket.png?format=story|og`. Crawler Zalo/Messenger gọi bản `og` qua thẻ `og:image`. Khách bấm "Tạo vé để chia sẻ" thì web gọi bản `story`.
2. API dựng nội dung vé từ dữ liệu công khai của mẫu và thành phố: tên, số ngày, mùa, phương tiện, tối đa 8 điểm còn công khai, đường dẫn và QR. Nội dung được băm thành `hash` (32 ký tự hex), ảnh nằm ở `tickets/{hash}/{story|og}.png` trên bucket công khai `R2_BUCKET`. URL và khoá đều không chứa ObjectId.
3. Có ảnh thì trả ngay. Chưa có thì xếp job `itinerary.ticket` (hàng đợi BullMQ `itinerary-ticket`, jobId `ticket-{hash}`, nhiều request cùng nội dung chỉ thành một job). Sau đó API đọc lại R2 mỗi 250 ms, tối đa 4 giây với OG và 8 giây với story.
4. Worker dựng cả hai ảnh bằng Satori + resvg (khoảng 0,1–0,3 giây mỗi vé), ghi R2, đặt `Itinerary.ticketKey = tickets/{hash}` (không đổi `updatedAt`) và xoá hai ảnh của khoá cũ. Job thử tối đa 3 lần; job xong bị xoá khỏi hàng đợi, job hỏng giữ 7 ngày.

Vé chỉ sinh lại khi nội dung vé đổi: sửa mẫu, đổi tên điểm, ẩn điểm, đổi tên hay màu nhấn thành phố, đổi `SITE_URL`, hoặc tăng `TICKET_RENDER_VERSION`. Vé không có trường vị trí nên không bao giờ chứa nơi ở của khách.

## Endpoint và cache

| Tình huống | Phản hồi |
| --- | --- |
| Có ảnh | `200 image/png`, `Cache-Control: public, max-age=3600` |
| OG chưa in xong sau 4 giây, hoặc Redis/R2 lỗi | `200 image/png` là `og-default.png`, `Cache-Control: no-store` (CDN không giữ, lần sau có vé thật) |
| Story chưa in xong sau 8 giây, hoặc Redis/R2 lỗi | `503`, `Cache-Control: no-store`, `Retry-After: 3`, JSON `{ code: "INTERNAL_ERROR", message: "Vé đang được in, thử lại sau vài giây nhé." }`; web hiện "Thử lại" |
| Mẫu nháp, `unlisted`, sai thành phố, không có | `404 NOT_FOUND` |
| `format` thiếu hoặc sai, slug sai định dạng | `400 VALIDATION_FAILED` |

URL ảnh cố định theo slug, không có tham số phiên bản. Cloudflare giữ ảnh tối đa 1 giờ. Facebook giữ ảnh xem trước theo URL, nên sau khi sửa mẫu đã chia sẻ, vào [Sharing Debugger](https://developers.facebook.com/tools/debug/) và bấm "Scrape Again" để Messenger lấy vé mới.

## Cấu hình

- API và worker cần `SITE_URL`, là URL web khách in trên vé (QR và đường dẫn rút gọn): production `https://ranhduong.vn`, staging `https://staging.ranhduong.vn`, local mặc định `http://localhost:3100`. Đổi `SITE_URL` thì mọi vé sinh lại.
- Worker phải chạy (`pnpm --filter @ranhduong/api worker`, cùng image với API) thì mới có vé. Không có worker thì OG luôn là ảnh mặc định và story luôn 503.
- Image Docker của API/worker (S02) phải chép thư mục `apps/api/assets` (font và `og-default.png`) và gói `packages/ui` (màu đọc từ `tokens.css`). Thiếu thì worker báo `ENOENT` khi dựng vé.
- Bucket: dùng `R2_BUCKET` công khai đã có; không cần CORS cho bucket vì web tải ảnh qua API (CORS theo `WEB_ORIGINS`).
- Local: image `minio/minio` trong compose hiện không tải được; dùng S3 local tương thích như S06, ví dụ `docker run -d --name ranhduong-s3 -p 9000:9000 -e RUSTFS_ACCESS_KEY=minio -e RUSTFS_SECRET_KEY=minio12345 rustfs/rustfs:1.0.0`, rồi `pnpm --filter @ranhduong/api media:setup:local`.

## Font, màu và ảnh mẫu

- Font tĩnh có tiếng Việt (Lora Bold, Be Vietnam Pro 400/600/700, Patrick Hand) nằm ở `apps/api/assets/ticket/fonts`, chỉ dùng cho vé. Nguồn ghim theo commit, SHA-256 và giấy phép SIL OFL 1.1 ghi ở `apps/api/assets/ticket/README.md`; trang `/ghi-nguon#font-ve` ghi nguồn cho khách.
- Màu đọc từ `packages/ui/src/tokens.css`; màu nhấn (chip mùa, điểm cuối chuyến) là `City.accent`.
- Đổi bố cục, nhãn, font hoặc nâng `satori`/`@resvg/resvg-js`/`uqr`: tăng `TICKET_RENDER_VERSION` trong `apps/api/src/modules/tickets/ticket-data.ts`, rồi xem ảnh mẫu:

```bash
pnpm --filter @ranhduong/api build
pnpm --filter @ranhduong/api ticket:sample --out <thư mục>
```

Lệnh ghi `story.png`, `og.png` (2 ngày, 5 điểm) và `story-dai.png`, `og-dai.png` (5 ngày, tiêu đề 200 ký tự có emoji, tên điểm dài) từ dữ liệu giả, không đọc database hay R2. Emoji không có trong font nên bị bỏ (worker ghi log "Vé thiếu glyph emoji").

## Trên web

- Trang `/{city}/lich-trinh/{slug}`: `og:image` và `twitter:image` là URL vé OG; trang lỗi 503 dùng `/og-default.png`.
- Mục "Rủ bạn đi cùng" có nút nét đứt "Tạo vé để chia sẻ"; thanh đáy (điện thoại) và khối chỉ đường (desktop) có nút tròn nét đứt cùng chức năng. Chưa có JavaScript thì nút mở thẳng ảnh story.
- Màn xem trước là `<dialog>`: khung chờ "Đang in vé…", rồi ảnh vé. Máy nhận gửi file (`navigator.canShare({ files })`) thì có "Gửi vé", gửi ảnh kèm câu "Mình đi theo lịch này nè, bạn đi chung không?" và link. Không nhận thì có "Lưu ảnh" (tải `ve-lich-trinh-{slug}.png`) và "Sao chép link"; clipboard bị chặn thì hiện ô link để chép tay. Huỷ bảng chia sẻ không báo thành công. Đóng màn thì thu hồi object URL.
- Đếm `ticket_create`, `ticket_share` và lượt vào có `utm_source=ticket` thuộc S41.

## Kiểm link xem trước trên Zalo, Messenger

1. Mở trang mẫu trên môi trường crawler vào được, bấm "Tạo vé để chia sẻ" một lần (hoặc gọi URL OG) để vé có sẵn.
2. Messenger: dán link vào Sharing Debugger, kiểm `og:image` là URL vé, ảnh 1200×630 hiện đúng; "Scrape Again" nếu đã từng scrape. Dán link vào một cuộc trò chuyện Messenger.
3. Zalo: dán link vào cuộc trò chuyện, chờ thẻ xem trước hiện ảnh vé.
4. Quét QR trên ảnh story bằng điện thoại: mở đúng trang mẫu có `?utm_source=ticket`.

Staging đặt basic auth (technical-design mục 13) nên crawler của Facebook và Zalo không đọc được trang. Muốn thử trên staging thì tạm mở trang mẫu và `api.staging…/v1/…/ticket.png` khỏi basic auth, hoặc thử trên production sau khi ra mắt.

## Lỗi thường gặp

| Dấu hiệu | Kiểm |
| --- | --- |
| OG luôn là ảnh mặc định, story luôn 503 | Worker có chạy không; log API có "Chưa lấy được vé …" (Redis/R2 lỗi); job failed trong hàng đợi `itinerary-ticket` |
| Endpoint trả 500 | Dữ liệu vé không hợp lệ: `SITE_URL` sai, hoặc tên thành phố rỗng. Đọc log API |
| Chữ trên vé thiếu dấu hoặc trống | Log worker "Vé thiếu glyph": font hoặc ký tự ngoài bộ font; emoji bị bỏ là bình thường |
| Ảnh cũ còn trên R2 | Ảnh của khoá cũ bị xoá khi job mới chạy xong; job lỗi giữa chừng thì lần sinh sau xoá tiếp. Mỗi lịch trình chỉ xoá khoá của chính nó |

## Kiểm tra đã chạy

- `pnpm turbo run lint typecheck test build --force`: 20/20 task xanh. Vitest: API 458, contracts 442, admin 218, web 150, geo 37.
- `pnpm --filter @ranhduong/web test:ssr`: 84/84 xanh, gồm `og:image`/`twitter:image` là URL vé, ảnh mặc định khi trang lỗi, link "Tạo vé để chia sẻ" và mục font ở `/ghi-nguon`.
- Chạy thật local (API, worker, MongoDB, Redis, RustFS S3, mẫu và địa điểm "Giả Lập" tạm, đã xoá sau khi kiểm):
  - Lần gọi OG đầu: 200 vé thật sau 0,3 giây; story đã có sẵn.
  - Tắt worker và đổi tiêu đề: OG 200 `no-store` đúng `og-default.png` sau 4 giây; story 503 `Retry-After: 3` sau 8 giây.
  - Bật worker: ra vé mới, `ticketKey` đổi, hai ảnh của khoá cũ bị xoá, `updatedAt` của mẫu không đổi.
  - QR trên ảnh thật và ảnh mẫu giải mã ra đúng link có `utm_source=ticket` (jsQR).
- Chrome headless, 390px giả lập thiết bị và 1280px:
  - Không tràn ngang; thanh đáy có nút Chia sẻ, nút vé nét đứt (52px) và Chỉ đường.
  - Mở màn xem trước từ cả hai nút; có "Gửi vé" khi trình duyệt nhận file; giả lập không hỗ trợ thì có "Lưu ảnh" (blob, đúng tên file) và "Sao chép link".
  - Esc và nút Đóng đóng màn, focus về nút đã mở.
  - Giảm chuyển động thì khung chờ không nhấp nháy; worker tắt thì sau khoảng 8 giây hiện câu chờ và "Thử lại", bật worker rồi Thử lại thì ra vé.
  - Console không có lỗi JavaScript; chỉ có dòng mạng 503 của trạng thái chờ.

## Còn chờ

- S02: R2 staging/production, container worker, `SITE_URL` theo môi trường, chép `apps/api/assets` vào image.
- Thử link xem trước thật trên Zalo và Messenger, quét QR bằng điện thoại.
- Thử trên Android và iPhone thật: bảng chia sẻ kèm file ảnh (Zalo, Messenger, Instagram), "Lưu ảnh" trên Safari.
- Theo dõi Sentry 24 giờ trên staging.
- S39 vé cho `/l/{shareId}` (dùng `TicketsService.ensure`), S41 đếm lượt tạo/chia sẻ vé và lượt vào từ vé.
