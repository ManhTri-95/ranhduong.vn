import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { MAX_PHOTO_BYTES, PHOTO_WIDTHS } from '@ranhduong/contracts';
import { createPhotoVariants } from './media-image';

const image = () => sharp({ create: { width: 1600, height: 800, channels: 3, background: '#123456' } });

describe('S06 xử lý ảnh thật (fixture giả lập)', () => {
  it.each(['jpeg', 'png', 'webp'] as const)('%s → WebP đúng chiều rộng 400/800/1200, bỏ metadata', async (format) => {
    const bytes = await image().toFormat(format).withExif({ IFD0: { Copyright: 'Tác giả Giả Lập' }, IFD3: { GPSLatitude: '21/1 1/1 1/1', GPSLongitude: '105/1 1/1 1/1' } }).toBuffer();
    expect((await sharp(bytes).metadata()).exif).toBeDefined();
    const variants = await createPhotoVariants(bytes, `image/${format}`, bytes.length);
    expect(variants.map((variant) => variant.width)).toEqual(PHOTO_WIDTHS);
    for (const variant of variants) {
      const metadata = await sharp(variant.body).metadata();
      expect(metadata).toMatchObject({ format: 'webp', width: variant.width });
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
    }
  });
  it('auto-orient trước khi resize, ảnh nhỏ vẫn tạo đúng các chiều rộng', async () => {
    const bytes = await sharp({ create: { width: 100, height: 50, channels: 3, background: '#123456' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const first = (await createPhotoVariants(bytes, 'image/jpeg', bytes.length))[0];
    expect(await sharp(first?.body).metadata()).toMatchObject({ width: 400, height: 800 });
  });
  it('từ chối byte thật quá giới hạn, size khai báo sai, MIME giả và ảnh hỏng', async () => {
    const bytes = await image().png().toBuffer();
    await expect(createPhotoVariants(Buffer.alloc(MAX_PHOTO_BYTES), 'image/png', MAX_PHOTO_BYTES - 1)).rejects.toThrow();
    await expect(createPhotoVariants(bytes, 'image/png', bytes.length - 1)).rejects.toThrow();
    await expect(createPhotoVariants(bytes, 'image/jpeg', bytes.length)).rejects.toThrow();
    const fake = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await expect(createPhotoVariants(fake, 'image/png', fake.length)).rejects.toThrow();
    await expect(createPhotoVariants(Buffer.from('hỏng'), 'image/webp', 5)).rejects.toThrow();
  });
  it('chặn ảnh nhiều frame và số pixel giải nén quá lớn', async () => {
    const animated = await sharp(Buffer.concat([Buffer.alloc(20 * 20 * 3, 30), Buffer.alloc(20 * 20 * 3, 200)]), { raw: { width: 20, height: 40, channels: 3, pageHeight: 20 } }).webp({ delay: [100, 100], loop: 0 }).toBuffer();
    expect((await sharp(animated).metadata()).pages).toBe(2);
    await expect(createPhotoVariants(animated, 'image/webp', animated.length)).rejects.toThrow();
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    await expect(createPhotoVariants(gif, 'image/png', gif.length)).rejects.toThrow();
    const huge = await sharp({ create: { width: 7000, height: 7000, channels: 3, background: '#123456' } }).png().toBuffer();
    await expect(createPhotoVariants(huge, 'image/png', huge.length)).rejects.toThrow();
  });
});
