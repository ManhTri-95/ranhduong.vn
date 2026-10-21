import { Module } from '@nestjs/common';
import { CitiesModule } from '../cities/cities.module';
import { PlacesModule } from '../places/places.module';
import { AdminCitiesController } from './admin-cities.controller';
import { AdminPlacesController } from './admin-places.controller';
import { MediaModule } from '../media/media.module';
import { AdminMediaController } from './admin-media.controller';
import { AdminMediaService } from './admin-media.service';
import { CuratedListsModule } from '../curated-lists/curated-lists.module';
import { AdminCuratedListsController } from './admin-curated-lists.controller';
import { ItinerariesModule } from '../itineraries/itineraries.module';
import { AdminTemplatesController } from './admin-templates.controller';
import { AdminTemplateLock } from './admin-template-lock';
import { AdminCitySeasonsService } from './admin-city-seasons.service';
import { AdminPlaceImportController } from './admin-place-import.controller';
import { AdminItineraryCoverageController } from './admin-itinerary-coverage.controller';
import { ItineraryCoverageModule } from '../itineraries/coverage-report/coverage.module';

/**
 * Route quản trị (tầng ngoài cùng, architecture mục 4): chỉ gọi service của cities và places; mọi route có AdminGuard.
 * Tách khỏi CitiesModule, PlacesModule để lệnh seed và test các module đó không cần ConfigModule, SessionModule.
 */
@Module({
  imports: [CitiesModule, PlacesModule, MediaModule, CuratedListsModule, ItinerariesModule, ItineraryCoverageModule],
  controllers: [AdminPlacesController, AdminCitiesController, AdminMediaController, AdminCuratedListsController, AdminTemplatesController, AdminPlaceImportController, AdminItineraryCoverageController],
  providers: [AdminMediaService, AdminTemplateLock, AdminCitySeasonsService],
})
export class AdminModule {}
