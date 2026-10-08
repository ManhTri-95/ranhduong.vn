import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../shared/http/api-exception';

/** Số lần đọc lại khi trạng thái, updatedAt hay slug vừa bị request khác đổi. */
export const MAX_ATTEMPTS = 3;

/** Lỗi dùng chung của các service sửa địa điểm trong admin (PlaceEditorService, PlaceStatusService). */
export const placeNotFound = () => new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy địa điểm');
export const placeBusy = () =>
  new ApiException('CONFLICT', HttpStatus.CONFLICT, 'Địa điểm vừa được sửa ở nơi khác. Tải lại trang rồi thử lại.');
export const placeInvalid = (message: string, details?: unknown) =>
  new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, message, details);
