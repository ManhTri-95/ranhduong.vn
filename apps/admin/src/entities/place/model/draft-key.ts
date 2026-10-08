/** Khoá localStorage của bản đang sửa trên máy (form địa điểm S05); `moi` khi tạo mới. Xoá nháp (S07) cũng xoá khoá này. */
export function placeDraftKey(id: string | null): string {
  return `rd-admin:place-draft:${id ?? 'moi'}`;
}
