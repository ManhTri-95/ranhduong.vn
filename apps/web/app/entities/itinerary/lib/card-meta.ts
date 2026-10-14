import { PACE_LABEL, TRANSPORT_LABEL, type ItineraryCard } from '@ranhduong/contracts';

/** Dòng meta thẻ lịch trình trang chủ; số ngày hiện riêng ở đầu vé. */
export function itineraryCardMeta(card: Pick<ItineraryCard, 'stopCount' | 'transport' | 'pace'>): string {
  return [card.stopCount ? `${card.stopCount} điểm` : '', TRANSPORT_LABEL[card.transport], PACE_LABEL[card.pace]].filter(Boolean).join(' · ');
}
