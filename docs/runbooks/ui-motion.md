# S25 — Chuyển động

## Hành vi

Lịch trình `/da-lat/lich-trinh/{slug}` giữ chữ, giờ và liên kết hiển thị từ SSR. Mốc trong viewport khi mount đứng yên. Các mốc ngoài viewport chỉ được tăng cường bằng JavaScript khi có IntersectionObserver; cuộn tới lần đầu thì vòng số hiện `scale(0.4 → 1.1 → 1)` trong 400ms, sau đó nét đứt nối xuống dưới tự vẽ `scaleY(0 → 1)` trong 600ms ease-out, gốc ở trên.

Các mốc cùng vào màn hình có thời điểm sẵn sàng cách nhau 500ms. Hàng đợi chỉ chạy một hiệu ứng lịch trình tại một thời điểm; khi cần, thời gian chờ dài hơn stagger để giữ tối đa hai hiệu ứng trang trí khi một ghim bản đồ cũng đang rơi. Cuộn nhanh ra ngoài bỏ chuyển động đang chạy, không chạy lại mốc đã xong. Focus vào nội dung hoặc vòng số đưa trang trí về trạng thái cuối ngay. Vùng bấm luôn 44×44px; chỉ span bên trong chuyển động.

Ghim chọn trên cả bản đồ địa điểm và lịch trình rơi `translateY(-40px → 4px → 0)` trong 700ms ease-out. Phần tử con chuyển động, transform định vị của MapLibre trên button cha giữ nguyên. Ghim lịch trình vẫn đánh số, đổi màu/viền khi chọn và chọn/focus hai chiều với timeline.

Banner mùa trên trang chủ đứng yên khi tải lần đầu. Sau khi cuộn, minh hoạ trong viewport lắc -2° ↔ 2° trong 4 giây, lặp lại. Loop dừng khi banner ngoài viewport hoặc tab ẩn. Rời trang/thay mùa dọn observer và listener.

`prefers-reduced-motion: reduce` tắt mọi animation và transition bằng CSS dùng chung. Timeline có override transform/opacity về trạng thái cuối và huỷ hàng đợi ngay khi cài đặt đổi. Bật lại chuyển động không chạy lại các mốc đã hoàn tất. Không JavaScript hoặc thiếu observer vẫn có đủ số, nét nối và nội dung.

Không thêm dependency, không thay dữ liệu, API hoặc URL công khai. Tem check-in và bottom sheet kéo theo tay thuộc phạm vi story/lát tương ứng, không nằm trong S25 của backlog.

## Kiểm chứng local

Node 24.20.0, pnpm 12.9.1:

```bash
pnpm turbo run lint typecheck test build
pnpm --filter @ranhduong/web test:ssr
```

- Toàn workspace: 20/20 task đạt lint, typecheck, test và build.
- Web: 24 file, 107 test đạt; 12 test S25 kiểm viewport ban đầu, callback observer trước scroll, thứ tự 400/600ms, hàng đợi, leave/re-entry, focus, reduce ban đầu/giữa chừng, dispose/API thiếu và lifecycle loop mùa. Test mới đã thấy đỏ trước khi implement rồi xanh.
- SSR: 75/75 test đạt sau khi sửa fixture thời tiết S24. Trước bản sửa, ca `renders fresh rain weather and keeps source/disclaimer visible` từng thất bại; lượt sau tái hiện cả bốn ca fog/sun/cloud/rain và `never extends weather freshness by caching the home HTML on the same URL`. Payload fixture có expiresAt = clock SSR + 900001ms, vượt giới hạn 900000ms của `freshCityWeather` đúng 1ms. Fixture fresh nay hết hạn sau 14 phút, nằm trong cửa sổ hợp lệ; giữ nguyên kiểm tra độ mới dữ liệu thật và các unit test biên của contracts.
- Review độc lập không còn phát hiện cụ thể. Lo ngại ban đầu về specificity của pin reduced motion đã được rút lại sau khi xác minh rule `animation: none !important` dùng chung.

Chrome headless chạy bản Nuxt production, fixture chỉ mang tên **Giả Lập**, không ghi vào database:

| Tiêu chí | Bằng chứng |
| --- | --- |
| Vùng đầu trang đứng yên, số/nét nối khi cuộn | 390×844 và 1440×1000: không có animation ban đầu; marker 0.4s, connector 0.6s với origin trên |
| Vùng bấm, không replay, số hiệu ứng | Host 44×44px kể cả khi scale; cuộn ngược không chạy lại; đo animation đồng thời không quá 2 |
| Focus/chọn ngày | Focus link trong mốc chờ hiện số ngay; anchor Ngày 2 vẫn dùng được |
| Giảm chuyển động | Bật trước mount và giữa animation: số/nét nối ở trạng thái cuối; hai pin và banner có animationName none |
| Banner mùa | Không lắc khi tải; cuộn mới chạy 4s; ngoài viewport thì animation-play-state paused. Tab ẩn được kiểm bằng unit test |
| Hai bản đồ | MapLibre thật/tile thật: child pin 0.7s, transform định vị trên cha giữ nguyên, chọn và live reduce đúng |
| Không JS/observer | Không JS: đủ 8 mốc và Chỉ đường. Helper thiếu observer giữ trang trí cuối; probe cố ý bỏ API cũng gây lỗi prefetch NuxtLink ngoài helper, được ghi riêng |
| Hiển thị | Không tràn ngang trên mobile/desktop; không lỗi runtime hoặc hydration trong các luồng bình thường |

Ảnh: [lịch trình mobile](assets/s25-timeline-mobile.png), [lịch trình desktop](assets/s25-timeline-desktop.png), [mùa mobile](assets/s25-season-mobile.png), [mùa desktop](assets/s25-season-desktop.png). Ảnh là trạng thái cuối; thời lượng và thứ tự chuyển động được kiểm trực tiếp trên browser.

Probe đã tìm và sửa viền span cộng thêm 2px: dùng box-sizing border-box cục bộ, giữ vùng bấm đúng 44px. Các chỉnh sửa chỉ liên quan vòng số và ghim lịch trình.

## Nghiệm thu còn lại

- [ ] CI remote và merge/deploy staging sau S02.
- [ ] Android/iPhone thật: cuộn nhanh/chậm, nhảy ngày, chọn ghim, bật/tắt giảm chuyển động của hệ điều hành, Back và tab nền.
- [ ] Kiểm LCP/mạng 4G thật và theo dõi Sentry 24 giờ trên staging.

Chỉ chuyển story sang Xong khi đủ definition of done trong backlog §6; hiện tại là Code xong với kiểm chứng local.
