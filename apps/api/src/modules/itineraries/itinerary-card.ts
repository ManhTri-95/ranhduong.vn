import { ItineraryCard } from '@ranhduong/contracts';

/** Lịch trình mẫu như repository đọc ra, chưa validate. Service đổi sang ItineraryCard. */
export interface TemplateSummary {
  id: string;
  slug?: string;
  title: string;
  days?: number;
  transport?: string;
  pace?: string;
  /** placeId của mọi điểm dừng theo thứ tự ngày, điểm. */
  stopPlaceIds: string[];
}

/** Ảnh bìa: ảnh đầu tiên của điểm dừng đầu tiên có ảnh. */
export function pickCoverKey(placeIds: string[], covers: ReadonlyMap<string, string>): string | undefined {
  for (const id of placeIds) {
    const key = covers.get(id);
    if (key) return key;
  }
  return undefined;
}

/** Validate bằng ItineraryCard của contracts; bản hỏng trả null để không làm hỏng cả danh sách. */
export function toItineraryCard(summary: TemplateSummary, covers: ReadonlyMap<string, string>): ItineraryCard | null {
  const parsed = ItineraryCard.safeParse({
    slug: summary.slug,
    title: summary.title,
    days: summary.days,
    transport: summary.transport,
    pace: summary.pace,
    coverKey: pickCoverKey(summary.stopPlaceIds, covers),
  });
  return parsed.success ? parsed.data : null;
}
