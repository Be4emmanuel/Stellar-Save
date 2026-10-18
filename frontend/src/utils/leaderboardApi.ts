/**
 * leaderboardApi.ts
 *
 * Ranking algorithms and public API for leaderboard data.
 * Mock data factories have been moved to src/mocks/leaderboardMockData.ts and
 * are loaded only when VITE_USE_MOCKS=true.
 *
 * TODO: replace fetchLeaderboard() with real Soroban/Horizon queries when
 * the on-chain indexer is ready.
 */

import type {
  LeaderboardData,
  LeaderboardGroup,
  LeaderboardMember,
  TimePeriod,
} from '../types/leaderboard';

// ── Ranking algorithms ────────────────────────────────────────────────────────

/**
 * Score a group: weighted combination of completion rate, on-time rate,
 * and normalised volume. Returns 0–100.
 */
export function scoreGroup(g: Omit<LeaderboardGroup, 'rank' | 'trend'>): number {
  return (
    g.completionRate * 0.5 +
    g.onTimeRate * 0.3 +
    Math.min(g.totalVolume / 100_000, 1) * 100 * 0.2
  );
}

/**
 * Score a member: weighted combination of on-time rate, streak, and
 * normalised total contributed. Returns 0–100.
 */
export function scoreMember(m: Omit<LeaderboardMember, 'rank' | 'trend'>): number {
  return (
    m.onTimeRate * 0.5 +
    Math.min(m.streak / 12, 1) * 100 * 0.3 +
    Math.min(m.totalContributed / 10_000, 1) * 100 * 0.2
  );
}

// ── Mock gate ─────────────────────────────────────────────────────────────────

const USE_MOCKS = import.meta.env['VITE_USE_MOCKS'] === 'true';

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchLeaderboard(period: TimePeriod): Promise<LeaderboardData> {
  if (USE_MOCKS) {
    // Lazily import so the mock module is excluded from production bundles
    const { mockGroups, mockMembers } = await import('../mocks/leaderboardMockData');
    await new Promise((r) => setTimeout(r, 400));
    return {
      groups: mockGroups(period),
      members: mockMembers(period),
      period,
      generatedAt: new Date(),
    };
  }

  // TODO: replace with real Soroban/Horizon query
  return {
    groups: [],
    members: [],
    period,
    generatedAt: new Date(),
  };
}
