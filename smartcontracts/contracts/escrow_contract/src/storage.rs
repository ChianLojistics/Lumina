use soroban_sdk::{Env, Address, String};
use crate::types::{DataKey, Escrow};

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get::<DataKey, Address>(&DataKey::EscrowAdmin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set::<DataKey, Address>(&DataKey::EscrowAdmin, admin);
}

pub fn save_escrow(env: &Env, escrow_id: String, escrow: Escrow) {
    env.storage().instance().set::<DataKey, Escrow>(&DataKey::Escrow(escrow_id), &escrow);
}

pub fn get_escrow(env: &Env, escrow_id: String) -> Option<Escrow> {
    env.storage().instance().get::<DataKey, Escrow>(&DataKey::Escrow(escrow_id))
}

pub fn escrow_exists(env: &Env, escrow_id: String) -> bool {
    env.storage().instance().has(&DataKey::Escrow(escrow_id))
}
