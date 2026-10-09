import { Injectable } from '@nestjs/common';
import { OverpassResponse, Place, type OsmDraft, type OsmImportResult } from '@ranhduong/contracts';
import { nextFreeSlug, normalizeName, slugify } from '@ranhduong/geo';
import { isDuplicateKeyError } from '../../shared/db/mongo-errors';
import { CitiesService } from '../cities/cities.service';
import { toOsmDraft } from './place-osm';
import { PlacesRepository } from './places.repository';

@Injectable()
export class PlaceOsmImportService {
  constructor(private readonly repo: PlacesRepository, private readonly cities: CitiesService) {}

  async run(citySlug: string, input: unknown, dryRun = false): Promise<OsmImportResult> {
    const response = OverpassResponse.parse(input);
    const city = await this.cities.resolveCity(citySlug);
    const { mapBounds } = await this.cities.getPublic(citySlug);
    if (!dryRun) await this.repo.ensureIndexes();
    const result: OsmImportResult = { received: response.elements.length, created: 0, wouldCreate: 0, existing: 0, skipped: 0, dryRun };
    const seen = new Set<string>();
    for (const inputElement of response.elements) {
      const draft = toOsmDraft(inputElement, mapBounds);
      if (!draft) { result.skipped++; continue; }
      if (seen.has(draft.osmId) || await this.repo.hasOsmId(city.id, draft.osmId)) {
        result.existing++;
        continue;
      }
      seen.add(draft.osmId);
      if (dryRun) result.wouldCreate++;
      else if (await this.insert(city.id, draft)) result.created++;
      else result.existing++;
    }
    return result;
  }

  private async insert(cityId: string, draft: OsmDraft): Promise<boolean> {
    const base = slugify(draft.name) || `osm-${draft.osmId.replace('/', '-')}`;
    for (let attempt = 0; attempt < 10; attempt++) {
      const slug = nextFreeSlug(base, await this.repo.takenSlugs(cityId, base));
      const place = Place.parse({
        cityId, slug, name: draft.name, nameNorm: normalizeName(draft.name), category: draft.category,
        location: draft.location, address: draft.address, ids: { osmId: draft.osmId }, status: 'draft', source: 'admin',
      });
      try { return await this.repo.upsertOsmDraft(place); }
      catch (err) { if (!isDuplicateKeyError(err)) throw err; }
    }
    throw new Error(`Không tạo được nháp ${draft.osmId} do nhiều lần trùng khóa. Chạy lại lệnh import để tiếp tục.`);
  }
}
