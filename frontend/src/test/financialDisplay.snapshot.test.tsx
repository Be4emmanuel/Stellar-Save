/**
 * Snapshot tests for the financially-sensitive display components.
 *
 * These are the components where a rendering regression is a financial bug: a
 * user reads an amount off the screen and acts on it. A snapshot catches the
 * class of change that unit assertions miss - a dropped decimal place, a
 * changed currency label, a progress bar that stops reflecting its input, a
 * column that silently disappears.
 *
 * ## Why these ten
 *
 * Each one renders a number a user would act on, and each formats that number
 * differently, so together they cover the formatting surface that matters:
 *
 *  | Component                   | Formats                            |
 *  | --------------------------- | ---------------------------------- |
 *  | BalanceDisplay              | Stellar balances, relative time    |
 *  | UserStats                   | Totals with thousands separators   |
 *  | StreakDisplay               | Progress %, milestone labels       |
 *  | StaleDataBanner             | Cached/stale data warning          |
 *  | CycleProgress               | Cycle %, amounts, time remaining   |
 *  | GroupMetrics                | Rates, health score, durations     |
 *  | MemberCard                  | Totals, payout position ordinals   |
 *  | PayoutQueue                 | Payout amounts, dates, positions   |
 *  | TransactionTables           | Signed/unsigned amounts, statuses  |
 *  | dashboard/TransactionTable  | Signed amounts, currencies, chips  |
 *
 * ## Determinism
 *
 * A snapshot that changes depending on when or where it ran is worse than no
 * snapshot, because it trains reviewers to accept diffs without reading them.
 * Three things are pinned here:
 *
 * 1. `process.env.TZ = 'UTC'` - several components call `toLocaleDateString()`
 *    with no explicit time zone, so the same instant renders as a different
 *    calendar day depending on the machine. Set before any test runs.
 * 2. Fake timers with an explicit `setSystemTime` - `CycleProgress` and
 *    `BalanceDisplay` both measure against `Date.now()`.
 * 3. Fixed mock data with mid-day UTC timestamps - a date at midnight UTC
 *    still moves a day backwards in any negative-offset zone.
 *
 * `TransactionTables` renders one date column through a bare
 * `toLocaleDateString()` with no locale argument, so it also depends on the
 * runtime default locale. That is a latent flakiness bug in the component
 * rather than in the test; see the review guidance in
 * `frontend/src/test/SNAPSHOT_REVIEW.md` before accepting a diff there.
 */
process.env.TZ = 'UTC';

import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BalanceDisplay } from '../components/BalanceDisplay';
import { CycleProgress } from '../components/CycleProgress';
import { TransactionTable as DashboardTransactionTable } from '../components/dashboard/TransactionTable';
import { GroupMetrics } from '../components/GroupMetrics';
import { MemberCard } from '../components/MemberCard';
import { PayoutQueue } from '../components/PayoutQueue';
import { StaleDataBanner } from '../components/StaleDataBanner';
import { StreakDisplay } from '../components/StreakDisplay';
import TransactionTables from '../components/TransactionTables';
import { UserStats } from '../components/UserStats';

import type { PayoutQueueData } from '../types/contribution';
import type { Transaction as DashboardTransaction } from '../types/dashboard';
import type { Transaction } from '../types/transaction';
import type { DetailedGroup, GroupContribution, GroupCycle } from '../utils/groupApi';

// A single fixed "now" for every test that measures elapsed time.
const NOW = new Date('2026-06-15T12:00:00Z');

vi.mock('../hooks/useBalance', () => ({
  useBalance: () => mockUseBalance(),
}));

const mockUseBalance = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  mockUseBalance.mockReset();
});

describe('BalanceDisplay snapshots', () => {
  it('prompts to connect when no wallet is attached', () => {
    mockUseBalance.mockReturnValue({
      xlmBalance: null,
      allBalances: [],
      isLoading: false,
      error: null,
      lastUpdated: null,
      refresh: vi.fn(),
      hasAddress: false,
    });

    const { container } = render(<BalanceDisplay />);
    expect(container).toMatchSnapshot();
  });

  it('renders the XLM balance with a relative timestamp', () => {
    mockUseBalance.mockReturnValue({
      xlmBalance: '1234.5678901',
      allBalances: [],
      isLoading: false,
      error: null,
      lastUpdated: new Date('2026-06-15T11:58:30Z'),
      refresh: vi.fn(),
      hasAddress: true,
    });

    const { container } = render(<BalanceDisplay />);
    expect(container).toMatchSnapshot();
  });

  it('renders every asset when showAllBalances is set', () => {
    mockUseBalance.mockReturnValue({
      xlmBalance: '1234.5678901',
      allBalances: [
        { asset_type: 'native', balance: '1234.5678901' },
        { asset_type: 'credit_alphanum4', asset_code: 'USDC', balance: '5000' },
        { asset_type: 'credit_alphanum4', asset_code: 'EURC', balance: '2500.5' },
      ],
      isLoading: false,
      error: null,
      lastUpdated: new Date('2026-06-15T11:58:30Z'),
      refresh: vi.fn(),
      hasAddress: true,
    });

    const { container } = render(<BalanceDisplay showAllBalances />);
    expect(container).toMatchSnapshot();
  });

  it('surfaces a balance fetch error', () => {
    mockUseBalance.mockReturnValue({
      xlmBalance: null,
      allBalances: [],
      isLoading: false,
      error: 'Failed to load account: horizon timeout',
      lastUpdated: null,
      refresh: vi.fn(),
      hasAddress: true,
    });

    const { container } = render(<BalanceDisplay />);
    expect(container).toMatchSnapshot();
  });
});

describe('UserStats snapshots', () => {
  const stats = {
    totalContributed: 12500,
    totalReceived: 8200.5,
    groupsJoined: 4,
    activeGroups: 3,
    completedCycles: 17,
    averageContribution: 312.5,
  };

  it('renders every total with thousands separators', () => {
    const { container } = render(<UserStats stats={stats} />);
    expect(container).toMatchSnapshot();
  });

  it('renders zeroes without collapsing a stat', () => {
    const { container } = render(
      <UserStats
        stats={{
          totalContributed: 0,
          totalReceived: 0,
          groupsJoined: 0,
          activeGroups: 0,
          completedCycles: 0,
          averageContribution: 0,
        }}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders a non-XLM currency label', () => {
    const { container } = render(<UserStats stats={stats} currency="USDC" />);
    expect(container).toMatchSnapshot();
  });
});

describe('StreakDisplay snapshots', () => {
  it('renders streaks with the next milestone and earned badges', () => {
    const { container } = render(<StreakDisplay currentStreak={12} longestStreak={19} />);
    expect(container).toMatchSnapshot();
  });

  it('renders the at-risk warning', () => {
    const { container } = render(<StreakDisplay currentStreak={3} longestStreak={8} atRisk />);
    expect(container).toMatchSnapshot();
  });

  it('renders the empty badge state below the first threshold', () => {
    const { container } = render(<StreakDisplay currentStreak={0} longestStreak={0} />);
    expect(container).toMatchSnapshot();
  });
});

describe('StaleDataBanner snapshots', () => {
  it('renders nothing when data is neither stale nor cached', () => {
    const { container } = render(<StaleDataBanner />);
    expect(container).toMatchSnapshot();
  });

  it('renders the stale warning with a refresh action', () => {
    const { container } = render(<StaleDataBanner isStale onRefresh={() => {}} />);
    expect(container).toMatchSnapshot();
  });

  it('renders the cached notice without a refresh action', () => {
    const { container } = render(<StaleDataBanner fromCache />);
    expect(container).toMatchSnapshot();
  });
});

describe('CycleProgress snapshots', () => {
  it('renders an active cycle part-way through', () => {
    const { container } = render(
      <CycleProgress
        cycleNumber={4}
        deadline={new Date('2026-06-20T12:00:00Z')}
        contributedCount={7}
        totalMembers={10}
        targetAmount={5000}
        currentAmount={3500}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders a completed cycle at 100%', () => {
    const { container } = render(
      <CycleProgress
        cycleNumber={3}
        deadline={new Date('2026-06-10T12:00:00Z')}
        contributedCount={10}
        totalMembers={10}
        targetAmount={5000}
        currentAmount={5000}
        status="completed"
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders an overdue cycle', () => {
    const { container } = render(
      <CycleProgress
        cycleNumber={2}
        deadline={new Date('2026-06-01T12:00:00Z')}
        contributedCount={2}
        totalMembers={10}
        targetAmount={5000}
        currentAmount={1000}
        status="pending"
      />
    );
    expect(container).toMatchSnapshot();
  });
});

describe('GroupMetrics snapshots', () => {
  const group: DetailedGroup = {
    id: '1',
    name: 'Family Savings Circle',
    memberCount: 10,
    contributionAmount: 500,
    currency: 'XLM',
    status: 'active',
    createdAt: new Date('2026-01-10T12:00:00Z'),
    totalMembers: 10,
    targetAmount: 5000,
    currentAmount: 3500,
    contributionFrequency: 'monthly',
    members: [],
    contributions: [],
    cycles: [],
  };

  const contributions: GroupContribution[] = [
    {
      id: 'c1',
      memberId: 'm1',
      amount: 500,
      timestamp: new Date('2026-05-01T12:00:00Z'),
      transactionHash: 'tx1',
      status: 'completed',
    },
    {
      id: 'c2',
      memberId: 'm2',
      amount: 500,
      timestamp: new Date('2026-05-01T18:00:00Z'),
      transactionHash: 'tx2',
      status: 'completed',
    },
    {
      id: 'c3',
      memberId: 'm3',
      amount: 500,
      timestamp: new Date('2026-05-03T12:00:00Z'),
      transactionHash: 'tx3',
      status: 'completed',
    },
    {
      id: 'c4',
      memberId: 'm4',
      amount: 500,
      timestamp: new Date('2026-06-01T12:00:00Z'),
      transactionHash: 'tx4',
      status: 'pending',
    },
  ];

  const cycles: GroupCycle[] = [
    {
      cycleNumber: 1,
      startDate: new Date('2026-03-01T12:00:00Z'),
      endDate: new Date('2026-04-01T12:00:00Z'),
      targetAmount: 5000,
      currentAmount: 4000,
      status: 'completed',
    },
    {
      cycleNumber: 2,
      startDate: new Date('2026-04-01T12:00:00Z'),
      endDate: new Date('2026-05-01T12:00:00Z'),
      targetAmount: 5000,
      currentAmount: 4800,
      status: 'completed',
    },
  ];

  it('renders completion rate, average time, and health score', () => {
    const { container } = render(
      <GroupMetrics group={group} contributions={contributions} cycles={cycles} />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders zeroes with no contributions or cycles', () => {
    const { container } = render(<GroupMetrics group={group} contributions={[]} cycles={[]} />);
    expect(container).toMatchSnapshot();
  });
});

describe('MemberCard snapshots', () => {
  const member = {
    address: 'GAX7BQJ2N3V5YRQ4Z8W6KTPY1M3N9QRS7T2V4X6Z8A0B2C4D6E8F',
    name: 'Ada Lovelace',
    joinDate: new Date('2026-02-14T12:00:00Z'),
    contributionCount: 8,
    totalContributed: 4000,
    payoutPosition: 3,
    totalMembers: 10,
    hasReceivedPayout: false,
    status: 'active' as const,
  };

  it('renders the full card with totals and payout position', () => {
    const { container } = render(<MemberCard member={member} />);
    expect(container).toMatchSnapshot();
  });

  it('renders the current user with a You marker', () => {
    const { container } = render(<MemberCard member={member} isCurrentUser />);
    expect(container).toMatchSnapshot();
  });

  it('renders a member who has already been paid', () => {
    const { container } = render(
      <MemberCard
        member={{
          ...member,
          name: 'Grace Hopper',
          payoutPosition: 1,
          hasReceivedPayout: true,
          status: 'inactive',
        }}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders the compact variant', () => {
    const { container } = render(<MemberCard member={member} compact />);
    expect(container).toMatchSnapshot();
  });
});

describe('PayoutQueue snapshots', () => {
  const data: PayoutQueueData = {
    cycleId: 5,
    totalMembers: 6,
    currentUserAddress: 'GAX7BQJ2N3V5YRQ4Z8W6KTPY1M3N9QRS7T2V4X6Z8A0B2C4D6E8F',
    entries: [
      {
        position: 1,
        memberAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWWH',
        memberName: 'Ada Lovelace',
        estimatedDate: new Date('2026-05-01T12:00:00Z'),
        amount: 500,
        status: 'completed',
        txHash: 'abc123',
        paidAt: new Date('2026-05-01T12:00:00Z'),
      },
      {
        position: 2,
        memberAddress: 'GAX7BQJ2N3V5YRQ4Z8W6KTPY1M3N9QRS7T2V4X6Z8A0B2C4D6E8F',
        memberName: 'Grace Hopper',
        estimatedDate: new Date('2026-06-01T12:00:00Z'),
        amount: 750.25,
        status: 'next',
      },
      {
        position: 3,
        memberAddress: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        estimatedDate: new Date('2026-07-01T12:00:00Z'),
        amount: 1000,
        status: 'upcoming',
      },
    ],
  };

  it('renders completed, next, and upcoming payouts', () => {
    const { container } = render(<PayoutQueue data={data} />);
    expect(container).toMatchSnapshot();
  });

  /**
   * NOTE: this snapshot currently records `NaN%` in the progress header.
   *
   * `PayoutQueue` computes `progress = (completedCount / totalMembers) * 100`
   * with no guard, so a group with zero members divides 0 by 0. That is a real
   * bug, tracked separately - it is captured here deliberately so that the day
   * someone fixes it, this snapshot shows the change instead of the fix hiding
   * behind an already-wrong baseline. Do not "fix" the NaN by regenerating this
   * snapshot without also fixing the component.
   */
  it('renders an empty queue with no entries', () => {
    const { container } = render(
      <PayoutQueue
        data={{ cycleId: 1, totalMembers: 0, entries: [], currentUserAddress: undefined }}
      />
    );
    expect(container).toMatchSnapshot();
  });
});

describe('TransactionTables snapshots', () => {
  const transactions: Transaction[] = [
    {
      id: 't1',
      hash: 'tx1',
      createdAt: '2026-06-10T12:00:00Z',
      type: 'deposit',
      amount: '1500.25',
      assetCode: 'XLM',
      from: 'GAX7BQJ2N3V5YRQ4Z8W6KTPY1M3N9QRS7T2V4X6Z8A0B2C4D6E8F',
      status: 'success',
      fee: '0.00001',
    },
    {
      id: 't2',
      hash: 'tx2',
      createdAt: '2026-06-08T12:00:00Z',
      type: 'payment',
      amount: '-320.10',
      assetCode: 'USDC',
      from: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      status: 'success',
      fee: '0.00001',
    },
    {
      id: 't3',
      hash: 'tx3',
      createdAt: '2026-06-05T12:00:00Z',
      type: 'withdraw',
      amount: '-99',
      assetCode: 'XLM',
      from: 'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      status: 'failed',
      fee: '0.00001',
    },
  ];

  it('renders a populated transaction list', () => {
    const { container } = render(
      <TransactionTables transactions={transactions} isLoading={false} onRowClick={() => {}} />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders the loading state', () => {
    const { container } = render(
      <TransactionTables transactions={[]} isLoading onRowClick={() => {}} />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders the empty state', () => {
    const { container } = render(
      <TransactionTables transactions={[]} isLoading={false} onRowClick={() => {}} />
    );
    expect(container).toMatchSnapshot();
  });
});

describe('dashboard TransactionTable snapshots', () => {
  const transactions: DashboardTransaction[] = [
    {
      id: 'd1',
      type: 'deposit',
      amount: 2500,
      currency: 'XLM',
      date: '2026-06-12',
      status: 'paid',
    },
    {
      id: 'd2',
      type: 'payout',
      amount: 750.5,
      currency: 'XLM',
      date: '2026-06-06',
      status: 'paid',
    },
    {
      id: 'd3',
      type: 'fee',
      amount: 0.5,
      currency: 'XLM',
      date: '2026-06-06',
      status: 'pending',
    },
  ];

  it('renders recent transactions with signed amounts and status chips', () => {
    const { container } = render(<DashboardTransactionTable transactions={transactions} />);
    expect(container).toMatchSnapshot();
  });

  it('renders the loading state', () => {
    const { container } = render(<DashboardTransactionTable transactions={[]} isLoading />);
    expect(container).toMatchSnapshot();
  });

  it('renders the empty state', () => {
    const { container } = render(<DashboardTransactionTable transactions={[]} />);
    expect(container).toMatchSnapshot();
  });
});
