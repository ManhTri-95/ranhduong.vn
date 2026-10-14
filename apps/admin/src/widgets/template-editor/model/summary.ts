import {
  PACE_LABEL,
  TRANSPORT_LABEL,
  type ItineraryStatus,
  type ScheduledTemplateStop,
  type TemplateAnalysis,
  type TemplateDayInput,
  type TemplateEditInput,
  type TemplateIssue,
  type TemplateStopInput,
} from '@ranhduong/contracts';

/** Dòng phụ ở đầu trang: "2 ngày · 9 điểm · xe máy · thong thả". */
export function templateMeta(form: Pick<TemplateEditInput, 'days' | 'transport' | 'pace'>): string {
  const stops = form.days.reduce((sum, day) => sum + day.stops.length, 0);
  return `${form.days.length} ngày · ${stops} điểm · ${TRANSPORT_LABEL[form.transport]} · ${PACE_LABEL[form.pace]}`;
}

export function issueCounts(analysis: Pick<TemplateAnalysis, 'issues'>): { errors: number; warnings: number } {
  const errors = analysis.issues.filter((issue) => issue.level === 'error').length;
  return { errors, warnings: analysis.issues.length - errors };
}

export interface IssueTarget {
  day: number;
  /** null: vấn đề của cả ngày (thiếu bữa, kết thúc muộn). */
  stopKey: string | null;
}
type Rank = readonly [number, number, number];
const compareRank = (a: Rank, b: Rank) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Vấn đề đầu tiên để nhảy tới: lỗi trước nhắc nhở, rồi theo ngày, rồi theo thứ tự điểm (vấn đề cả ngày đứng trước). */
export function firstIssueTarget(analysis: Pick<TemplateAnalysis, 'issues'>, days: readonly TemplateDayInput[]): IssueTarget | null {
  let best: { rank: Rank; target: IssueTarget } | null = null;
  for (const issue of analysis.issues) {
    const index = issue.stopKey ? (days[issue.day]?.stops.findIndex((stop) => stop.key === issue.stopKey) ?? -1) : -1;
    const rank: Rank = [issue.level === 'error' ? 0 : 1, issue.day, index];
    if (!best || compareRank(rank, best.rank) < 0) best = { rank, target: { day: issue.day, stopKey: issue.stopKey ?? null } };
  }
  return best?.target ?? null;
}

export interface StopRow {
  time: string;
  manual: boolean;
  errors: number;
  warnings: number;
}

/** Hàng gọn của một điểm dừng: khoảng giờ (đã tính, thiếu thì giờ sửa tay đang nhập) và số vấn đề của riêng điểm. */
export function stopRow(
  stop: Pick<TemplateStopInput, 'key' | 'manualStart' | 'manualEnd'>,
  scheduled: Pick<ScheduledTemplateStop, 'start' | 'end'> | undefined,
  issues: readonly TemplateIssue[],
): StopRow {
  const own = issues.filter((issue) => issue.stopKey === stop.key);
  const errors = own.filter((issue) => issue.level === 'error').length;
  const start = scheduled?.start ?? stop.manualStart ?? '--:--';
  const end = scheduled?.end ?? stop.manualEnd ?? '--:--';
  return { time: `${start}–${end}`, manual: Boolean(stop.manualStart || stop.manualEnd), errors, warnings: own.length - errors };
}

export function stopPosition(days: readonly TemplateDayInput[], key: string): { day: number; index: number } | null {
  for (const [day, value] of days.entries()) {
    const index = value.stops.findIndex((stop) => stop.key === key);
    if (index >= 0) return { day, index };
  }
  return null;
}

/** Câu báo cho trình đọc màn hình sau khi đổi chỗ một điểm. */
export function moveAnnouncement(days: readonly TemplateDayInput[], key: string, name: string): string {
  const position = stopPosition(days, key);
  return position ? `Đã chuyển ${name} tới vị trí ${position.index + 1}, ngày ${position.day + 1}.` : '';
}

export type PublishConfirm = 'first-publish' | 'unpublish' | null;

/** Hỏi lại khi công khai lần đầu (slug cố định từ đó) và khi chuyển về nháp (thôi hiện trên web). */
export function publishConfirm(current: ItineraryStatus | null, target: ItineraryStatus): PublishConfirm {
  if (target === 'published' && current !== 'published') return 'first-publish';
  if (target === 'draft' && current === 'published') return 'unpublish';
  return null;
}

/** Lý do nút công khai đang tắt, hiện cạnh thanh lưu; rỗng là công khai được. */
export function publishBlocker(title: string, analysis: Pick<TemplateAnalysis, 'issues' | 'canPublish'>): string {
  if (!title.trim()) return 'Chưa có tên';
  const { errors } = issueCounts(analysis);
  if (errors > 0) return `Còn ${errors} lỗi`;
  return analysis.canPublish ? '' : 'Còn lỗi cần sửa';
}
