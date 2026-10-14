/** Tên tab trình duyệt: "{tên trang} · Rành Đường Quản trị"; không có tên trang thì dùng tên trong index.html. */
export function formatDocumentTitle(title: string): string {
  const name = title.trim();
  return name ? `${name} · Rành Đường Quản trị` : 'Rành Đường · Quản trị';
}
