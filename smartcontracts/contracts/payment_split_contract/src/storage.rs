use soroban_sdk::{Env, String, Address};

use crate::types::{DataKey, SplitRule};

pub fn get_version(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get::<DataKey, u32>(&DataKey::Version)
        .unwrap_or(0)
}

pub fn set_version(env: &Env, version: u32) {
    env.storage()
        .instance()
        .set::<DataKey, u32>(&DataKey::Version, &version);
}

pub fn set_admin(env: &Env, admin: Address) {
    env.storage()
        .instance()
        .set::<DataKey, Address>(&DataKey::Admin, &admin);
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage()
        .instance()
        .get::<DataKey, Address>(&DataKey::Admin)
}

pub fn save_split(env: &Env, split_id: String, split_rule: SplitRule) {
    env.storage()
        .instance()
        .set::<DataKey, SplitRule>(&DataKey::Split(split_id), &split_rule);
}

pub fn get_split(env: &Env, split_id: String) -> Option<SplitRule> {
    env.storage()
        .instance()
        .get::<DataKey, SplitRule>(&DataKey::Split(split_id))
}

pub fn split_exists(env: &Env, split_id: String) -> bool {
    env.storage()
        .instance()
        .has(&DataKey::Split(split_id))
}

pub fn remove_split(env: &Env, split_id: String) {
    env.storage()
        .instance()
        .remove(&DataKey::Split(split_id));
}
