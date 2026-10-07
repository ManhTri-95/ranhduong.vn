import { PHOTO_WIDTHS, photoVariantKey, type PhotoWidth } from '@ranhduong/contracts';

/** URL một bản WebP của ảnh (S06 sinh 400/800/1200). */
export function photoUrl(mediaBase: string, key: string, width: PhotoWidth): string {
  return `${mediaBase.replace(/\/+$/, '')}/${photoVariantKey(key, width)}`;
}

/** srcset đủ các kích thước cho <img>. */
export function photoSrcset(mediaBase: string, key: string): string {
  return PHOTO_WIDTHS.map((width) => `${photoUrl(mediaBase, key, width)} ${width}w`).join(', ');
}
