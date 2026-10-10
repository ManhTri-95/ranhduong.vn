import { Injectable } from '@nestjs/common';
import { CATEGORY_URL_SLUG, SitemapResponse, type SitemapKind, type SitemapEntry, type SitemapSource } from '@ranhduong/contracts';
import { CitiesService } from '../cities/cities.service';
import { PlacesService } from '../places/places.service';
import { CuratedListsService } from '../curated-lists/curated-lists.service';
import { ItinerariesService } from '../itineraries/itineraries.service';

@Injectable()
export class SeoService {
  constructor(private readonly cities: CitiesService, private readonly places: PlacesService, private readonly lists: CuratedListsService, private readonly itineraries: ItinerariesService) {}

  async sitemap(kind: SitemapKind): Promise<SitemapResponse> {
    const items: SitemapEntry[] = [];
    const entry = (path: string, source: SitemapSource): SitemapEntry => ({ path, ...(source.updatedAt ? { lastmod: source.updatedAt } : {}) });
    for (const city of await this.cities.sitemapCities()) {
      const prefix = `/${city.slug}`;
      if (kind === 'pages') {
        items.push(entry(prefix, city), entry(`${prefix}/ban-do`, city), ...Object.values(CATEGORY_URL_SLUG).map((slug) => entry(`${prefix}/${slug}`, city)), ...city.zones.map((zone) => entry(`${prefix}/khu-vuc/${zone.slug}`, zone)));
      } else {
        const sources = kind === 'places' ? await this.places.sitemapSources(city.id) : kind === 'lists' ? await this.lists.sitemapSources(city.id) : await this.itineraries.sitemapSources(city.id, city.slug);
        const segment = kind === 'places' ? 'dia-diem' : kind === 'lists' ? 'top' : 'lich-trinh';
        items.push(...sources.map((source) => entry(`${prefix}/${segment}/${source.slug}`, source)));
      }
    }
    return SitemapResponse.parse({ items });
  }
}
