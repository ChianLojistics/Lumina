#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address, Vec};

mod logic;
mod storage;
mod types;

#[contract]
pub struct FeeManagerContract;

#[contractimpl]
impl FeeManagerContract {
    pub fn initialize(env: Env, admin: Address, treasury_address: Address) {
        logic::initialize(&env, admin, treasury_address)
    }

    pub fn version(_env: Env) -> u32 {
        1
    }

    pub fn set_fee_percentage(
        env: Env,
        admin: Address,
        operation_type: types::FeeOperation,
        percentage: u32,
        tiers: Vec<types::FeeTier>,
    ) -> Result<(), types::Error> {
        logic::set_fee_percentage(&env, admin, operation_type, percentage, tiers)
    }

    pub fn execute_fee_change(
        env: Env,
        admin: Address,
        operation_type: types::FeeOperation,
    ) -> Result<(), types::Error> {
        logic::execute_fee_change(&env, admin, operation_type)
    }

    pub fn set_fee_tier(
        env: Env,
        admin: Address,
        operation_type: types::FeeOperation,
        tier_config: Vec<types::FeeTier>,
    ) -> Result<(), types::Error> {
        logic::set_fee_tier(&env, admin, operation_type, tier_config)
    }

    pub fn calculate_fee(
        env: Env,
        amount: i128,
        operation_type: types::FeeOperation,
    ) -> Result<i128, types::Error> {
        logic::calculate_fee(&env, amount, operation_type)
    }

    pub fn collect_fee(
        env: Env,
        from_address: Address,
        amount: i128,
    ) -> Result<(), types::Error> {
        logic::collect_fee(&env, from_address, amount)
    }

    pub fn get_fee_config(
        env: Env,
        operation_type: types::FeeOperation,
    ) -> Option<types::FeeConfig> {
        logic::get_fee_config(&env, operation_type)
    }

    pub fn update_treasury(
        env: Env,
        admin: Address,
        new_treasury: Address,
    ) -> Result<(), types::Error> {
        logic::update_treasury(&env, admin, new_treasury)
    }

    pub fn get_fee_change_request(
        env: Env,
        operation_type: types::FeeOperation,
    ) -> Option<types::FeeChangeRequest> {
        logic::get_fee_change_request(&env, operation_type)
    }

    pub fn get_audit_log(
        env: Env,
        log_id: u64,
    ) -> Option<types::FeeAuditLog> {
        storage::get_audit_log(&env, log_id)
    }
}

#[cfg(test)]
mod test;
