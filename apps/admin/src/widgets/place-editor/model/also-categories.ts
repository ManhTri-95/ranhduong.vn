import { CATEGORY_LABEL, MAX_ALSO_CATEGORIES, PUBLIC_CATEGORIES, type PlaceCategory } from '@ranhduong/contracts';

export interface AlsoCategoryChoice {
  value: PlaceCategory;
  label: string;
  /** Đã chọn đủ số danh mục phụ tối đa thì khoá các ô chưa chọn. */
  disabled: boolean;
}

/** Lựa chọn "Cũng phục vụ": danh mục công khai trừ danh mục chính (S27). */
export function alsoCategoryChoices(primary: PlaceCategory | '', selected: readonly PlaceCategory[]): AlsoCategoryChoice[] {
  return PUBLIC_CATEGORIES.filter((c) => c !== primary).map((value) => ({
    value,
    label: CATEGORY_LABEL[value],
    disabled: !selected.includes(value) && selected.length >= MAX_ALSO_CATEGORIES,
  }));
}

/** Bỏ danh mục chính khỏi danh mục phụ, dùng khi người nhập đổi danh mục chính. */
export function withoutPrimary(also: readonly PlaceCategory[], primary: PlaceCategory | ''): PlaceCategory[] {
  return also.filter((c) => c !== primary);
}
