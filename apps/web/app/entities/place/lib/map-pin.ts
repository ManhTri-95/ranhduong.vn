import type { PlaceCategory } from '@ranhduong/contracts';

// One vector source for both the committed sprite and the selected HTML marker.
const icons: Record<PlaceCategory, string> = {
  cafe: '<path d="M10 13h13v6a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5zM23 14h2a3 3 0 0 1 0 6h-2M9 27h17M14 8v2M19 7v3"/>',
  food: '<path d="M8 17h20a10 10 0 0 1-20 0zM13 27h10M12 8l12 5M14 6l12 5"/>',
  attraction: '<circle cx="18" cy="17" r="5"/><path d="M18 7v2M18 25v2M8 17h2M26 17h2M11 10l1.5 1.5M24.5 23.5L26 25M11 24l1.5-1.5M24.5 10.5L26 9"/>',
  activity: '<path d="M7 27l9-16 7 16zM19 20l4-8 6 15h-6M12 18l4 3 3-3M16 11V6l6 2-6 2"/>',
  stay: '<path d="M8 27V12M28 27V17H8v7h20M11 17v-5h6v5M17 17v-7h8l3 7M8 24v3M28 24v3"/>',
  shop: '<path d="M10 13h16l2 15H8zM14 13v-3a4 4 0 0 1 8 0v3M14 17v1M22 17v1"/>',
};

export function placePinSvg(category: PlaceCategory, fill = 'var(--accent)', stroke = 'var(--ink)'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44" aria-hidden="true" focusable="false"><path d="M18 42C15 37 2 28 2 18 2 8 9 2 18 2c9 0 16 6 16 16 0 10-12 19-16 24z" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/><g fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[category]}</g></svg>`;
}
