use soroban_sdk::{Env, Address};

use crate::types::{DataKey, FeeConfig, FeeChangeRequest, FeeAuditLog, FeeOperation};

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

pub fn set_treasury(env: &Env, treasury: Address) {
    env.storage()
        .instance()
        .set::<DataKey, Address>(&DataKey::Treasury, &treasury);
}

pub fn get_treasury(env: &Env) -> Option<Address> {
    env.storage()
        .instance()
        .get::<DataKey, Address>(&DataKey::Treasury)
}

pub fn set_fee_config(env: &Env, operation_type: FeeOperation, config: FeeConfig) {
    env.storage()
        .instance()
        .set::<DataKey, FeeConfig>(&DataKey::FeeConfig(operation_type), &config);
}

pub fn get_fee_config(env: &Env, operation_type: FeeOperation) -> Option<FeeConfig> {
    env.storage()
        .instance()
        .get::<DataKey, FeeConfig>(&DataKey::FeeConfig(operation_type))
}

pub fn set_fee_change_request(env: &Env, operation_type: FeeOperation, request: FeeChangeRequest) {
    env.storage()
        .instance()
        .set::<DataKey, FeeChangeRequest>(&DataKey::FeeChangeTimelock(operation_type), &request);
}

pub fn get_fee_change_request(env: &Env, operation_type: FeeOperation) -> Option<FeeChangeRequest> {
    env.storage()
        .instance()
        .get::<DataKey, FeeChangeRequest>(&DataKey::FeeChangeTimelock(operation_type))
}

pub fn remove_fee_change_request(env: &Env, operation_type: FeeOperation) {
    env.storage()
        .instance()
        .remove(&DataKey::FeeChangeTimelock(operation_type));
}

pub fn set_audit_log(env: &Env, log_id: u64, log: FeeAuditLog) {
    env.storage()
        .instance()
        .set::<DataKey, FeeAuditLog>(&DataKey::FeeAuditLog(log_id), &log);
}

pub fn get_audit_log(env: &Env, log_id: u64) -> Option<FeeAuditLog> {
    env.storage()
        .instance()
        .get::<DataKey, FeeAuditLog>(&DataKey::FeeAuditLog(log_id))
}

pub fn get_next_log_id(env: &Env) -> u64 {
    let mut log_id = 0u64;
    loop {
        if !env.storage().instance().has(&DataKey::FeeAuditLog(log_id)) {
            return log_id;
        }
        log_id += 1;
    }
}
