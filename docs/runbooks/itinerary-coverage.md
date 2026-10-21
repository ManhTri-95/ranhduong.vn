# S36: Báo cáo độ phủ lịch trình

Trang quản trị **Vận hành → Độ phủ lịch trình** ở `/do-phu-lich-trinh` giúp tìm phần dữ liệu cần bổ sung trước khi mở tính năng tạo lịch trình cho khách.

## Cách dùng

1. Chọn ngày bắt đầu kiểm tra, phương tiện và nhóm đi cùng. Mặc định là hôm nay theo giờ Việt Nam, xe máy, nhóm bạn; không chọn nơi ở.
2. Bấm **Chạy báo cáo**. Mỗi lượt chạy thuật toán thật của S34–S35 cho 1–5 ngày × 2 nhịp × 7 ngày khởi hành liên tiếp × 6 lựa chọn gu: không chọn gu và từng gu trong 5 gu hiện có, tổng **420 tổ hợp**. Các ngày thực tế quyết định mùa mưa và thứ mở cửa; đây không phải kiểm tra mọi ngày trong năm, mọi phương tiện, nhóm đi cùng hay tổ hợp nhiều gu cùng lúc.
3. Xem tổng đã kiểm tra, đủ điểm và bữa, còn lỗi. Phần kết quả ghi điều kiện và thời điểm đã chạy; thay lựa chọn không tự đổi kết quả cũ, cần bấm **Chạy lại báo cáo**.
4. Xem số điểm đủ dữ liệu theo cụm và danh mục. Bộ lọc ở phần lỗi cho chọn số ngày, gu và loại lỗi; danh sách hiện 50 tổ hợp mỗi lần, bấm **Xem thêm** để đọc tiếp.
5. Bổ sung hoặc xác minh địa điểm trong trang Địa điểm, rồi chạy lại. Không có cache kết quả báo cáo.

## Ý nghĩa số đếm và lỗi

- **Điểm đủ dữ liệu:** `active`, xác minh không quá 90 ngày, có toạ độ hợp lệ, cụm thuộc thành phố, giờ mở cửa hợp lệ và thời lượng ghé. Không bắt buộc thời điểm đẹp. Tổng cụm đếm mỗi điểm một lần; danh mục tính cả danh mục phụ nên tổng các cột có thể lớn hơn tổng cụm. Cụm chưa có điểm vẫn hiện số 0. Số đếm này chưa lọc theo phương tiện hay thứ khởi hành.
- **Thiếu điểm:** thuật toán trả `NOT_ENOUGH_PLACES`; báo ngày, cụm đã gán và số lượt ghé tìm được so với tối thiểu 3. Khi chưa gán được cụm, hiện rõ thông báo đó.
- **Thiếu bữa trưa/tối:** S35 tạo được lịch nhưng đi qua khung bữa ăn mà không chèn được quán hợp lệ. Báo cáo vẫn tính tổ hợp này là lỗi và chỉ rõ ngày/cụm cần thêm chỗ ăn.
- Số điểm đủ dữ liệu yêu cầu thời lượng ghé, còn thuật toán giữ mặc định 60 phút khi thiếu trường này theo thiết kế hiện tại. Vì vậy số đếm sẵn sàng và số ứng viên tạo lịch trình có thể khác nhau.

## API và ranh giới dữ liệu

`GET /v1/admin/cities/:city/itineraries/coverage?startDate=YYYY-MM-DD&transport=motorbike&with=friends`

- Có `AdminGuard`, kiểm slug và query bằng contracts, trả `Cache-Control: no-store`. Ngày đi không được trước hôm nay theo giờ Việt Nam; thiếu ngày thì xác định hôm nay ở mỗi request.
- Chỉ đọc địa điểm, cụm, mùa, mẫu `published` cùng thành phố; snapshot chỉ giữ điểm `active`. Bản ghi hỏng giờ mở cửa bị loại cả bản ghi, không cắt bỏ riêng ca hỏng để làm giờ có vẻ hợp lệ.
- Độ phổ biến dùng lượt xem trong 30 ngày Việt Nam, gồm hôm nay; ghép số hôm nay từ MongoDB/Redis bằng giá trị lớn nhất để không đếm hai lần. Điểm đã ẩn không tham gia chuẩn hoá trọng số phổ biến.
- Không tạo, sửa hay xoá lịch trình, không xếp job, không ghi số liệu. Chỉ trả tóm tắt lỗi và số đếm; không trả nội dung các lịch trình thử. Vòng chạy nhường event loop sau mỗi tổ hợp.
- Contracts: `packages/contracts/src/itinerary-coverage.ts`; báo cáo và service: `apps/api/src/modules/itineraries/coverage-report/`; giao diện: `apps/admin/src/widgets/itinerary-coverage/`. Module báo cáo dùng chung repository lịch trình; module lịch trình công khai không phụ thuộc Redis của báo cáo.

## Kiểm chứng trong workspace

Logic được viết test trước: query/ngày Việt Nam; 420 tổ hợp; ngày qua năm mới; thiếu điểm/bữa; điều kiện đủ dữ liệu và danh mục phụ; snapshot và trọng số điểm đã ẩn; mẫu published/cũ; lượt xem 30 ngày; HTTP xác thực, thành phố, không ghi lịch trình; trạng thái tải/thử lại/401 và bỏ phản hồi cũ.

Chrome headless dùng bản admin production và fixture sinh bằng `buildCoverageReport` thật trên dữ liệu **Giả Lập**: 1440px và 390px, bộ lọc, không tràn ngang, vùng bấm tối thiểu 44px, thử lại, hết phiên và trạng thái không còn tổ hợp lỗi. Đây không phải dữ liệu độ phủ thật của Đà Lạt.

Ảnh kiểm giao diện: [desktop](assets/s36-coverage-desktop.png), [điện thoại](assets/s36-coverage-mobile.png), [lỗi trên điện thoại](assets/s36-coverage-mobile-failures.png).

Lệnh kiểm tra:

```sh
pnpm turbo run lint typecheck test build
pnpm --filter @ranhduong/web test:ssr
```

Review độc lập phát hiện và đã sửa snapshot chứa điểm đã ẩn làm lệch trọng số phổ biến; regression test đã thấy đỏ trước sửa. Lượt chạy tổng thể cũng lộ test thời hạn thật 40ms sẵn có của `tickets.service.test.ts` không kịp nhận ảnh khi tải cao; test này chuyển sang đồng hồ giả, giữ nguyên service và các kiểm tra thời hạn.

Kết quả lượt cuối: **20/20 task lint/typecheck/test/build đạt**, gồm API **594** test, contracts **619**, admin **249**, web **150**, geo **38**; bộ SSR riêng **84/84** đạt. `git diff --check` sạch. Log local: `.superpowers/s36-complete-workspace-checks.log`, `.superpowers/s36-browser-results.json`.

## Nghiệm thu sau triển khai

- [ ] CI remote và staging đạt; mở trang bằng phiên admin thật.
- [ ] Chạy trên dữ liệu thật, đọc từng lỗi và số đếm, kiểm tra collection lịch trình không thay đổi sau báo cáo.
- [ ] Chạy nhiều tuần đại diện mùa mưa/khô, các phương tiện và nhóm đi cùng cần hỗ trợ.
- [ ] Đạt tiêu chí lát 2: bộ gu mặc định, 1–4 ngày, hai nhịp và cả bảy thứ khởi hành không còn lỗi.
- [ ] Thử Android/iPhone thật và theo dõi Sentry 24 giờ trên staging.
