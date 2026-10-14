import type { ActivationIssue, ActivationIssueCode } from '@ranhduong/contracts';
import { ACTIVATION_LABEL } from '@/entities/place/model/missing';

export interface ChecklistItem {
  code: ActivationIssueCode;
  label: string;
  /** id của mục form để nhảy tới. */
  target: string;
  ok: boolean;
  messages: string[];
}

const TARGET: Record<ActivationIssueCode, string> = {
  location_missing: 'sec-location',
  hours_invalid: 'sec-hours',
  verify_source_missing: 'sec-verify',
  photo_source_missing: 'sec-photos',
};
const ORDER: readonly ActivationIssueCode[] = ['location_missing', 'hours_invalid', 'verify_source_missing', 'photo_source_missing'];

/** Bốn điều kiện kích hoạt (ui-spec §12), mỗi điều kiện kèm câu chi tiết còn thiếu. */
export function activationChecklist(issues: readonly ActivationIssue[]): ChecklistItem[] {
  return ORDER.map((code) => {
    const messages = issues.filter((issue) => issue.code === code).map((issue) => issue.message);
    return { code, label: ACTIVATION_LABEL[code], target: TARGET[code], ok: messages.length === 0, messages };
  });
}
