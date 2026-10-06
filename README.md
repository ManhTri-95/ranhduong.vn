# Rành Đường

Cẩm nang số Đà Lạt: bản đồ, địa điểm đã xác minh, lịch trình theo cụm khu vực.

## Chạy local

```bash
nvm use                 # Node 24 (tối thiểu 22.19)
corepack enable         # dùng pnpm theo packageManager
pnpm install
cp .env.example apps/api/.env   # sửa giá trị nếu cần
pnpm infra:up           # MongoDB, Redis, MinIO
pnpm dev                # web: http://localhost:3000, admin: http://localhost:5174, API: http://localhost:3001/v1/health
```

Kiểm tra trước khi đẩy code: `pnpm turbo run typecheck test build`.

Quy ước và tài liệu: xem [CLAUDE.md](./CLAUDE.md) và [docs/decisions.md](./docs/decisions.md).
