import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { ApiError } from '@ranhduong/contracts';
import { ApiException } from './api-exception';

const BAD_REQUEST: ApiError = { code: 'VALIDATION_FAILED', message: 'Yêu cầu không hợp lệ' };
const BY_STATUS: Partial<Record<number, ApiError>> = {
  400: BAD_REQUEST,
  401: { code: 'UNAUTHENTICATED', message: 'Cần đăng nhập' },
  403: { code: 'FORBIDDEN', message: 'Không có quyền' },
  404: { code: 'NOT_FOUND', message: 'Không tìm thấy' },
  429: { code: 'RATE_LIMITED', message: 'Gửi quá nhiều yêu cầu, thử lại sau' },
};
const INTERNAL: ApiError = { code: 'INTERNAL_ERROR', message: 'Có lỗi phía máy chủ, thử lại sau' };

/** Đổi mọi lỗi sang `{ code, message, details? }` (technical-design mục 6). Tách khỏi filter để test không cần HTTP. */
export function toApiError(exception: unknown): { status: number; body: ApiError } {
  if (exception instanceof ApiException) return { status: exception.getStatus(), body: exception.body };
  if (exception instanceof HttpException && exception.getStatus() < 500) {
    const status = exception.getStatus();
    return { status, body: { ...(BY_STATUS[status] ?? BAD_REQUEST) } };
  }
  return { status: 500, body: { ...INTERNAL } };
}

interface HttpResponse {
  status(code: number): { json(body: unknown): unknown };
}

/** Filter chung cho mọi route. Lỗi hệ thống ghi log đầy đủ, nhưng chỉ trả thông điệp chung cho người gọi. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = toApiError(exception);
    if (status >= 500) {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    }
    host.switchToHttp().getResponse<HttpResponse>().status(status).json(body);
  }
}
