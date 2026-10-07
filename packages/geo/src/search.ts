import { removeDiacritics } from './normalize.js';

/** Chuỗi dùng để so khi tìm kiếm: chữ thường, không dấu, chỉ a-z 0-9, các từ cách nhau một khoảng trắng. */
export function searchKey(input: string): string {
  return removeDiacritics(input.toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Mức khớp của từ khoá với một địa điểm, 0 là không khớp:
 * 3: tên bắt đầu bằng từ khoá; 2: mọi từ của từ khoá là phần đầu một từ trong tên;
 * 1: mọi từ khớp phần đầu một từ trong tên, tên khác hoặc chữ phụ (ví dụ tên danh mục).
 * Không dựng regex từ từ khoá, nên ký tự đặc biệt không gây lỗi.
 */
export function matchScore(query: string, name: string, extra: readonly string[] = []): 0 | 1 | 2 | 3 {
  const q = searchKey(query);
  if (!q) return 0;
  const nameKey = searchKey(name);
  if (nameKey.startsWith(q)) return 3;
  const tokens = q.split(' ');
  const covered = (words: string[]) => tokens.every((token) => words.some((word) => word.startsWith(token)));
  const nameWords = nameKey.split(' ');
  if (covered(nameWords)) return 2;
  const extraWords = extra.flatMap((text) => searchKey(text).split(' '));
  return covered([...nameWords, ...extraWords]) ? 1 : 0;
}
