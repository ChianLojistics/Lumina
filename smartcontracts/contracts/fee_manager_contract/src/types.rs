use soroban_sdk::{contracttype, contracterror, Address, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Version,
    Admin,
    Treasury,
    FeeConfig(FeeOperation),
    FeeChangeTimelock(FeeOperation),
    FeeAuditLog(u64),
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FeeOperation {
    Payment,
    Escrow,
    Split,
    Subscription,
    Withdrawal,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeTier {
    pub min_volume: i128,
    pub max_volume: i128,
    pub basis_points: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeConfig {
    pub operation_type: FeeOperation,
    pub base_percentage: u32,
    pub volume_tiers: Vec<FeeTier>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeChangeRequest {
    pub operation_type: FeeOperation,
    pub new_percentage: u32,
    pub new_tiers: Vec<FeeTier>,
    pub requested_at: u64,
    pub effective_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeAuditLog {
    pub log_id: u64,
    pub operation_type: FeeOperation,
    pub old_percentage: u32,
    pub new_percentage: u32,
    pub changed_by: Address,
    pub timestamp: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotAuthorized = 1,
    InvalidFeePercentage = 2,
    FeeChangeTimelocked = 3,
    TreasuryNotFound = 4,
    InvalidVolumeTier = 5,
    FeeConfigNotFound = 6,
    TimelockNotExpired = 7,
}
