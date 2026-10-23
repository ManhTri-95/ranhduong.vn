import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { SitemapResponse } from '@ranhduong/contracts';
import { CitiesService } from '../cities/cities.service';
import { createTestApp, type TestApp } from '../../testing/app';
import { fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { SeoModule } from './seo.module';

describe('S17 sitemap public sources', () => {
  let t: TestApp;
  let cityId: string;
  const updatedAt = new Date('2026-10-09T08:30:00.000Z');
  beforeAll(async () => {
    t = await createTestApp([SeoModule]);
    const cities = t.app.get(CitiesService);
    cityId = (await cities.applySeed(fakeCitySeed())).cityId;
    const inactive = (await cities.applySeed(fakeCitySeed({ slug: 'thanh-pho-tat', active: false }))).cityId;
    await t.conn.collection('cities').insertOne({ slug: 'bad_slug', active: true, name: 'Thành phố Giả Lập lỗi slug' });
    await t.conn.collection('places').insertMany([
      ...['active', 'closed', 'draft', 'hidden', 'suspected', 'merged'].map((status) => fakePlaceDoc(cityId, { status, slug: status, slugHistory: ['old'], updatedAt })),
      fakePlaceDoc(inactive, { slug: 'inactive' }),
    ]);
    await t.conn.collection('curated_lists').insertMany(['published', 'draft'].map((status) => ({ cityId: new Types.ObjectId(cityId), slug: status, title: 'Danh sách Giả Lập', description: '', placeIds: [], status, updatedAt })));
    const template = { cityId: new Types.ObjectId(cityId), slug: 'mau-gia-lap', title: 'Mẫu Giả Lập', kind: 'template', visibility: 'public', status: 'published', params: { days: 1, transport: 'motorbike', pace: 'relaxed' }, days: [], updatedAt };
    await t.conn.collection('itineraries').insertMany([
      template,
      { ...template, slug: 'private', visibility: 'unlisted' },
      { ...template, slug: 'personal', kind: 'user' },
      { ...template, slug: 'draft', status: 'draft' },
      { ...template, slug: 'broken', params: { days: 0 } },
      { ...template, slug: 'inactive', cityId: new Types.ObjectId(inactive) },
    ]);
  });
  afterAll(async () => { await t?.close(); });
  const get = (kind: string) => fetch(`${t.url}/seo/sitemap/${kind}`);
  it('includes only active/closed canonical places with actual lastmod', async () => {
    const response = await get('places');
    expect(response.status).toBe(200);
    const body = SitemapResponse.parse(await response.json());
    expect(body.items).toEqual(['active', 'closed'].map((slug) => ({ path: `/thanh-pho-gia-lap/dia-diem/${slug}`, lastmod: updatedAt.toISOString() })));
  });
  it('includes published lists and readable public templates only', async () => {
    expect(SitemapResponse.parse(await (await get('lists')).json()).items).toEqual([{ path: '/thanh-pho-gia-lap/top/published', lastmod: updatedAt.toISOString() }]);
    expect(SitemapResponse.parse(await (await get('itineraries')).json()).items).toEqual([{ path: '/thanh-pho-gia-lap/lich-trinh/mau-gia-lap', lastmod: updatedAt.toISOString() }]);
  });
  it('includes active city, four categories, map and existing zones', async () => {
    const paths = SitemapResponse.parse(await (await get('pages')).json()).items.map((entry) => entry.path);
    expect(paths).toContain('/thanh-pho-gia-lap/tao-lich-trinh');
    expect(paths).toEqual(expect.arrayContaining(['/thanh-pho-gia-lap', '/thanh-pho-gia-lap/ca-phe', '/thanh-pho-gia-lap/an-uong', '/thanh-pho-gia-lap/tham-quan', '/thanh-pho-gia-lap/hoat-dong', '/thanh-pho-gia-lap/ban-do', '/thanh-pho-gia-lap/khu-vuc/cum-gia-lap-a']));
    expect(paths.join(' ')).not.toMatch(/undefined|bad_slug|thanh-pho-tat|tim-kiem|admin|\/l\//);
  });
  it('rejects invalid kind without exposing collections', async () => {
    expect((await get('users')).status).toBe(400);
  });
});
