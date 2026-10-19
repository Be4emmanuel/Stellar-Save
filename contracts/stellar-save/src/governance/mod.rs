//! Governance logic: group-dissolution voting and dynamic contribution-amount changes.
//!
//! # Module responsibilities
//!
//! | Module      | Single responsibility                                        |
//! |-------------|--------------------------------------------------------------|
//! | `proposal`  | Creating / validating a pending governance proposal          |
//! | `voting`    | Receiving member votes and triggering execution at threshold |
//! | `execution` | Applying the resulting state change (dissolution / amount)   |
//! | `storage`   | All raw `env.storage()` calls for governance-specific keys   |
//!
//! The split ensures that each module can be read, tested, and reasoned about
//! independently.  `voting` orchestrates the other modules but does **not**
//! own any storage or mutation logic itself.

pub mod execution;
pub mod proposal;
pub mod storage;
pub mod voting;

pub use proposal::propose_contribution_change;
pub use voting::{vote_contribution_change, vote_dissolve};
