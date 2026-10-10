import { HttpStatus, Injectable } from '@nestjs/common';
import { CuratedListEditInput, Slug, type AdminCuratedList, type AdminCuratedListResponse, type CuratedListDetail, type CuratedListResponse } from '@ranhduong/contracts';
import { slugify } from '@ranhduong/geo';
import { ApiException } from '../../shared/http/api-exception';
import { CitiesService } from '../cities/cities.service';
import { PlacesService } from '../places/places.service';
import { CuratedListsRepository } from './curated-lists.repository';

const notFound = () => new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy danh sách');

@Injectable()
export class CuratedListsService {
  constructor(private readonly repo: CuratedListsRepository, private readonly cities: CitiesService, private readonly places: PlacesService) {}

  async adminList(citySlug: string): Promise<AdminCuratedListResponse> {
    const city = await this.cities.resolveCity(citySlug);
    return { items: await this.repo.list(city.id) };
  }

  async get(id: string): Promise<AdminCuratedList> {
    const list = await this.repo.byId(id);
    if (!list) throw notFound();
    return list;
  }

  private async validateReferences(cityId: string, input: CuratedListEditInput): Promise<void> {
    const statuses = await this.places.curatedReferenceStatuses(cityId, input.placeIds);
    const details = input.placeIds.flatMap((id, index) => {
      const status = statuses.get(id);
      const message = !status || status === 'merged' ? 'Địa điểm không còn tồn tại trong thành phố này'
        : input.status === 'published' && status !== 'active' ? 'Chỉ chọn địa điểm đang hiển thị để công khai danh sách' : null;
      return message ? [{ path: `placeIds.${index}`, message }] : [];
    });
    if (details.length) throw new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Kiểm tra lại các địa điểm trong danh sách', details);
  }

  async create(citySlug: string, raw: CuratedListEditInput): Promise<AdminCuratedList> {
    const input = CuratedListEditInput.parse(raw);
    const city = await this.cities.resolveCity(citySlug);
    const base = slugify(input.title);
    if (!Slug.safeParse(base).success) throw new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Tiêu đề cần có chữ hoặc số để tạo đường dẫn', [{ path: 'title', message: 'Nhập tiêu đề có chữ hoặc số' }]);
    await this.validateReferences(city.id, input);
    await this.repo.ensureIndexes();
    for (let suffix = 1; suffix <= 100; suffix++) {
      try { return await this.repo.insert(city.id, suffix === 1 ? base : `${base}-${suffix}`, input); }
      catch (err) {
        if (typeof err !== 'object' || err === null || !('code' in err) || err.code !== 11000) throw err;
      }
    }
    throw new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Có quá nhiều danh sách cùng tiêu đề, hãy dùng tiêu đề khác');
  }

  async update(id: string, raw: CuratedListEditInput): Promise<AdminCuratedList> {
    const input = CuratedListEditInput.parse(raw);
    const current = await this.get(id);
    await this.validateReferences(current.cityId, input);
    const updated = await this.repo.update(id, input);
    if (!updated) throw notFound();
    return updated;
  }

  async detail(citySlug: string, slug: string): Promise<CuratedListDetail> {
    const city = await this.cities.resolveCity(citySlug);
    const list = await this.repo.published(city.id, slug);
    if (!list) throw notFound();
    const cards = await this.places.curatedCards(city.id, list.placeIds);
    return { slug: list.slug, title: list.title, description: list.description, places: list.placeIds.flatMap((id) => cards.get(id) ?? []) };
  }

  async publicList(citySlug: string): Promise<CuratedListResponse> {
    const city = await this.cities.resolveCity(citySlug);
    const lists = await this.repo.list(city.id, true);
    const cards = await this.places.curatedCards(city.id, [...new Set(lists.flatMap((list) => list.placeIds))]);
    return { items: lists.map((list) => {
      const places = list.placeIds.flatMap((id) => cards.get(id) ?? []);
      return { slug: list.slug, title: list.title, description: list.description, placeCount: places.length, coverKey: places.find((place) => place.coverKey)?.coverKey };
    }) };
  }
}
