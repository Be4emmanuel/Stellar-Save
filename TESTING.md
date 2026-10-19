# Testing Guide

## Overview

This project uses a comprehensive testing strategy including:
- **Unit tests** for smart contracts (Rust) and frontend (TypeScript)
- **Property-based testing** (fuzzing) for contracts
- **Code coverage** tracking with 95% threshold for contracts
- **Mutation testing** to verify test suite quality

---

## Mutation Testing (`contracts/stellar-save/src/mutation_tests.rs`)

`mutation_tests.rs` exists for one reason: to **kill mutants** produced by
`cargo-mutants`. It is not a general-purpose test file — every test in it should
fail when a specific, targeted mutation is introduced into the contract source.
Tests that merely re-assert behaviour already covered by the property tests in
`src/test.rs` are duplicates and should be removed rather than kept.

### Running the mutation tool

```bash
# Install once (pinned tool version recommended)
cargo install cargo-mutants --locked

# Run mutation testing against the stellar-save contract only
cd contracts/stellar-save
cargo mutants --file src/lib.rs --file src/mutation_tests.rs

# Emit a machine-readable survivor list for review
cargo mutants --json --output mutants.json
```

`cargo mutants` recompiles the crate once per mutant and runs the test suite;
this is slow by design. Scope it with `--file` / `--in-place` while iterating.

### Recording results

After each run, record the outcome in the PR description (and update this
section when the baseline changes):

| Field | Value |
|-------|-------|
| Tool | `cargo-mutants` |
| Scope | `contracts/stellar-save/src/lib.rs` |
| Mutants generated | _fill from run_ |
| Mutants killed | _fill from run_ |
| Survivors | _fill from run_ |
| Kill rate | _killed / generated_ |
| Expected kill rate | **≥ 90%** |

Survivors are listed in `mutants.out/missed.txt` (or the `--json` output). Each
survivor must either be killed by a new/kept test in `mutation_tests.rs`, or be
explicitly justified as equivalent/unreachable in the PR.

### Pruning policy

- **Keep** a test only if removing it lets at least one mutant survive.
- **Delete** tests whose assertions are already covered by the property tests
  in `src/test.rs` (they add runtime cost without improving the kill rate).
- Re-run `cargo mutants` after pruning and confirm the kill rate did not drop.

---

## Shared Stellar SDK Mock

A shared manual mock for `@stellar/stellar-sdk` eliminates live network calls and
removes the need for ad-hoc inline mocks in individual test files.

### Why a shared mock?

Without a shared mock, each test file that touches the Stellar SDK would either:
1. Make real HTTP calls to Horizon / Soroban RPC — making tests slow and flaky.
2. Duplicate an inline `jest.mock(…, () => ({ … }))` factory — hard to keep in sync.

The shared mock ensures all unit tests are **offline-first**, **deterministic**, and
**consistent** across the codebase.

### Mock file locations

| Workspace | File | Test framework |
|-----------|------|----------------|
| Frontend  | `frontend/src/__mocks__/@stellar/stellar-sdk.ts` | Vitest (`vi.fn`) |
| Backend   | `backend/src/__mocks__/@stellar/stellar-sdk.ts`  | Jest (`jest.fn`) |

Both mocks mirror the same `@stellar/stellar-sdk` API surface:
- `Keypair` (static factories + instance methods)
- `Networks` (passphrase constants)
- `Asset` (native + custom)
- `TransactionBuilder` (builder pattern)
- `Operation` (payment, changeTrust, setOptions, …)
- `Contract` / `Address`
- `Horizon.Server` (loadAccount, submitTransaction, payments, transactions)
- `SorobanRpc.Server` / `rpc.Server` (getAccount, simulateTransaction, sendTransaction, …)
- Helper functions: `nativeToScVal`, `scValToNative`, `xdr`

### Using the shared mock (frontend — Vitest)

Add a single `vi.mock()` call at the top of your test file; Vitest picks up the
shared mock automatically — no factory argument needed.

```typescript
// src/hooks/__tests__/useSomething.test.ts
import { vi, describe, it, expect } from 'vitest';

// This one line activates the shared mock.
// See frontend/src/__mocks__/@stellar/stellar-sdk.ts for the full stub surface.
vi.mock('@stellar/stellar-sdk');

describe('useSomething', () => {
  it('fetches balance without hitting the network', async () => {
    // All Horizon.Server / SorobanRpc.Server methods return pre-configured
    // stubs. No real RPC endpoint is called.
    const { Horizon } = await import('@stellar/stellar-sdk');
    const server = new Horizon.Server('https://horizon-testnet.stellar.org');
    expect(server.loadAccount).toBeDefined();
  });
});
```

**Overriding a specific stub per test:**

```typescript
vi.mock('@stellar/stellar-sdk');

it('handles loadAccount failure', async () => {
  const { Horizon } = await import('@stellar/stellar-sdk');
  (Horizon.Server as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
    loadAccount: vi.fn().mockRejectedValueOnce(new Error('network error')),
  }));
  // … test body
});
```

**Using the helper factories:**

```typescript
import { makeMockHorizonServer, FAKE_ACCOUNT_ID } from
  '../__mocks__/@stellar/stellar-sdk';

const server = makeMockHorizonServer();
server.loadAccount.mockResolvedValueOnce({
  id: FAKE_ACCOUNT_ID,
  balances: [{ asset_type: 'native', balance: '50.0000000' }],
  sequence: '1',
});
```

**When you need the real SDK (rare):**

```typescript
const realSdk = await vi.importActual('@stellar/stellar-sdk');
```

### Using the shared mock (backend — Jest)

```typescript
// src/tests/somethingService.test.ts
import { SorobanClientPool } from '../lib/soroban';

// This one line activates the shared mock.
// See backend/src/__mocks__/@stellar/stellar-sdk.ts for the full stub surface.
jest.mock('@stellar/stellar-sdk');

describe('SorobanClientPool', () => {
  it('creates clients without a live RPC endpoint', () => {
    const pool = new SorobanClientPool({ rpcUrl: 'http://localhost', poolSize: 2 });
    expect(pool.metrics().total).toBe(2);
  });
});
```

**Overriding a specific stub per test:**

```typescript
jest.mock('@stellar/stellar-sdk');

it('retries on RPC failure', async () => {
  const { rpc } = require('@stellar/stellar-sdk');
  (rpc.Server.prototype.getAccount as jest.Mock).mockRejectedValueOnce(
    new Error('connection refused')
  );
  // … test body
});
```

**Using the helper factories:**

```typescript
import { makeMockRpcServer, FAKE_ACCOUNT_ID } from
  '../__mocks__/@stellar/stellar-sdk';

const server = makeMockRpcServer();
server.sendTransaction.mockResolvedValueOnce({ status: 'ERROR', hash: '', errorResult: 'bad_auth' });
```

**When you need the real SDK (e.g. signing in auth tests):**

```typescript
// auth.test.ts — intentionally uses real Keypair for cryptographic signing
import { Keypair } from '@stellar/stellar-sdk';
// Do NOT call jest.mock('@stellar/stellar-sdk') in this file.
const keypair = Keypair.random(); // real Ed25519 key
```

### Which tests intentionally use the real SDK

| File | Reason |
|------|--------|
| `backend/src/tests/auth.test.ts` | Needs real `Keypair.sign()` / `Keypair.verify()` to test the challenge–response auth flow |
| `frontend/src/test/e2e-testnet/testnet.e2e.ts` | E2E tests submit real transactions to Stellar testnet |
| `frontend/e2e/rosca-journey.spec.ts` | Playwright E2E — hits a running app, not a unit test |

All other tests that touch `@stellar/stellar-sdk` **must** use the shared mock.

---

## Smart Contract Tests (Rust)

### Running Tests

```bash
# Run all contract tests
cargo test --workspace

# Run tests for specific contract
cargo test -p guess-the-number
cargo test -p fungible-allowlist-example
cargo test -p nft-enumerable-example

# Run with output
cargo test -- --nocapture
```

### Test Structure

- Tests use Soroban SDK's `testutils` for mocking and assertions
- Each contract has tests in either `src/test.rs` or `tests/test.rs`
- Tests include mock auth, address generation, and cross-contract calls

---

## Frontend Tests (Vitest + React Testing Library)

### Setup

```bash
cd frontend
npm install
```

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm test run

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### Test Structure

| Directory | Purpose |
|-----------|---------|
| `src/test/` | Component and hook unit tests |
| `src/hooks/__tests__/` | Hook-specific unit tests (using shared Stellar mock) |
| `src/test/e2e-testnet/` | Testnet E2E tests (real SDK, real network) |
| `src/__mocks__/@stellar/` | Shared Vitest manual mocks |

### Writing Tests

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Fake timers: required pattern for any delay-dependent test

Never let a test depend on a real delay. A real `setTimeout` plus `waitFor`
passes locally and fails intermittently on a loaded CI runner, because
`waitFor` can exhaust its polling budget before the timer fires. Drive the
clock explicitly instead.

```ts
it('shows the latency badge once the request resolves', async () => {
  vi.useFakeTimers();
  mockFetch.mockImplementation(
    () => new Promise((resolve) => {
      setTimeout(() => resolve({ ok: true }), 100);
    }),
  );

  try {
    render(<MyComponent />);

    // Assert the pre-timer state so the advance is proven to be what changes it.
    expect(screen.queryByText(/ms/)).not.toBeInTheDocument();

    // Advance the exact mocked duration and flush the resolved promise.
    await vi.advanceTimersByTimeAsync(100);

    expect(screen.getByText(/ms/)).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});
```

Rules:

- Use `await vi.advanceTimersByTimeAsync(ms)`, not the synchronous
  `advanceTimersByTime`, whenever a promise resolves inside the timer. The
  async form flushes the microtask queue that the call
