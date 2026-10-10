import { describe, expect, it } from 'vitest';
import { estimateTemplateTravelMinutes } from './distance.js';
describe('template travel estimate', () => {
  it('uses the raw distance formula, rounds to 5 minutes and permits zero for co-located places', () => {
    expect(estimateTemplateTravelMinutes({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
    expect(estimateTemplateTravelMinutes({ lat: 0, lng: 0 }, { lat: 0, lng: 0.02 })).toBe(5);
    expect(estimateTemplateTravelMinutes({ lat: 0, lng: 0 }, { lat: 0, lng: 0.04 })).toBe(15);
  });
});
