import { describe, expect, it } from 'vitest';
import { MEAL_WINDOWS } from './itinerary-meals.js';

describe('shared meal windows', () => {
  it('exposes lunch and dinner for scheduling and template diagnostics', () => {
    expect(MEAL_WINDOWS).toEqual([
      { kind: 'lunch', start: 690, end: 810, label: 'bữa trưa (11:30–13:30)' },
      { kind: 'dinner', start: 1080, end: 1200, label: 'bữa tối (18:00–20:00)' },
    ]);
  });
});
