<script setup lang="ts">
import { LEGAL_PAGES } from '~/shared/lib/legal-pages';
import RdLegalPage from '~/shared/ui/RdLegalPage.vue';
import RdLegalContact from '~/shared/ui/RdLegalContact.vue';
</script>

<template>
  <RdLegalPage :page="LEGAL_PAGES[2]">
    <section id="ban-do">
      <h2>Bản đồ và dữ liệu OpenStreetMap</h2>
      <p>Dữ liệu nền bản đồ: © OpenStreetMap contributors, theo giấy phép Open Database License (ODbL). Ghi nguồn này cũng hiển thị cạnh bản đồ địa điểm và bản đồ lịch trình.</p>
      <ul>
        <li><a class="rd-legal__link" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Bản quyền và nguồn dữ liệu OpenStreetMap</a></li>
        <li><a class="rd-legal__link" href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer">Giấy phép Open Database License 1.0</a></li>
        <li><a class="rd-legal__link" href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap · Dịch vụ nền bản đồ</a></li>
        <li><a class="rd-legal__link" href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">© OpenMapTiles · Cấu trúc dữ liệu nền bản đồ</a></li>
        <li><a class="rd-legal__link" href="https://maplibre.org" target="_blank" rel="noopener noreferrer">MapLibre · Công cụ hiển thị bản đồ</a></li>
      </ul>
      <p>Phong cách sổ tay được Rành Đường sửa màu, đường nét và lớp hiển thị từ <a href="https://github.com/hyperknot/openfreemap-styles" target="_blank" rel="noopener noreferrer">Positron của OpenFreeMap</a> và <a href="https://github.com/openmaptiles/positron-gl-style" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>. Thiết kế gốc từ CartoDB Basemaps do Stamen và Paul Norman thực hiện cho CartoDB Inc. (CC BY 3.0); thiết kế Positron theo <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Biểu tượng ghim danh mục do Rành Đường vẽ riêng.</p>
      <p>Một phần thông tin ban đầu về địa điểm có thể đến từ OpenStreetMap, sau đó được Rành Đường rà soát và bổ sung. Ghi nguồn không có nghĩa cộng đồng OpenStreetMap hoặc các nhà cung cấp bản đồ xác nhận hay bảo trợ cho từng địa điểm.</p>
    </section>
    <section id="anh-dia-diem">
      <h2>Ảnh địa điểm</h2>
      <p>Mỗi ảnh trên trang địa điểm có tên người giữ bản quyền, loại nguồn, giấy phép hoặc sự cho phép sử dụng; có đường dẫn trang gốc khi nguồn cung cấp đường dẫn đó. Phần “Nguồn ảnh” nằm ngay dưới bộ ảnh và có thể đọc được khi tắt JavaScript.</p>
      <p>Ảnh có thể do Rành Đường tự chụp, chủ địa điểm hoặc cộng tác viên cung cấp, hoặc được sử dụng theo giấy phép Creative Commons phù hợp. Ảnh gửi riêng cho Rành Đường không mặc nhiên được phép sử dụng ở nơi khác.</p>
      <p>Ảnh công khai được chuyển sang WebP và thay đổi kích thước, loại bỏ metadata; khung hiển thị có thể cắt ảnh để vừa bố cục. Nếu dùng lại ảnh Creative Commons, hãy mở nguồn gốc và thực hiện đúng yêu cầu ghi tác giả, liên kết giấy phép, nêu thay đổi và chia sẻ theo cùng giấy phép nếu có.</p>
      <a class="rd-legal__link" href="https://creativecommons.org/share-your-work/cclicenses/" target="_blank" rel="noopener noreferrer">Tìm hiểu các giấy phép Creative Commons</a>
    </section>
    <section id="font-ve">
      <h2>Font trên vé lịch trình</h2>
      <p>Ba font này chỉ dùng để in vé lịch trình dạng ảnh; chữ trên web tải từ Google Fonts. Cả ba dùng giấy phép SIL Open Font License 1.1.</p>
      <ul>
        <li><a class="rd-legal__link" href="https://github.com/cyrealtype/Lora-Cyrillic" target="_blank" rel="noopener noreferrer">Lora</a> · © 2011 The Lora Project Authors (Cyreal)</li>
        <li><a class="rd-legal__link" href="https://github.com/bettergui/BeVietnamPro" target="_blank" rel="noopener noreferrer">Be Vietnam Pro</a> · © 2021 The Be Vietnam Pro Project Authors</li>
        <li><a class="rd-legal__link" href="https://fonts.google.com/specimen/Patrick+Hand" target="_blank" rel="noopener noreferrer">Patrick Hand</a> · © 2010–2012 Patrick Wagesreiter</li>
      </ul>
      <a class="rd-legal__link" href="https://openfontlicense.org" target="_blank" rel="noopener noreferrer">SIL Open Font License 1.1</a>
    </section>
    <section id="thoi-tiet">
      <h2>Thời tiết</h2>
      <p>Nguồn dữ liệu: <a class="rd-legal__link" href="https://www.weatherapi.com/" target="_blank" rel="noopener noreferrer">WeatherAPI.com</a>. Rành Đường lấy dữ liệu theo tâm thành phố, giữ cache tối đa 15 phút và rút gọn thành bốn trạng thái để gợi ý chỗ ghé khi có mưa.</p>
      <p>Thời tiết chỉ để tham khảo, có thể khác theo vị trí và thời điểm. Dự báo mang tính xác suất và có thể không chính xác. Với quyết định liên quan đến an toàn cá nhân, hàng không, hàng hải hoặc ứng phó khẩn cấp, hãy xem thông tin khí tượng chính thức và hướng dẫn của cơ quan có thẩm quyền; không dùng dữ liệu này làm căn cứ duy nhất.</p>
    </section>
    <section>
      <h2>Thông tin và ghi chú địa phương</h2>
      <p>Tên, địa chỉ, giờ mở cửa và thông tin liên hệ được thu thập thủ công từ nguồn công khai hoặc do địa điểm cung cấp. Mô tả và ghi chú được Rành Đường biên soạn. Trang địa điểm ghi ngày xác minh và cho biết khi thông tin chưa được chủ quán xác nhận.</p>
      <p>Google Maps được dùng qua liên kết chỉ đường. Rành Đường không lấy ảnh, đánh giá hay bài nhận xét từ Google Maps để đăng lại trên cẩm nang.</p>
    </section>
    <RdLegalContact />
  </RdLegalPage>
</template>
