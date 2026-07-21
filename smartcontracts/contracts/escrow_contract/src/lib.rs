#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address, String, Symbol};

mod logic;
mod storage;
mod types;

use storage;

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    pub fn initialize(env: Env, admin: Address) {
        logic::initialize(&env, admin);
    }

    pub fn create_escrow(
        env: Env,
        sender: Address,
        recipient: Address,
        amount: i128,
        release_condition: Symbol,
    ) -> Result<String, crate::types::Error> {
        logic::create_escrow(&env, sender, recipient, amount, release_condition)
    }

    pub fn fund_escrow(env: Env, escrow_id: String, sender: Address) -> Result<(), crate::types::Error> {
        logic::fund_escrow(&env, escrow_id, sender)
    }

    pub fn release_escrow(env: Env, escrow_id: String, admin: Address) -> Result<(), crate::types::Error> {
        logic::release_escrow(&env, escrow_id, admin)
    }

    pub fn refund_escrow(env: Env, escrow_id: String, sender: Address) -> Result<(), crate::types::Error> {
        logic::refund_escrow(&env, escrow_id, sender)
    }

    pub fn cancel_escrow(env: Env, escrow_id: String, sender: Address) -> Result<(), crate::types::Error> {
        logic::cancel_escrow(&env, escrow_id, sender)
    }

    pub fn get_escrow(env: Env, escrow_id: String) -> Option<crate::types::Escrow> {
        storage::get_escrow(&env, escrow_id)
    }
}
