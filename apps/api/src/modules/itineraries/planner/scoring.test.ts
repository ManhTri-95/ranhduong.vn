import type { BestTime, PlaceCover, TripInterest, TripWith } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { fakePlace } from '../../../testing/planner-fixtures';
import { byScore, interestMatch, pickVisits, pinOf, popularityShares, scorePlace, type ScoredPlace } from './scoring';

const req = (tags: TripInterest[], w: TripWith = 'friends') => ({ tags, with: w });
const scored = (n: number, score: number, bestTime: BestTime[] = []): ScoredPlace => ({ place: fakePlace(n, { bestTime }), score, match: 0 });

describe('interestMatch', () => {
  it('không có tiêu chí thì 0', () => {
    expect(interestMatch(fakePlace(1, { tags: ['chill'] }), req([]))).toBe(0);
  });
  it('tỉ lệ gu khớp theo bảng gu → thẻ', () => {
    expect(interestMatch(fakePlace(1, { tags: ['chill'] }), req(['chill_cafe']))).toBe(1);
    expect(interestMatch(fakePlace(1, { tags: ['chill'] }), req(['chill_cafe', 'photo_spots']))).toBe(0.5);
    expect(interestMatch(fakePlace(1, { tags: ['dac-san'] }), req(['breakfast_specialties']))).toBe(1);
  });
  it('săn mây khớp cả điểm có thời điểm đẹp bình minh', () => {
    expect(interestMatch(fakePlace(1, { bestTime: ['sunrise'] }), req(['clouds_hills']))).toBe(1);
  });
  it('Gia đình thêm một tiêu chí thẻ gia-dinh; đi cùng khác không thêm', () => {
    expect(interestMatch(fakePlace(1, { tags: ['gia-dinh'] }), req([], 'family'))).toBe(1);
    expect(interestMatch(fakePlace(1, { tags: ['chill'] }), req(['chill_cafe'], 'family'))).toBe(0.5);
    expect(interestMatch(fakePlace(1, { tags: ['gia-dinh'] }), req([], 'couple'))).toBe(0);
  });
});

describe('popularityShares', () => {
  it('chia cho max; thiếu số liệu hoặc toàn 0 thì 0', () => {
    expect([...popularityShares(['a', 'b', 'c'], new Map([['a', 10], ['b', 5]]))]).toEqual([['a', 1], ['b', 0.5], ['c', 0]]);
    expect([...popularityShares(['a'], new Map())]).toEqual([['a', 0]]);
    expect([...popularityShares(['a'], new Map([['a', 0]]))]).toEqual([['a', 0]]);
  });
});

describe('scorePlace', () => {
  const base = { request: req(['chill_cafe']), popularityShare: 0.5, rainy: false };
  it('0,5 × khớp gu + 0,3 × độ phổ biến + 0,2 × ratingAvg/5', () => {
    expect(scorePlace(fakePlace(1, { tags: ['chill'] }), base)).toBeCloseTo(0.65);
    expect(scorePlace(fakePlace(1, { tags: ['chill'], ratingAvg: 4 }), base)).toBeCloseTo(0.81);
  });
  it('ngày mưa cộng điểm mái che: che hết rồi che một phần', () => {
    const covers: (PlaceCover | undefined)[] = ['full', 'partial', 'none', undefined];
    expect(covers.map((cover) => scorePlace(fakePlace(1, { cover }), { ...base, rainy: true }))).toEqual([0.35, 0.25, 0.15, 0.15].map((v) => expect.closeTo(v)));
    expect(scorePlace(fakePlace(1, { cover: 'full' }), base)).toBeCloseTo(0.15);
  });
});

describe('pinOf', () => {
  it('bình minh ghim đầu ngày (ưu tiên), buổi tối ghim cuối ngày', () => {
    const times: BestTime[][] = [['sunrise', 'morning'], ['evening'], ['sunrise', 'evening'], []];
    expect(times.map((bestTime) => pinOf({ bestTime }))).toEqual(['first', 'last', 'first', undefined]);
  });
});

describe('byScore', () => {
  it('điểm cao trước; hoà (chênh dưới EPS) thì id nhỏ trước', () => {
    expect([scored(1, 0.2), scored(2, 0.5)].sort(byScore).map((p) => p.place.name)).toEqual(['Điểm Giả Lập 2', 'Điểm Giả Lập 1']);
    expect([scored(2, 0.3), scored(1, 0.1 + 0.2)].sort(byScore).map((p) => p.place.name)).toEqual(['Điểm Giả Lập 1', 'Điểm Giả Lập 2']);
  });
});

describe('pickVisits', () => {
  const ranked = [scored(1, 0.9, ['sunrise']), scored(2, 0.8, ['sunrise']), scored(3, 0.7, ['evening']), scored(4, 0.6, ['evening']), scored(5, 0.5), scored(6, 0.4)];
  it('bỏ điểm đã dùng và điểm ghim trùng loại, dừng ở target', () => {
    expect(pickVisits(ranked, 3, new Set([fakePlace(5).id])).map((p) => p.place.name)).toEqual(['Điểm Giả Lập 1', 'Điểm Giả Lập 3', 'Điểm Giả Lập 6']);
  });
  it('hết ứng viên thì trả ít hơn target', () => {
    expect(pickVisits(ranked.slice(0, 2), 4, new Set())).toHaveLength(1);
  });
  it('một điểm xuất hiện hai lần trong danh sách chỉ được chọn một lần', () => {
    expect(pickVisits([scored(5, 0.5), scored(5, 0.4), scored(6, 0.3)], 3, new Set())).toHaveLength(2);
  });
});
