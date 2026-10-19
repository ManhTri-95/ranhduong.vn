/** CSV UTF-8 theo Google Sheets: dấu phẩy, ngoặc kép RFC 4180, xuống dòng trong ô. */
export interface CsvRecord { row: number; cells: string[] }

export function readCsv(text: string, maxRows: number): CsvRecord[] {
  const input = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let closed = false;
  let line = 1;
  let start = 1;
  const malformed = () => new Error(`Dòng ${line}: ngoặc kép CSV không hợp lệ. Xuất lại CSV từ Google Sheets.`);
  function finish(): void {
    cells.push(cell.trim());
    if (cells.some((value) => value !== '')) records.push({ row: start, cells });
    if (records.length > maxRows + 1) throw new Error(`Mỗi file tối đa ${maxRows} dòng dữ liệu. Chia file rồi nhập tiếp.`);
    cells = [];
    cell = '';
    closed = false;
  }
  for (let index = 0; index < input.length; index++) {
    const char = input[index]!;
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') { cell += '"'; index++; }
        else { quoted = false; closed = true; }
      } else { cell += char; if (char === '\n') line++; }
    } else if (char === ',') {
      cells.push(cell.trim()); cell = ''; closed = false;
    } else if (char === '\n') {
      finish(); line++; start = line;
    } else if (char === '"') {
      if (cell !== '' || closed) throw malformed();
      quoted = true;
    } else {
      if (closed) throw malformed();
      cell += char;
    }
  }
  if (quoted) throw malformed();
  if (cell !== '' || cells.length > 0 || closed) finish();
  return records;
}
