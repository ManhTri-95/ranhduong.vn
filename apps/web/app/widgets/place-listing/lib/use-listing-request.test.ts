import { effectScope, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useListingRequest } from './use-listing-request';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('listing pagination context', () => {
  it.each(['params', 'page'] as const)('discards an older response after %s changes, even if transport ignores abort', async (field) => {
    const scope = effectScope();
    const params = ref({ zone: undefined as string | undefined });
    const page = ref({ items: ['unfiltered-first-page'] });
    const request = scope.run(() => useListingRequest(() => [params.value, page.value]))!;
    const older = deferred<string>();
    let signal: AbortSignal | undefined;
    const accepted: string[] = [];
    const operation = request.run(s => { signal = s; return older.promise; }, value => { accepted.push(value); }, () => { throw new Error('Cancelled requests must not report failure'); });
    if (field === 'params') params.value = { zone: 'trung-tam' };
    else page.value = { items: ['filtered-first-page'] };
    expect(signal?.aborted).toBe(true);
    older.resolve('unfiltered-next-page');
    await operation;
    expect(accepted).toEqual([]);
    expect(request.active.value).toBe(false);
    scope.stop();
  });
  it('does not let an old completion clear the loading state of a new request', async () => {
    const scope = effectScope(), context = ref('old');
    const request = scope.run(() => useListingRequest(() => context.value))!;
    const older = deferred<string>(), newer = deferred<string>();
    const accepted: string[] = [];
    const first = request.run(() => older.promise, value => { accepted.push(value); }, () => {});
    context.value = 'new';
    const second = request.run(() => newer.promise, value => { accepted.push(value); }, () => {});
    older.resolve('old'); await first;
    expect(request.active.value).toBe(true);
    newer.resolve('new'); await second;
    expect(accepted).toEqual(['new']);
    expect(request.active.value).toBe(false);
    scope.stop();
  });
  it('prevents duplicate submissions and ignores errors after its component scope is disposed', async () => {
    const scope = effectScope();
    const request = scope.run(() => useListingRequest(() => 'context'))!;
    const pending = deferred<string>();
    let calls = 0, failures = 0;
    const first = request.run(() => { calls++; return pending.promise; }, () => {}, () => { failures++; });
    await request.run(async () => { calls++; return 'duplicate'; }, () => {}, () => {});
    expect(calls).toBe(1);
    scope.stop(); pending.reject(new Error('Late transport failure')); await first;
    expect(failures).toBe(0);
    expect(request.active.value).toBe(false);
  });
  it('blocks a new page request while the matching first page is still refreshing', async () => {
    const scope = effectScope(), ready = ref(false);
    const request = scope.run(() => useListingRequest(() => 'new-area', () => ready.value))!;
    let calls = 0;
    await request.run(async () => { calls++; return 'old-cursor'; }, () => {}, () => {});
    expect(calls).toBe(0);
    ready.value = true;
    await request.run(async () => { calls++; return 'matching-cursor'; }, () => {}, () => {});
    expect(calls).toBe(1);
    scope.stop();
  });
});
