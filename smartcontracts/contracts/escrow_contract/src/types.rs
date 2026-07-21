use soroban_sdk::{contracttype, contracterror, Address, String, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    EscrowAdmin,
    Escrow(String),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Created,
    Funded,
    Released,
    Refunded,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub escrow_id: String,
    pub sender: Address,
    pub recipient: Address,
    pub amount: i128,
    pub status: EscrowStatus,
    pub created_at: u64,
    pub release_condition: Symbol,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotAuthorized = 1,
    EscrowNotFound = 2,
    InvalidStatus = 3,
    InsufficientBalance = 4,
}
