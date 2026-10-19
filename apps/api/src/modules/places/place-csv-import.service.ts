import { Injectable } from '@nestjs/common';
import {
  CsvImportInput, CsvImportResponse, CsvPreviewInput, parsePlaceCsv,
  type CsvImportMatch, type CsvImportRow, type CsvPlaceDraft, type ParsedPlaceCsvRow,
} from '@ranhduong/contracts';
import { findDuplicates, nextFreeSlug, normalizeName, slugify, type DuplicateSubject } from '@ranhduong/geo';
import { isDuplicateKeyError } from '../../shared/db/mongo-errors';
import { CitiesService } from '../cities/cities.service';
import { candidateImportKeys, csvDuplicateSubject, csvImportKeys } from './place-csv-import';
import { editUpdate } from './place-edit';
import { placeBusy, placeInvalid } from './place-errors';
import { PlacesRepository } from './places.repository';

interface Candidate {
  ref: CsvImportMatch;
  keys: string[];
  subject: DuplicateSubject;
  aliases: string[];
  merged: boolean;
}

@Injectable()
export class PlaceCsvImportService {
  constructor(private readonly repo: PlacesRepository, private readonly cities: CitiesService) {}

  async preview(citySlug: string, raw: CsvPreviewInput): Promise<CsvImportResponse> {
    const context = await this.prepare(citySlug, CsvPreviewInput.parse(raw).csv);
    const candidates = await this.candidates(context.cityId);
    const rows = context.rows.map((row) => {
      const checked = this.check(row, candidates);
      if (row.draft && (checked.status === 'ready' || checked.status === 'duplicate')) {
        candidates.push(this.fromDraft(row.draft, { name: row.name, row: row.row }));
      }
      return checked;
    });
    return CsvImportResponse.parse({ rows });
  }

  async run(citySlug: string, raw: CsvImportInput): Promise<CsvImportResponse> {
    const input = CsvImportInput.parse(raw);
    const context = await this.prepare(citySlug, input.csv);
    const byRow = new Map(context.rows.map((row) => [row.row, row]));
    if (input.selections.some(({ row }) => !byRow.has(row))) throw placeInvalid('Dòng được chọn không còn trong file CSV. Kiểm tra lại file.');
    // Chờ index trước khi ghi, kể cả khi MongoDB tắt autoIndex trong môi trường chạy thật.
    await this.repo.ensureIndexes();
    const rows: CsvImportRow[] = [];
    for (const selection of input.selections.toSorted((a, b) => a.row - b.row)) {
      const row = byRow.get(selection.row)!;
      // Đọc lại trước mỗi lần tạo: vừa bắt retry, vừa kiểm thay đổi sau bước xem trước.
      const checked = this.check(row, await this.candidates(context.cityId));
      if (!row.draft || !['ready', 'duplicate'].includes(checked.status) || (checked.status === 'duplicate' && !selection.allowDuplicate)) {
        rows.push(checked);
        continue;
      }
      rows.push(await this.insert(context.cityId, row, context.zoneIds.get(row.draft.place.zone ?? '')));
    }
    return CsvImportResponse.parse({ rows });
  }

  private async prepare(citySlug: string, csv: string) {
    const city = await this.cities.resolveCity(citySlug);
    let rows: ParsedPlaceCsvRow[];
    try { rows = parsePlaceCsv(csv); }
    catch (err) { throw placeInvalid(err instanceof Error ? err.message : 'Không đọc được file CSV.'); }
    const zones = await this.cities.zones(city.id);
    const zoneIds = new Map(zones.map((zone) => [zone.slug, zone.id]));
    for (const row of rows) {
      if (!row.draft) continue;
      if (row.draft.place.zone && !zoneIds.has(row.draft.place.zone)) {
        row.issues.push({ column: 'zone', message: 'Khu vực không có trong thành phố này.', fix: `Chọn ${zones.map((zone) => zone.slug).join(', ') || 'khu vực đang có'}; hoặc để trống.` });
      }
      if (!slugify(row.draft.place.name)) row.issues.push({ column: 'name', message: 'Tên chưa tạo được đường dẫn.', fix: 'Tên cần có ít nhất một chữ cái hoặc chữ số.' });
      if (row.issues.length) { row.status = 'error'; row.draft = undefined; }
    }
    return { cityId: city.id, rows, zoneIds };
  }

  private async candidates(cityId: string): Promise<Candidate[]> {
    return (await this.repo.listForCsvImport(cityId)).map((row) => ({
      ref: { name: row.name, placeId: row.id }, keys: candidateImportKeys(row), subject: row,
      aliases: row.aliases, merged: row.status === 'merged',
    }));
  }

  private fromDraft(draft: CsvPlaceDraft, ref: CsvImportMatch): Candidate {
    return { ref, keys: csvImportKeys(draft), subject: csvDuplicateSubject(draft), aliases: draft.place.aliases, merged: false };
  }

  private check(row: ParsedPlaceCsvRow, candidates: Candidate[]): CsvImportRow {
    const { draft, ...result } = row;
    if (!draft) return result;
    const keys = new Set(csvImportKeys(draft));
    const exact = candidates.find((candidate) => candidate.keys.some((key) => keys.has(key)));
    if (exact) return { ...result, status: 'existing', placeId: exact.ref.placeId, matches: [exact.ref], message: 'Đã có cùng ID Sheet, ID OSM, số điện thoại hoặc nội dung nhập. Bỏ qua để tránh tạo trùng.' };
    const matches = findDuplicates(csvDuplicateSubject(draft), candidates.filter((candidate) => !candidate.merged)
      .map((candidate) => ({ ...candidate.subject, aliases: candidate.aliases, ref: candidate.ref })))
      .slice(0, 5).map((match) => match.ref);
    return { ...result, status: matches.length ? 'duplicate' : 'ready', matches };
  }

  private async insert(cityId: string, row: ParsedPlaceCsvRow, zoneId?: string): Promise<CsvImportRow> {
    const draft = row.draft!;
    const base = slugify(draft.place.name);
    const keys = csvImportKeys(draft);
    for (let attempt = 0; attempt < 10; attempt++) {
      const slug = nextFreeSlug(base, await this.repo.takenSlugs(cityId, base));
      try {
        const placeId = await this.repo.insertDraft(cityId, {
          ...editUpdate(draft.place, { nameNorm: normalizeName(draft.place.name), slug, zoneId }).$set,
          ids: draft.osmId ? { osmId: draft.osmId } : {}, importKeys: keys,
        });
        return { row: row.row, name: row.name, status: 'created', placeId, issues: [], matches: [] };
      } catch (err) {
        if (!isDuplicateKeyError(err)) throw err;
        const checked = this.check(row, await this.candidates(cityId));
        if (checked.status === 'existing') return checked;
      }
    }
    throw placeBusy();
  }
}
