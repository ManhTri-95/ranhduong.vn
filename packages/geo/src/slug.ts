/** Slug thuộc gốc `base`: đúng bằng base hoặc base-<số> (do nextFreeSlug sinh). */
export function isSlugOf(slug: string, base: string): boolean {
  return slug === base || (slug.startsWith(`${base}-`) && /^\d+$/.test(slug.slice(base.length + 1)));
}

/** Slug chưa dùng cho gốc `base` (ADR 0010): base, rồi base-2, base-3… */
export function nextFreeSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const slug = `${base}-${n}`;
    if (!taken.has(slug)) return slug;
  }
}
