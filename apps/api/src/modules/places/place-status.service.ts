import { Injectable } from '@nestjs/common';
import {
  activationIssues,
  canVerify,
  PLACE_STATUS_LABEL,
  statusActionTarget,
  statusAfter,
  type AdminPlace,
  type AdminVerifySource,
  type PlaceStatusAction,
} from '@ranhduong/contracts';
import type { EditRow } from './place-edit';
import { PlaceEditorService } from './place-editor.service';
import { MAX_ATTEMPTS, placeBusy, placeInvalid, placeNotFound } from './place-errors';
import { PlacesRepository } from './places.repository';

const NOT_READY = 'Chưa đủ điều kiện để hiện trên web, mở form để hoàn thiện.';

/** Điều kiện kích hoạt của địa điểm như đang lưu; `verifySource` là nguồn vừa chọn khi xác minh. */
function issuesOf(row: EditRow, verifySource: unknown = row.verifySource) {
  return activationIssues({ location: row.location, openingHours: row.openingHours ?? [], verifySource, photos: row.photos ?? [] });
}

/** Chỉ ghi khi document còn như lúc đọc. */
const expectedOf = (row: EditRow) => ({ status: row.status, updatedAt: row.updatedAt ?? null });

/**
 * Xác minh, đổi trạng thái, xoá nháp từ danh sách admin (S07, technical-design mục 4). Mọi chuyển trạng thái là update
 * có điều kiện, đọc lại tối đa MAX_ATTEMPTS lần; chuyển sang active luôn kiểm điều kiện kích hoạt.
 */
@Injectable()
export class PlaceStatusService {
  constructor(
    private readonly repo: PlacesRepository,
    private readonly editor: PlaceEditorService,
  ) {}

  /** "Đã xác minh": đặt nguồn xác nhận, lastVerifiedAt là lúc bấm; nháp và chỗ bị nghi ngờ thành đang hiển thị. */
  async verify(id: string, verifySource: AdminVerifySource, now = new Date()): Promise<AdminPlace> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const current = await this.repo.findForEdit(id);
      if (!current) throw placeNotFound();
      if (!canVerify(current.status)) {
        throw placeInvalid(`Không xác minh được địa điểm đang ở trạng thái "${PLACE_STATUS_LABEL[current.status]}".`);
      }
      const issues = issuesOf(current, verifySource);
      if (issues.length > 0) throw placeInvalid(NOT_READY, issues);
      const updated = await this.repo.transition(id, expectedOf(current), {
        status: 'active',
        verifySource,
        lastVerifiedAt: now,
        suspicionScore: 0,
      });
      if (updated) return this.editor.present(updated);
    }
    throw placeBusy();
  }

  /** Ẩn, hiện lại, đánh dấu đã đóng cửa, mở lại. Đã ở trạng thái đích (bấm lại) thì trả nguyên. */
  async changeStatus(id: string, action: PlaceStatusAction): Promise<AdminPlace> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const current = await this.repo.findForEdit(id);
      if (!current) throw placeNotFound();
      if (current.status === statusActionTarget(action)) return this.editor.present(current);
      const target = statusAfter(current.status, action);
      if (target === null) {
        throw placeInvalid(`Không làm được thao tác này với địa điểm đang ở trạng thái "${PLACE_STATUS_LABEL[current.status]}".`);
      }
      if (target === 'active') {
        const issues = issuesOf(current);
        if (issues.length > 0) throw placeInvalid(NOT_READY, issues);
      }
      const updated = await this.repo.transition(id, expectedOf(current), { status: target });
      if (updated) return this.editor.present(updated);
    }
    throw placeBusy();
  }

  /**
   * Xoá hẳn nháp (chủ dự án chọn 2026-10-08): nháp chưa từng có URL công khai nên không gãy link (ADR 0010).
   * Chỗ đã công khai thì ẩn hoặc đánh dấu đã đóng cửa.
   */
  async deleteDraft(id: string): Promise<void> {
    const current = await this.repo.findForEdit(id);
    if (!current) throw placeNotFound();
    if (current.status !== 'draft') {
      throw placeInvalid('Chỉ xoá được nháp. Chỗ đã hiện trên web thì ẩn hoặc đánh dấu đã đóng cửa để giữ đường dẫn.');
    }
    // Vừa được kích hoạt ở máy khác giữa lúc đọc và lúc xoá: không xoá.
    if (!(await this.repo.deleteDraft(id))) throw placeBusy();
  }
}
