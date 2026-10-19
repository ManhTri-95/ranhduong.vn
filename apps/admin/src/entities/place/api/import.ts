import { CsvImportResponse, type CsvImportInput } from '@ranhduong/contracts';
import { api } from '@/shared/api/client';

export async function previewCsvPlaces(city: string, csv: string): Promise<CsvImportResponse> {
  return CsvImportResponse.parse(await api(`/admin/cities/${city}/places/import/preview`, { method: 'POST', body: { csv }, retry: 0 }));
}

export async function createCsvPlaces(city: string, input: CsvImportInput): Promise<CsvImportResponse> {
  return CsvImportResponse.parse(await api(`/admin/cities/${city}/places/import`, { method: 'POST', body: input, retry: 0 }));
}
