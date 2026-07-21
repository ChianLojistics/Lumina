#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Events}, Address, Env, IntoVal, FromVal};

#[test]
fn test_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MerchantVaultContract);
    let client = MerchantVaultContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);

    client.initialize(&admin);

    // 1. Initial deposit
    client.deposit(&merchant, &1000);
    assert_eq!(client.get_merchant_balance(&merchant), 1000);

    // 2. Second deposit
    client.deposit(&merchant, &500);
    assert_eq!(client.get_merchant_balance(&merchant), 1500);

    // 3. Verify event
    let events = env.events().all();
    let event = events.last().unwrap();
    
    // Topics: (Symbol("deposit"), merchant)
    let expected_topics = (soroban_sdk::symbol_short!("deposit"), merchant).into_val(&env);
    assert_eq!(event.1, expected_topics);
    
    // Data: amount (500)
    let amount: i128 = i128::from_val(&env, &event.2);
    assert_eq!(amount, 500);
}

#[test]
fn test_withdraw() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MerchantVaultContract);
    let client = MerchantVaultContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let destination = Address::generate(&env);

    client.initialize(&admin);

    // Deposit first
    client.deposit(&merchant, &1000);
    assert_eq!(client.get_merchant_balance(&merchant), 1000);

    // Withdraw
    client.withdraw(&merchant, &500, &destination);
    assert_eq!(client.get_merchant_balance(&merchant), 500);

    // Verify event
    let events = env.events().all();
    let event = events.last().unwrap();
    
    // Topics: (Symbol("withdraw"), merchant)
    let expected_topics = (soroban_sdk::symbol_short!("withdraw"), merchant).into_val(&env);
    assert_eq!(event.1, expected_topics);
}

#[test]
fn test_withdraw_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MerchantVaultContract);
    let client = MerchantVaultContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let destination = Address::generate(&env);

    client.initialize(&admin);

    // Deposit small amount
    client.deposit(&merchant, &100);

    // Try to withdraw more than balance
    let result = client.try_withdraw(&merchant, &500, &destination);
    assert!(result.is_err());
}

#[test]
fn test_withdraw_full_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MerchantVaultContract);
    let client = MerchantVaultContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let destination = Address::generate(&env);

    client.initialize(&admin);

    // Deposit
    client.deposit(&merchant, &1000);

    // Withdraw full balance
    client.withdraw(&merchant, &1000, &destination);
    assert_eq!(client.get_merchant_balance(&merchant), 0);
}

#[test]
fn test_multiple_merchants() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MerchantVaultContract);
    let client = MerchantVaultContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant1 = Address::generate(&env);
    let merchant2 = Address::generate(&env);

    client.initialize(&admin);

    // Deposit to different merchants
    client.deposit(&merchant1, &1000);
    client.deposit(&merchant2, &2000);

    // Verify balances are separate
    assert_eq!(client.get_merchant_balance(&merchant1), 1000);
    assert_eq!(client.get_merchant_balance(&merchant2), 2000);

    // Withdraw from merchant1
    let destination = Address::generate(&env);
    client.withdraw(&merchant1, &500, &destination);

    // Verify only merchant1 balance changed
    assert_eq!(client.get_merchant_balance(&merchant1), 500);
    assert_eq!(client.get_merchant_balance(&merchant2), 2000);
}

#[test]
fn test_get_balance_zero_for_new_merchant() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MerchantVaultContract);
    let client = MerchantVaultContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);

    client.initialize(&admin);

    // New merchant should have zero balance
    assert_eq!(client.get_merchant_balance(&merchant), 0);
}
