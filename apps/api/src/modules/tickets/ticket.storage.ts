import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ENV, type Env } from '../../config/env';
import { createR2Client } from '../../shared/storage/r2-client';

/** Vé PNG cỡ vài trăm KB; vượt mức này coi như hỏng. */
const MAX_TICKET_BYTES = 5 * 1024 * 1024;

function isMissing(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = '$metadata' in error ? (error.$metadata as { httpStatusCode?: number }).httpStatusCode : undefined;
  return error.name === 'NoSuchKey' || status === 404;
}

/** Ảnh vé trên bucket công khai, khoá `tickets/{hash}/{story|og}.png` (không chứa ObjectId). */
@Injectable()
export class TicketStorage implements OnApplicationShutdown {
  private readonly client: S3Client;
  constructor(@Inject(ENV) private readonly env: Env) {
    this.client = createR2Client(env);
  }

  async read(key: string): Promise<Buffer | null> {
    try {
      const object = await this.client.send(new GetObjectCommand({ Bucket: this.env.R2_BUCKET, Key: key }));
      if (!object.Body) return null;
      if ((object.ContentLength ?? 0) >= MAX_TICKET_BYTES) throw new Error('Ảnh vé quá lớn');
      const bytes = await object.Body.transformToByteArray();
      if (bytes.length >= MAX_TICKET_BYTES) throw new Error('Ảnh vé quá lớn');
      return Buffer.from(bytes);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  async write(key: string, body: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.env.R2_BUCKET, Key: key, Body: body, ContentType: 'image/png', CacheControl: 'public, max-age=31536000, immutable',
    }));
  }

  async remove(keys: string[]): Promise<void> {
    for (const key of keys) await this.client.send(new DeleteObjectCommand({ Bucket: this.env.R2_BUCKET, Key: key }));
  }

  onApplicationShutdown(): void { this.client.destroy(); }
}
