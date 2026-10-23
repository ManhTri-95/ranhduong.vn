import { PlaceCategory, Slug } from '@ranhduong/contracts';

export interface MapExtraFilters { q?: string; zone?: string; tags?: string[] }
export interface MapFilters extends MapExtraFilters { category?: PlaceCategory; rainSafe: boolean }

/** URL input stays within the existing public API's limits, including GET checkbox arrays. */
export function parseMapFilters(query: Record<string, unknown>): MapFilters {
  const category = PlaceCategory.safeParse(query.category);
  const zone = Slug.safeParse(query.zone);
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100).replace(/[\uD800-\uDBFF]$/, '') : '';
  const rawTags = typeof query.tags === 'string' ? query.tags.split(',') : Array.isArray(query.tags) ? query.tags : [];
  const tags = [...new Set(rawTags.filter((tag): tag is string => typeof tag === 'string' && Slug.safeParse(tag).success))].sort().slice(0, 10);
  return { category: category.success ? category.data : undefined, rainSafe: rainFilterSelected(query.rainSafe), q: q || undefined, zone: zone.success ? zone.data : undefined, tags };
}

export function rainFilterSelected(value: unknown): boolean { return value === 'true'; }
export function mapFilterQuery(category: PlaceCategory | undefined, rainSafe: boolean, extra: MapExtraFilters = {}): Record<string, string> {
  const clean = parseMapFilters({ ...extra, category, rainSafe: rainSafe ? 'true' : undefined });
  return { ...(category ? { category } : {}), ...(rainSafe ? { rainSafe: 'true' } : {}), ...(clean.q ? { q: clean.q } : {}), ...(clean.zone ? { zone: clean.zone } : {}), ...(clean.tags?.length ? { tags: clean.tags.join(',') } : {}) };
}
