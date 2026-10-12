import type { ItineraryCard } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { promoteItinerary } from './promote-itinerary';
const card = (slug: string): ItineraryCard => ({ slug, title: 'Lịch trình Giả Lập', days: 1, transport: 'motorbike', pace: 'relaxed' });
describe('seasonal itinerary promotion', () => {
  it('preserves order without a featured itinerary', () => {
    expect(promoteItinerary([card('a'), card('b')], null).map((item) => item.slug)).toEqual(['a', 'b']);
  });
  it('promotes an existing card without duplicates or mutating the list', () => {
    const items = [card('a'), card('b'), card('c')];
    expect(promoteItinerary(items, card('c')).map((item) => item.slug)).toEqual(['c', 'a', 'b']);
    expect(items.map((item) => item.slug)).toEqual(['a', 'b', 'c']);
  });
  it('includes a featured card that was not in the limited public list', () => {
    expect(promoteItinerary([card('a')], card('outside')).map((item) => item.slug)).toEqual(['outside', 'a']);
  });
});
