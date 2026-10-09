import type { PlaceCard } from '@ranhduong/contracts';
import { searchKey } from '@ranhduong/geo';
import { parseSearchQuery } from './search-query';

export interface SearchSuggestionsState {
  items: PlaceCard[];
  pending: boolean;
  failed: boolean;
}

/** One request per pause in typing; abort plus generation checks also cover fetchers that ignore AbortSignal. */
export function createSearchSuggestions(
  fetchItems: (q: string, signal: AbortSignal) => Promise<PlaceCard[]>,
  changed: (state: SearchSuggestionsState) => void,
) {
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;

  function cancel(): void {
    generation++;
    clearTimeout(timer);
    request?.abort();
    request = undefined;
    changed({ items: [], pending: false, failed: false });
  }

  function search(input: string): void {
    cancel();
    const q = parseSearchQuery(input);
    if (searchKey(q).length < 2) return;
    const current = generation;
    changed({ items: [], pending: true, failed: false });
    timer = setTimeout(async () => {
      const controller = new AbortController();
      request = controller;
      try {
        const items = await fetchItems(q, controller.signal);
        if (current === generation) changed({ items: items.slice(0, 6), pending: false, failed: false });
      } catch {
        if (current === generation) changed({ items: [], pending: false, failed: true });
      } finally {
        if (current === generation) request = undefined;
      }
    }, 250);
  }

  return { search, cancel };
}
