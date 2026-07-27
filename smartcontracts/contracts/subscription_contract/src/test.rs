#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};
use crate::types::SubscriptionStatus;

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let fee_percentage = client.get_fee_percentage();
    assert_eq!(fee_percentage, 5);
}

#[test]
fn test_initialize_already_initialized() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let result = client.try_initialize(&admin, &5);
    assert!(result.is_err());
}

#[test]
fn test_create_plan() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let plan_id = client.create_plan(
        &merchant,
        &1000,
        &86400,
        &Some(12)
    );
    
    let plan = client.get_plan(&plan_id);
    assert!(plan.is_some());
    let plan = plan.unwrap();
    assert_eq!(plan.amount, 1000);
    assert_eq!(plan.billing_interval, 86400);
    assert_eq!(plan.max_cycles, Some(12));
    assert_eq!(plan.active, true);
}

#[test]
fn test_create_plan_invalid_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let result = client.try_create_plan(
        &merchant,
        &0,
        &86400,
        &Some(12)
    );
    assert!(result.is_err());
}

#[test]
fn test_subscribe() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let customer = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let plan_id = client.create_plan(
        &merchant,
        &1000,
        &86400,
        &Some(12)
    );
    
    let subscription_id = client.subscribe(&customer, &plan_id);
    
    let subscription = client.get_subscription(&subscription_id);
    assert!(subscription.is_some());
    let subscription = subscription.unwrap();
    assert_eq!(subscription.plan_id, plan_id);
    assert_eq!(subscription.status, SubscriptionStatus::Active);
    assert_eq!(subscription.current_cycle, 0);
}

#[test]
fn test_subscribe_nonexistent_plan() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let customer = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let fake_plan_id = String::from_str(&env, "PLAN_999");
    
    let result = client.try_subscribe(&customer, &fake_plan_id);
    assert!(result.is_err());
}

#[test]
fn test_process_billing_not_due() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let customer = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let plan_id = client.create_plan(
        &merchant,
        &1000,
        &86400,
        &Some(12)
    );
    
    let subscription_id = client.subscribe(&customer, &plan_id);
    
    let result = client.try_process_billing(&subscription_id);
    assert!(result.is_err());
}

#[test]
fn test_cancel_subscription() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let customer = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let plan_id = client.create_plan(
        &merchant,
        &1000,
        &86400,
        &Some(12)
    );
    
    let subscription_id = client.subscribe(&customer, &plan_id);
    
    client.cancel_subscription(&subscription_id);
    
    let subscription = client.get_subscription(&subscription_id).unwrap();
    assert_eq!(subscription.status, SubscriptionStatus::Cancelled);
}

#[test]
fn test_pause_subscription() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let customer = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let plan_id = client.create_plan(
        &merchant,
        &1000,
        &86400,
        &Some(12)
    );
    
    let subscription_id = client.subscribe(&customer, &plan_id);
    
    client.pause_subscription(&subscription_id);
    
    let subscription = client.get_subscription(&subscription_id).unwrap();
    assert_eq!(subscription.status, SubscriptionStatus::Paused);
}

#[test]
fn test_resume_subscription() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let customer = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let plan_id = client.create_plan(
        &merchant,
        &1000,
        &86400,
        &Some(12)
    );
    
    let subscription_id = client.subscribe(&customer, &plan_id);
    
    client.pause_subscription(&subscription_id);
    
    client.resume_subscription(&subscription_id);
    
    let subscription = client.get_subscription(&subscription_id).unwrap();
    assert_eq!(subscription.status, SubscriptionStatus::Active);
}

#[test]
fn test_handle_payment_failure() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let customer = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let plan_id = client.create_plan(
        &merchant,
        &1000,
        &86400,
        &Some(12)
    );
    
    let subscription_id = client.subscribe(&customer, &plan_id);
    
    client.handle_payment_failure(&subscription_id);
    
    let subscription = client.get_subscription(&subscription_id).unwrap();
    assert_eq!(subscription.retry_count, 1);
}

#[test]
fn test_max_cycles_reached() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SubscriptionContract);
    let client = SubscriptionContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let customer = Address::generate(&env);
    
    client.initialize(&admin, &5);
    
    let plan_id = client.create_plan(
        &merchant,
        &1000,
        &86400,
        &Some(2)
    );
    
    let subscription_id = client.subscribe(&customer, &plan_id);
    
    let subscription = client.get_subscription(&subscription_id).unwrap();
    assert_eq!(subscription.current_cycle, 0);
}
