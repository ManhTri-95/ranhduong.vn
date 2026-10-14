import { describe, expect, it } from 'vitest';
import { missingLabels } from './missing';

describe('missingLabels', () => {
  it('đổi mã thành nhãn, mỗi mã một lần, theo thứ tự vị trí, giờ, nguồn xác nhận, ảnh', () => {
    expect(missingLabels(['photo_source_missing', 'location_missing', 'photo_source_missing'])).toEqual(['Vị trí', 'Nguồn ảnh']);
    expect(missingLabels(['verify_source_missing', 'hours_invalid'])).toEqual(['Giờ mở cửa', 'Nguồn xác nhận']);
    expect(missingLabels([])).toEqual([]);
  });
});
