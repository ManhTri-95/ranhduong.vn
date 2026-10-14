import { describe, expect, it } from 'vitest';
import { itineraryCardMeta } from './card-meta';

describe('itineraryCardMeta', () => {
  it('ghi số điểm, phương tiện, nhịp độ; thiếu số điểm (API cũ) hoặc bằng 0 thì bỏ phần đó', () => {
    expect(itineraryCardMeta({ stopCount: 12, transport: 'motorbike', pace: 'relaxed' })).toBe('12 điểm · xe máy · thong thả');
    expect(itineraryCardMeta({ transport: 'car', pace: 'packed' })).toBe('ô tô · dày lịch');
    expect(itineraryCardMeta({ stopCount: 0, transport: 'taxi', pace: 'relaxed' })).toBe('taxi · thong thả');
  });
});
