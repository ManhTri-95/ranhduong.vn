import { describe, expect, it } from 'vitest';
import { loadDbEnv, loadEnv } from './env';

const REQUIRED = {
  MONGODB_URI: 'mongodb://localhost:27017/gia-lap',
  GOOGLE_CLIENT_ID: 'client-id-gia-lap.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'client-secret-gia-lap',
};

describe('loadEnv', () => {
  it('S06 cấu hình R2 local, bucket ảnh gốc riêng và URL hợp lệ', () => {
    const env = loadEnv(REQUIRED);
    expect(env).toMatchObject({ R2_ENDPOINT: 'http://localhost:9000', R2_BUCKET: 'ranhduong-media', R2_UPLOAD_BUCKET: 'ranhduong-uploads' });
    expect(() => loadEnv({ ...REQUIRED, R2_BUCKET: 'same', R2_UPLOAD_BUCKET: 'same' })).toThrow(/R2_UPLOAD_BUCKET/);
    expect(() => loadEnv({ ...REQUIRED, R2_ENDPOINT: 'file:///tmp' })).toThrow(/R2_ENDPOINT/);
  });
  it('đủ biến bắt buộc thì các biến còn lại lấy mặc định cho local', () => {
    const env = loadEnv(REQUIRED);
    expect(env).toMatchObject({
      REDIS_URL: 'redis://localhost:6379',
      API_PUBLIC_URL: 'http://localhost:3101',
      ADMIN_URL: 'http://localhost:5174',
      ADMIN_EMAILS: [],
      SESSION_COOKIE_NAME: 'sid',
    });
    expect(env.SESSION_COOKIE_DOMAIN).toBeUndefined();
  });

  it('ADMIN_EMAILS bỏ khoảng trắng, chữ hoa và mục rỗng', () => {
    const env = loadEnv({ ...REQUIRED, ADMIN_EMAILS: ' Quan-Tri-Gia-Lap@Example.com, ,phu-ta-gia-lap@example.com,' });
    expect(env.ADMIN_EMAILS).toEqual(['quan-tri-gia-lap@example.com', 'phu-ta-gia-lap@example.com']);
  });

  it('bỏ dấu / cuối URL; SESSION_COOKIE_DOMAIN rỗng coi như không đặt', () => {
    const env = loadEnv({ ...REQUIRED, API_PUBLIC_URL: 'https://api.ranhduong.vn/', ADMIN_URL: 'https://admin.ranhduong.vn/', SESSION_COOKIE_DOMAIN: ' ' });
    expect(env.API_PUBLIC_URL).toBe('https://api.ranhduong.vn');
    expect(env.ADMIN_URL).toBe('https://admin.ranhduong.vn');
    expect(env.SESSION_COOKIE_DOMAIN).toBeUndefined();
    expect(loadEnv({ ...REQUIRED, SESSION_COOKIE_DOMAIN: '.ranhduong.vn' }).SESSION_COOKIE_DOMAIN).toBe('.ranhduong.vn');
  });

  it('thiếu thông tin Google thì dừng với lỗi nêu đúng tên biến', () => {
    expect(() => loadEnv({ MONGODB_URI: REQUIRED.MONGODB_URI })).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it('URL không phải http(s) hoặc tên cookie lạ thì báo lỗi', () => {
    expect(() => loadEnv({ ...REQUIRED, ADMIN_URL: 'javascript:alert(1)' })).toThrow(/ADMIN_URL/);
    expect(() => loadEnv({ ...REQUIRED, SESSION_COOKIE_NAME: 'sid;x' })).toThrow(/SESSION_COOKIE_NAME/);
  });
});

describe('loadDbEnv', () => {
  it('lệnh seed chỉ cần MONGODB_URI, chưa cấu hình Google vẫn chạy được', () => {
    expect(loadDbEnv({ MONGODB_URI: REQUIRED.MONGODB_URI })).toEqual({ MONGODB_URI: REQUIRED.MONGODB_URI });
  });
});
