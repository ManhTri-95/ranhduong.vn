<script setup lang="ts">
import { LEGAL_PAGES } from '~/shared/lib/legal-pages';
import RdLegalPage from '~/shared/ui/RdLegalPage.vue';
import RdLegalContact from '~/shared/ui/RdLegalContact.vue';

const config = useRuntimeConfig().public;
</script>

<template>
  <RdLegalPage :page="LEGAL_PAGES[1]">
    <section>
      <h2>1. Khi bạn xem địa điểm</h2>
      <p>Bạn không cần tài khoản để xem cẩm nang. Rành Đường đếm lượt xem địa điểm và lượt bấm chỉ đường, gọi quán, fanpage hoặc chia sẻ lịch trình để hiểu nội dung nào hữu ích.</p>
      <p>Bộ đếm dùng địa chỉ IP và thông tin trình duyệt để tạo mã băm có giá trị thay đổi mỗi ngày, giúp hạn chế đếm trùng. Mã chống trùng tồn tại tối đa 24 giờ; bộ đếm được tổng hợp hằng ngày theo địa điểm và giữ tạm tối đa 8 ngày để có thể thử lại khi gặp lỗi. Cơ chế giới hạn yêu cầu cũng dùng mã băm IP ngắn hạn.</p>
      <p>Phần đo lường này không lưu IP, thông tin trình duyệt gốc hoặc từng sự kiện thô vào cơ sở dữ liệu, không dùng cookie định danh. Số liệu tổng hợp được giữ để xem báo cáo. Bộ đếm vẫn hoạt động khi bạn từ chối đo lượt truy cập bằng Umami.</p>
    </section>
    <section id="do-luot-truy-cap">
      <h2>2. Đo lượt truy cập theo lựa chọn của bạn</h2>
      <p>Khi được bật, công cụ Umami chỉ tải sau khi bạn bấm “Cho phép”. Bạn có thể bấm “Từ chối” và tiếp tục sử dụng cẩm nang. Lựa chọn được lưu trong bộ nhớ trình duyệt trên thiết bị của bạn.</p>
      <p>Dữ liệu gửi tới công cụ gồm đường dẫn trang và thông tin kỹ thuật của yêu cầu truy cập. Rành Đường loại bỏ nội dung tìm kiếm, tham số trên đường dẫn, phần sau dấu # và trang giới thiệu; không gửi tên, email hoặc số điện thoại trong dữ liệu đo lượt truy cập.</p>
      <p>Bạn có thể thay đổi hoặc rút lại lựa chọn qua “Tuỳ chọn đo lượt truy cập” ở cuối trang. Rút lại lựa chọn dừng việc gửi dữ liệu mới, không tự xoá số liệu đã tổng hợp. Rành Đường cũng tôn trọng tín hiệu Do Not Track và Global Privacy Control từ trình duyệt.</p>
      <a v-if="config.indexable && config.umamiScriptUrl && config.umamiWebsiteId" class="rd-legal__link" href="#analytics-settings">Đến tuỳ chọn đo lượt truy cập</a>
      <p v-else>Trang hiện chưa bật công cụ đo lượt truy cập Umami.</p>
    </section>
    <section>
      <h2>3. Bộ nhớ trên thiết bị và phiên quản trị</h2>
      <p>Lựa chọn đo lượt truy cập được lưu trên thiết bị đến khi bạn đổi lựa chọn hoặc xoá dữ liệu trang trong trình duyệt. Xoá lựa chọn sẽ khiến trang hỏi lại; Umami vẫn cần bạn cho phép trước khi chạy.</p>
      <p>Khu vực quản trị dành cho người được cấp quyền sử dụng đăng nhập Google. Phiên lưu email, mã tài khoản Google và thời điểm tạo; cookie phiên có thời hạn 30 ngày và được gia hạn khi sử dụng. Cookie tạm bảo vệ luồng đăng nhập hết hạn sau 10 phút. Đăng xuất thu hồi phiên.</p>
      <p>Bản nháp nhập liệu quản trị có thể được giữ trong bộ nhớ trình duyệt để khôi phục. Các cơ chế này phục vụ quản trị, không yêu cầu khách xem cẩm nang phải đăng nhập.</p>
    </section>
    <section>
      <h2>4. Yêu cầu tới nhà cung cấp bên ngoài</h2>
      <p>Trình duyệt tải phông chữ từ Google Fonts, ảnh từ máy chủ ảnh và dữ liệu nền bản đồ từ OpenFreeMap khi bạn mở bản đồ. Các nhà cung cấp nhận thông tin kỹ thuật như IP để trả nội dung. Hạ tầng phục vụ website cũng xử lý thông tin kết nối để vận hành và bảo vệ dịch vụ.</p>
      <p>Máy chủ Rành Đường gọi WeatherAPI.com bằng tọa độ tâm thành phố để lấy thời tiết. Lời gọi này không gửi IP, vị trí thiết bị hay thông tin cá nhân của khách xem cẩm nang tới nhà cung cấp thời tiết.</p>
      <p>Khi bấm Google Maps, fanpage hoặc website của địa điểm, bạn chuyển tới dịch vụ bên ngoài và chính sách của dịch vụ đó áp dụng. Rành Đường không kiểm soát cách những bên này lưu dữ liệu truy cập.</p>
    </section>
    <section>
      <h2>5. Yêu cầu về dữ liệu và thay đổi chính sách</h2>
      <p>Bạn có thể hỏi về việc sử dụng dữ liệu, yêu cầu kiểm tra hoặc sửa thông tin cá nhân liên quan đến bạn. Không cần gửi giấy tờ hay thông tin nhạy cảm trong yêu cầu ban đầu. Rành Đường sẽ trao đổi thêm khi cần xác định dữ liệu và người yêu cầu.</p>
      <p>Ngày ở đầu trang cho biết lần cập nhật nội dung gần nhất. Khi có tính năng thu thập dữ liệu mới, chính sách sẽ được cập nhật để mô tả cách sử dụng và lựa chọn tương ứng.</p>
    </section>
    <RdLegalContact />
  </RdLegalPage>
</template>
