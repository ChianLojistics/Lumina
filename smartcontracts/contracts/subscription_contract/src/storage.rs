use soroban_sdk::{Env, Address, String};

use crate::types::{DataKey, SubscriptionPlan, Subscription};

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get::<DataKey, Address>(&DataKey::Admin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set::<DataKey, Address>(&DataKey::Admin, admin);
}

pub fn get_fee_percentage(env: &Env) -> Option<u32> {
    env.storage().instance().get::<DataKey, u32>(&DataKey::FeePercentage)
}

pub fn set_fee_percentage(env: &Env, fee_percentage: u32) {
    env.storage().instance().set::<DataKey, u32>(&DataKey::FeePercentage, &fee_percentage);
}

pub fn get_plan(env: &Env, plan_id: String) -> Option<SubscriptionPlan> {
    env.storage()
        .instance()
        .get::<DataKey, SubscriptionPlan>(&DataKey::Plan(plan_id))
}

pub fn set_plan(env: &Env, plan_id: String, plan: &SubscriptionPlan) {
    env.storage()
        .instance()
        .set::<DataKey, SubscriptionPlan>(&DataKey::Plan(plan_id), plan);
}

pub fn plan_exists(env: &Env, plan_id: String) -> bool {
    env.storage()
        .instance()
        .has(&DataKey::Plan(plan_id))
}

pub fn get_subscription(env: &Env, subscription_id: String) -> Option<Subscription> {
    env.storage()
        .instance()
        .get::<DataKey, Subscription>(&DataKey::Subscription(subscription_id))
}

pub fn set_subscription(env: &Env, subscription_id: String, subscription: &Subscription) {
    env.storage()
        .instance()
        .set::<DataKey, Subscription>(&DataKey::Subscription(subscription_id), subscription);
}

pub fn subscription_exists(env: &Env, subscription_id: String) -> bool {
    env.storage()
        .instance()
        .has(&DataKey::Subscription(subscription_id))
}

pub fn get_plan_counter(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get::<DataKey, u32>(&DataKey::PlanCounter)
        .unwrap_or(0)
}

pub fn increment_plan_counter(env: &Env) -> u32 {
    let counter = get_plan_counter(env) + 1;
    env.storage()
        .instance()
        .set::<DataKey, u32>(&DataKey::PlanCounter, &counter);
    counter
}

pub fn get_subscription_counter(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get::<DataKey, u32>(&DataKey::SubscriptionCounter)
        .unwrap_or(0)
}

pub fn increment_subscription_counter(env: &Env) -> u32 {
    let counter = get_subscription_counter(env) + 1;
    env.storage()
        .instance()
        .set::<DataKey, u32>(&DataKey::SubscriptionCounter, &counter);
    counter
}
