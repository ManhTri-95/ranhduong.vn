import { HttpStatus, Injectable } from '@nestjs/common';
import { CitySeasonEditInput, type CitySeasonSettings, type SeasonItineraryOptions } from '@ranhduong/contracts';
import { ApiException } from '../../shared/http/api-exception';
import { CitiesService } from '../cities/cities.service';
import { ItinerariesService } from '../itineraries/itineraries.service';

@Injectable()
export class AdminCitySeasonsService {
  constructor(private readonly cities: CitiesService, private readonly itineraries: ItinerariesService) {}

  async options(slug: string): Promise<SeasonItineraryOptions> {
    return this.itineraries.seasonOptions((await this.cities.resolveCity(slug)).id);
  }

  async save(slug: string, raw: CitySeasonEditInput): Promise<CitySeasonSettings> {
    const input = CitySeasonEditInput.parse(raw);
    const city = await this.cities.resolveCity(slug);
    for (const [index, season] of input.seasons.entries()) {
      if (season.featuredItineraryId && !await this.itineraries.featuredTemplate(city.id, season.featuredItineraryId)) {
        throw new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Chọn lịch trình mẫu đang công khai trong thành phố này.', [{ path: ['seasons', index, 'featuredItineraryId'], message: 'Lịch trình chưa công khai hoặc không còn hợp lệ' }]);
      }
    }
    return this.cities.replaceSeasons(slug, input);
  }
}
