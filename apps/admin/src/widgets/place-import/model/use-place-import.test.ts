import { CsvImportResponse } from '@ranhduong/contracts';
import { FetchError } from 'ofetch';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCsvPlaces, previewCsvPlaces } from '@/entities/place/api/import';
import { usePlaceImport } from './use-place-import';

vi.mock('@/entities/place/api/import', () => ({ createCsvPlaces: vi.fn(), previewCsvPlaces: vi.fn() }));
const csv = 'name,category,status\nQuán GIẢ,cafe,Đã xác nhận';
const file = (name = 'gia-lap.csv', text = csv) => ({ name, size: text.length, text: async () => text });
const response = CsvImportResponse.parse({ rows: [
  { row: 2, name: 'Sẵn sàng GIẢ', status: 'ready' },
  { row: 3, name: 'Nghi trùng GIẢ', status: 'duplicate', matches: [{ name: 'Đã có GIẢ', placeId: '0123456789abcdef01234567' }] },
  { row: 4, name: 'Lỗi GIẢ', status: 'error' },
  { row: 5, name: 'Đã nhập GIẢ', status: 'existing' },
] });
afterEach(() => vi.resetAllMocks());

describe('S21 admin import state', () => {
  it('selects ready rows by default and requires explicit consent for suspected duplicates', async () => {
    vi.mocked(previewCsvPlaces).mockResolvedValue(response);
    const model = usePlaceImport();
    await model.chooseFile(file());
    await model.preview();
    expect(model.step.value).toBe(2);
    expect(model.selections.value).toEqual([{ row: 2, allowDuplicate: false }]);
    model.decisions.value[3] = 'create';
    model.decisions.value[4] = 'create';
    model.decisions.value[5] = 'create';
    expect(model.selections.value).toEqual([{ row: 2, allowDuplicate: false }, { row: 3, allowDuplicate: true }]);
    model.decisions.value[2] = 'skip';
    expect(model.selections.value).toEqual([{ row: 3, allowDuplicate: true }]);
  });

  it('retains file, decisions and review after a lost response, and can retry safely', async () => {
    vi.mocked(previewCsvPlaces).mockResolvedValue(response);
    vi.mocked(createCsvPlaces).mockRejectedValueOnce(new Error('Mất mạng giả')).mockResolvedValueOnce(CsvImportResponse.parse({ rows: [{ row: 2, name: 'GIẢ', status: 'existing', placeId: '0123456789abcdef01234567' }] }));
    const model = usePlaceImport();
    await model.chooseFile(file());
    await model.preview();
    await model.submit();
    expect(model.step.value).toBe(2);
    expect(model.failure.value?.login).toBe(false);
    expect(model.csv.value).toBe(csv);
    expect(model.selections.value).toHaveLength(1);
    await model.submit();
    expect(model.step.value).toBe(3);
    expect(model.result.value?.rows[0]?.status).toBe('existing');
  });

  it('keeps the CSV in memory on session expiry and offers login', async () => {
    const error = new FetchError('Phiên giả hết hạn');
    Object.defineProperty(error, 'statusCode', { value: 401 });
    vi.mocked(previewCsvPlaces).mockRejectedValue(error);
    const model = usePlaceImport();
    await model.chooseFile(file());
    await model.preview();
    expect(model.failure.value?.login).toBe(true);
    expect(model.csv.value).toBe(csv);
    expect(model.busy.value).toBeNull();
  });

  it('ignores an older preview when a new file is selected', async () => {
    let resolveOld: ((value: CsvImportResponse) => void) | undefined;
    vi.mocked(previewCsvPlaces).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const model = usePlaceImport();
    await model.chooseFile(file('cu.csv'));
    const old = model.preview();
    await model.chooseFile(file('moi.csv', `${csv} `));
    resolveOld?.(response);
    await old;
    expect(model.fileName.value).toBe('moi.csv');
    expect(model.previewRows.value).toEqual([]);
    expect(model.step.value).toBe(1);
  });

  it('ignores late file reads, oversized files and double submits', async () => {
    let resolveRead: ((value: string) => void) | undefined;
    const model = usePlaceImport();
    const old = model.chooseFile({ name: 'cu.csv', size: 20, text: () => new Promise((resolve) => { resolveRead = resolve; }) });
    await model.chooseFile(file('moi.csv'));
    resolveRead?.('CSV cũ GIẢ');
    await old;
    expect(model.csv.value).toBe(csv);
    await model.chooseFile({ ...file(), size: 300_000 });
    expect(model.csv.value).toBe('');
    expect(model.failure.value?.message).toContain('256');

    vi.mocked(previewCsvPlaces).mockResolvedValue(response);
    await model.chooseFile(file());
    await model.preview();
    let finish: ((value: CsvImportResponse) => void) | undefined;
    vi.mocked(createCsvPlaces).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockRejectedValueOnce(new Error('Không được gọi lần hai'));
    const pending = model.submit();
    await model.submit();
    await model.chooseFile(file('khong-doi.csv'));
    expect(model.fileName.value).toBe('gia-lap.csv');
    finish?.(CsvImportResponse.parse({ rows: [{ row: 2, name: 'GIẢ', status: 'created', placeId: '0123456789abcdef01234567' }] }));
    await pending;
    expect(model.result.value?.rows[0]?.status).toBe('created');
  });
});
