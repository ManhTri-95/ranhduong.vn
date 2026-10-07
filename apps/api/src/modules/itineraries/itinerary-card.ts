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
