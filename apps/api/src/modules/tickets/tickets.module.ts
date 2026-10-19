import { Module } from '@nestjs/common';
import { CitiesModule } from '../cities/cities.module';
import { ItinerariesModule } from '../itineraries/itineraries.module';
import { TicketRenderer } from './ticket-renderer';
import { TicketQueue } from './ticket.queue';
import { TicketStorage } from './ticket.storage';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

/** Vé lịch trình dạng ảnh (S30). TicketProcessor chỉ đăng ký trong worker.ts. */
@Module({
  imports: [CitiesModule, ItinerariesModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketStorage, TicketQueue, TicketRenderer],
  exports: [TicketsService],
})
export class TicketsModule {}
