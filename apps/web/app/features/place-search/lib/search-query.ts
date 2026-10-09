type QueryValue = string | null | (string | null)[] | undefined;

/** Khớp giới hạn PlaceListQuery; bỏ query thiếu hoặc lặp khoá, cắt đoạn dán dài thay vì gửi lên API để nhận 400. */
export function parseSearchQuery(value: QueryValue): string {
  const query = typeof value === 'string' ? value.trim().slice(0, 100) : '';
  // Cắt giữa cặp surrogate của emoji sẽ làm encodeURIComponent báo lỗi khi ghép URL gọi API.
  return query.replace(/[\uD800-\uDBFF]$/, '');
}
