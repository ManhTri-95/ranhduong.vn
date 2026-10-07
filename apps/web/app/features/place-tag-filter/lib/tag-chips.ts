import { tagLabel, type TagCount } from '@ranhduong/contracts';
import { toggleTag } from '~/entities/place/lib/listing-query';

export interface TagChip {
  slug: string;
  label: string;
  pressed: boolean;
  /** Giá trị `tags` sau khi bấm chip: thêm thẻ này nếu chưa chọn, bỏ nếu đang chọn; rỗng là bỏ lọc. */
  value: string;
}

/**
 * Chip lọc thẻ: các thẻ có trong danh mục hoặc cụm (nhiều chỗ trước), rồi các thẻ đang chọn mà không còn chỗ nào có,
 * để luôn bỏ chọn được. Bấm chip không làm chip đổi chỗ.
 */
export function tagChips(available: readonly TagCount[], selected: readonly string[]): TagChip[] {
  const known = new Set(available.map((tag) => tag.slug));
  const slugs = [...available.map((tag) => tag.slug), ...selected.filter((slug) => !known.has(slug))];
  return slugs.map((slug) => ({
    slug,
    label: tagLabel(slug),
    pressed: selected.includes(slug),
    value: toggleTag(selected, slug).join(','),
  }));
}
