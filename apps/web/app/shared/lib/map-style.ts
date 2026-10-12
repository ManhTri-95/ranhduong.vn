import type { StyleSpecification } from 'maplibre-gl';

/** Resolve asset URLs against the fetched style, including local deployment origins. */
export function resolveMapStyleSprites(style: StyleSpecification, styleUrl: string, pageUrl: string): StyleSpecification {
  if (!style.sprite) return style;
  const base = new URL(styleUrl, pageUrl);
  return {
    ...style,
    sprite: typeof style.sprite === 'string' ? new URL(style.sprite, base).href
      : style.sprite.map((sprite) => ({ ...sprite, url: new URL(sprite.url, base).href })),
  };
}
