import { Injectable } from '@nestjs/common';
import {
  activationIssues,
  normalizeVnPhone,
  type AdminPlace,
  type AdminPlaceListResponse,
  type DuplicateCheckInput,
  type DuplicateCheckResponse,
  type PlaceEditInput,
} from '@ranhduong/contracts';
import { findDuplicates, isSlugOf, nextFreeSlug, normalizeName, slugify } from '@ranhduong/geo';
import { isDuplicateKeyError } from '../../shared/db/mongo-errors';
import { CitiesService } from '../cities/cities.service';
import { editUpdate, toAdminPlace, toAdminPlaceSummary, type EditRow } from './place-edit';
import { MAX_ATTEMPTS, placeBusy as busy, placeInvalid as invalid, placeNotFound as notFound } from './place-errors';
import { PlacesRepository } from './places.repository';

/** Số chỗ nghi trùng trả về tối đa. */
const MAX_DUPLICATES = 5;

const invalidField = (path: string, message: string) => invalid('Dữ liệu gửi lên không hợp lệ', [{ path, message }]);

/** Gốc slug từ tên; tên không có chữ cái hay chữ số (ví dụ chỉ có biểu tượng) thì không tạo được đường dẫn. */
function slugBase(name: string): string {
  const base = slugify(name);
  if (!base) throw invalidField('name', 'Tên cần có ít nhất một chữ cái hoặc chữ số');
  return base;
}

/**
 * Tạo, sửa, kích hoạt địa điểm từ form admin (S05). Mọi chuyển trạng thái là update có điều kiện (technical-design mục 4):
 * địa điểm đã công khai luôn giữ đủ điều kiện kích hoạt.
 */
@Injectable()
export class PlaceEditorService {
  constructor(
    private readonly repo: PlacesRepository,
    private readonly cities: CitiesService,
  ) {}

  async get(id: string): Promise<AdminPlace> {
    const row = await this.repo.findForEdit(id);
    if (!row) throw notFound();
    return this.present(row);
  }

  /** Danh sách admin (S07): mọi địa điểm chưa gộp của thành phố. */
  async list(citySlug: string): Promise<AdminPlaceListResponse> {
    const city = await this.cities.resolveCity(citySlug);
    const [rows, zones] = await Promise.all([this.repo.listForAdmin(city.id), this.cities.zones(city.id)]);
    const zoneSlugById = new Map(zones.map((z) => [z.id, z.slug]));
    return { items: rows.map((row) => toAdminPlaceSummary(row, zoneSlugById)) };
  }

  /** Tạo nháp: slug từ tên, thêm -2, -3… nếu đã có chỗ dùng (kể cả slug cũ). */
  async create(citySlug: string, input: PlaceEditInput): Promise<AdminPlace> {
    const city = await this.cities.resolveCity(citySlug);
    const base = slugBase(input.name);
    const zoneId = await this.zoneId(city.id, input.zone);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const slug = nextFreeSlug(base, await this.repo.takenSlugs(city.id, base));
      try {
        const id = await this.repo.insertDraft(city.id, editUpdate(input, { nameNorm: normalizeName(input.name), slug, zoneId }).$set);
        return await this.get(id);
      } catch (err) {
        // Request khác vừa lấy đúng slug này (unique {cityId, slug}): tính lại.
        if (!isDuplicateKeyError(err)) throw err;
      }
    }
    throw busy();
  }

  /**
   * PUT: thay toàn bộ trường form. Nháp thì slug đổi theo tên; địa điểm đã công khai giữ slug (ADR 0010)
   * và phải còn đủ điều kiện kích hoạt. Chỉ ghi khi trạng thái chưa đổi kể từ lúc kiểm.
   */
  async update(id: string, input: PlaceEditInput): Promise<AdminPlace> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const current = await this.repo.findForEdit(id);
      if (!current) throw notFound();
      if (current.status === 'merged') throw invalid('Địa điểm đã gộp vào chỗ khác, sửa ở bản chính.');
      if (current.status !== 'draft') {
        const issues = activationIssues({ ...input, photos: current.photos ?? [] });
        if (issues.length > 0) throw invalid('Địa điểm đang công khai phải giữ đủ điều kiện kích hoạt.', issues);
      }
      const cityId = current.cityId.toString();
      const zoneId = await this.zoneId(cityId, input.zone);
      const slug = current.status === 'draft' ? await this.draftSlug(cityId, current, input.name) : current.slug;
      try {
        const update = editUpdate(input, { nameNorm: normalizeName(input.name), slug, zoneId });
        const updated = await this.repo.replaceEditable(id, current.status, update);
        if (updated) return await this.present(updated);
        // Trạng thái vừa đổi (ví dụ vừa kích hoạt ở máy khác): đọc lại, kiểm theo trạng thái mới.
      } catch (err) {
        if (!isDuplicateKeyError(err)) throw err;
      }
    }
    throw busy();
  }

  /** Nháp → active khi đủ điều kiện (ui-spec mục 12); lastVerifiedAt là lúc kích hoạt. Đã active thì trả nguyên. */
  async activate(id: string, now = new Date()): Promise<AdminPlace> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const current = await this.repo.findForEdit(id);
      if (!current) throw notFound();
      if (current.status === 'active') return this.present(current);
      if (current.status !== 'draft') throw invalid('Chỉ kích hoạt được địa điểm đang là nháp.');
      const issues = activationIssues({
        location: current.location,
        openingHours: current.openingHours ?? [],
        verifySource: current.verifySource,
        photos: current.photos ?? [],
      });
      if (issues.length > 0) throw invalid('Chưa đủ điều kiện kích hoạt.', issues);
      // Chỉ kích hoạt đúng bản vừa kiểm: document đổi giữa chừng thì đọc và kiểm lại.
      const activated = await this.repo.activate(id, current.updatedAt ?? null, now);
      if (activated) return this.present(activated);
    }
    throw busy();
  }

  /** Chỗ nghi trùng trong thành phố (technical-design mục 9 và luật tên giống, decisions 2026-10-08), điểm cao trước. */
  async checkDuplicates(citySlug: string, input: DuplicateCheckInput): Promise<DuplicateCheckResponse> {
    const city = await this.cities.resolveCity(citySlug);
    const [rows, zoneNames] = await Promise.all([this.repo.listForDuplicateCheck(city.id, input.excludeId), this.cities.zoneNames(city.id)]);
    const [lng, lat] = input.location?.coordinates ?? [];
    const subject = {
      name: input.name,
      location: lng !== undefined && lat !== undefined ? { lng, lat } : undefined,
      phone: input.phone ? (normalizeVnPhone(input.phone) ?? undefined) : undefined,
      fanpage: input.fanpage || undefined,
    };
    const matches = findDuplicates(subject, rows.map((row) => ({ ...row, ref: row })));
    return {
      matches: matches.slice(0, MAX_DUPLICATES).map(({ ref, score, level, distanceM }) => ({
        id: ref.id,
        name: ref.name,
        status: ref.status,
        zoneName: ref.zoneId === undefined ? undefined : zoneNames.get(ref.zoneId),
        distanceM: distanceM === undefined ? undefined : Math.round(distanceM),
        score: Math.round(score * 100) / 100,
        level,
      })),
    };
  }

  private async zoneId(cityId: string, slug: string | undefined): Promise<string | undefined> {
    if (slug === undefined) return undefined;
    const zone = (await this.cities.zones(cityId)).find((z) => z.slug === slug);
    if (!zone) throw invalidField('zone', 'Không có cụm này trong thành phố');
    return zone.id;
  }

  private async draftSlug(cityId: string, current: EditRow, name: string): Promise<string> {
    const base = slugBase(name);
    if (isSlugOf(current.slug, base)) return current.slug;
    return nextFreeSlug(base, await this.repo.takenSlugs(cityId, base, current._id.toString()));
  }

  /** Document → AdminPlace (id cụm thành slug); PlaceStatusService cũng dùng. */
  async present(row: EditRow): Promise<AdminPlace> {
    const zones = await this.cities.zones(row.cityId.toString());
    return toAdminPlace(row, new Map(zones.map((z) => [z.id, z.slug])));
  }
}
