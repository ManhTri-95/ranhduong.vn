import { createHash } from 'node:crypto';
import { normalizeVnPhone, type CsvPlaceDraft } from '@ranhduong/contracts';
import type { DuplicateSubject } from '@ranhduong/geo';
import type { DuplicateRow } from './place-edit';

export interface CsvImportCandidate extends DuplicateRow { importKeys: string[] }

/** Lưu khoá gốc riêng với trường có thể sửa: retry không tạo lại địa điểm sau khi admin đổi số/tên. */
export function csvImportKeys(draft: CsvPlaceDraft): string[] {
  const keys = [
    ...(draft.sheetId ? [`sheet:${draft.sheetId}`] : []),
    ...(draft.osmId ? [`osm:${draft.osmId}`] : []),
    ...(draft.place.contact.phone ? [`phone:${draft.place.contact.phone}`] : []),
  ];
  return keys.length ? keys : [`content:${createHash('sha256').update(JSON.stringify(draft.place)).digest('hex')}`];
}

export function candidateImportKeys(candidate: CsvImportCandidate): string[] {
  const phone = candidate.phone ? normalizeVnPhone(candidate.phone) : null;
  return [...candidate.importKeys, ...(candidate.osmId ? [`osm:${candidate.osmId}`] : []), ...(phone ? [`phone:${phone}`] : [])];
}

export function csvDuplicateSubject(draft: CsvPlaceDraft): DuplicateSubject {
  const [lng, lat] = draft.place.location?.coordinates ?? [];
  return {
    name: draft.place.name, phone: draft.place.contact.phone, fanpage: draft.place.contact.fanpage, osmId: draft.osmId,
    location: lng !== undefined && lat !== undefined ? { lng, lat } : undefined,
  };
}
