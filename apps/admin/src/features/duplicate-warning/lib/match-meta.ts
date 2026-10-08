import { PLACE_STATUS_LABEL, type DuplicateMatch } from '@ranhduong/contracts';

/** "cách 40 m", "cách 1,2 km". */
export function distanceText(m: number): string {
  if (m < 1000) return `cách ${m} m`;
  return `cách ${(m / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`;
}

/** Dòng phụ dưới tên chỗ nghi trùng: "Trung tâm · cách 40 m · Đang hiển thị". */
export function matchMeta(match: DuplicateMatch): string {
  const parts = [match.zoneName, match.distanceM === undefined ? undefined : distanceText(match.distanceM), PLACE_STATUS_LABEL[match.status]];
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}

export function duplicateHeading(matches: readonly DuplicateMatch[]): string {
  return matches.some((m) => m.level === 'likely') ? 'Rất có thể đã có chỗ này:' : 'Có thể trùng với:';
}
