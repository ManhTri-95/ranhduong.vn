import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CitiesModule } from '../cities/cities.module';
import { PlaceEditorService } from './place-editor.service';
import { PlaceStatusService } from './place-status.service';
import { PlaceOsmImportService } from './place-osm-import.service';
import { PlaceCsvImportService } from './place-csv-import.service';
import { PlacesController } from './places.controller';
import { PlacesRepository } from './places.repository';
import { PlacesService } from './places.service';
import { PLACE_MODEL, PlaceSchema } from './schemas/place.schema';
import { PlanningSnapshot } from './planning-snapshot';

@Module({
  imports: [MongooseModule.forFeature([{ name: PLACE_MODEL, schema: PlaceSchema }]), CitiesModule],
  controllers: [PlacesController],
  providers: [PlanningSnapshot, PlacesRepository, PlacesService, PlaceEditorService, PlaceStatusService, PlaceOsmImportService, PlaceCsvImportService],
  exports: [PlacesService, PlaceEditorService, PlaceStatusService, PlaceOsmImportService, PlaceCsvImportService],
})
export class PlacesModule {}
