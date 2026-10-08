import type { DuplicateMatch } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { distanceText, duplicateHeading, matchMeta } from './match-meta';

const MATCH: DuplicateMatch = { id: '0123456789abcdef01234567', name: 'Giả Lập Mây', status: 'active', score: 0.47, level: 'possible' };

describe('matchMeta', () => {
  it('ghép cụm, khoảng cách, trạng thái; thiếu phần nào thì bỏ phần đó', () => {
    expect(matchMeta({ ...MATCH, zoneName: 'Cụm Giả Lập A', distanceM: 40 })).toBe('Cụm Giả Lập A · cách 40 m · Đang hiển thị');
    expect(matchMeta({ ...MATCH, status: 'draft', distanceM: 1234 })).toBe('cách 1,2 km · Nháp');
    expect(matchMeta(MATCH)).toBe('Đang hiển thị');
  });
  it('dưới 1 km ghi mét, từ 1 km ghi km một chữ số thập phân', () => {
    expect(distanceText(999)).toBe('cách 999 m');
    expect(distanceText(1000)).toBe('cách 1 km');
  });
});

describe('duplicateHeading', () => {
  it('có chỗ rất có thể trùng thì nói rõ hơn', () => {
    expect(duplicateHeading([{ ...MATCH, level: 'likely' }, MATCH])).toBe('Rất có thể đã có chỗ này:');
    expect(duplicateHeading([MATCH])).toBe('Có thể trùng với:');
  });
});
