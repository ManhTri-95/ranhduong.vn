import { Injectable } from '@nestjs/common';
import type { ItineraryCoverageQuery, ItineraryCoverageReport } from '@ranhduong/contracts';
import { CitiesService } from '../../cities/cities.service';
import { PlacesService } from '../../places/places.service';
import { MetricsService } from '../../metrics/metrics.service';
import { ItinerariesRepository } from '../itineraries.repository';
import { buildCoverageReport } from './report';

@Injectable()
export class ItineraryCoverageService {
  constructor(private readonly cities: CitiesService, private readonly places: PlacesService, private readonly repo: ItinerariesRepository, private readonly metrics: MetricsService) {}

  async report(citySlug: string, query: ItineraryCoverageQuery, now = new Date()): Promise<ItineraryCoverageReport> {
    const city = await this.cities.resolveCity(citySlug);
    const [places, zones, context, templates] = await Promise.all([
      this.places.planningPlaces(city.id), this.cities.itineraryZones(city.id), this.cities.seasonContext(citySlug), this.repo.planningTemplates(city.id),
    ]);
    const popularity = await this.metrics.itineraryPopularity(city.id, places.map((p) => p.id), now);
    return buildCoverageReport({ places, zones, seasons: context.seasons, templates, popularity, now }, query);
  }
}
