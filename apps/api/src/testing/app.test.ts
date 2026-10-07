import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './app';

describe('createTestApp và configureApp', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp([], ['http://web.gia-lap']);
  });
  afterAll(async () => {
    await t.close();
  });

  it('route không có trả 404 theo định dạng lỗi chung', async () => {
    const res = await fetch(`${t.url}/khong-co`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ code: 'NOT_FOUND', message: 'Không tìm thấy' });
  });

  it('CORS có credentials chỉ cho nguồn trong danh sách', async () => {
    const allowed = await fetch(`${t.url}/khong-co`, { headers: { Origin: 'http://web.gia-lap' } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://web.gia-lap');
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true');
    const other = await fetch(`${t.url}/khong-co`, { headers: { Origin: 'http://nguon-la.gia-lap' } });
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
  });
});
