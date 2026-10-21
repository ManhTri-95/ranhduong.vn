import { Injectable } from '@nestjs/common';
import type { ItineraryPlace } from '@ranhduong/contracts';

interface Entry { expiresAt: number; value: Promise<ItineraryPlace[]> }

/** Process-local planning facts only. Invalidating also detaches in-flight loads. */
@Injectable()
export class PlanningSnapshot {
  private readonly entries = new Map<string, Entry>();

  get(cityId: string, load: () => Promise<ItineraryPlace[]>, now = Date.now()): Promise<ItineraryPlace[]> {
    const cached = this.entries.get(cityId);
    if (cached && cached.expiresAt > now) return cached.value;
    const entry: Entry = { expiresAt: now + 600000, value: load() };
    this.entries.set(cityId, entry);
    void entry.value.catch(() => { if (this.entries.get(cityId) === entry) this.entries.delete(cityId); });
    return entry.value;
  }

  invalidate(): void { this.entries.clear(); }
}
