/** Tuỳ chọn kết nối BullMQ từ REDIS_URL; dùng chung cho hàng đợi ảnh và vé. */
export function queueRedisOptions(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname, port: Number(parsed.port || 6379),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: Number(parsed.pathname.slice(1) || 0),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}
