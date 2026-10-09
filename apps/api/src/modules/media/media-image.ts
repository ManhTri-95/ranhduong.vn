import { MAX_PHOTO_BYTES, PHOTO_WIDTHS, type PhotoWidth } from '@ranhduong/contracts';
import sharp from 'sharp';

export class InvalidPhoto extends Error {}
export interface PhotoVariant { width: PhotoWidth; body: Buffer }
const MIME_FORMAT: Record<string, string> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
// Giới hạn cả ảnh nén nhỏ nhưng giải nén quá lớn; điện thoại thường có ảnh tối đa 48 MP.
const MAX_PIXELS = 48_000_000;

export async function createPhotoVariants(bytes: Buffer, contentType: string, declaredSize: number): Promise<PhotoVariant[]> {
  if (bytes.length === 0 || bytes.length >= MAX_PHOTO_BYTES || bytes.length !== declaredSize) {
    throw new InvalidPhoto('Ảnh phải nhỏ hơn 8 MB và khớp dung lượng đã khai báo.');
  }
  try {
    const options = { limitInputPixels: MAX_PIXELS, failOn: 'warning' as const };
    const metadata = await sharp(bytes, options).metadata();
    if (!MIME_FORMAT[contentType] || metadata.format !== MIME_FORMAT[contentType] || (metadata.pages ?? 1) > 1) {
      throw new InvalidPhoto('Chỉ nhận ảnh JPEG, PNG hoặc WebP tĩnh đúng định dạng đã chọn.');
    }
    const variants: PhotoVariant[] = [];
    for (const width of PHOTO_WIDTHS) {
      // sharp bỏ EXIF/XMP/ICC mặc định. Không gọi keepMetadata/withMetadata trên đầu ra.
      const body = await sharp(bytes, options).autoOrient().resize({ width }).webp({ quality: 82 }).toBuffer();
      variants.push({ width, body });
    }
    return variants;
  } catch (err) {
    if (err instanceof InvalidPhoto) throw err;
    throw new InvalidPhoto('Ảnh bị hỏng hoặc quá lớn khi giải nén. Chọn ảnh khác.');
  }
}
