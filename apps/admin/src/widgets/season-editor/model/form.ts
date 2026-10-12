import { citySeasonKind, type CitySeasonForm, type CitySeasonLocalDraft, type CitySeasonSettings } from '@ranhduong/contracts';

export type SeasonIllustration = 'wild-sunflower' | 'cherry-blossom' | 'rain' | 'notebook';
export function newSeason(illustration: SeasonIllustration = 'notebook'): CitySeasonForm {
  const presets = {
    'wild-sunflower': { key: 'da-quy', kind: 'flower' as const, accent: '#E9B824', title: 'Đà Lạt vào mùa dã quỳ' },
    'cherry-blossom': { key: 'mai-anh-dao', kind: 'flower' as const, accent: '#E58FA8', title: 'Đà Lạt vào mùa mai anh đào' },
    rain: { key: 'mua-mua', kind: 'rain' as const, accent: '#8DB3CF', title: 'Đà Lạt mùa mưa' },
    notebook: { key: '', kind: 'other' as const, accent: '#E9B824', title: '' },
  };
  return { ...presets[illustration], illustration, from: '', to: '', sub: '', featuredItineraryId: '' };
}

export function moveSeason(rows: CitySeasonForm[], from: number, to: number): CitySeasonForm[] {
  const result = [...rows];
  if (from < 0 || to < 0 || from >= rows.length || to >= rows.length) return result;
  const row = result.splice(from, 1)[0];
  if (row) result.splice(to, 0, row);
  return result;
}

export function seasonForm(settings: CitySeasonSettings): CitySeasonLocalDraft {
  return { updatedAt: settings.updatedAt, seasons: settings.seasons.map((season) => ({ ...season, kind: citySeasonKind(season), featuredItineraryId: season.featuredItineraryId ?? '' })) };
}

export function seasonInput(form: CitySeasonLocalDraft) {
  return { updatedAt: form.updatedAt, seasons: form.seasons.map(({ featuredItineraryId, ...season }) => featuredItineraryId ? { ...season, featuredItineraryId } : season) };
}
