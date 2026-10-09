import type { PlaceCard } from '@ranhduong/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchSuggestions, type SearchSuggestionsState } from './search-suggestions';

const fakePlace = (slug: string): PlaceCard => ({ slug, name: `Quán Giả Lập ${slug}`, category: 'cafe', openingHours: [], unconfirmed: true });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('S13 search suggestions', () => {
  let state: SearchSuggestionsState;
  beforeEach(() => {
    vi.useFakeTimers();
    state = { items: [], pending: false, failed: false };
  });
  afterEach(() => { vi.useRealTimers(); });

  it('debounces typing by 250ms and shows at most six suggestions for the last query', async () => {
    const queries: string[] = [];
    const controller = createSearchSuggestions(async (q) => {
      queries.push(q);
      return Array.from({ length: 8 }, (_, i) => fakePlace(`gia-lap-${i}`));
    }, (next) => { state = next; });
    controller.search('ca');
    await vi.advanceTimersByTimeAsync(150);
    controller.search('ca phe may');
    await vi.advanceTimersByTimeAsync(249);
    expect(queries).toEqual([]);
    expect(state.pending).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(queries).toEqual(['ca phe may']);
    expect(state.items).toHaveLength(6);
    expect(state.pending).toBe(false);
  });

  it('does not request empty, punctuation-only or one-character normalized input', async () => {
    let calls = 0;
    const controller = createSearchSuggestions(async () => { calls++; return []; }, (next) => { state = next; });
    for (const q of ['', '  ', '(.*)', 'đ', ' e\u0302 ']) {
      controller.search(q);
      await vi.advanceTimersByTimeAsync(300);
      expect(state).toEqual({ items: [], pending: false, failed: false });
    }
    expect(calls).toBe(0);
  });

  it('aborts older requests and ignores their late success or failure', async () => {
    const old = deferred<PlaceCard[]>();
    const fresh = deferred<PlaceCard[]>();
    const signals: AbortSignal[] = [];
    const controller = createSearchSuggestions((q, signal) => {
      signals.push(signal);
      return q === 'ca' ? old.promise : fresh.promise;
    }, (next) => { state = next; });
    controller.search('ca');
    await vi.advanceTimersByTimeAsync(250);
    controller.search('may');
    expect(signals[0]?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(250);
    fresh.resolve([fakePlace('moi')]);
    await vi.advanceTimersByTimeAsync(0);
    old.reject(new Error('Old request failed'));
    await vi.advanceTimersByTimeAsync(0);
    expect(state.items.map((item) => item.slug)).toEqual(['moi']);
    expect(state.failed).toBe(false);
  });

  it.each(['clear', 'dismiss'])('%s cancels work and a late response cannot reopen suggestions', async (mode) => {
    const response = deferred<PlaceCard[]>();
    let signal: AbortSignal | undefined;
    const controller = createSearchSuggestions((_q, nextSignal) => {
      signal = nextSignal;
      return response.promise;
    }, (next) => { state = next; });
    controller.search('may');
    await vi.advanceTimersByTimeAsync(250);
    if (mode === 'clear') controller.search('');
    else controller.cancel();
    expect(signal?.aborted).toBe(true);
    response.resolve([fakePlace('cu')]);
    await vi.advanceTimersByTimeAsync(0);
    expect(state).toEqual({ items: [], pending: false, failed: false });
  });

  it('cancel also clears a scheduled debounce before any fetch', async () => {
    let calls = 0;
    const controller = createSearchSuggestions(async () => { calls++; return []; }, (next) => { state = next; });
    controller.search('may');
    controller.cancel();
    await vi.advanceTimersByTimeAsync(500);
    expect(calls).toBe(0);
  });

  it('reports a network error and a new search retries successfully', async () => {
    let calls = 0;
    const controller = createSearchSuggestions(async () => {
      if (++calls === 1) throw new Error('Network failed');
      return [fakePlace('thu-lai')];
    }, (next) => { state = next; });
    controller.search('may');
    await vi.advanceTimersByTimeAsync(500);
    expect(state).toEqual({ items: [], pending: false, failed: true });
    expect(calls).toBe(1);
    controller.search('may');
    await vi.advanceTimersByTimeAsync(250);
    expect(state.items.map((item) => item.slug)).toEqual(['thu-lai']);
    expect(state.failed).toBe(false);
  });

  it('trims and caps pasted queries without splitting emoji surrogate pairs', async () => {
    let sent = '';
    const controller = createSearchSuggestions(async (q) => { sent = q; return []; }, (next) => { state = next; });
    controller.search(`  ${'a'.repeat(99)}😀extra  `);
    await vi.advanceTimersByTimeAsync(250);
    expect(sent).toBe('a'.repeat(99));
    expect(state).toEqual({ items: [], pending: false, failed: false });
  });
});
