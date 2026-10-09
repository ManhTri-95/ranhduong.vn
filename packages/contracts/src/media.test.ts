import { describe, expect, it } from 'vitest';
import * as contracts from './index.js';

const input = { contentType: 'image/jpeg', size: 1024, source: 'owner', credit: 'Quán Giả Lập', license: 'Được chủ quán cho phép' };

describe('S06 upload contracts', () => {
  it('URL presigned nhận localhost/MinIO nhưng chỉ cho giao thức http(s)', () => {
    const response = { uploadId: 'd91b94b0-0b88-4e0e-a633-2a4ab8b4c923', url: 'http://localhost:9000/private/uploads/gia-lap?signature=gia-lap', headers: { 'Content-Type': 'image/png' }, expiresAt: '2026-10-09T23:00:00.000Z' };
    expect(contracts.MediaUploadResponse.safeParse(response).success).toBe(true);
    expect(contracts.MediaUploadResponse.safeParse({ ...response, url: 'javascript:alert(1)' }).success).toBe(false);
  });
  it('chỉ JPEG/PNG/WebP, dung lượng dương và nhỏ hơn 8 MiB', () => {
    for (const contentType of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(contracts.MediaUploadInput.safeParse({ ...input, contentType, size: 8 * 1024 * 1024 - 1 }).success).toBe(true);
    }
    for (const size of [0, -1, 1.5, 8 * 1024 * 1024]) expect(contracts.MediaUploadInput.safeParse({ ...input, size }).success).toBe(false);
    expect(contracts.MediaUploadInput.safeParse({ ...input, contentType: 'image/gif' }).success).toBe(false);
  });
  it('bắt buộc nguồn, tác giả và giấy phép; bỏ khoảng trắng', () => {
    for (const field of ['source', 'credit', 'license']) expect(contracts.MediaUploadInput.safeParse({ ...input, [field]: '' }).success).toBe(false);
    expect(contracts.MediaUploadInput.parse({ ...input, credit: ' Quán Giả Lập ' }).credit).toBe('Quán Giả Lập');
  });
  it('CC phải có link http(s) và giấy phép cho phép thương mại', () => {
    const cc = { ...input, source: 'cc', license: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gia-lap.jpg' };
    expect(contracts.MediaUploadInput.safeParse(cc).success).toBe(true);
    expect(contracts.MediaUploadInput.safeParse({ ...cc, sourceUrl: undefined }).success).toBe(false);
    expect(contracts.MediaUploadInput.safeParse({ ...cc, sourceUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(contracts.MediaUploadInput.safeParse({ ...cc, license: 'CC BY-NC 4.0' }).success).toBe(false);
  });
});
