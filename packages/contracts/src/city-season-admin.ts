import { z } from 'zod';
import { CitySeason } from './city.js';
import { HexColor, ObjectIdString } from './common.js';
import { ItineraryCard } from './itinerary.js';
import { GeoPoint } from './geojson.js';
import { CityWeather } from './weather.js';

export const CitySeasonSettings = z.object({ seasons: z.array(CitySeason), updatedAt: z.iso.datetime() });
export type CitySeasonSettings = z.infer<typeof CitySeasonSettings>;
export const CitySeasonEditInput = CitySeasonSettings.extend({
  seasons: z.array(CitySeason).max(24).superRefine((seasons, ctx) => {
    const keys = new Set<string>();
    seasons.forEach((season, index) => {
      if (keys.has(season.key)) ctx.addIssue({ code: 'custom', path: [index, 'key'], message: 'Khoá mùa bị trùng' });
      keys.add(season.key);
    });
  }),
});
export type CitySeasonEditInput = z.infer<typeof CitySeasonEditInput>;
export const CityNow = z.object({ accent: HexColor, season: CitySeason.omit({ featuredItineraryId: true }).nullable(), featuredItinerary: ItineraryCard.nullable(), weather: CityWeather.nullable().optional(), expiresAt: z.iso.datetime() });
export type CityNow = z.infer<typeof CityNow>;

/** Internal service DTO; never send this context to public clients. */
export const CitySeasonContext = CitySeasonSettings.extend({ id: ObjectIdString, accent: HexColor, center: GeoPoint, timezone: z.literal('Asia/Ho_Chi_Minh') });
export type CitySeasonContext = z.infer<typeof CitySeasonContext>;

/** Admin-only IDs paired with public cards for the season picker. */
export const SeasonItineraryOptions = z.object({ items: z.array(ItineraryCard.extend({ id: ObjectIdString })) });
export type SeasonItineraryOptions = z.infer<typeof SeasonItineraryOptions>;

/** Local drafts accept unfinished input; only the save path uses CitySeasonEditInput. */
export const CitySeasonForm = CitySeason.extend({
  key: z.string(), from: z.string(), to: z.string(), accent: z.string(),
  title: z.string(), sub: z.string(), illustration: z.string(), featuredItineraryId: z.string().default(''),
});
export type CitySeasonForm = z.infer<typeof CitySeasonForm>;
export const CitySeasonLocalDraft = z.object({ seasons: z.array(CitySeasonForm).max(24), updatedAt: z.iso.datetime() });
export type CitySeasonLocalDraft = z.infer<typeof CitySeasonLocalDraft>;
