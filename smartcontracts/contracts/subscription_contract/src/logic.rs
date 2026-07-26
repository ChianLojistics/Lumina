use soroban_sdk::{Env, Address, String, symbol_short, xdr::ToXdr, BytesN};

use crate::storage;
use crate::types::{Error, SubscriptionPlan, Subscription, SubscriptionStatus};

const MAX_RETRY_COUNT: u32 = 3;

fn bytes_to_hex(env: &Env, bytes: BytesN<32>) -> String {
    let hex_chars = b"0123456789abcdef";
    let mut hex_bytes = [0u8; 64];
    for (i, &b) in bytes.to_array().iter().enumerate() {
        hex_bytes[i * 2] = hex_chars[(b >> 4) as usize];
        hex_bytes[i * 2 + 1] = hex_chars[(b & 0x0F) as usize];
    }
    String::from_str(env, core::str::from_utf8(&hex_bytes).unwrap())
}

pub fn initialize(env: &Env, admin: Address, fee_percentage: u32) -> Result<(), Error> {
    if storage::get_admin(env).is_some() {
        return Err(Error::NotInitialized);
    }
    
    if fee_percentage > 100 {
        return Err(Error::InvalidPlan);
    }
    
    storage::set_admin(env, &admin);
    storage::set_fee_percentage(env, fee_percentage);
    
    env.events().publish(
        (symbol_short!("init"), admin),
        fee_percentage
    );
    
    Ok(())
}

pub fn create_plan(
    env: &Env,
    merchant: Address,
    amount: i128,
    interval: u64,
    max_cycles: Option<u32>,
) -> Result<String, Error> {
    let _admin = storage::get_admin(env).ok_or(Error::NotInitialized)?;
    
    merchant.require_auth();
    
    if amount <= 0 {
        return Err(Error::InvalidPlan);
    }
    
    if interval == 0 {
        return Err(Error::InvalidPlan);
    }
    
    let plan_counter = storage::increment_plan_counter(env);
    let tuple = (merchant.clone(), plan_counter, env.ledger().timestamp());
    let id_hash = env.crypto().sha256(&tuple.to_xdr(env));
    let plan_id = bytes_to_hex(env, id_hash);
    
    let plan = SubscriptionPlan {
        plan_id: plan_id.clone(),
        merchant: merchant.clone(),
        amount,
        billing_interval: interval,
        max_cycles,
        active: true,
        created_at: env.ledger().timestamp(),
    };
    
    storage::set_plan(env, plan_id.clone(), &plan);
    
    env.events().publish(
        (symbol_short!("plan_crt"), merchant),
        (plan_id.clone(), amount)
    );
    
    Ok(plan_id)
}

pub fn subscribe(
    env: &Env,
    customer: Address,
    plan_id: String,
) -> Result<String, Error> {
    customer.require_auth();
    
    let plan = storage::get_plan(env, plan_id.clone())
        .ok_or(Error::PlanNotFound)?;
    
    if !plan.active {
        return Err(Error::InvalidPlan);
    }
    
    let subscription_counter = storage::increment_subscription_counter(env);
    let tuple = (customer.clone(), plan_id.clone(), subscription_counter, env.ledger().timestamp());
    let id_hash = env.crypto().sha256(&tuple.to_xdr(env));
    let subscription_id = bytes_to_hex(env, id_hash);
    
    let current_timestamp = env.ledger().timestamp();
    let next_billing_at = current_timestamp + plan.billing_interval;
    
    let subscription = Subscription {
        subscription_id: subscription_id.clone(),
        plan_id: plan_id.clone(),
        customer: customer.clone(),
        merchant: plan.merchant.clone(),
        current_cycle: 0,
        next_billing_at,
        status: SubscriptionStatus::Active,
        created_at: current_timestamp,
        last_billing_at: None,
        retry_count: 0,
    };
    
    storage::set_subscription(env, subscription_id.clone(), &subscription);
    
    env.events().publish(
        (symbol_short!("subscr"), customer),
        (subscription_id.clone(), plan_id)
    );
    
    Ok(subscription_id)
}

pub fn process_billing(
    env: &Env,
    subscription_id: String,
) -> Result<(), Error> {
    let mut subscription = storage::get_subscription(env, subscription_id.clone())
        .ok_or(Error::SubscriptionNotFound)?;
    
    if subscription.status != SubscriptionStatus::Active {
        return Err(Error::InvalidStatus);
    }
    
    let current_timestamp = env.ledger().timestamp();
    
    if current_timestamp < subscription.next_billing_at {
        return Err(Error::BillingNotDue);
    }
    
    let plan = storage::get_plan(env, subscription.plan_id.clone())
        .ok_or(Error::PlanNotFound)?;
    
    if let Some(max_cycles) = plan.max_cycles {
        if subscription.current_cycle >= max_cycles {
            subscription.status = SubscriptionStatus::Expired;
            storage::set_subscription(env, subscription_id.clone(), &subscription);
            return Err(Error::MaxCyclesReached);
        }
    }
    
    let fee_percentage = storage::get_fee_percentage(env).unwrap_or(0);
    let platform_fee = (plan.amount * fee_percentage as i128) / 100;
    let merchant_amount = plan.amount - platform_fee;
    
    subscription.current_cycle += 1;
    subscription.last_billing_at = Some(current_timestamp);
    subscription.next_billing_at = current_timestamp + plan.billing_interval;
    subscription.retry_count = 0;
    
    storage::set_subscription(env, subscription_id.clone(), &subscription);
    
    env.events().publish(
        (symbol_short!("bill_done"), subscription_id.clone()),
        (subscription.current_cycle, merchant_amount, platform_fee)
    );
    
    Ok(())
}

pub fn cancel_subscription(
    env: &Env,
    subscription_id: String,
) -> Result<(), Error> {
    let mut subscription = storage::get_subscription(env, subscription_id.clone())
        .ok_or(Error::SubscriptionNotFound)?;
    
    subscription.customer.require_auth();
    
    if subscription.status == SubscriptionStatus::Cancelled || 
       subscription.status == SubscriptionStatus::Expired {
        return Err(Error::InvalidStatus);
    }
    
    subscription.status = SubscriptionStatus::Cancelled;
    storage::set_subscription(env, subscription_id.clone(), &subscription);
    
    env.events().publish(
        (symbol_short!("cancelled"), subscription.customer),
        subscription_id
    );
    
    Ok(())
}

pub fn pause_subscription(
    env: &Env,
    subscription_id: String,
) -> Result<(), Error> {
    let mut subscription = storage::get_subscription(env, subscription_id.clone())
        .ok_or(Error::SubscriptionNotFound)?;
    
    subscription.customer.require_auth();
    
    if subscription.status != SubscriptionStatus::Active {
        return Err(Error::InvalidStatus);
    }
    
    subscription.status = SubscriptionStatus::Paused;
    storage::set_subscription(env, subscription_id.clone(), &subscription);
    
    env.events().publish(
        (symbol_short!("paused"), subscription.customer),
        subscription_id
    );
    
    Ok(())
}

pub fn resume_subscription(
    env: &Env,
    subscription_id: String,
) -> Result<(), Error> {
    let mut subscription = storage::get_subscription(env, subscription_id.clone())
        .ok_or(Error::SubscriptionNotFound)?;
    
    subscription.customer.require_auth();
    
    if subscription.status != SubscriptionStatus::Paused {
        return Err(Error::InvalidStatus);
    }
    
    subscription.status = SubscriptionStatus::Active;
    storage::set_subscription(env, subscription_id.clone(), &subscription);
    
    env.events().publish(
        (symbol_short!("resumed"), subscription.customer),
        subscription_id
    );
    
    Ok(())
}

pub fn handle_payment_failure(
    env: &Env,
    subscription_id: String,
) -> Result<(), Error> {
    let mut subscription = storage::get_subscription(env, subscription_id.clone())
        .ok_or(Error::SubscriptionNotFound)?;
    
    if subscription.status != SubscriptionStatus::Active {
        return Err(Error::InvalidStatus);
    }
    
    subscription.retry_count += 1;
    
    if subscription.retry_count >= MAX_RETRY_COUNT {
        subscription.status = SubscriptionStatus::Cancelled;
    }
    
    storage::set_subscription(env, subscription_id.clone(), &subscription);
    
    env.events().publish(
        (symbol_short!("pay_fail"), subscription.customer),
        (subscription_id, subscription.retry_count)
    );
    
    Ok(())
}
