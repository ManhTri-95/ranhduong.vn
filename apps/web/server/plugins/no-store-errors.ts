/**
 * Phản hồi lỗi (từ 400) không được cache ở Cloudflare. Nitro không lưu các phản hồi này vào cache của nó,
 * nhưng vẫn gắn `s-maxage` của route rule SWR cho mọi phản hồi, nên phải ghi đè trước khi gửi.
 */
export default defineNitroPlugin((nitroApp) => {
  // Handler lỗi Nitro gửi phản hồi trực tiếp, bỏ qua beforeResponse và ghi lại cache-control (404 dùng no-cache).
  // Chặn việc ghi đè ở chính response bị lỗi, cho cả HTML lẫn JSON; header khác giữ cách ghi thông thường.
  nitroApp.hooks.hook('error', (_error, context) => {
    const response = context?.event?.node.res;
    if (!response || response.headersSent) return;
    const setHeader = response.setHeader.bind(response);
    response.setHeader = (name, value) => setHeader(name, name.toLowerCase() === 'cache-control' ? 'no-store' : value);
    setHeader('cache-control', 'no-store');
  });
  nitroApp.hooks.hook('beforeResponse', (event) => {
    if (event.node.res.statusCode >= 400) setResponseHeader(event, 'cache-control', 'no-store');
  });
});
