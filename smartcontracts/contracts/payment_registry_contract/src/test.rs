#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Events}, Address, Env, IntoVal, FromVal, symbol_short};
use crate::types::PaymentStatus;

#[test]
fn test_status_update() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentRegistryContract);
    let client = PaymentRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let asset = Address::generate(&env);

    // 1. Initialize
    client.initialize(&admin);

    // 2. Create payment
    let amount = 1000i128;
    let payment_id = client.create_payment_record(&merchant, &amount, &asset);

    // 3. Update status (as admin)
    client.update_payment_status(&payment_id, &PaymentStatus::Confirmed);

    // 4. Verify status
    let record = client.get_payment(&payment_id).unwrap();
    assert_eq!(record.status, PaymentStatus::Confirmed);

    // 5. Verify event
    let events = env.events().all();
    let event = events.last().unwrap();
    
    // Topics: (Symbol("PaymentStatusUpdated"), payment_id)
    let expected_topics = (soroban_sdk::Symbol::new(&env, "PaymentStatusUpdated"), payment_id).into_val(&env);
    assert_eq!(event.1, expected_topics);
    
    // Data: status (Confirmed)
    let status: PaymentStatus = PaymentStatus::from_val(&env, &event.2);
    assert_eq!(status, PaymentStatus::Confirmed);
}

#[test]
fn test_status_update_auth() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentRegistryContract);
    let client = PaymentRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let asset = Address::generate(&env);

    // 1. Initialize
    client.initialize(&admin);

    // 2. Create payment
    let amount = 1000i128;
    let payment_id = client.create_payment_record(&merchant, &amount, &asset);

    // 3. Update status
    client.update_payment_status(&payment_id, &PaymentStatus::Confirmed);

    // 4. Verify auth
    // env.auths() returns a list of authorizations that were recorded during the last top-level contract call.
    let auths = env.auths();
    assert_eq!(auths.len(), 1);
    let (address, _call) = &auths[0];
    assert_eq!(address, &admin);
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentRegistryContract);
    let client = PaymentRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    // Initialize contract
    client.initialize(&admin);

    // Verify version is set
    let version = client.version();
    assert_eq!(version, 1);
}

#[test]
fn test_create_payment_record() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentRegistryContract);
    let client = PaymentRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let asset = Address::generate(&env);

    // Initialize
    client.initialize(&admin);

    // Create payment
    let amount = 5000i128;
    let payment_id = client.create_payment_record(&merchant, &amount, &asset);

    // Verify payment exists
    let record = client.get_payment(&payment_id).unwrap();
    assert_eq!(record.merchant_address, merchant);
    assert_eq!(record.amount, amount);
    assert_eq!(record.asset, asset);
    assert_eq!(record.status, PaymentStatus::Pending);
}

#[test]
fn test_get_payment_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentRegistryContract);
    let client = PaymentRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    // Initialize
    client.initialize(&admin);

    // Try to get non-existent payment
    let fake_id = soroban_sdk::String::from_str(&env, "fake_payment_id");
    let result = client.get_payment(&fake_id);
    assert!(result.is_none());
}

#[test]
fn test_multiple_payment_records() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentRegistryContract);
    let client = PaymentRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant1 = Address::generate(&env);
    let merchant2 = Address::generate(&env);
    let asset = Address::generate(&env);

    // Initialize
    client.initialize(&admin);

    // Create multiple payments
    let payment_id1 = client.create_payment_record(&merchant1, &1000i128, &asset);
    let payment_id2 = client.create_payment_record(&merchant2, &2000i128, &asset);
    let payment_id3 = client.create_payment_record(&merchant1, &3000i128, &asset);

    // Verify all payments exist
    let record1 = client.get_payment(&payment_id1).unwrap();
    assert_eq!(record1.amount, 1000);

    let record2 = client.get_payment(&payment_id2).unwrap();
    assert_eq!(record2.amount, 2000);

    let record3 = client.get_payment(&payment_id3).unwrap();
    assert_eq!(record3.amount, 3000);
}

#[test]
fn test_payment_status_transitions() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentRegistryContract);
    let client = PaymentRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let asset = Address::generate(&env);

    // Initialize
    client.initialize(&admin);

    // Create payment
    let payment_id = client.create_payment_record(&merchant, &1000i128, &asset);

    // Test status transitions
    client.update_payment_status(&payment_id, &PaymentStatus::Confirmed);
    let record = client.get_payment(&payment_id).unwrap();
    assert_eq!(record.status, PaymentStatus::Confirmed);

    client.update_payment_status(&payment_id, &PaymentStatus::Failed);
    let record = client.get_payment(&payment_id).unwrap();
    assert_eq!(record.status, PaymentStatus::Failed);
}
