import { PlaceEvent, type EventBatch, type PlaceEventSource } from '@ranhduong/contracts';

export class PlaceEventBuffer {
  private events: PlaceEvent[] = [];
  constructor(private readonly send: (batch: EventBatch) => Promise<unknown>) {}
  add(input: PlaceEvent): void {
    const event = PlaceEvent.safeParse(input);
    if (!event.success) return;
    if (this.events.length >= 100) this.events.shift();
    this.events.push(event.data);
  }
  async flush(): Promise<void> {
    const batches: EventBatch[] = [];
    while (this.events.length) batches.push({ events: this.events.splice(0, 20) });
    await Promise.allSettled(batches.map((batch) => this.send(batch)));
  }
}
export function eventSource(path: string): PlaceEventSource {
  if (/\/tim-kiem(?:\?|$)/.test(path)) return 'search';
  if (/\/ban-do(?:\?|$)/.test(path)) return 'map';
  if (/\/lich-trinh\//.test(path)) return 'itinerary';
  if (/\/(?:top\/|khu-vuc\/|ca-phe|an-uong|tham-quan|hoat-dong)/.test(path)) return 'list';
  return 'direct';
}
