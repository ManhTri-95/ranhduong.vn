import { ItineraryCoverageReport, type ItineraryCoverageQuery } from '@ranhduong/contracts';
import { api } from '@/shared/api/client';

export async function fetchItineraryCoverage(city: string, query: ItineraryCoverageQuery): Promise<ItineraryCoverageReport> {
  return ItineraryCoverageReport.parse(await api(`/admin/cities/${city}/itineraries/coverage`, { query, timeout: 120_000, retry: 0 }));
}
