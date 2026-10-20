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

/** Mùa phủ ngày `monthDay` ('MM-DD'): bao gồm hai đầu, `from > to` là mùa vắt qua năm mới. */
export function seasonCovers({ from, to }: Pick<CitySeason, 'from' | 'to'>, monthDay: string): boolean {
  return from <= to ? monthDay >= from && monthDay <= to : monthDay >= from || monthDay <= to;
}

/** Inclusive recurring dates; flowers take priority, then the editorial order. */
export function selectCitySeason(seasons: CitySeason[], now: Date, timezone: 'Asia/Ho_Chi_Minh'): CitySeason | null {
  const day = cityMonthDay(now, timezone);
  const matches = seasons.filter((season) => seasonCovers(season, day));
  return matches.find((season) => citySeasonKind(season) === 'flower') ?? matches[0] ?? null;
}

/** Ngày `monthDay` nằm trong một mùa mưa của thành phố (thuật toán lịch trình); không có mùa mưa thì false. */
export function inRainSeason(seasons: readonly CitySeason[], monthDay: string): boolean {
  return seasons.some((season) => citySeasonKind(season) === 'rain' && seasonCovers(season, monthDay));
}
