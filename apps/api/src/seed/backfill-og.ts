import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { photoVariantKey } from '@ranhduong/contracts';
import sharp from 'sharp';
import { loadEnv } from '../config/env';

/** Run after API build. Dry-run by default; --apply writes only missing public derivatives. */
async function main(): Promise<void> {
  const env = loadEnv();
  const client = new S3Client({ endpoint: env.R2_ENDPOINT, region: 'auto', forcePathStyle: true, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } });
  const apply = process.argv.includes('--apply');
  let continuation: string | undefined;
  let count = 0;
  try {
    do {
      const page = await client.send(new ListObjectsV2Command({ Bucket: env.R2_BUCKET, ContinuationToken: continuation }));
      for (const object of page.Contents ?? []) {
        if (!object.Key?.endsWith('/1200.webp')) continue;
        const target = photoVariantKey(object.Key.slice(0, -'/1200.webp'.length), 'og');
        try { await client.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: target })); continue; }
        catch (error) {
          if (!(error instanceof Error) || !('$metadata' in error) || (error.$metadata as { httpStatusCode?: number }).httpStatusCode !== 404) throw error;
        }
        count++;
        if (!apply) continue;
        const source = await client.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: object.Key }));
        if (!source.Body) throw new Error('Thiếu nội dung ảnh WebP');
        const bytes = await source.Body.transformToByteArray();
        const body = await sharp(bytes, { limitInputPixels: 48_000_000 }).resize(1200, 630, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
        await client.send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: target, Body: body, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }));
      }
      continuation = page.NextContinuationToken;
    } while (continuation);
    console.log(`${apply ? 'Đã tạo' : 'Cần tạo'} ${count} ảnh OG 1200×630. ${apply ? '' : 'Thêm --apply để ghi.'}`);
  } finally { client.destroy(); }
}

void main().catch(() => { console.error('Chưa backfill được ảnh OG. Kiểm tra cấu hình/quyền bucket và thử lại.'); process.exitCode = 1; });
