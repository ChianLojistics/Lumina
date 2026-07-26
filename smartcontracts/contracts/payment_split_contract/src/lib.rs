#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address, String, Vec};

mod logic;
mod storage;
mod types;

#[contract]
pub struct PaymentSplitContract;

#[contractimpl]
impl PaymentSplitContract {
    pub fn initialize(env: Env, admin: Address) {
        logic::initialize(&env, admin)
    }

    pub fn version(_env: Env) -> u32 {
        1
    }

    pub fn create_split(
        env: Env,
        from: Address,
        split_id: String,
        recipients: Vec<types::Recipient>,
    ) -> Result<(), types::Error> {
        logic::create_split(&env, from, split_id, recipients)
    }

    pub fn execute_split(
        env: Env,
        split_id: String,
        amount: i128,
    ) -> Result<Vec<(Address, i128)>, types::Error> {
        logic::execute_split(&env, split_id, amount)
    }

    pub fn update_split(
        env: Env,
        split_id: String,
        new_recipients: Vec<types::Recipient>,
    ) -> Result<(), types::Error> {
        logic::update_split(&env, split_id, new_recipients)
    }

    pub fn get_split(
        env: Env,
        split_id: String,
    ) -> Result<types::SplitRule, types::Error> {
        logic::get_split(&env, split_id)
    }
}

