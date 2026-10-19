import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Font } from 'satori';

/** `apps/api/assets/ticket`: src/modules/tickets và dist/modules/tickets cùng độ sâu nên dùng được cả khi test lẫn bản build. */
export const TICKET_ASSET_DIR = join(__dirname, '..', '..', '..', 'assets', 'ticket');

/** Màu vé theo design token (Spec UI mục 2); accent là màu nhấn của thành phố, luôn đi với chữ ink. */
export interface TicketColors {
  paper: string;
  paperRaised: string;
  ink: string;
  inkSoft: string;
  mist: string;
  line: string;
  note: string;
  accent: string;
}

const TOKEN_NAMES = {
  paper: 'paper', paperRaised: 'paper-raised', ink: 'ink', inkSoft: 'ink-soft', mist: 'mist', line: 'line', note: 'note',
} as const satisfies Record<Exclude<keyof TicketColors, 'accent'>, string>;

/** tokens.css của packages/ui: một nguồn màu cho web, admin và vé. */
export function readTokensCss(): string {
  return readFileSync(require.resolve('@ranhduong/ui/tokens.css'), 'utf8');
}

export function ticketColors(tokensCss: string, accent: string): TicketColors {
  const token = (name: string): string => {
    const value = new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})\\s*;`).exec(tokensCss)?.[1];
    if (!value) throw new Error(`Thiếu token --${name} trong tokens.css`);
    return value;
  };
  return {
    paper: token(TOKEN_NAMES.paper), paperRaised: token(TOKEN_NAMES.paperRaised), ink: token(TOKEN_NAMES.ink),
    inkSoft: token(TOKEN_NAMES.inkSoft), mist: token(TOKEN_NAMES.mist), line: token(TOKEN_NAMES.line), note: token(TOKEN_NAMES.note),
    accent,
  };
}

/** Font tĩnh có tiếng Việt, chỉ dùng cho vé (README trong thư mục assets ghi nguồn và giấy phép). */
export function loadTicketFonts(dir = join(TICKET_ASSET_DIR, 'fonts')): Font[] {
  const font = (file: string, name: string, weight: 400 | 600 | 700): Font => ({ name, data: readFileSync(join(dir, file)), weight, style: 'normal' });
  return [
    font('Lora-Bold.ttf', 'Lora', 700),
    font('BeVietnamPro-Regular.ttf', 'Be Vietnam Pro', 400),
    font('BeVietnamPro-SemiBold.ttf', 'Be Vietnam Pro', 600),
    font('BeVietnamPro-Bold.ttf', 'Be Vietnam Pro', 700),
    font('PatrickHand-Regular.ttf', 'Patrick Hand', 400),
  ];
}

/** Ảnh OG khi vé chưa sinh xong; giống apps/web/public/og-default.png. */
export function readDefaultOg(): Buffer {
  return readFileSync(join(TICKET_ASSET_DIR, 'og-default.png'));
}
