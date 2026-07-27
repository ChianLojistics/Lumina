use soroban_sdk::{contracttype, contracterror, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    FeePercentage,
    Plan(String),
    Subscription(String),
    PlanCounter,
    SubscriptionCounter,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized = 1,
    NotAuthorized = 2,
    PlanNotFound = 3,
    SubscriptionNotFound = 4,
    InvalidPlan = 5,
    SubscriptionAlreadyExists = 6,
    InvalidStatus = 7,
    BillingNotDue = 8,
    MaxCyclesReached = 9,
    InsufficientBalance = 10,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Cancelled,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SubscriptionPlan {
    pub plan_id: String,
    pub merchant: Address,
    pub amount: i128,
    pub billing_interval: u64,
    pub max_cycles: Option<u32>,
    pub active: bool,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Subscription {
    pub subscription_id: String,
    pub plan_id: String,
    pub customer: Address,
    pub merchant: Address,
    pub current_cycle: u32,
    pub next_billing_at: u64,
    pub status: SubscriptionStatus,
    pub created_at: u64,
    pub last_billing_at: Option<u64>,
    pub retry_count: u32,
}
