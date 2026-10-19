import { S3Client } from '@aws-sdk/client-s3';
import type { Env } from '../../config/env';

/** Client R2 (local là MinIO) dùng chung cho ảnh địa điểm và vé lịch trình. */
export function createR2Client(env: Env): S3Client {
  return new S3Client({
    region: 'auto', endpoint: env.R2_ENDPOINT, forcePathStyle: true,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
    requestHandler: { connectionTimeout: 5000, requestTimeout: 30_000 },
  });
}
