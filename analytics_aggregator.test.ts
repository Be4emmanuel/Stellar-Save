import { describe, it, expect } from 'vitest';
import {
  aggregateAnalytics,
  type AnalyticsEvent,
  type AggregateOptions,
} from './analytics_aggregator';

/**
 * Golden-dataset correctness tests for analytics_aggregator.ts.
 *
 * The input dataset below is fixed and small; every expected aggregate value
 * was hand-calculated (see comments) so that regressions such as
 * double-counting or timezone-boundary errors are caught immediately.
 */

const UTC: AggregateOptions = { timezone: 'UTC' };

/**
 * Fixed input dataset.
 *
 * Hand-calculated totals (UTC):
 *   - total events: 6
 *   - unique users: 3 (u1, u2, u3)
 *   - page_view: 3, click: 2, purchase: 1
 *   - revenue: 10 + 25 = 35
 */
const goldenDataset: AnalyticsEvent[] = [
  { id: 'e1', userId: 'u1', type: 'page_view', timestamp: '2024-03-01T00:00:00Z', revenue: 0 },
  { id: 'e2', userId: 'u1', type: 'click', timestamp: '2024-03-01T06:30:00Z', revenue: 0 },
  { id: 'e3', userId: 'u2', type: 'page_view', timestamp: '2024-03-01T12:00:00Z', revenue: 0 },
  { id: 'e4', userId: 'u2', type: 'purchase', timestamp: '2024-03-01T18:45:00Z', revenue: 10 },
  { id: 'e5', userId: 'u3', type: 'click', timestamp: '2024-03-02T03:15:00Z', revenue: 0 },
  { id: 'e6', userId: 'u3', type: 'page_view', timestamp: '2024-03-02T09:00:00Z', revenue: 25 },
];

describe('aggregateAnalytics - golden dataset', () => {
  it('produces exactly the hand-calculated aggregate outputs', () => {
    const result = aggregateAnalytics(goldenDataset, UTC);

    expect(result.totalEvents).toBe(6);
    expect(result.uniqueUsers).toBe(3);
    expect(result.revenue).toBe(35);
    expect(result.countsByType).toEqual({
      page_view: 3,
      click: 2,
      purchase: 1,
    });
  });

  it('does not double-count events when the same user appears multiple times', () => {
    const result = aggregateAnalytics(goldenDataset, UTC);

    // u1 appears twice, u2 twice, u3 twice -> still 3 unique users.
    expect(result.uniqueUsers).toBe(3);
    // Each event counted exactly once.
    expect(result.totalEvents).toBe(6);
    expect(result.countsByType.page_view).toBe(3);
  });

  it('is stable regardless of input ordering', () => {
    const shuffled = [...goldenDataset].reverse();
    const result = aggregateAnalytics(shuffled, UTC);

    expect(result.totalEvents).toBe(6);
    expect(result.uniqueUsers).toBe(3);
    expect(result.revenue).toBe(35);
    expect(result.countsByType).toEqual({ page_view: 3, click: 2, purchase: 1 });
  });
});

describe('aggregateAnalytics - timezone boundaries', () => {
  /**
   * Events straddling a UTC midnight boundary.
   *
   * In UTC these fall on two distinct days:
   *   2024-03-01: e1 (23:30Z), e2 (23:59Z)
   *   2024-03-02: e3 (00:00Z), e4 (00:30Z)
   *
   * In America/New_York (UTC-5 in March, DST starts 2024-03-10):
   *   e1 -> 2024-03-01 18:30 local
   *   e2 -> 2024-03-01 18:59 local
   *   e3 -> 2024-03-01 19:00 local
   *   e4 -> 2024-03-01 19:30 local
   * so all four events belong to the same local day (2024-03-01).
   */
  const boundaryDataset: AnalyticsEvent[] = [
    { id: 'e1', userId: 'u1', type: 'page_view', timestamp: '2024-03-01T23:30:00Z', revenue: 0 },
    { id: 'e2', userId: 'u1', type: 'click', timestamp: '2024-03-01T23:59:00Z', revenue: 0 },
    { id: 'e3', userId: 'u2', type: 'page_view', timestamp: '2024-03-02T00:00:00Z', revenue: 0 },
    { id: 'e4', userId: 'u2', type: 'click', timestamp: '2024-03-02T00:30:00Z', revenue: 0 },
  ];

  it('splits events across two days in UTC', () => {
    const result = aggregateAnalytics(boundaryDataset, { timezone: 'UTC' });

    expect(result.countsByDay).toEqual({
      '2024-03-01': 2,
      '2024-03-02': 2,
    });
  });

  it('groups the same events into one local day in America/New_York', () => {
    const result = aggregateAnalytics(boundaryDataset, { timezone: 'America/New_York' });

    expect(result.countsByDay).toEqual({
      '2024-03-01': 4,
    });
  });

  it('keeps totals consistent across timezones', () => {
    const utc = aggregateAnalytics(boundaryDataset, { timezone: 'UTC' });
    const ny = aggregateAnalytics(boundaryDataset, { timezone: 'America/New_York' });

    expect(utc.totalEvents).toBe(4);
    expect(ny.totalEvents).toBe(4);
    expect(utc.uniqueUsers).toBe(2);
    expect(ny.uniqueUsers).toBe(2);
  });
});
