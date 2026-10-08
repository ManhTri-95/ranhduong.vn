export interface ZoneOption {
  slug: string;
  name: string;
}

export type ZoneHint =
  | { kind: 'none' }
  /** Chưa chọn cụm và ghim nằm trong đúng một cụm: chọn luôn. */
  | { kind: 'select'; slug: string }
  /** Ghim nằm trên ranh giới nhiều cụm: để người nhập chọn. */
  | { kind: 'boundary'; zones: ZoneOption[] }
  /** Đã chọn cụm khác cụm chứa ghim: hỏi có đổi không. */
  | { kind: 'differs'; zone: ZoneOption };

/** Gợi ý cụm sau khi ghim (decisions 2026-10-07); không bao giờ tự đổi cụm người nhập đã chọn. */
export function zoneHint(current: string, suggested: readonly ZoneOption[]): ZoneHint {
  if (suggested.some((zone) => zone.slug === current)) return { kind: 'none' };
  const [only, ...rest] = suggested;
  if (!only) return { kind: 'none' };
  if (rest.length > 0) return { kind: 'boundary', zones: [...suggested] };
  return current === '' ? { kind: 'select', slug: only.slug } : { kind: 'differs', zone: only };
}
