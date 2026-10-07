import { describe, expect, it } from 'vitest';
import { ItineraryCard, ItineraryTemplateQuery } from './itinerary.js';

const CARD = { slug: 'lich-trinh-gia-lap', title: 'Lịch trình Giả Lập', days: 3, transport: 'motorbike', pace: 'relaxed' };

describe('ItineraryCard', () => {
  it('nhận thẻ hợp lệ; ảnh bìa tuỳ chọn', () => {
    expect(ItineraryCard.parse(CARD)).toEqual(CARD);
    expect(ItineraryCard.parse({ ...CARD, coverKey: 'gia-lap/1' }).coverKey).toBe('gia-lap/1');
  });
  it('từ chối số ngày ngoài 1–5, phương tiện lạ, thiếu slug', () => {
    expect(ItineraryCard.safeParse({ ...CARD, days: 0 }).success).toBe(false);
    expect(ItineraryCard.safeParse({ ...CARD, days: 6 }).success).toBe(false);
    expect(ItineraryCard.safeParse({ ...CARD, transport: 'bike' }).success).toBe(false);
    expect(ItineraryCard.safeParse({ ...CARD, slug: undefined }).success).toBe(false);
  });
});

describe('ItineraryTemplateQuery', () => {
  it('mặc định 10, đọc từ chuỗi, trong khoảng 1–20', () => {
    expect(ItineraryTemplateQuery.parse({})).toEqual({ limit: 10 });
    expect(ItineraryTemplateQuery.parse({ limit: '20' })).toEqual({ limit: 20 });
    for (const limit of ['0', '21', 'x']) expect(ItineraryTemplateQuery.safeParse({ limit }).success, limit).toBe(false);
  });
});
