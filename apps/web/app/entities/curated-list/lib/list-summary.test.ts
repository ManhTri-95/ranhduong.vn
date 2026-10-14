import type { PlaceCard } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { curatedListSummary } from './list-summary';

const place = (slug: string, category: PlaceCard['category'], zoneName?: string): PlaceCard => ({
  slug, name: `Quán Giả Lập ${slug}`, category, openingHours: [], unconfirmed: false, ...(zoneName ? { zoneName } : {}),
});

describe('curatedListSummary', () => {
  it('ghi số địa điểm, danh mục chính và khu vực không trùng theo thứ tự trong danh sách', () => {
    expect(curatedListSummary([place('a', 'cafe', 'Phía Đông'), place('b', 'cafe', 'Phía Đông'), place('c', 'food', 'Trung tâm')]))
      .toBe('3 địa điểm · Cà phê, Ăn uống · Phía Đông, Trung tâm');
  });
  it('bỏ phần khu vực khi không chỗ nào có khu vực; danh sách rỗng thì rỗng', () => {
    expect(curatedListSummary([place('a', 'attraction')])).toBe('1 địa điểm · Tham quan');
    expect(curatedListSummary([])).toBe('');
  });
});
