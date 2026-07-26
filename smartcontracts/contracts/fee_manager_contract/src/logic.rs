use soroban_sdk::{Env, Address};

use crate::types::{FeeConfig, FeeOperation, FeeTier, FeeChangeRequest, FeeAuditLog, Error};
use crate::storage;

const MAX_FEE_BASIS_POINTS: u32 = 500; // 5% maximum
const TIMELOCK_SECONDS: u64 = 7 * 24 * 60 * 60; // 7 days in seconds

pub fn initialize(env: &Env, admin: Address, treasury_address: Address) {
    if storage::get_version(env) != 0 {
        panic!("Already initialized");
    }
    
    storage::set_admin(env, admin);
    storage::set_treasury(env, treasury_address);
    storage::set_version(env, 1);
}

pub fn set_fee_percentage(
    env: &Env,
    admin: Address,
    operation_type: FeeOperation,
    percentage: u32,
    tiers: soroban_sdk::Vec<FeeTier>,
) -> Result<(), Error> {
    if !is_admin(env, &admin) {
        return Err(Error::NotAuthorized);
    }
    
    if percentage > MAX_FEE_BASIS_POINTS {
        return Err(Error::InvalidFeePercentage);
    }
    
    validate_volume_tiers(&tiers)?;
    
    let current_time = env.ledger().timestamp();
    let effective_at = current_time + TIMELOCK_SECONDS;
    
    let old_config = storage::get_fee_config(env, operation_type.clone());
    let _old_percentage = old_config.as_ref().map(|c| c.base_percentage).unwrap_or(0);
    
    let request = FeeChangeRequest {
        operation_type: operation_type.clone(),
        new_percentage: percentage,
        new_tiers: tiers,
        requested_at: current_time,
        effective_at,
    };
    
    storage::set_fee_change_request(env, operation_type, request);
    
    Ok(())
}

pub fn execute_fee_change(
    env: &Env,
    admin: Address,
    operation_type: FeeOperation,
) -> Result<(), Error> {
    if !is_admin(env, &admin) {
        return Err(Error::NotAuthorized);
    }
    
    let request = storage::get_fee_change_request(env, operation_type.clone())
        .ok_or(Error::FeeConfigNotFound)?;
    
    let current_time = env.ledger().timestamp();
    if current_time < request.effective_at {
        return Err(Error::TimelockNotExpired);
    }
    
    let old_config = storage::get_fee_config(env, operation_type.clone());
    let old_percentage = old_config.as_ref().map(|c| c.base_percentage).unwrap_or(0);
    
    let new_config = FeeConfig {
        operation_type: operation_type.clone(),
        base_percentage: request.new_percentage,
        volume_tiers: request.new_tiers,
    };
    
    storage::set_fee_config(env, operation_type.clone(), new_config);
    
    let log_id = storage::get_next_log_id(env);
    let audit_log = FeeAuditLog {
        log_id,
        operation_type: operation_type.clone(),
        old_percentage,
        new_percentage: request.new_percentage,
        changed_by: admin,
        timestamp: current_time,
    };
    
    storage::set_audit_log(env, log_id, audit_log);
    storage::remove_fee_change_request(env, operation_type);
    
    Ok(())
}

pub fn set_fee_tier(
    env: &Env,
    admin: Address,
    operation_type: FeeOperation,
    tier_config: soroban_sdk::Vec<FeeTier>,
) -> Result<(), Error> {
    if !is_admin(env, &admin) {
        return Err(Error::NotAuthorized);
    }
    
    validate_volume_tiers(&tier_config)?;
    
    let mut config = storage::get_fee_config(env, operation_type.clone())
        .ok_or(Error::FeeConfigNotFound)?;
    
    config.volume_tiers = tier_config;
    storage::set_fee_config(env, operation_type, config);
    
    Ok(())
}

pub fn calculate_fee(
    env: &Env,
    amount: i128,
    operation_type: FeeOperation,
) -> Result<i128, Error> {
    let config = storage::get_fee_config(env, operation_type.clone())
        .ok_or(Error::FeeConfigNotFound)?;
    
    let applicable_tier = find_applicable_tier(&config.volume_tiers, amount);
    let basis_points = applicable_tier.map_or(config.base_percentage, |t| t.basis_points);
    
    let fee = (amount * basis_points as i128) / 10000;
    Ok(fee)
}

pub fn collect_fee(
    env: &Env,
    _from_address: Address,
    _amount: i128,
) -> Result<(), Error> {
    let _treasury = storage::get_treasury(env).ok_or(Error::TreasuryNotFound)?;
    
    // In a real implementation, this would transfer tokens
    // For now, we'll just log the fee collection
    // The actual token transfer would be done by the calling contract
    
    Ok(())
}

pub fn get_fee_config(
    env: &Env,
    operation_type: FeeOperation,
) -> Option<FeeConfig> {
    storage::get_fee_config(env, operation_type)
}

pub fn update_treasury(
    env: &Env,
    admin: Address,
    new_treasury: Address,
) -> Result<(), Error> {
    if !is_admin(env, &admin) {
        return Err(Error::NotAuthorized);
    }
    
    storage::set_treasury(env, new_treasury);
    Ok(())
}

pub fn get_fee_change_request(
    env: &Env,
    operation_type: FeeOperation,
) -> Option<FeeChangeRequest> {
    storage::get_fee_change_request(env, operation_type)
}

fn is_admin(env: &Env, address: &Address) -> bool {
    storage::get_admin(env)
        .map(|admin| admin == *address)
        .unwrap_or(false)
}

fn validate_volume_tiers(tiers: &soroban_sdk::Vec<FeeTier>) -> Result<(), Error> {
    let mut prev_max = 0i128;
    
    for tier in tiers.iter() {
        if tier.min_volume >= tier.max_volume {
            return Err(Error::InvalidVolumeTier);
        }
        
        if tier.min_volume < prev_max {
            return Err(Error::InvalidVolumeTier);
        }
        
        if tier.basis_points > MAX_FEE_BASIS_POINTS {
            return Err(Error::InvalidFeePercentage);
        }
        
        prev_max = tier.max_volume;
    }
    
    Ok(())
}

fn find_applicable_tier(tiers: &soroban_sdk::Vec<FeeTier>, amount: i128) -> Option<FeeTier> {
    for tier in tiers.iter() {
        if amount >= tier.min_volume && amount < tier.max_volume {
            return Some(tier);
        }
    }
    None
}
