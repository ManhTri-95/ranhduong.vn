import type { Connection } from 'mongoose';
import { afterAll, describe, expect, it } from 'vitest';
import { connectTestDb, dropTestDb } from './mongo';

describe('connectTestDb', () => {
  const opened: Connection[] = [];
  afterAll(async () => {
    await Promise.all(opened.map((conn) => dropTestDb(conn)));
  });

  it('mỗi lần mở một database riêng, tên bắt đầu bằng ranhduong_test_', async () => {
    const a = await connectTestDb();
    const b = await connectTestDb();
    opened.push(a, b);
    expect(a.name).toMatch(/^ranhduong_test_[0-9a-f]{12}$/);
    expect(a.name).not.toBe(b.name);
  });

  it('ghi và đọc được dữ liệu', async () => {
    const conn = await connectTestDb();
    opened.push(conn);
    await conn.collection('probe').insertOne({ ok: 1 });
    expect(await conn.collection('probe').countDocuments()).toBe(1);
  });
});
