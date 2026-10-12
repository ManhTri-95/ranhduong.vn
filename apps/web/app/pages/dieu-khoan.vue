<script setup lang="ts">
import { LEGAL_PAGES } from '~/shared/lib/legal-pages';
import RdLegalPage from '~/shared/ui/RdLegalPage.vue';
import RdLegalContact from '~/shared/ui/RdLegalContact.vue';
</script>

<template>
  <RdLegalPage :page="LEGAL_PAGES[0]">
    <section>
      <h2>1. Sử dụng cẩm nang</h2>
      <p>Rành Đường là cẩm nang tham khảo về địa điểm và lịch trình ở Đà Lạt. Bạn có thể xem nội dung và chia sẻ đường dẫn mà không cần đăng nhập. Website hiện không nhận đặt chỗ, bán vé hoặc thanh toán thay cho địa điểm.</p>
      <p>Hãy sử dụng trang đúng mục đích, không can thiệp vào hệ thống, gửi yêu cầu tự động gây quá tải hoặc dùng nội dung để mạo danh Rành Đường hay chủ địa điểm.</p>
    </section>
    <section>
      <h2>2. Thông tin có thể thay đổi</h2>
      <p>Giờ mở cửa, giá, đường đi và tình trạng hoạt động có thể thay đổi sau lần xác minh gần nhất. Ngày xác minh và nhãn “Thông tin chưa được quán xác nhận” giúp bạn đánh giá thông tin trước khi đi.</p>
      <p>Gọi địa điểm để xác nhận khi cần, nhất là dịp lễ hoặc khi trang nhắc đã lâu chưa xác minh. Lịch trình là gợi ý; bạn cần tự cân nhắc thời tiết, giao thông, sức khoẻ và quy định tại nơi đến.</p>
      <p>Ô thời tiết dùng dữ liệu WeatherAPI.com theo tâm thành phố. Dự báo chỉ để tham khảo và có thể không chính xác tại vị trí hoặc thời điểm của bạn. Với hoạt động liên quan đến an toàn, hàng không, hàng hải hoặc ứng phó khẩn cấp, hãy xem thông tin khí tượng chính thức và hướng dẫn của cơ quan có thẩm quyền; không dùng dữ liệu này làm căn cứ duy nhất.</p>
    </section>
    <section>
      <h2>3. Nội dung và quyền sử dụng ảnh</h2>
      <p>Mô tả và ghi chú do Rành Đường biên soạn. Bạn có thể dẫn link tới trang gốc; khi trích dẫn, ghi rõ nguồn Rành Đường. Việc sao chép hoặc tái sử dụng nội dung cần có sự cho phép hoặc giấy phép phù hợp.</p>
      <p>Ảnh thuộc người giữ bản quyền được ghi ở từng địa điểm. Việc ảnh xuất hiện trên website không có nghĩa bạn được tự do sử dụng lại. Kiểm tra giấy phép và đường dẫn nguồn của từng ảnh trước khi dùng.</p>
      <NuxtLink class="rd-legal__link" to="/ghi-nguon">Xem nguồn bản đồ và ảnh</NuxtLink>
    </section>
    <section>
      <h2>4. Liên kết và dịch vụ bên ngoài</h2>
      <p>Nút chỉ đường mở Google Maps; fanpage và website mở trang của địa điểm. Khi rời Rành Đường, bạn sử dụng dịch vụ theo điều khoản và chính sách riêng của bên đó. Rành Đường không quản lý nội dung hoặc giao dịch trên những trang này.</p>
    </section>
    <section>
      <h2>5. Quyền riêng tư và cập nhật điều khoản</h2>
      <p>Cách sử dụng dữ liệu truy cập được trình bày ở trang quyền riêng tư. Khi thay đổi nội dung điều khoản, Rành Đường cập nhật ngày ở đầu trang để bạn kiểm tra lại.</p>
      <NuxtLink class="rd-legal__link" to="/quyen-rieng-tu">Đọc chính sách quyền riêng tư</NuxtLink>
    </section>
    <RdLegalContact />
  </RdLegalPage>
</template>
