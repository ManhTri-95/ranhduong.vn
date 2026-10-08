import { describe, expect, it } from 'vitest';
import { formatLocalTime } from './time';

describe('formatLocalTime', () => {
  it('hiện theo giờ Việt Nam (UTC+7)', () => {
    const text = formatLocalTime('2026-10-08T07:32:00Z');
    expect(text).toMatch(/14:32/);
    expect(text).toMatch(/08\/10/);
  });
});
