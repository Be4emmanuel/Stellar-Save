# zk/ Subsystem

This directory implements the zero-knowledge proof flows used by the
protocol.

- `circuits/` — circuit definitions and compiled artifacts (R1CS,
  proving/verification keys).
- `client/` — witness assembly and proof generation.
- `server/` — proof verification.

## Architecture and trust assumptions

See [ADR 0001: zk/ Subsystem Architecture and Trust Assumptions](../docs/adr/0001-zk-architecture.md)
for the end-to-end proof generation/verification flow, the trust
assumptions, the trusted-setup details, and the contracts that consume zk
proofs.
