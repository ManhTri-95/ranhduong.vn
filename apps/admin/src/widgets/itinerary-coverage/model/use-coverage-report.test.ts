import { FetchError } from 'ofetch';
import { effectScope } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ItineraryCoverageReport } from '@ranhduong/contracts';
import { fetchItineraryCoverage } from '@/entities/itinerary/api/coverage';
import { useCoverageReport } from './use-coverage-report';

vi.mock('@/entities/itinerary/api/coverage', () => ({ fetchItineraryCoverage: vi.fn() }));
const query = { startDate: '2026-11-23', transport: 'motorbike', with: 'friends' } as const;
const report = (startDate: string = query.startDate): ItineraryCoverageReport => ({ checkedAt: '2026-11-20T03:00:00Z', startDate, endDate: '2026-11-29', transport: 'motorbike', with: 'friends', total: 420, passed: 420, failed: 0, failures: [], zones: [] });
const scopes: ReturnType<typeof effectScope>[] = [];
const mount = () => { const scope = effectScope(); scopes.push(scope); return scope.run(useCoverageReport)!; };
afterEach(() => { scopes.splice(0).forEach((s) => s.stop()); vi.clearAllMocks(); });

describe('S36 coverage state', () => {
  it('runs only on request, clears an older report while running and publishes the checked context', async () => {
    vi.mocked(fetchItineraryCoverage).mockResolvedValue(report());
    const model = mount();
    expect(model.state.value.kind).toBe('idle');
    const pending = model.run(query);
    expect(model.state.value.kind).toBe('loading');
    await pending;
    expect(model.state.value.kind).toBe('ready');
    expect(model.report.value?.total).toBe(420);
    const again = model.run(query);
    expect(model.report.value).toBeNull();
    await again;
  });
  it('offers retry for network errors and login for an expired session', async () => {
    vi.mocked(fetchItineraryCoverage).mockRejectedValueOnce(new Error('Mất mạng Giả Lập'));
    const model = mount();
    await model.run(query);
    expect(model.state.value).toEqual({ kind: 'error', login: false });
    const expired = new FetchError('Hết phiên Giả Lập');
    Object.defineProperty(expired, 'statusCode', { value: 401 });
    vi.mocked(fetchItineraryCoverage).mockRejectedValueOnce(expired);
    await model.run(query);
    expect(model.state.value).toEqual({ kind: 'error', login: true });
    vi.mocked(fetchItineraryCoverage).mockResolvedValueOnce(report());
    await model.run(query);
    expect(model.state.value.kind).toBe('ready');
  });
  it('ignores late responses from an older run or a disposed page', async () => {
    let release: ((value: ItineraryCoverageReport) => void) | undefined;
    vi.mocked(fetchItineraryCoverage).mockImplementationOnce(() => new Promise((resolve) => { release = resolve; })).mockResolvedValueOnce(report('2026-12-01'));
    const model = mount();
    const old = model.run(query);
    await model.run({ ...query, startDate: '2026-12-01' });
    release?.(report()); await old;
    expect(model.report.value?.startDate).toBe('2026-12-01');
    vi.mocked(fetchItineraryCoverage).mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const last = model.run(query);
    scopes[0]?.stop(); release?.(report()); await last;
    expect(model.report.value).toBeNull();
  });
});
