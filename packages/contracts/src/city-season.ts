import type { CitySeason } from './city.js';

export function citySeasonKind(season: CitySeason): 'flower' | 'rain' | 'other' {
  if (season.kind) return season.kind;
  if (season.key === 'da-quy' || season.key === 'mai-anh-dao') return 'flower';
  return season.key === 'mua-mua' ? 'rain' : 'other';
}

export function cityMonthDay(now: Date, timezone: 'Asia/Ho_Chi_Minh'): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, month: '2-digit', day: '2-digit' }).formatToParts(now);
  return `${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`;
}

/** Inclusive recurring dates; flowers take priority, then the editorial order. */
export function selectCitySeason(seasons: CitySeason[], now: Date, timezone: 'Asia/Ho_Chi_Minh'): CitySeason | null {
  const day = cityMonthDay(now, timezone);
  const matches = seasons.filter(({ from, to }) => from <= to ? day >= from && day <= to : day >= from || day <= to);
  return matches.find((season) => citySeasonKind(season) === 'flower') ?? matches[0] ?? null;
}
