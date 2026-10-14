import { TAG_LABEL, tagLabel, type TagCount } from '@ranhduong/contracts';
import { toggleTag } from '~/entities/place/lib/listing-query';

export interface TagChip {
  slug: string;
  label: string;
  /** Số chỗ có thẻ này trong danh mục hoặc cụm; thẻ chỉ còn trên URL thì không có số. */
  count?: number;
  pressed: boolean;
  /** Giá trị `tags` sau khi bấm chip: thêm thẻ này nếu chưa chọn, bỏ nếu đang chọn; rỗng là bỏ lọc. */
  value: string;
}

/**
 * Chip lọc thẻ: các thẻ có trong danh mục hoặc cụm (nhiều chỗ trước), rồi các thẻ đang chọn có tên trong TAG_LABEL mà
 * không còn chỗ nào có, để luôn bỏ chọn được. Bấm chip không làm chip đổi chỗ.
 * Chữ tuỳ ý trên URL (không có trong dữ liệu, không có tên) không thành chip, để không ai mượn trang hiện chữ của họ;
 * bấm chip bất kỳ thì nó bị bỏ khỏi URL.
 */
export function tagChips(available: readonly TagCount[], selected: readonly string[]): TagChip[] {
  const known = new Set(available.map((tag) => tag.slug));
  const counts = new Map(available.map((tag) => [tag.slug, tag.count]));
  const shown = selected.filter((slug) => known.has(slug) || Object.hasOwn(TAG_LABEL, slug));
  const slugs = [...available.map((tag) => tag.slug), ...shown.filter((slug) => !known.has(slug))];
  return slugs.map((slug) => ({
    slug,
    label: tagLabel(slug),
    count: counts.get(slug),
    pressed: shown.includes(slug),
    value: toggleTag(shown, slug).join(','),
  }));
}

/** Quá ngưỡng này thì chỉ hiện các thẻ nhiều chỗ nhất, phần còn lại gom vào "Thêm n thẻ". */
export const VISIBLE_TAG_LIMIT = 8;

/** Chia chip thành phần hiện sẵn và phần gom lại; thẻ đang chọn luôn hiện để khách thấy mình đang lọc gì. */
export function visibleTagChips(chips: readonly TagChip[], limit = VISIBLE_TAG_LIMIT): { shown: TagChip[]; hidden: TagChip[] } {
  if (chips.length <= limit) return { shown: [...chips], hidden: [] };
  const head = chips.slice(0, limit);
  const tail = chips.slice(limit);
  return { shown: [...head, ...tail.filter((chip) => chip.pressed)], hidden: tail.filter((chip) => !chip.pressed) };
}
