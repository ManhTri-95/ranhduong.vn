import { HttpStatus, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { ApiException } from './api-exception';

/** Validate input bằng schema Zod của packages/contracts (ADR 0011); sai thì trả 400 VALIDATION_FAILED kèm từng lỗi. */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new ApiException(
      'VALIDATION_FAILED',
      HttpStatus.BAD_REQUEST,
      'Dữ liệu gửi lên không hợp lệ',
      result.error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message })),
    );
  }
}
