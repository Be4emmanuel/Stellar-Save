//! Shared test harness for Stellar-Save contract tests.
//!
//! Eliminates repeated `Env::default() / mock_all_auths / register / deploy
//! token / mint` boilerplate that previously existed in every test module.
//!
//! # Quick start
//!
//! ```rust
//! use crate::test_utils::TestHarness;
//!
//! #[test]
//! fn my_test() {
//!     let mut h = TestHarness::new();
//!     let group_id = h.new_group(10_000_000, 604_800, 5);
//!     let alice = h.join_member(group_id);
//!     h.fund_token(&alice, 100);          // 100 XLM
//!     h.advance_time(604_801);            // skip past one cycle deadline
//! }
//! ```

#[cfg(test)]
pub use harness::TestHarness;

#[cfg(test)]
mod harness {
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::StellarAssetClient,
        Address, Env,
    };

    use crate::{
        payout::PayoutOrder,
        StellarSaveContract, StellarSaveContractClient,
    };

    /// One XLM expressed in stroops (the smallest Stellar unit).
    const STROOPS_PER_XLM: i128 = 10_000_000;

    /// Default contribution amount used by [`TestHarness::new_group`]: 1 XLM.
    pub const DEFAULT_CONTRIBUTION: i128 = STROOPS_PER_XLM;
    /// Default cycle duration: one week in seconds.
    pub const DEFAULT_CYCLE_DURATION: u64 = 604_800;
    /// Default maximum group size.
    pub const DEFAULT_MAX_MEMBERS: u32 = 5;
    /// Tokens minted to each member automatically by [`TestHarness::join_member`].
    pub const DEFAULT_MINT_XLM: i128 = 1_000;

    /// A self-contained test environment wrapping an [`Env`], a deployed
    /// `StellarSaveContract`, and a mock Stellar Asset Contract token.
    ///
    /// All auth checks are stubbed out (`mock_all_auths`).
    pub struct TestHarness {
        /// The Soroban test environment. Exposed so tests can inspect storage,
        /// advance the ledger directly, or check events.
        pub env: Env,
        /// Address of the deployed `StellarSaveContract`.
        pub contract_id: Address,
        /// Address of the mock SAC token used as the payment token.
        pub token: Address,
        /// A generated creator/admin address available for convenience.
        pub admin: Address,
    }

    impl TestHarness {
        // ── Construction ─────────────────────────────────────────────────────

        /// Create a fresh harness with:
        /// - A default `Env` with all auths mocked.
        /// - A deployed `StellarSaveContract`.
        /// - A deployed mock Stellar Asset Contract (SAC) token.
        /// - An admin address with `DEFAULT_MINT_XLM * 10` tokens pre-minted.
        pub fn new() -> Self {
            let env = Env::default();
            env.mock_all_auths();

            // Deploy mock SAC token
            let token_admin = Address::generate(&env);
            let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
            let token = sac.address();

            // Deploy contract
            let contract_id = env.register(StellarSaveContract, ());

            // Generate a convenience admin address and give it some tokens
            let admin = Address::generate(&env);
            StellarAssetClient::new(&env, &token)
                .mint(&admin, &(DEFAULT_MINT_XLM * 10 * STROOPS_PER_XLM));

            // Set a non-zero initial timestamp so deadline arithmetic works
            env.ledger().set_timestamp(1_000);

            TestHarness { env, contract_id, token, admin }
        }

        // ── Contract client ───────────────────────────────────────────────────

        /// Return a fresh `StellarSaveContractClient` bound to this harness.
        ///
        /// A new client is returned each time because the lifetime of
        /// `StellarSaveContractClient<'_>` is tied to the borrow of `self.env`.
        pub fn client(&self) -> StellarSaveContractClient<'_> {
            StellarSaveContractClient::new(&self.env, &self.contract_id)
        }

        // ── Group helpers ─────────────────────────────────────────────────────

        /// Create a group with the harness token and return its `group_id`.
        ///
        /// Uses `self.admin` as the creator. Grace period is 0; payout order
        /// is [`PayoutOrder::Sequential`].
        ///
        /// # Arguments
        /// * `contribution_amount` – Amount each member pays per cycle (stroops).
        /// * `cycle_duration`      – Length of a cycle in seconds.
        /// * `max_members`         – Maximum number of members the group accepts.
        pub fn new_group(
            &self,
            contribution_amount: i128,
            cycle_duration: u64,
            max_members: u32,
        ) -> u64 {
            self.client().create_group(
                &self.admin,
                &contribution_amount,
                &cycle_duration,
                &max_members,
                &self.token,
                &0u64,
                &PayoutOrder::Sequential,
            )
        }

        /// Shorthand for [`new_group`] using the default contribution/cycle/size.
        pub fn new_default_group(&self) -> u64 {
            self.new_group(DEFAULT_CONTRIBUTION, DEFAULT_CYCLE_DURATION, DEFAULT_MAX_MEMBERS)
        }

        // ── Member helpers ────────────────────────────────────────────────────

        /// Generate a new address, mint `DEFAULT_MINT_XLM` XLM to it, and
        /// join it to `group_id`. Returns the new member's address.
        pub fn join_member(&self, group_id: u64) -> Address {
            let member = Address::generate(&self.env);
            self.fund_token(&member, DEFAULT_MINT_XLM);
            self.client().join_group(&group_id, &member, &None);
            member
        }

        /// Generate a new address, mint `xlm_amount` XLM to it, and join it to
        /// `group_id`. Returns the new member's address.
        pub fn join_member_with_funds(&self, group_id: u64, xlm_amount: i128) -> Address {
            let member = Address::generate(&self.env);
            self.fund_token(&member, xlm_amount);
            self.client().join_group(&group_id, &member, &None);
            member
        }

        // ── Token helpers ─────────────────────────────────────────────────────

        /// Mint `xlm_amount` XLM (converted to stroops) to `address`.
        pub fn fund_token(&self, address: &Address, xlm_amount: i128) {
            StellarAssetClient::new(&self.env, &self.token)
                .mint(address, &(xlm_amount * STROOPS_PER_XLM));
        }

        /// Mint an exact `stroops` amount to `address` (no XLM conversion).
        pub fn fund_stroops(&self, address: &Address, stroops: i128) {
            StellarAssetClient::new(&self.env, &self.token).mint(address, &stroops);
        }

        // ── Time helpers ──────────────────────────────────────────────────────

        /// Advance the ledger timestamp by `seconds`.
        pub fn advance_time(&self, seconds: u64) {
            let current = self.env.ledger().timestamp();
            self.env.ledger().set_timestamp(current + seconds);
        }

        /// Set the ledger timestamp to an absolute value.
        pub fn set_time(&self, timestamp: u64) {
            self.env.ledger().set_timestamp(timestamp);
        }

        // ── Composite helpers ─────────────────────────────────────────────────

        /// Create a group, join `member_count` members to it, activate it, and
        /// assign sequential payout positions. Returns `(group_id, members)`.
        ///
        /// This is the minimum setup required to run contribution / payout tests.
        pub fn setup_active_group(
            &self,
            contribution_amount: i128,
            cycle_duration: u64,
            member_count: u32,
        ) -> (u64, Vec<Address>) {
            use soroban_sdk::Vec as SdkVec;

            let group_id = self.new_group(contribution_amount, cycle_duration, member_count);
            let mut members = std::vec::Vec::new();

            // Join the admin as the first member
            self.fund_token(&self.admin, DEFAULT_MINT_XLM);
            self.client().join_group(&group_id, &self.admin, &None);
            members.push(self.admin.clone());

            // Join remaining members
            for _ in 1..member_count {
                let m = self.join_member(group_id);
                members.push(m);
            }

            // Activate and assign positions
            self.client().activate_group(&group_id, &self.admin, &member_count);
            self.client().assign_payout_positions(
                &group_id,
                &self.admin,
                &crate::AssignmentMode::Sequential,
            );

            (group_id, members)
        }
    }

    impl Default for TestHarness {
        fn default() -> Self {
            Self::new()
        }
    }
}
