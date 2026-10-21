import type { ItineraryRequest } from '@ranhduong/contracts';
import type { ScheduledDay, ScheduledStop } from '../planner/generate-itinerary';

export interface UserItineraryInput {
  cityId: string;
  guestId: string;
  title: string;
  params: ItineraryRequest & { startWeekday: number };
  templateId?: string;
  days: {
    day: number;
    startTime: string;
    zoneIds: string[];
    stops: (ScheduledStop & { key: string; note: string; locked: boolean; isVip: boolean })[];
    detours: { afterKey: string; placeId: string; detourMin: number }[];
    issues: ScheduledDay['issues'];
  }[];
}
