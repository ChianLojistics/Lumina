#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address, String};

mod logic;
mod storage;
mod types;

#[contract]
pub struct SubscriptionContract;

#[contractimpl]
impl SubscriptionContract {
    pub fn initialize(env: Env, admin: Address, fee_percentage: u32) -> Result<(), crate::types::Error> {
        logic::initialize(&env, admin, fee_percentage)
    }

    pub fn create_plan(
        env: Env,
        merchant: Address,
        amount: i128,
        interval: u64,
        max_cycles: Option<u32>,
    ) -> Result<String, crate::types::Error> {
        logic::create_plan(&env, merchant, amount, interval, max_cycles)
    }

    pub fn subscribe(
        env: Env,
        customer: Address,
        plan_id: String,
    ) -> Result<String, crate::types::Error> {
        logic::subscribe(&env, customer, plan_id)
    }

    pub fn process_billing(
        env: Env,
        subscription_id: String,
    ) -> Result<(), crate::types::Error> {
        logic::process_billing(&env, subscription_id)
    }

    pub fn cancel_subscription(
        env: Env,
        subscription_id: String,
    ) -> Result<(), crate::types::Error> {
        logic::cancel_subscription(&env, subscription_id)
    }

    pub fn pause_subscription(
        env: Env,
        subscription_id: String,
    ) -> Result<(), crate::types::Error> {
        logic::pause_subscription(&env, subscription_id)
    }

    pub fn resume_subscription(
        env: Env,
        subscription_id: String,
    ) -> Result<(), crate::types::Error> {
        logic::resume_subscription(&env, subscription_id)
    }

    pub fn get_subscription(
        env: Env,
        subscription_id: String,
    ) -> Option<crate::types::Subscription> {
        storage::get_subscription(&env, subscription_id)
    }

    pub fn get_plan(
        env: Env,
        plan_id: String,
    ) -> Option<crate::types::SubscriptionPlan> {
        storage::get_plan(&env, plan_id)
    }

    pub fn handle_payment_failure(
        env: Env,
        subscription_id: String,
    ) -> Result<(), crate::types::Error> {
        logic::handle_payment_failure(&env, subscription_id)
    }

    pub fn get_fee_percentage(env: Env) -> u32 {
        storage::get_fee_percentage(&env).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
