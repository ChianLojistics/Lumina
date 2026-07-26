use soroban_sdk::{contracttype, contracterror, Address, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Version,
    Admin,
    Split(String),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    InvalidPercentage = 1,
    DuplicateRecipient = 2,
    SplitNotFound = 3,
    Unauthorized = 4,
    InsufficientFunds = 5,
    AlreadyInitialized = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Recipient {
    pub address: Address,
    pub percentage: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitRule {
    pub split_id: String,
    pub from_address: Address,
    pub recipients: Vec<Recipient>,
    pub total_percentage: u32,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitConfig {
    pub split_id: String,
    pub from_address: Address,
    pub recipients: Vec<Recipient>,
}
