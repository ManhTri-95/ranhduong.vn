# Tài nguyên vé lịch trình (S30)

Font và ảnh trong thư mục này chỉ dùng để worker dựng vé lịch trình dạng ảnh bằng Satori + resvg (Spec UI mục 9). Web khách không dùng các file này mà vẫn tải Google Fonts. Image Docker của API và worker phải chép cả thư mục `apps/api/assets`.

## Font

Satori không đọc được variable font, nên mọi file đều là bản tĩnh và đã có bộ ký tự tiếng Việt. Lora trên google/fonts chỉ có bản variable, nên bản tĩnh lấy từ repo gốc của Lora. Các link dưới đây ghim theo commit.

| File | Nguồn | SHA-256 |
| --- | --- | --- |
| `fonts/Lora-Bold.ttf` | [cyrealtype/Lora-Cyrillic@2d53b44](https://raw.githubusercontent.com/cyrealtype/Lora-Cyrillic/2d53b449b60e185b39f671b44fded83e0910ad30/fonts/ttf/Lora-Bold.ttf) | `32baf740eac1bf3f257904a6cf89e4e067ca1566b375bf22f743a26fc88b3791` |
| `fonts/BeVietnamPro-Regular.ttf` | [google/fonts@47d54ca ofl/bevietnampro](https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/bevietnampro/BeVietnamPro-Regular.ttf) | `cd1ef6e9d7db28ad5cdb88a65ccbe693870e60d340b791f349d248342b4fe4c3` |
| `fonts/BeVietnamPro-SemiBold.ttf` | [google/fonts@47d54ca ofl/bevietnampro](https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/bevietnampro/BeVietnamPro-SemiBold.ttf) | `bd8e27eb02720b9d91e59e4f10a90878643219f25ce6a8d9a4f06a8a88d3bb71` |
| `fonts/BeVietnamPro-Bold.ttf` | [google/fonts@47d54ca ofl/bevietnampro](https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/bevietnampro/BeVietnamPro-Bold.ttf) | `7f738fe5c43c8872807b20e2d30d42163618de8a4daf7f48a939adac32c16847` |
| `fonts/PatrickHand-Regular.ttf` | [google/fonts@47d54ca ofl/patrickhand](https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/patrickhand/PatrickHand-Regular.ttf) | `0f173b3e6cb6d1af25babf7f0057c5ac4ee11f9992b0469bb817e967ef4ad0fc` |

Cả ba họ font dùng giấy phép SIL Open Font License 1.1. Bản giấy phép đi kèm file font:

- `fonts/Lora-OFL.txt`: Copyright 2011 The Lora Project Authors, Reserved Font Name "Lora".
- `fonts/BeVietnamPro-OFL.txt`: Copyright 2021 The Be Vietnam Pro Project Authors.
- `fonts/PatrickHand-OFL.txt`: Copyright (c) 2010-2012 Patrick Wagesreiter.

Trang `/ghi-nguon` của web cũng ghi nguồn các font này.

Khi đổi font, nâng Satori/resvg hay đổi bố cục: tăng `TICKET_RENDER_VERSION` trong `src/modules/tickets/ticket-data.ts` để mọi vé được sinh lại, rồi xem ảnh mẫu bằng `pnpm --filter @ranhduong/api ticket:sample --out <thư mục>`.

## Ảnh mặc định

`og-default.png` (1200×630) là ảnh xem trước khi vé chưa sinh xong. File này giống `apps/web/public/og-default.png`. Sinh lại cả hai cùng lúc bằng:

```bash
node apps/web/scripts/generate-og-default.mjs
```
