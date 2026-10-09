import { Readable } from 'node:stream';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { MAX_PHOTO_BYTES, PHOTO_WIDTHS, UPLOAD_URL_TTL_S, photoVariantKey } from '@ranhduong/contracts';
import { ENV, type Env } from '../../config/env';
import { InvalidPhoto } from './media-image';

@Injectable()
export class MediaStorage implements OnApplicationShutdown {
  private readonly client: S3Client;
  constructor(@Inject(ENV) private readonly env: Env) {
    this.client = new S3Client({
      region: 'auto', endpoint: env.R2_ENDPOINT, forcePathStyle: true,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
      requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
      requestHandler: { connectionTimeout: 5000, requestTimeout: 30_000 },
    });
  }
  presign(key: string, contentType: string, size: number): Promise<string> {
    return getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.env.R2_UPLOAD_BUCKET, Key: key, ContentType: contentType, ContentLength: size }), {
      expiresIn: UPLOAD_URL_TTL_S, signableHeaders: new Set(['content-type', 'content-length']),
    });
  }
  async read(key: string): Promise<Buffer> {
    const object = await this.client.send(new GetObjectCommand({ Bucket: this.env.R2_UPLOAD_BUCKET, Key: key }));
    const body = object.Body;
    if (!(body instanceof Readable)) throw new Error('R2 không trả stream ảnh');
    if ((object.ContentLength ?? 0) >= MAX_PHOTO_BYTES) {
      body.destroy();
      throw new InvalidPhoto('Ảnh phải nhỏ hơn 8 MB.');
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of body) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      size += buffer.length;
      if (size >= MAX_PHOTO_BYTES) {
        body.destroy();
        throw new InvalidPhoto('Ảnh phải nhỏ hơn 8 MB.');
      }
      chunks.push(buffer);
    }
    return Buffer.concat(chunks);
  }
  async writeVariant(key: string, body: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.env.R2_BUCKET, Key: key, Body: body, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }));
  }
  async deleteOriginal(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.env.R2_UPLOAD_BUCKET, Key: key }));
  }
  async deleteVariants(key: string): Promise<void> {
    for (const width of PHOTO_WIDTHS) {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.env.R2_BUCKET, Key: photoVariantKey(key, width) }));
    }
  }
  onApplicationShutdown(): void { this.client.destroy(); }
}
