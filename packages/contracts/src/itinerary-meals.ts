/** Phút từ 00:00, khoảng [start, end); dùng chung cho S15 và thuật toán tạo lịch trình. */
export const MEAL_WINDOWS = [
  { kind: 'lunch', start: 690, end: 810, label: 'bữa trưa (11:30–13:30)' },
  { kind: 'dinner', start: 1080, end: 1200, label: 'bữa tối (18:00–20:00)' },
] as const;
