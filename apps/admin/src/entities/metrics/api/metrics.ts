import { WeeklyMetricsReport } from '@ranhduong/contracts';
import { api } from '@/shared/api/client';

export async function fetchWeeklyMetrics(city: string, week?: string): Promise<WeeklyMetricsReport> {
  return WeeklyMetricsReport.parse(await api(`/admin/cities/${city}/metrics`, { query: week ? { week } : undefined }));
}
