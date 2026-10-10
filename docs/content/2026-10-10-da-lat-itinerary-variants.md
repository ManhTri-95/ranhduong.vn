# Ba lịch trình Đà Lạt có bữa sáng cụ thể

Soạn ngày 10/10/2026 để dùng với bộ soạn lịch trình hiện tại. Đây là nội dung đề xuất có nguồn tham khảo, chưa phải các bản nháp đã lưu trong admin.

Các mẫu là những lựa chọn thay thế cho nhau, không phải ba ngày đi liên tiếp. Giả định lưu trú ở trung tâm, đi taxi hoặc xe máy. Giờ ghé và thời lượng do người soạn đề xuất; khoảng trống dành cho di chuyển hoặc nghỉ, chưa được kiểm bằng định tuyến giao thông thực tế. Chọn thứ khởi hành và đối chiếu giờ phục vụ trước khi công khai.

## Dữ liệu hiện tại hỗ trợ ăn sáng như thế nào

Không cần đổi schema để nhập quán ăn sáng. `PlaceEditInput` trong `packages/contracts/src/place-admin.ts` đã có danh mục `food`, danh mục phụ, thẻ, giờ mở cửa, thời lượng và thời điểm ghé. Thẻ `an-sang` có nhãn Ăn sáng sẵn trong `packages/contracts/src/labels.ts` và được form địa điểm hiển thị thành checkbox.

| Trường trong form địa điểm | Cách nhập quán ăn sáng |
| --- | --- |
| Danh mục | Ăn uống (`food`) |
| Danh mục phụ | Nếu quán có danh mục chính Cà phê, thêm Ăn uống khi có phục vụ bữa ăn |
| Thẻ | Ăn sáng (`an-sang`); thêm Đặc sản (`dac-san`) khi phù hợp |
| Giờ mở cửa | Giờ thực tế theo từng ngày, lấy từ nguồn đã xác minh |
| Thời gian tham quan | Đề xuất 30–45 phút cho bữa sáng; có thể tăng nếu đi nhóm hoặc thường phải chờ |
| Thời điểm đẹp | Buổi sáng (`morning`) |
| Ghi chú thực tế | Món phục vụ, giờ nhận món cuối nếu biết, hướng dẫn tìm quán, tình trạng chỗ gửi xe |

Trong bộ soạn: tìm quán theo tên hoặc lọc danh mục Ăn uống, thêm vào đầu ngày, chọn Loại điểm = Bữa ăn (`meal`), nhập ghi chú Ăn sáng. Quán có danh mục phụ Ăn uống cũng xuất hiện khi lọc danh mục này.

Giới hạn hiện tại: `StopKind` chỉ có Ghé thăm và Bữa ăn, chưa có trường riêng phân loại sáng/trưa/tối. Bộ soạn chưa lọc riêng theo thẻ Ăn sáng và chỉ có nhắc nhở thiếu bữa trưa/tối. `openingHours` lưu giờ mở cửa của địa điểm, chưa lưu khung phục vụ từng món hoặc từng bữa; một quán mở sớm không tự động được coi là có bữa sáng.

API local ngày tra cứu trả 0 địa điểm ăn uống công khai ở `/v1/cities/da-lat/places?category=food&limit=50`. Con số này không bao gồm các bản nháp hoặc địa điểm riêng tư trong admin.

## Mẫu 1 — Bánh mì xíu mại và kiến trúc phía Tây

Tên: Đà Lạt một ngày: xíu mại, kiến trúc và phố cũ.

Mô tả: Bắt đầu bằng bánh mì xíu mại ở Hoàng Diệu, tham quan Crazy House rồi quay về trung tâm ăn cơm niêu. Buổi chiều nghỉ chân tại cà phê Tùng, tối dạo chợ. Phù hợp khi muốn đổi khỏi tuyến ga Đà Lạt và hồ Tuyền Lâm.

Phương tiện: Taxi hoặc xe máy. Nhịp độ: Thong thả. Giờ đầu ngày: 07:00.

| Giờ ghé đề xuất | Điểm dừng | Thời lượng | Loại điểm | Ghi chú |
| --- | --- | --- | --- | --- |
| 07:00–07:45 | Bánh mì xíu mại Bé Linh, cơ sở 37 Hoàng Diệu | 45 phút | Bữa ăn | Ăn sáng bằng bánh mì xíu mại; xác nhận đúng cơ sở 37 Hoàng Diệu khi hỏi đường hoặc gọi xe. |
| 08:30–10:00 | Crazy House — Biệt thự Hằng Nga | 90 phút | Ghé thăm | Tham quan kiến trúc, chọn lối đi phù hợp sức khỏe và tránh kéo dài sang khung ăn trưa. |
| 11:30–12:45 | Cơm niêu Như Ngọc, 1/18 Hồ Tùng Mậu | 75 phút | Bữa ăn | Ăn trưa rồi nghỉ tại nơi lưu trú; hỏi thực đơn và giá trước khi gọi món theo nhóm. |
| 14:30–15:45 | Cà phê Tùng, 6 khu Hòa Bình | 75 phút | Ghé thăm | Uống cà phê trong khu trung tâm; để phần còn lại của buổi chiều tự do nghỉ hoặc dạo phố quanh nơi lưu trú. |
| 18:00–19:30 | Chợ đêm Đà Lạt, khu Nguyễn Thị Minh Khai | 90 phút | Bữa ăn | Ăn tối và dạo chợ, chọn một bữa chính trước khi thử đồ ăn vặt. |

Lý do sắp tuyến: đi từ cụm Hoàng Diệu xuống khu Crazy House trước, sau đó quay về trung tâm cho phần còn lại trong ngày. Đây là đề xuất theo vị trí, chưa phải kết quả tối ưu đường đi.

Nguồn: [Bé Linh, cơ sở 37 Hoàng Diệu — Vietnam Airlines](https://www.vietnamairlines.com/go/vi/plan-book/travel/travel-guide/banh-mi-xiu-mai-da-lat), [Crazy House — website bán vé của điểm tham quan](https://ticket.crazyhouse.vn/), [Cơm niêu Như Ngọc — website nhà hàng](https://comnieunhungoc.com/vn), [Cà phê Tùng — cổng du lịch Lâm Đồng](https://visitlamdong.vn/vi/caphetungdl), [chợ đêm — Vietnam Airlines](https://www.vietnamairlines.com/kh/vi/plan-book/travel/travel-guide/cho-dem-da-lat).

## Mẫu 2 — Bánh căn, ga Đà Lạt và cà phê chụp ảnh

Tên: Đà Lạt một ngày: bánh căn, ga cổ và Still Cafe.

Mô tả: Ăn bánh căn ở Yersin, tham quan ga Đà Lạt và nghỉ chân tại Still Cafe trong cùng buổi sáng. Ăn cơm niêu, nghỉ trưa rồi dạo quảng trường; buổi tối ăn uống ở chợ đêm. Phù hợp với người thích chụp ảnh và khám phá món địa phương.

Phương tiện: Taxi hoặc xe máy. Nhịp độ: Đi nhiều. Giờ đầu ngày: 07:00.

| Giờ ghé đề xuất | Điểm dừng | Thời lượng | Loại điểm | Ghi chú |
| --- | --- | --- | --- | --- |
| 07:00–07:45 | Bánh căn Lệ, 27/44 Yersin | 45 phút | Bữa ăn | Ăn sáng trước khi tham quan ga. Quán ở trong hẻm nên chừa thời gian tìm lối vào và gửi xe. |
| 08:15–09:45 | Ga Đà Lạt, 01 Quang Trung | 90 phút | Ghé thăm | Tham quan tại ga; chưa bao gồm chuyến tàu Trại Mát. |
| 10:00–11:00 | Still Cafe, 59 Nguyễn Trãi | 60 phút | Ghé thăm | Uống cà phê và chụp ảnh trong khu tổ hợp; không cần gọi thêm một bữa ăn trước bữa trưa. |
| 11:45–13:00 | Cơm niêu Như Ngọc, 1/18 Hồ Tùng Mậu | 75 phút | Bữa ăn | Ăn trưa, sau đó nghỉ đến khoảng 14:30. |
| 15:00–16:00 | Quảng trường Lâm Viên | 60 phút | Ghé thăm | Đi dạo và chụp ảnh; nếu trời mưa có thể rút ngắn phần ngoài trời. |
| 18:00–19:30 | Chợ đêm Đà Lạt, khu Nguyễn Thị Minh Khai | 90 phút | Bữa ăn | Ăn tối rồi về nghỉ; giữ buổi tối ở trung tâm. |

Lý do sắp tuyến: ghép Yersin, ga và Still vào buổi sáng; chuyển về Hồ Tùng Mậu và cụm trung tâm cho phần còn lại. Đây là đề xuất theo vị trí, chưa phải kết quả tối ưu đường đi.

Nguồn: [Bánh căn Lệ — cổng du lịch Lâm Đồng](https://visitlamdong.vn/vi/banhcanle/bookingres), [ga Đà Lạt](https://visitlamdong.vn/vi/nhagadalat), [Still Cafe](https://visitlamdong.vn/vi/stillcafe), [Cơm niêu Như Ngọc](https://comnieunhungoc.com/vn), [chợ đêm và cụm quảng trường — Vietnam Airlines](https://www.vietnamairlines.com/kh/vi/plan-book/travel/travel-guide/cho-dem-da-lat).

## Mẫu 3 — Bữa sáng nóng và thiên nhiên phía Nam

Tên: Đà Lạt một ngày: phở sáng, Trúc Lâm và Tuyền Lâm.

Mô tả: Ăn phở ở trung tâm rồi đi thẳng hướng Trúc Lâm – Tuyền Lâm. Buổi trưa ăn lẩu rau trên đồi Robin, nghỉ chân ở Dalat Golf Cafe rồi kết thúc buổi đi chơi khoảng 15:00. Phù hợp với một ngày muốn thong thả hoặc ngày cuối trước khi rời Đà Lạt.

Phương tiện: Taxi hoặc xe máy. Nhịp độ: Thong thả. Giờ đầu ngày: 07:00.

| Giờ ghé đề xuất | Điểm dừng | Thời lượng | Loại điểm | Ghi chú |
| --- | --- | --- | --- | --- |
| 07:00–07:45 | Phở Hiếu, 23 Tăng Bạt Hổ | 45 phút | Bữa ăn | Ăn sáng tại trung tâm trước khi ra tuyến phía Nam. |
| 08:30–10:00 | Thiền viện Trúc Lâm | 90 phút | Ghé thăm | Đi thẳng bằng phương tiện đã chọn, tham quan khu vực mở cho khách. |
| 10:15–11:30 | Hồ Tuyền Lâm, khu bờ hồ/bến thuyền gần thiền viện | 75 phút | Ghé thăm | Đi dạo, ngắm cảnh và nghỉ. Nếu chọn đi thuyền hoặc SUP, điều chỉnh thời gian sau khi hỏi đơn vị tổ chức. |
| 12:00–13:30 | Léguda, lầu 1 khu du lịch cáp treo, đồi Robin | 90 phút | Bữa ăn | Ăn trưa trên đường về; hỏi rõ phần buffet và món tính thêm. Lịch này không yêu cầu đi cáp treo. |
| 13:45–15:00 | Dalat Golf Cafe, 14 Đống Đa | 75 phút | Ghé thăm | Uống cà phê rồi về trung tâm, giữ phần còn lại trong ngày để nghỉ hoặc di chuyển theo kế hoạch riêng. |

Lý do sắp tuyến: đi Trúc Lâm – Tuyền Lâm trước, sau đó quay về qua cụm đồi Robin/Đống Đa. Chỉ có bữa sáng và bữa trưa vì lịch kết thúc trước khung bữa tối. Đây là đề xuất theo vị trí, chưa phải kết quả tối ưu đường đi.

Nguồn: [Phở Hiếu — cổng du lịch Lâm Đồng](https://visitlamdong.vn/vi/phohieu), [thiền viện Trúc Lâm](https://visitlamdong.vn/vi/thienvientruclam), [hồ Tuyền Lâm](https://visitlamdong.vn/vi/hotuyenlam), [Léguda — đơn vị vận hành Dalattourist](https://dalattourist.com.vn/nha-hang/buffet-rau-leguda), [Dalat Golf Cafe](https://visitlamdong.vn/vi/dalatgolfcafe).

## Nhập và lưu

Nhập các quán ăn còn thiếu ở `/dia-diem/moi` theo `docs/data-collection.md`, ghim vị trí thật và xác minh giờ phục vụ. Thông tin chưa có nguồn thì để trống khi lưu nháp. Sau đó dùng `/lich-trinh/moi` để chọn các điểm, đánh dấu Bữa ăn và nhập giờ, thời lượng, ghi chú từ mẫu đã chọn.

Không dùng giá hoặc giờ trong bài tham khảo như dữ liệu đã được chủ quán xác nhận. Khi chưa có ngày đi và ngân sách, các mẫu không chốt giá vé, chi phí hoặc khung giờ phục vụ theo từng thứ. Lưu nháp trước, kiểm các lỗi của bộ soạn rồi mới công khai.
