import { HttpStatus, Injectable } from '@nestjs/common';
import { analyzeTemplate, Slug, TemplateEditInput, type AdminTemplate, type AdminTemplateResponse, type TemplateAnalysis, type TemplatePlaceResponse } from '@ranhduong/contracts';
import { estimateTemplateTravelMinutes, slugify } from '@ranhduong/geo';
import { ApiException } from '../../shared/http/api-exception';
import { CitiesService } from '../cities/cities.service';
import { PlacesService } from '../places/places.service';
import { ItinerariesRepository, type TemplateRecord } from './itineraries.repository';

const notFound = () => new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy lịch trình mẫu');
const travel: Parameters<typeof analyzeTemplate>[2] = (from, to) => estimateTemplateTravelMinutes({ lng: from.coordinates[0], lat: from.coordinates[1] }, { lng: to.coordinates[0], lat: to.coordinates[1] });

@Injectable()
export class TemplateEditorService {
  constructor(private readonly repo: ItinerariesRepository, private readonly cities: CitiesService, private readonly places: PlacesService) {}
  private async present(record: TemplateRecord): Promise<AdminTemplate> {
    return { ...record, analysis: analyzeTemplate(record, await this.places.templatePlaces(record.cityId), travel) };
  }
  async list(citySlug: string): Promise<AdminTemplateResponse> {
    const city = await this.cities.resolveCity(citySlug);
    const [records, places] = await Promise.all([this.repo.listForEditor(city.id), this.places.templatePlaces(city.id)]);
    return { items: records.map((record) => ({ ...record, analysis: analyzeTemplate(record, places, travel) })) };
  }
  async get(id: string): Promise<AdminTemplate> {
    const record = await this.repo.findForEditor(id);
    if (!record) throw notFound();
    return this.present(record);
  }
  async library(citySlug: string): Promise<TemplatePlaceResponse> {
    const city = await this.cities.resolveCity(citySlug);
    return { items: await this.places.templatePlaces(city.id) };
  }
  async preview(citySlug: string, input: TemplateEditInput): Promise<TemplateAnalysis> {
    const { items } = await this.library(citySlug);
    return analyzeTemplate(input, items, travel);
  }
  private async prepare(cityId: string, input: TemplateEditInput) {
    const places = await this.places.templatePlaces(cityId);
    const validIds = new Set(places.map((p) => p.id));
    if (input.days.some((day) => day.stops.some((stop) => !validIds.has(stop.placeId)))) {
      throw new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Có địa điểm không tồn tại trong thành phố này');
    }
    const analysis = analyzeTemplate(input, places, travel);
    if (input.status === 'published' && !analysis.canPublish) throw new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Sửa hết lỗi trước khi công khai lịch trình', analysis.issues.filter((issue) => issue.level === 'error'));
    return { places, analysis };
  }
  async create(citySlug: string, raw: TemplateEditInput, assertWriteOwned: () => Promise<void>): Promise<AdminTemplate> {
    const input = TemplateEditInput.parse(raw);
    const city = await this.cities.resolveCity(citySlug);
    const base = slugify(input.title);
    if (!Slug.safeParse(base).success) throw new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Tên lịch trình cần có chữ hoặc số');
    const { places, analysis } = await this.prepare(city.id, input);
    await this.repo.ensureIndexes();
    for (let suffix = 1; suffix <= 100; suffix++) {
      try { await assertWriteOwned(); return { ...await this.repo.insertTemplate(city.id, suffix === 1 ? base : `${base}-${suffix}`, input, analysis, places), analysis }; }
      catch (err) { if (typeof err !== 'object' || !err || !('code' in err) || err.code !== 11000) throw err; }
    }
    throw new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Có quá nhiều lịch trình cùng tên');
  }
  async update(id: string, raw: TemplateEditInput, assertWriteOwned: () => Promise<void>): Promise<AdminTemplate> {
    const input = TemplateEditInput.parse(raw);
    const current = await this.repo.findForEditor(id);
    if (!current) throw notFound();
    const { places, analysis } = await this.prepare(current.cityId, input);
    await assertWriteOwned();
    const updated = await this.repo.updateTemplate(id, input, analysis, places, current.slug);
    if (!updated) throw notFound();
    return { ...updated, analysis };
  }
  async assertPlaceNotReferenced(id: string): Promise<void> {
    if (await this.repo.referencesPlace(id)) throw new ApiException('CONFLICT', HttpStatus.CONFLICT, 'Địa điểm đang nằm trong lịch trình mẫu. Bỏ địa điểm khỏi lịch trình trước khi xoá nháp.');
  }
}
