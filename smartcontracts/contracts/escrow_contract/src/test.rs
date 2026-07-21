#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Events}, Address, Env, IntoVal, FromVal, symbol_short};
use crate::types::EscrowStatus;

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    client.initialize(&admin);

    let stored_admin = storage::get_admin(&env);
    assert_eq!(stored_admin, Some(admin));
}

#[test]
fn test_create_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.initialize(&admin);

    let amount = 1000i128;
    let release_condition = symbol_short!("delivery");

    let escrow_id = client.create_escrow(&sender, &recipient, &amount, &release_condition);

    let escrow = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(escrow.sender, sender);
    assert_eq!(escrow.recipient, recipient);
    assert_eq!(escrow.amount, amount);
    assert_eq!(escrow.status, EscrowStatus::Created);
}

#[test]
fn test_fund_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.initialize(&admin);

    let amount = 1000i128;
    let release_condition = symbol_short!("delivery");
    let escrow_id = client.create_escrow(&sender, &recipient, &amount, &release_condition);

    client.fund_escrow(&escrow_id, &sender);

    let escrow = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(escrow.status, EscrowStatus::Funded);
}

#[test]
fn test_release_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.initialize(&admin);

    let amount = 1000i128;
    let release_condition = symbol_short!("delivery");
    let escrow_id = client.create_escrow(&sender, &recipient, &amount, &release_condition);

    client.fund_escrow(&escrow_id, &sender);

    client.release_escrow(&escrow_id, &admin);

    let escrow = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(escrow.status, EscrowStatus::Released);
}

#[test]
fn test_refund_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.initialize(&admin);

    let amount = 1000i128;
    let release_condition = symbol_short!("delivery");
    let escrow_id = client.create_escrow(&sender, &recipient, &amount, &release_condition);

    client.fund_escrow(&escrow_id, &sender);

    client.refund_escrow(&escrow_id, &sender);

    let escrow = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(escrow.status, EscrowStatus::Refunded);
}

#[test]
fn test_cancel_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.initialize(&admin);

    let amount = 1000i128;
    let release_condition = symbol_short!("delivery");
    let escrow_id = client.create_escrow(&sender, &recipient, &amount, &release_condition);

    client.cancel_escrow(&escrow_id, &sender);

    let escrow = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(escrow.status, EscrowStatus::Cancelled);
}

#[test]
fn test_fund_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let unauthorized = Address::generate(&env);

    client.initialize(&admin);

    let amount = 1000i128;
    let release_condition = symbol_short!("delivery");
    let escrow_id = client.create_escrow(&sender, &recipient, &amount, &release_condition);

    let result = client.try_fund_escrow(&escrow_id, &unauthorized);
    assert!(result.is_err());
}

#[test]
fn test_release_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let unauthorized = Address::generate(&env);

    client.initialize(&admin);

    let amount = 1000i128;
    let release_condition = symbol_short!("delivery");
    let escrow_id = client.create_escrow(&sender, &recipient, &amount, &release_condition);

    client.fund_escrow(&escrow_id, &sender);

    let result = client.try_release_escrow(&escrow_id, &unauthorized);
    assert!(result.is_err());
}

#[test]
fn test_escrow_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.initialize(&admin);

    let amount = 1000i128;
    let release_condition = symbol_short!("delivery");
    
    // Create
    let escrow_id = client.create_escrow(&sender, &recipient, &amount, &release_condition);
    let escrow = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(escrow.status, EscrowStatus::Created);

    // Fund
    client.fund_escrow(&escrow_id, &sender);
    let escrow = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(escrow.status, EscrowStatus::Funded);

    // Release
    client.release_escrow(&escrow_id, &admin);
    let escrow = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(escrow.status, EscrowStatus::Released);
}
