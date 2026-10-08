/** Lỗi trùng unique index của MongoDB (E11000), ví dụ hai request cùng lấy một slug. */
export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 11000;
}
