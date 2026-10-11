import { HttpStatus, Injectable } from '@nestjs/common';
import { EventBatch, METRIC_FIELDS, WeeklyMetricsReport, emptyMetricCounts, metricsDayKey, metricsWeekStart, shiftMetricDay, type EventReceipt, type MetricCounts, type WeeklyMetricsQuery } from '@ranhduong/contracts';
import { ApiException } from '../../shared/http/api-exception';
import { CitiesService } from '../cities/cities.service';
import { PlacesService } from '../places/places.service';
import { MetricsStore } from './metrics.store';
import { MetricsRepository } from './metrics.repository';

@Injectable()
export class MetricsService {
  constructor(private readonly store: MetricsStore, private readonly repo: MetricsRepository, private readonly cities: CitiesService, private readonly places: PlacesService) {}
  async record(raw: EventBatch, identity: { ip: string; userAgent: string }, now = new Date()): Promise<EventReceipt> {
    const batch = EventBatch.parse(raw);
    const day = metricsDayKey(now);
    const visitor = await this.store.identity(day, identity.ip, identity.userAgent.slice(0, 1000));
    if (!await this.store.rateAllowed(visitor.ip, now.getTime())) throw new ApiException('RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS, 'Gửi quá nhiều yêu cầu, thử lại sau một phút.');
    const activeCities = new Set((await this.cities.sitemapCities()).map((city) => city.id));
    const refs = await this.places.publicMetricRefs([...new Set(batch.events.map((event) => event.placeId))]);
    const allowed = new Map(refs.filter((place) => activeCities.has(place.cityId)).map((place) => [place.id, place.cityId]));
    let accepted = 0;
    for (const event of batch.events) {
      const cityId = allowed.get(event.placeId);
      if (cityId) accepted += await this.store.count(event, day, visitor.visitor, cityId);
    }
    return { accepted };
  }
  async rollup(now = new Date()): Promise<void> {
    // The 15-minute window lets in-flight pre-midnight requests settle before final aggregation.
    const day = metricsDayKey(new Date(now.getTime() - 15 * 60000));
    const cutoff = shiftMetricDay(day, -1);
    for (const pending of await this.store.pendingDays(cutoff)) {
      const ids = await this.store.placeIds(pending);
      for (const id of ids) {
        const row = await this.store.daily(id, pending);
        if (row) await this.repo.saveDaily(row);
      }
      await this.store.acknowledge(pending);
    }
  }
  async weeklyReport(citySlug: string, query: WeeklyMetricsQuery, now = new Date()): Promise<WeeklyMetricsReport> {
    const city = await this.cities.resolveCity(citySlug);
    const start = metricsWeekStart(query.week ?? metricsDayKey(now));
    if (start > metricsWeekStart(metricsDayKey(now))) throw new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Tuần này chưa bắt đầu.');
    const end = shiftMetricDay(start, 6);
    const days = Array.from({ length: 7 }, (_, index) => ({ dayKey: shiftMetricDay(start, index), counts: emptyMetricCounts() }));
    const totals = emptyMetricCounts();
    const persisted = new Map((await this.repo.weekly(city.id, start, end)).map((row) => [`${row.placeId}:${row.dayKey}`, row.counts]));
    const refs = await this.places.reportMetricRefs(city.id);
    const add = (target: MetricCounts, counts: MetricCounts) => { for (const field of METRIC_FIELDS) target[field] += counts[field]; };
    const items = await Promise.all(refs.map(async (place) => {
      const counts = emptyMetricCounts();
      for (const day of days) {
        const live = await this.store.counts(place.id, day.dayKey);
        const saved = persisted.get(`${place.id}:${day.dayKey}`);
        for (const field of METRIC_FIELDS) live[field] = Math.max(live[field], saved?.[field] ?? 0);
        add(counts, live); add(day.counts, live);
      }
      add(totals, counts);
      return { placeId: place.id, slug: place.slug, name: place.name, status: place.status, counts };
    }));
    items.sort((a, b) => b.counts.directionClicks - a.counts.directionClicks || a.name.localeCompare(b.name, 'vi'));
    return WeeklyMetricsReport.parse({ weekStart: start, weekEnd: end, updatedAt: now.toISOString(), days, totals, items });
  }
}
