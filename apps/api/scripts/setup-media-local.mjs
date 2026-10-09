import { createRequire } from 'node:module';
import {
  CreateBucketCommand, DeleteBucketPolicyCommand, PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand, PutBucketPolicyCommand, S3Client,
} from '@aws-sdk/client-s3';

const require = createRequire(import.meta.url);
const { loadEnv } = require('../dist/config/env.js');
const env = loadEnv();
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.R2_ENDPOINT).hostname)) {
  throw new Error('Script này chỉ cấu hình storage local. R2 staging/production làm theo runbook.');
}
const client = new S3Client({
  region: 'auto', endpoint: env.R2_ENDPOINT, forcePathStyle: true,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  requestChecksumCalculation: 'WHEN_REQUIRED',
});
try {
  for (const bucket of [env.R2_BUCKET, env.R2_UPLOAD_BUCKET]) {
    try { await client.send(new CreateBucketCommand({ Bucket: bucket })); }
    catch (err) { if (!['BucketAlreadyExists', 'BucketAlreadyOwnedByYou'].includes(err.name)) throw err; }
  }
  await client.send(new DeleteBucketPolicyCommand({ Bucket: env.R2_UPLOAD_BUCKET }));
  await client.send(new PutBucketCorsCommand({ Bucket: env.R2_UPLOAD_BUCKET, CORSConfiguration: { CORSRules: [{
    AllowedOrigins: [env.ADMIN_URL], AllowedMethods: ['PUT'], AllowedHeaders: ['Content-Type'], MaxAgeSeconds: 3600,
  }] } }));
  await client.send(new PutBucketLifecycleConfigurationCommand({ Bucket: env.R2_UPLOAD_BUCKET, LifecycleConfiguration: { Rules: [{
    ID: 'expire-private-originals', Status: 'Enabled', Filter: { Prefix: 'uploads/' }, Expiration: { Days: 1 },
  }] } }));
  await client.send(new PutBucketPolicyCommand({ Bucket: env.R2_BUCKET, Policy: JSON.stringify({
    Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${env.R2_BUCKET}/photos/*` }],
  }) }));
  console.log('Đã cấu hình bucket WebP công khai và bucket upload riêng tư cho local.');
} finally { client.destroy(); }
