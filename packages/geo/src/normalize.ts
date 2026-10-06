/** Từ chung bị bỏ khi so tên để chống trùng (tài liệu thiết kế kỹ thuật, mục 9). */
const STOP_WORDS = ['nha hang', 'ca phe', 'quan', 'tiem', 'cafe', 'coffee', 'homestay', 'da lat', 'dalat'];

/** Bỏ dấu tiếng Việt, kể cả chữ đ. */
export function removeDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

/** Chuẩn hoá tên địa điểm: chữ thường, bỏ dấu, bỏ ký tự đặc biệt và từ chung. */
export function normalizeName(input: string): string {
  let s = removeDiacritics(input.toLowerCase()).replace(/&/g, ' va ').replace(/[^a-z0-9 ]/g, ' ');
  s = ` ${s.split(/\s+/).filter(Boolean).join(' ')} `;
  for (const word of STOP_WORDS) {
    s = s.split(` ${word} `).join(' ');
  }
  return s.replace(/\s+/g, ' ').trim();
}

/** Tạo slug không dấu cho URL, ví dụ "Đồi chè Cầu Đất" → "doi-che-cau-dat". */
export function slugify(input: string): string {
  return removeDiacritics(input.toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
