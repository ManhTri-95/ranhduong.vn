import { randomUUID } from 'node:crypto';
import mongoose, { type Connection } from 'mongoose';

// Chỉ dùng trong test, không nằm trong build. Local: `pnpm infra:up`; CI: service container mongo.
export const TEST_URI = process.env.MONGODB_TEST_URI ?? 'mongodb://localhost:27017';

/**
 * Mở kết nối tới một database riêng, tên ngẫu nhiên, để các file test chạy song song không đụng nhau.
 * Tắt autoIndex/autoCreate: index chỉ có khi code gọi ensureIndexes(), đúng điều test cần kiểm.
 */
export async function connectTestDb(): Promise<Connection> {
  const dbName = `ranhduong_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  try {
    return await mongoose
      .createConnection(TEST_URI, { dbName, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000 })
      .asPromise();
  } catch (err) {
    throw new Error(`Không kết nối được MongoDB test tại ${TEST_URI}. Chạy \`pnpm infra:up\` trước.`, { cause: err });
  }
}

/** Xoá database test và đóng kết nối. */
export async function dropTestDb(conn: Connection): Promise<void> {
  await conn.dropDatabase();
  await conn.close();
}
