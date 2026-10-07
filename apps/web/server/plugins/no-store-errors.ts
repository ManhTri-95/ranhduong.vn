/**
 * Phản hồi lỗi (từ 400) không được cache ở Cloudflare. Nitro không lưu các phản hồi này vào cache của nó,
 * nhưng vẫn gắn `s-maxage` của route rule SWR cho mọi phản hồi, nên phải ghi đè trước khi gửi.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    if (event.node.res.statusCode >= 400) setResponseHeader(event, 'cache-control', 'no-store');
  });
});
