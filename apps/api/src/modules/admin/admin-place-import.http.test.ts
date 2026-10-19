import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CsvImportResponse } from '@ranhduong/contracts';
import { createAdminTestApp, type AdminTestApp } from '../../testing/admin-app';
import { fakeCitySeed } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { AdminModule } from './admin.module';

const csv = 'id,name,category,status\nD1,Địa điểm GIẢ,shop,Đã xác nhận';
const body = { csv, selections: [{ row: 2, allowDuplicate: false }] };

describe('S21 protected CSV import HTTP', () => {
  let t: AdminTestApp;
  beforeAll(async () => {
    t = await createAdminTestApp([AdminModule]);
    await t.app.get(CitiesService).applySeed(fakeCitySeed());
  });
  afterAll(async () => { await t.close(); });
  function post(suffix: string, input: unknown, cookie = t.cookie, origin = t.origin, city = 'thanh-pho-gia-lap') {
    return fetch(`${t.url}/admin/cities/${city}/places/import${suffix}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: origin }, body: JSON.stringify(input),
    });
  }

  it('requires admin session and an allowed write origin on both endpoints', async () => {
    for (const suffix of ['/preview', '']) {
      expect((await post(suffix, body, '')).status).toBe(401);
      expect((await post(suffix, body, t.cookie, 'https://evil.example')).status).toBe(403);
    }
  });

  it('previews then creates drafts and returns existing on a repeated POST', async () => {
    const preview = await post('/preview', { csv });
    expect(preview.status).toBe(200);
    expect(CsvImportResponse.parse(await preview.json()).rows[0]?.status).toBe('ready');
    const created = await post('', body);
    expect(created.status).toBe(200);
    expect(CsvImportResponse.parse(await created.json()).rows[0]).toMatchObject({ status: 'created', placeId: expect.any(String) });
    expect(CsvImportResponse.parse(await (await post('', body)).json()).rows[0]?.status).toBe('existing');
  });

  it('rejects malformed headers, tampered selections and oversized CSV with standard errors', async () => {
    for (const input of [{ csv, selections: [] }, { csv, selections: [{ row: 99 }] }, { csv, selections: [{ row: 2 }, { row: 2 }] }]) {
      const response = await post('', input);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
    }
    expect((await post('/preview', { csv: 'name\nGiả Lập' })).status).toBe(400);
    expect((await post('/preview', { csv: 'á'.repeat(140_000) })).status).toBe(400);
    expect((await post('/preview', { csv }, t.cookie, t.origin, 'khong-co-gia')).status).toBe(404);
  });

  it('accepts bounded CSV beyond the default JSON parser size and returns row errors', async () => {
    const response = await post('/preview', { csv: `${csv},${'a'.repeat(110_000)}` });
    expect(response.status).toBe(200);
    expect(CsvImportResponse.parse(await response.json()).rows[0]?.status).toBe('error');
  });
});
