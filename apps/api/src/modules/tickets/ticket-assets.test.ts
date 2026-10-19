import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { loadTicketFonts, readDefaultOg, readTokensCss, TICKET_ASSET_DIR, ticketColors } from './ticket-assets';

describe('S30 tài nguyên vé', () => {
  it('màu vé lấy đủ từ tokens.css, accent từ thành phố', () => {
    const colors = ticketColors(readTokensCss(), '#E9B824');
    for (const value of Object.values(colors)) expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(colors.accent).toBe('#E9B824');
    expect(colors.ink).toBe('#1E3A2F');
    expect(() => ticketColors(':root { --paper: #F7F2E8; }', '#E9B824')).toThrow(/--paper-raised/);
  });
  it('đủ 5 file font tĩnh, mỗi họ font kèm OFL, ảnh mặc định 1200×630', async () => {
    expect(loadTicketFonts().map((f) => `${f.name} ${f.weight}`)).toEqual(['Lora 700', 'Be Vietnam Pro 400', 'Be Vietnam Pro 600', 'Be Vietnam Pro 700', 'Patrick Hand 400']);
    for (const font of loadTicketFonts()) expect(font.data.byteLength).toBeGreaterThan(50_000);
    for (const family of ['Lora', 'BeVietnamPro', 'PatrickHand']) {
      expect(readFileSync(join(TICKET_ASSET_DIR, 'fonts', `${family}-OFL.txt`), 'utf8')).toContain('SIL OPEN FONT LICENSE');
    }
    expect(await sharp(readDefaultOg()).metadata()).toMatchObject({ width: 1200, height: 630, format: 'png' });
  });
});
