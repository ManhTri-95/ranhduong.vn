import type { PlaceCategory } from '@ranhduong/contracts';

export function rainFilterSelected(value: unknown): boolean { return value === 'true'; }
export function mapFilterQuery(category: PlaceCategory | undefined, rainSafe: boolean): Record<string, string> {
  return { ...(category ? { category } : {}), ...(rainSafe ? { rainSafe: 'true' } : {}) };
}
