use soroban_sdk::{Env, Address, symbol_short};
use crate::storage;
use crate::types::{MerchantBalance, Error};

pub fn initialize(env: &Env, admin: Address) {
    if storage::get_admin(env).is_none() {
        storage::set_admin(env, &admin);
    }
}

pub fn deposit(env: &Env, merchant: Address, amount: i128) -> Result<(), Error> {
    // 1. Authorization: Only admin can credit the vault (oracle flow)
    let admin = storage::get_admin(env).ok_or(Error::NotAuthorized)?;
    admin.require_auth();

    // 2. Fetch or initialize record
    let mut record = storage::get_merchant_record(env, &merchant).unwrap_or(MerchantBalance {
        merchant_address: merchant.clone(),
        usdc_balance: 0,
        last_updated: 0,
    });

    // 3. Update state
    record.usdc_balance += amount;
    record.last_updated = env.ledger().timestamp();

    // 4. Persistence
    storage::set_merchant_record(env, &merchant, &record);

    // 5. Event
    env.events().publish(
        (symbol_short!("deposit"), merchant),
        amount
    );

    Ok(())
}

pub fn withdraw(env: &Env, merchant: Address, amount: i128, destination: Address) -> Result<(), Error> {
    // 1. Authorization: Merchant must authorize withdrawal
    merchant.require_auth();

    // 2. Fetch merchant record
    let mut record = storage::get_merchant_record(env, &merchant).ok_or(Error::InsufficientBalance)?;

    // 3. Check sufficient balance
    if record.usdc_balance < amount {
        return Err(Error::InsufficientBalance);
    }

    // 4. Update balance
    record.usdc_balance -= amount;
    record.last_updated = env.ledger().timestamp();

    // 5. Persistence
    storage::set_merchant_record(env, &merchant, &record);

    // 6. Event
    env.events().publish(
        (symbol_short!("withdraw"), merchant),
        (destination, amount)
    );

    Ok(())
}
