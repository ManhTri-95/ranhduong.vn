import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';

export const SitemapKind = z.enum(['pages', 'places', 'lists', 'itineraries']);
export type SitemapKind = z.infer<typeof SitemapKind>;
export const SitemapSource = z.object({ slug: Slug, updatedAt: z.iso.datetime().optional() });
export type SitemapSource = z.infer<typeof SitemapSource>;
export const SitemapCity = SitemapSource.extend({ id: ObjectIdString, zones: z.array(SitemapSource) });
export type SitemapCity = z.infer<typeof SitemapCity>;
export const SitemapEntry = z.object({ path: z.string().regex(/^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/), lastmod: z.iso.datetime().optional() });
export type SitemapEntry = z.infer<typeof SitemapEntry>;
export const SitemapResponse = z.object({ items: z.array(SitemapEntry).max(50000) });
export type SitemapResponse = z.infer<typeof SitemapResponse>;

/** Skip malformed legacy slugs, retain only trustworthy stored modification times. */
export function sitemapSources(rows: { slug?: string | null; updatedAt?: Date | null }[]): SitemapSource[] {
  return rows.flatMap((row) => {
    const slug = Slug.safeParse(row.slug);
    if (!slug.success) return [];
    return [{ slug: slug.data, ...(row.updatedAt && Number.isFinite(row.updatedAt.getTime()) ? { updatedAt: row.updatedAt.toISOString() } : {}) }];
  });
}
