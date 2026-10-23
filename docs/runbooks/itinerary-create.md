# S38 — Màn tạo lịch trình

Route `/{city}/tao-lich-trinh` (Đà Lạt: `/da-lat/tao-lich-trinh`) render SSR, index/canonical/Open Graph/Breadcrumb qua `usePageSeo`, SWR 1 giờ. Sitemap pages lấy URL từ API SEO theo các thành phố active. Lỗi city 404/503 không cache. Lối vào nằm ở mục lịch trình trang chủ và cuối trang mẫu.

## Form và API

Feature `itinerary-create` có 7 nhóm lựa chọn: 1–5 ngày, ngày đi, phương tiện, đi cùng ai, tối đa 3 gu, nhịp độ, nơi ở tùy chọn. Nhãn/enum dùng contracts hiện có; `createItineraryRequestSchema(city.mapBounds)` kiểm trước gửi. Ngày mặc định và min được lấy trên client theo giờ Việt Nam để HTML SWR không giữ ngày cũ; kiểm lại ngày ở mỗi lần gửi.

`createGuestItinerary` chỉ được gọi sau bấm tạo, POST đến API S37 với `credentials: include`, `retry: 0`, timeout 5 giây và AbortSignal. Trong lúc gửi, khóa lựa chọn/nút gửi, hiện skeleton timeline; chống bấm trùng. Lỗi mạng giữ toàn bộ lựa chọn và cho Thử lại. `RATE_LIMITED` có lời nhắc riêng. `NOT_ENOUGH_PLACES` chỉ nhận suggestions qua `NotEnoughPlacesDetails`; bấm gợi ý đổi đúng số ngày hoặc bỏ gu rồi thử tạo ngay. Không hiển thị thông báo thô từ server.

Thành công khóa các lựa chọn và điều hướng tới `/l/{shareId}`; nếu điều hướng lỗi thì lần Thử lại chỉ mở lịch vừa tạo, không POST lại và không kiểm lại ngày đi của lịch đã tạo (kể cả khi qua nửa đêm). **Trang hiển thị `/l/{shareId}`, copy, vé khách và chỉnh sửa thuộc S39/S40, chưa được S38 triển khai.**

## Nơi ở

- GET city bổ sung `zones[].center` tùy chọn. API lấy trung điểm bbox vòng ngoài polygon đang có, không hard-code và không dùng tọa độ nơi ở thật. Đây là ước lượng giữa khu, không hứa là một địa chỉ hay nằm trong lòng polygon lõm.
- Chọn cụm thay ghim cũ bằng center đó. Cụm cũ không có center thì không hiển thị nút chọn; vẫn có bản đồ hoặc Bỏ qua. Bỏ qua xóa hẳn `stayLocation` khỏi request.
- MapLibre/CSS/worker chỉ import khi bấm mở bản đồ. Chạm để ghim hoặc dùng mũi tên dịch bản đồ rồi bấm Ghim tại giữa bản đồ. Kiểm bounds, có hai ngón tay/cooperative gestures, attribution, lỗi và retry khi bản đồ đã tải được thư viện. Lỗi tải chính component có fallback sau tối đa 15 giây. Lỗi chunk thì vẫn chọn cụm/bỏ qua được; không reload trang làm mất form. Khi đang tải/lỗi/đã tháo map, click không đổi ghim; map inert trong lúc gửi hoặc sau khi lịch đã tạo.
- State nơi ở chỉ nằm trong bộ nhớ component; không ghi URL/localStorage/Nuxt state/analytics. Chỉ gửi trong POST. S37 làm tròn 0,005° trước xếp tuyến/lưu và không trả trong DTO công khai.
- Đóng bản đồ/đổi cụm/rời trang dọn map, marker, observer, timer. Rời trang hủy request và bỏ kết quả trả muộn.

## Kiểm tra local (24/10/2026)

```powershell
pnpm turbo run lint typecheck test build
pnpm --filter @ranhduong/web test:ssr
```

- Bản cuối sau review: 20/20 task workspace đạt; 621 contracts, 38 geo, 249 admin, 214 web, 612 API test đạt (1.734 test), gồm 9 test flow tạo lịch trình. Lint/typecheck/build đều đạt.
- 115 test production SSR đạt, gồm route S38/index/canonical/SWR, đủ nhóm lựa chọn, không canvas/worker ở SSR, lối vào, sitemap và 404/503 no-store/hồi phục.
- Test flow mới: ngày Việt Nam qua nửa đêm, ngày cũ/ghim ngoài bounds không POST, giới hạn/bỏ gu, thay ghim bằng cụm/bỏ nơi ở, giữ lựa chọn/retry, details lỗi sai cấu trúc, suggestions, rate limit, pending/chống POST trùng và chuyển shareId.
- HTTP test city kiểm tâm hai cụm giả [0.25,0.25]/[0.75,0.75]; sitemap có route tạo. Không ghi dữ liệu địa điểm thật.
- Browser automation chưa khả dụng: inventory không có browser, mở Chrome trả `Browser is not available: chrome`. Chưa xác minh trực quan 390px/desktop, tương tác map thật hoặc bàn phím trong trình duyệt; CSS dùng breakpoint 900px, tokens, vùng bấm 44px và giảm chuyển động.
- Review độc lập: không có Critical; sửa lỗi giữ đường dẫn đã tạo nhưng vẫn cho sửa input/kiểm lại ngày khi retry điều hướng (regression test đỏ → xanh). Hai nhánh lỗi UI cũng đã sửa: map lỗi vẫn nhận click ở viền, và lỗi tải component thiếu fallback; theo CLAUDE.md, UI kiểm bằng lint/typecheck/SSR, browser còn chờ. Các mục để ngoài scope được cân nhắc: route S39 và idempotency server không mở rộng trong S38; nghiệm thu triển khai ghi rõ bên dưới.

## Nghiệm thu triển khai còn chờ

1. Browser 390px và desktop: không tràn ngang; focus/touch targets; chọn/bỏ gu và date picker; map click/keyboard/ngoài bounds/lỗi tile/retry/đóng; giảm chuyển động.
2. Chạy API S37 thật cùng MongoDB/Redis, cấu hình `WEB_ORIGINS` và cookie domain/Secure đúng; thử thiếu điểm, áp dụng gợi ý, offline rồi retry, 429; kiểm `gid` và POST duy nhất khi bấm liên tiếp.
3. Khi S39 có trang đích, kiểm tạo → `/l/{shareId}` và nơi ở không xuất hiện trong HTML/JSON/ảnh vé.
4. CI remote, staging, Android/iPhone thật và Sentry 24 giờ; chưa merge/deploy trong phiên này.
