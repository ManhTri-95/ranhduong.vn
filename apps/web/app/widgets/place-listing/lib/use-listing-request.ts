import { onScopeDispose, ref, watch } from 'vue';

/** Own pagination requests across both route disposal and an in-place first-page/context refresh. */
export function useListingRequest(context: () => unknown, ready: () => boolean = () => true) {
  const active = ref(false);
  let generation = 0;
  let controller: AbortController | undefined;
  function invalidate(): void { generation++; controller?.abort(); active.value = false; }
  watch([context, ready], invalidate, { flush: 'sync' });
  onScopeDispose(invalidate);
  async function run<T>(load: (signal: AbortSignal) => Promise<T>, accept: (value: T, current: () => boolean) => void | Promise<void>, fail: () => void): Promise<void> {
    if (active.value || !ready()) return;
    controller = new AbortController();
    const request = ++generation;
    const current = () => request === generation;
    active.value = true;
    try {
      const value = await load(controller.signal);
      if (current()) await accept(value, current);
    } catch { if (current()) fail(); }
    finally { if (current()) active.value = false; }
  }
  return { active, run };
}
