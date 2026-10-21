import { describe, expect, it, vi } from 'vitest';
import { PlanningSnapshot } from './planning-snapshot';

describe('S37 place snapshot', () => {
  it('shares concurrent loads, keeps cities separate and expires after ten minutes', async () => {
    const cache = new PlanningSnapshot();
    const load = vi.fn(async () => []);
    await Promise.all([cache.get('a', load, 0), cache.get('a', load, 0)]);
    await cache.get('a', load, 599999);
    expect(load).toHaveBeenCalledTimes(1);
    await cache.get('b', load, 599999);
    await cache.get('a', load, 600000);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('invalidates immediately and does not revive an invalidated in-flight load', async () => {
    const cache = new PlanningSnapshot();
    let finish!: (value: []) => void;
    const old = cache.get('a', () => new Promise<[]>((resolve) => { finish = resolve; }), 0);
    cache.invalidate();
    const fresh = vi.fn(async () => []);
    await cache.get('a', fresh, 1);
    finish([]);
    await old;
    await cache.get('a', fresh, 2);
    expect(fresh).toHaveBeenCalledTimes(1);
  });

  it('retries rejected loads', async () => {
    const cache = new PlanningSnapshot();
    await expect(cache.get('a', async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    await expect(cache.get('a', async () => [])).resolves.toEqual([]);
  });
});
