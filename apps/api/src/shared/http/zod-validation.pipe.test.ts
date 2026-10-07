import { HttpStatus } from '@nestjs/common';
import { PlaceListQuery, Slug } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { ApiException } from './api-exception';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  it('trả dữ liệu đã chuẩn hoá theo schema', () => {
    expect(new ZodValidationPipe(PlaceListQuery).transform({ limit: '6', q: ' may ' })).toMatchObject({ limit: 6, q: 'may' });
    expect(new ZodValidationPipe(Slug).transform('da-lat')).toBe('da-lat');
  });
  it('sai thì ném 400 VALIDATION_FAILED kèm đường dẫn từng lỗi', () => {
    let caught: unknown;
    try {
      new ZodValidationPipe(PlaceListQuery).transform({ limit: '0', category: 'bar' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiException);
    const err = caught as ApiException;
    expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(err.body.code).toBe('VALIDATION_FAILED');
    const paths = (err.body.details as { path: string }[]).map((d) => d.path);
    expect(paths).toContain('limit');
    expect(paths.some((p) => p.startsWith('category'))).toBe(true);
  });
});
