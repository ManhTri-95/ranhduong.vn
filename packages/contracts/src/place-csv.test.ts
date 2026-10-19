import { describe, expect, it } from 'vitest';
import { CsvImportInput, CsvImportResponse, CsvPreviewInput, parsePlaceCsv } from './place-csv.js';

const header = 'id,name,category,status,imported';
const csv = (extra = '', row = '') => `${header}${extra}\r\nD001,Quán Giả Lập,cafe,Đã xác nhận,no${row}\r\n`;

describe('Google Sheet CSV place import', () => {
  it('creates a minimal draft input using current defaults and owner provenance', () => {
    expect(parsePlaceCsv(csv())[0]).toMatchObject({ row: 2, status: 'ready', draft: { sheetId: 'D001', place: { name: 'Quán Giả Lập', category: 'cafe', alsoCategories: [], openingHours: [], contact: {}, verifySource: 'owner' } } });
  });

  it('maps all current fields, normalizes phone and keeps GeoJSON longitude first', () => {
    const row = parsePlaceCsv(csv(',aliases,also_category,zone,address,latlng,hours,visit_min,best_time,cover,price,tags,transport,notes,phone,fanpage,website,osm_id',
      ',Giả Lập Coffee;Café Giả Lập,food;shop,trung-tam,Địa chỉ Giả Lập,"0.2,0.3","T2-CN 06:30-11:00,14:00-22:00",60,morning;sunset,partial,2,chill;view-doi,motorbike;car,Ghi chú Giả Lập,0912 345 678,https://example.com/fanpage,https://example.com,node/123'))[0];
    expect(row).toMatchObject({ status: 'ready', draft: { osmId: 'node/123', place: { aliases: ['Giả Lập Coffee', 'Café Giả Lập'], alsoCategories: ['food', 'shop'], zone: 'trung-tam', address: 'Địa chỉ Giả Lập', location: { type: 'Point', coordinates: [0.3, 0.2] }, visitDurationMin: 60, bestTime: ['morning', 'sunset'], cover: 'partial', priceLevel: 2, tags: ['chill', 'view-doi'], transport: ['motorbike', 'car'], practicalNotes: 'Ghi chú Giả Lập', contact: { phone: '+84912345678', fanpage: 'https://example.com/fanpage', website: 'https://example.com' } } } });
    expect(row?.draft?.place.openingHours).toHaveLength(14);
  });

  it('exposes incoming identifiers and mapped place data for meaningful duplicate review', () => {
    const parsed = parsePlaceCsv(csv(',address,latlng,phone,osm_id', ',Địa chỉ Giả,"0.2,0.3",0912345678,node/123'));
    const row = CsvImportResponse.parse({ rows: parsed }).rows[0];
    expect(row).toMatchObject({ preview: { sheetId: 'D001', osmId: 'node/123', place: { category: 'cafe', address: 'Địa chỉ Giả', location: { type: 'Point', coordinates: [0.3, 0.2] }, contact: { phone: '+84912345678' } } } });
  });

  it.each(['attraction', 'cafe', 'food', 'activity', 'stay', 'shop'])('accepts current category %s', (category) => {
    expect(parsePlaceCsv(`${header}\nD1,Địa điểm Giả Lập,${category},Sẵn sàng đăng,`)[0]).toMatchObject({ status: 'ready', draft: { place: { verifySource: 'owner', category } } });
  });

  it('skips ineligible/already imported rows before validating their fields', () => {
    const rows = parsePlaceCsv(`${header}\nD1,,bad,Đã nhắn,no\nD2,,bad,Đã xác nhận, YES \nD3,Điểm Giả Lập,attraction,Đăng chưa xác nhận,no`);
    expect(rows.map((row) => row.status)).toEqual(['skipped', 'skipped', 'ready']);
    expect(rows[2]?.draft?.place.verifySource).toBe('admin');
  });

  it.each([['yes', 'full'], ['no', 'none']])('reads legacy indoor=%s when cover is blank', (indoor, cover) => {
    expect(parsePlaceCsv(csv(',cover,indoor', `,,${indoor}`))[0]).toMatchObject({ status: 'ready', draft: { place: { cover } } });
    expect(parsePlaceCsv(csv(',cover,indoor', `,partial,${indoor}`))[0]).toMatchObject({ status: 'ready', draft: { place: { cover: 'partial' } } });
  });

  it('handles UTF-8 BOM, quoted commas, escaped quotes, multiline notes and empty lines', () => {
    const rows = parsePlaceCsv('\uFEFFid,name,category,status,notes\r\nD1,"Quán ""Giả Lập"", A",shop,Đã xác nhận,"Dòng 1\r\nDòng 2"\r\n\r\nD2,Nhà Giả Lập,stay,Đăng chưa xác nhận,');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ row: 2, name: 'Quán "Giả Lập", A', draft: { place: { practicalNotes: 'Dòng 1\nDòng 2' } } });
    expect(rows[1]?.row).toBe(5);
  });

  it.each([
    [',category2', ',food', 'category2'],
    [',price', ',0', 'price'],
    [',visit_min', ',abc', 'visit_min'],
    [',visit_min', ',0', 'visit_min'],
    [',latlng', ',"90.1,108"', 'latlng'],
    [',phone', ',123', 'phone'],
    [',website', ',javascript:alert(1)', 'website'],
    [',also_category', ',cafe', 'also_category'],
    [',also_category', ',food;food', 'also_category'],
    [',cover', ',yes', 'cover'],
    [',indoor', ',maybe', 'indoor'],
    [',hours', ',T2 25:00-26:00', 'hours'],
    [',hours', ',T2 07:00-22:00-garbage', 'hours'],
    [',hours', ',T2 22:00-02:00; T3 01:00-03:00', 'hours'],
    [',hours', ',CN 22:00-02:00; T2 01:00-03:00', 'hours'],
    [',hours', ',T7 22:00-02:00; CN 01:00-03:00', 'hours'],
    [',hours', ',"T2 06:00-12:00,11:00-14:00"', 'hours'],
    [',osm_id', ',123', 'osm_id'],
  ])('reports actionable errors for invalid input %s %s', (extra, row, column) => {
    if (column === 'category2') {
      expect(() => parsePlaceCsv(csv(extra, row))).toThrow(/category2/);
    } else {
      expect(parsePlaceCsv(csv(extra, row))[0]).toMatchObject({ status: 'error', issues: expect.arrayContaining([expect.objectContaining({ column, fix: expect.any(String) })]) });
    }
  });

  it('accepts overnight/24h/closed hours and keeps blank numbers/coordinates absent', () => {
    const row = parsePlaceCsv(csv(',hours,price,visit_min,latlng', ',T5-T6 18:00-02:00; CN 24h; T2 Đóng,,,'))[0];
    expect(row).toMatchObject({ status: 'ready' });
    expect(row?.draft?.place.openingHours).toHaveLength(3);
    expect(row?.draft?.place.priceLevel).toBeUndefined();
    expect(row?.draft?.place.visitDurationMin).toBeUndefined();
    expect(row?.draft?.place.location).toBeUndefined();
  });

  it('accepts overnight shifts meeting the next shift exactly without overlap', () => {
    expect(parsePlaceCsv(csv(',hours', ',CN 22:00-02:00; T2 02:00-03:00'))[0]?.status).toBe('ready');
  });

  it.each([
    ['name,category\nA,cafe', /status/],
    ['id,name,name,category,status\nD1,A,A,cafe,Đã xác nhận', /name/],
    [`${header}\nD1,"Chưa đóng,cafe,Đã xác nhận,no`, /ngoặc kép/],
    [`${header}\nD1,Giả "Lập",cafe,Đã xác nhận,no`, /ngoặc kép/],
    [`${header}\nD1,"Giả Lập"x,cafe,Đã xác nhận,no`, /ngoặc kép/],
  ])('rejects ambiguous CSV before any writes', (input, message) => {
    expect(() => parsePlaceCsv(input)).toThrow(message);
  });

  it('marks ragged records as errors rather than shifting columns', () => {
    expect(parsePlaceCsv(`${header}\nD1,Giả Lập,cafe,Đã xác nhận,no,extra`)[0]).toMatchObject({ status: 'error', issues: [expect.objectContaining({ column: '*', fix: expect.any(String) })] });
  });

  it('allows documented tracking columns and does not require an id when phone or OSM can identify the row', () => {
    expect(parsePlaceCsv('name,category,status,batch,drive_folder\nGiả Lập,cafe,Đã xác nhận,1,https://example.com')[0]).toMatchObject({ status: 'ready' });
  });

  it('limits bytes/rows and rejects empty, repeated or nonpositive selections', () => {
    expect(CsvPreviewInput.safeParse({ csv: 'á'.repeat(140_000) }).success).toBe(false);
    expect(() => parsePlaceCsv(`${header}\n${'D1,Giả Lập,cafe,Đã xác nhận,no\n'.repeat(501)}`)).toThrow(/500/);
    for (const selections of [[], [{ row: 0 }], [{ row: 2 }, { row: 2 }]]) {
      expect(CsvImportInput.safeParse({ csv: csv(), selections }).success).toBe(false);
    }
  });
});
