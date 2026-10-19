# stellar-save

A Soroban smart contract for group savings (ROSCA-style) pools on the Stellar network.

## Overview

`stellar-save` lets members create savings pools, join them, and make periodic
contributions. Pool state and per-member contribution records are persisted in
contract storage.

## Upgrade & Migration Path

**This contract is not upgradeable.** There is no upgrade entrypoint in
`contract.rs` — no `upgrade`, `migrate`, or `__constructor`-based replacement
function, and no admin-gated code path that can swap the deployed WASM.

### Rationale

- Soroban contracts are immutable once deployed unless they explicitly expose an
  upgrade mechanism (e.g. `env.deployer().update_current_contract_wasm(...)`).
  `stellar-save` deliberately does not expose one.
- Because there is no upgrade path, there is also no migration path for existing
  pool or contribution storage data. Storage written by one deployment cannot be
  reinterpreted by a different contract version.
- Immutability removes the risk of an admin silently changing pool/contribution
  semantics or draining funds via a malicious upgrade, which is important for a
  contract that custodies member contributions.

### Consequences

- Any change to storage layout or pool/contribution logic requires deploying a
  **new** contract instance. Existing pools remain on the old instance and are
  not migrated automatically.
- Users must be informed to withdraw from the old instance and re-join the new
  one if a breaking change is released.
- If an upgrade path is ever required, it must be added explicitly (with an
  admin-gated `update_current_contract_wasm` call and a documented migration
  routine) and covered by a migration test that seeds pre-existing pool and
  contribution data and asserts data integrity after the upgrade.

## Testing

Run the contract test suite with:

```sh
cargo test -p stellar-save
```

Tests cover pool creation, joining, contributions, and payout logic. Since the
contract is not upgradeable, there is no upgrade-simulation test; the constraint
above is the enforced contract behavior.
