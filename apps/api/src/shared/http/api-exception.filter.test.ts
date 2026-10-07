import { BadRequestException, ForbiddenException, HttpStatus, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ApiException } from './api-exception';
import { toApiError } from './api-exception.filter';

describe('toApiError', () => {
  it('ApiException giữ nguyên mã, thông điệp và chi tiết', () => {
    const err = new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy thành phố', { slug: 'gia-lap' });
    expect(toApiError(err)).toEqual({
      status: 404,
      body: { code: 'NOT_FOUND', message: 'Không tìm thấy thành phố', details: { slug: 'gia-lap' } },
    });
  });
  it('lỗi HTTP có sẵn của Nest đổi sang mã lỗi chung, thông điệp tiếng Việt', () => {
    expect(toApiError(new NotFoundException('Cannot GET /v1/x'))).toEqual({ status: 404, body: { code: 'NOT_FOUND', message: 'Không tìm thấy' } });
    expect(toApiError(new BadRequestException())).toMatchObject({ status: 400, body: { code: 'VALIDATION_FAILED' } });
    expect(toApiError(new ForbiddenException())).toMatchObject({ status: 403, body: { code: 'FORBIDDEN' } });
    expect(toApiError(new PayloadTooLargeException())).toMatchObject({ status: 413, body: { code: 'VALIDATION_FAILED' } });
  });
  it('lỗi không lường trước trả 500 INTERNAL_ERROR và không lộ chi tiết', () => {
    expect(toApiError(new Error('chuỗi kết nối giả lập'))).toEqual({
      status: 500,
      body: { code: 'INTERNAL_ERROR', message: 'Có lỗi phía máy chủ, thử lại sau' },
    });
  });
});
