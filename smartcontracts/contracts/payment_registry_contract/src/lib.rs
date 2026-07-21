#![no_std]

use soroban_sdk::{contract, contractimpl, Env};

mod logic;
mod storage;
mod types;

#[contract]
pub struct PaymentRegistryContract;

#[contractimpl]
impl PaymentRegistryContract {
    pub fn initialize(env: Env, admin: soroban_sdk::Address) {
        logic::initialize(&env, admin)
    }

    pub fn version(_env: Env) -> u32 {
        1
    }

    pub fn create_payment_record(
        env: Env,
        merchant_address: soroban_sdk::Address,
        amount: i128,
        asset: soroban_sdk::Address,
    ) -> Result<soroban_sdk::String, crate::types::Error> {
        logic::create_payment_record(&env, merchant_address, amount, asset)
    }

    pub fn update_payment_status(
        env: Env,
        payment_id: soroban_sdk::String,
        status: crate::types::PaymentStatus,
    ) -> Result<(), crate::types::Error> {
        logic::update_payment_status(&env, payment_id, status)
    }

    pub fn get_payment(
        env: Env,
        payment_id: soroban_sdk::String,
    ) -> Option<crate::types::PaymentRecord> {
        storage::get_payment(&env, payment_id)
    }
}

#[cfg(test)]
mod test;
