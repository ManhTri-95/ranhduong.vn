import { randomInt, randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { createItineraryRequestSchema, ItineraryShareId, type CityRef, type ItineraryRequest, type ItineraryUserDetail } from '@ranhduong/contracts';
import { ApiException } from '../../../shared/http/api-exception';
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe';
import { isDuplicateKeyError } from '../../../shared/db/mongo-errors';
import { CitiesService } from '../../cities/cities.service';
import { PlacesService } from '../../places/places.service';
import { MetricsService } from '../../metrics/metrics.service';
import { ItinerariesRepository, type UserItineraryRow } from '../itineraries.repository';
import { generateItinerary } from '../planner/generate-itinerary';
import { roundStayLocation } from './guest-identity';
import { toUserItinerary } from './user-itinerary-public';
import type { UserItineraryInput } from './user-itinerary-record';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const shareId = () => Array.from({ length: 20 }, () => BASE62[randomInt(BASE62.length)]).join('');
const notFound = () => new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy lịch trình');

@Injectable()
export class GuestItinerariesService {
  constructor(private readonly repo: ItinerariesRepository, private readonly cities: CitiesService, private readonly places: PlacesService, private readonly metrics: MetricsService) {}

  async create(citySlug: string, raw: ItineraryRequest, gid: string, now = new Date()): Promise<ItineraryUserDetail> {
    const city = await this.cities.resolveCity(citySlug);
    const [context, publicCity] = await Promise.all([this.cities.seasonContext(citySlug), this.cities.getPublic(citySlug)]);
    const validated = new ZodValidationPipe(createItineraryRequestSchema(publicCity.mapBounds)).transform(raw);
    const request = { ...validated, stayLocation: roundStayLocation(validated.stayLocation) };
    const [places, zones, templates] = await Promise.all([
      this.places.planningSnapshot(city.id), this.cities.itineraryZones(city.id), this.repo.planningTemplates(city.id),
    ]);
    const popularity = await this.metrics.itineraryPopularity(city.id, places.map((place) => place.id), now);
    const result = generateItinerary({ request, places, zones, templates, seasons: context.seasons, popularity, now });
    if (!result.ok) throw new ApiException('NOT_ENOUGH_PLACES', HttpStatus.UNPROCESSABLE_ENTITY, 'Chưa đủ địa điểm để tạo lịch trình này.', result.details);
    const input: UserItineraryInput = {
      cityId: city.id, guestId: gid, title: `${city.name} · ${request.days} ngày`,
      params: { ...request, startWeekday: result.days[0]!.weekday }, templateId: result.templateId,
      days: result.days.map((day) => {
        const stops = day.stops.map((stop) => ({ ...stop, key: randomUUID(), note: '', locked: false, isVip: false }));
        return { day: day.day, startTime: day.startTime, zoneIds: day.zoneIds, stops,
          detours: day.detours.map((detour) => ({ afterKey: stops[detour.afterIndex]!.key, placeId: detour.placeId, detourMin: detour.detourMin })), issues: day.issues,
        };
      }),
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      let row: UserItineraryRow;
      try { row = await this.repo.insertUser(input, shareId()); }
      catch (error) { if (isDuplicateKeyError(error)) continue; throw error; }
      return this.present(row, city, gid);
    }
    throw new ApiException('CONFLICT', HttpStatus.CONFLICT, 'Chưa tạo được đường dẫn lịch trình. Thử lại nhé.');
  }

  async read(id: string, gid?: string): Promise<ItineraryUserDetail> {
    if (!ItineraryShareId.safeParse(id).success) throw notFound();
    const row = await this.repo.userByShareId(id);
    if (!row) throw notFound();
    const city = await this.cities.resolveCityById(row.cityId.toString());
    return this.present(row, city, gid);
  }

  private async present(row: UserItineraryRow, city: CityRef, gid?: string): Promise<ItineraryUserDetail> {
    const ids = [...new Set(row.days.flatMap((day) => [...day.stops.map((stop) => stop.placeId.toString()), ...(day.detours ?? []).map((detour) => detour.placeId.toString())]))];
    const places = await this.places.itineraryPlaces(city.id, ids);
    const detail = toUserItinerary(row, city, places, gid);
    if (!detail) throw notFound();
    return detail;
  }
}
