import { describe, expect, it } from 'vitest';
import { photoSrcset, photoUrl } from './media';

describe('ảnh trên R2', () => {
  it('ghép URL bản WebP, bỏ dấu / thừa ở gốc', () => {
    expect(photoUrl('https://media.gia-lap/', 'places/gia-lap/1', 400)).toBe('https://media.gia-lap/places/gia-lap/1/400.webp');
  });
  it('srcset đủ 3 kích thước', () => {
    expect(photoSrcset('https://media.gia-lap', 'k')).toBe(
      'https://media.gia-lap/k/400.webp 400w, https://media.gia-lap/k/800.webp 800w, https://media.gia-lap/k/1200.webp 1200w',
    );
  });
});
