import { HttpException, type HttpStatus } from '@nestjs/common';
import type { ApiError, ErrorCode } from '@ranhduong/contracts';

/** Lỗi có kiểm soát: filter chung trả nguyên `{ code, message, details? }` với mã HTTP đi kèm. */
export class ApiException extends HttpException {
  readonly body: ApiError;

  constructor(code: ErrorCode, status: HttpStatus, message: string, details?: unknown) {
    const body: ApiError = details === undefined ? { code, message } : { code, message, details };
    super(body, status);
    this.body = body;
  }
}
