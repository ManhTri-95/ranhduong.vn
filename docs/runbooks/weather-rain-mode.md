# S24: Ô thời tiết và chế độ mưa

## Cấu hình

Nhánh `feat/S24-weather-rain-mode`. Chủ dự án chốt WeatherAPI Free ngày 12/10/2026, thay Open-Meteo và mã WMO. Không thêm dependency.

1. Đăng ký [WeatherAPI Free](https://www.weatherapi.com/signup.aspx), lấy API key trong tài khoản.
2. Thêm `WEATHERAPI_KEY=...` vào `apps/api/.env` hoặc secret của container API; khởi động lại API. Không đặt key trong biến `NUXT_PUBLIC_*`, trình duyệt hoặc Git.
3. Kiểm `GET /v1/cities/da-lat/now`: `weather` có dữ liệu mới; thiếu key thì `weather: null`, trang vẫn dùng được.

Theo [bảng giá](https://www.weatherapi.com/pricing.aspx), gói Free cho 100K lượt/tháng, dự báo giờ trong 3 ngày và dùng thương mại. Một thành phố gọi đều mỗi 15 phút khoảng 96 lượt/ngày, 2.880 lượt/30 ngày; số lượt thực tế có thể tăng khi Redis lỗi hoặc chạy nhiều instance. Không tự nâng gói. Hết hạn mức hoặc key sai thì ẩn ô.

Theo [điều khoản](https://www.weatherapi.com/terms.aspx), Free cần ghi nguồn WeatherAPI.com và thông báo tính tham khảo/xác suất của dự báo. Tile, trang ghi nguồn và điều khoản đã có nội dung này. Cache hiện tại 15 phút nằm trong giới hạn 60 phút cho current conditions và 24 giờ cho forecast.

## API, cache và tuổi dữ liệu

- API gọi `https://api.weatherapi.com/v1/forecast.json` theo tâm City: chuyển `[lng, lat]` sang `q=lat,lng`; `days=2`, `aqi=no`, `alerts=no`. Không gửi IP hay vị trí thiết bị khách.
- Timeout toàn phần thời tiết 3 giây; thao tác Redis thời tiết tối đa 200ms; abort fetch khi hết hạn. HTTP/network/JSON/schema/Redis lỗi không làm lỗi trang. Không log URL hoặc nội dung exception của provider vì có thể chứa key.
- `CityNow.weather`: state, temperatureC, isDay, rainSoon, observedAt, expiresAt; UTC, không có key hoặc raw provider data. Null khi chưa cấu hình hoặc không lấy được dữ liệu hợp lệ.
- Redis `city-weather:v1:{cityId}:{lng},{lat}` chỉ lưu thời tiết đã validate, TTL tối đa 900.000ms; rút ngắn để quan sát không quá 30 phút tuổi. Cache hit không gia hạn TTL. Không lấy lại dữ liệu quá hạn khi provider lỗi. Các request đang chạy cùng city/coords trong một tiến trình dùng chung lời gọi.
- Cache mùa S23 riêng, không chứa thời tiết. `/now.expiresAt` lấy hạn sớm nhất mùa/thời tiết; HTTP cache tới hạn này, no-store khi không có thời tiết.
- Riêng trang chủ HTML no-store để SWR/CDN không kéo dài tuổi thời tiết. Các route khác giữ cache mùa S23. Chi phí: thêm lượt render SSR trang chủ; Redis vẫn giảm lượt gọi provider. Client ẩn tile khi hết hạn trước khi refresh và kiểm lại khi tab trở lại.

## Trạng thái và bộ lọc

Mã [WeatherAPI](https://www.weatherapi.com/docs/weather_conditions.json) ánh xạ trong `packages/contracts/src/weather.ts`: sun (1000), cloud (1003/1006/1009), fog (1030/1135/1147), rain (mưa/phùn/dông). Mã khác/chưa hỗ trợ thì ẩn ô. Ban đêm trời quang ghi “Trời trong”; sương ghi “Có sương”.

Khả năng mưa >=60% của bất kỳ giờ giao với `[bây giờ, bây giờ + 3 giờ)` cũng bật rain. Tính cả phần còn lại của giờ hiện tại; lúc 12:30 dùng các khoảng 12h/13h/14h/15h, lúc 12:00 dùng 12h/13h/14h. Dùng Unix timestamp và hai ngày qua nửa đêm. Thiếu/nhân đôi giờ, xác suất ngoài 0–100 hoặc quan sát tương lai hơn 1 phút thì ẩn ô. Nếu chỉ dự báo bật mưa, hiện “Sắp có mưa”.

Liên kết “Quán trú mưa được gần bạn” và nút bản đồ trang chủ trong chế độ mưa trỏ `/{city}/ban-do?rainSafe=true`. Bản đồ chọn sẵn chip “Trú mưa được”. Query rõ ràng quyết định bộ lọc; chọn/bỏ thủ công được giữ khi đổi danh mục, tải lại và quay lại. Form GET riêng cho danh mục và mái che giữ trường còn lại khi tắt JavaScript. Danh sách/bản đồ trong vùng đã xem; không yêu cầu định vị thiết bị.

API `GET /v1/cities/:city/places?rainSafe=true` lọc `cover` full/partial trong MongoDB trước phân trang; none/chưa rõ không được tính. Kết hợp với danh mục chính/phụ, bbox/near, thành phố và active. `rainSafe=false` bỏ điều kiện; giá trị khác hoặc query lặp không hợp lệ trả 400. Đổi chip huỷ request cũ, bỏ dữ liệu của bộ lọc cũ rồi tải lại.

Phạm vi S24 theo backlog là tile, link và chip bản đồ. Gợi ý điểm thay thế cho lịch trình buổi chiều trong tầm nhìn UI §7 cần story lịch trình riêng.

## Kết quả local

- `pnpm turbo run lint typecheck test build`: 20/20 task xanh; contracts 394, geo 37, API 388, admin 120, web 95 test.
- `pnpm --filter @ranhduong/web test:ssr`: 75/75 xanh. Bốn trạng thái, source/disclaimer, null/quá hạn vẫn HTTP 200, cùng URL không phát lại HTML thời tiết cũ, rain URL và form GET/chip chọn sẵn.
- Service tests dùng Redis thật (TTL/cache hit) và MongoDB thật (full/partial, trạng thái/thành phố/danh mục phụ, pagination); timeout, concurrent fetch, key redaction, malformed/stale cache và dữ liệu provider giả.
- Chrome headless 390×844 và 1440×1000: không tràn ngang, link 44px; rain link/chip, đổi danh mục giữ chip, bật/tắt đổi kết quả, bản đồ tải style thật, SSR khi tắt JavaScript, expiry/null không che nội dung; không hydration mismatch hoặc unhandled JS errors. Dữ liệu địa điểm/thời tiết của lượt QA đều ghi rõ Giả Lập.
- Review độc lập không có Critical/Important/Minor cần sửa. `git diff --check` xanh.

Ảnh: [390px](assets/s24-weather-mobile.png), [desktop](assets/s24-weather-desktop.png), [chip bản đồ](assets/s24-rain-map-mobile.png).

## Trước khi ra mắt

- [ ] Cấu hình API key thật và thử endpoint WeatherAPI thật trên staging; xác nhận quota của tài khoản.
- [ ] CI remote, deploy/staging, kiểm no-store trang chủ và tuổi cache API/Redis dưới tải thực tế.
- [ ] Thử Android/iPhone thật: chip, Back, expiry khi tab ngủ/thức, tắt mạng/khôi phục.
- [ ] Sentry không có lỗi mới sau 24 giờ staging; rà nguồn/disclaimer và nội dung mùa thực tế.

Chưa đánh dấu story “Xong” vì chưa merge/CI remote/staging/điện thoại thật.
