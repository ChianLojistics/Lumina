use soroban_sdk::{Env, Address, String, Vec, symbol_short};
use crate::storage;
use crate::types::{Error, SplitRule, Recipient};

pub fn initialize(env: &Env, admin: Address) {
    if storage::get_version(env) != 0 {
        panic!("Already initialized");
    }
    storage::set_version(env, 1);
    storage::set_admin(env, admin);
}

pub fn create_split(
    env: &Env,
    from: Address,
    split_id: String,
    recipients: Vec<Recipient>,
) -> Result<(), Error> {
    // Authorization check
    from.require_auth();

    // Validate split_id uniqueness
    if storage::split_exists(env, split_id.clone()) {
        return Err(Error::SplitNotFound);
    }

    // Validate recipients
    validate_recipients(&recipients)?;

    // Calculate total percentage
    let total_percentage: u32 = recipients.iter().map(|r| r.percentage).sum();

    // Create split rule
    let split_rule = SplitRule {
        split_id: split_id.clone(),
        from_address: from.clone(),
        recipients: recipients.clone(),
        total_percentage,
        created_at: env.ledger().timestamp(),
    };

    // Save to storage
    storage::save_split(env, split_id.clone(), split_rule);

    // Emit event
    env.events().publish(
        (symbol_short!("split_crt"), split_id),
        (from, total_percentage),
    );

    Ok(())
}

pub fn execute_split(
    env: &Env,
    split_id: String,
    amount: i128,
) -> Result<Vec<(Address, i128)>, Error> {
    // Get split rule
    let split_rule = storage::get_split(env, split_id.clone())
        .ok_or(Error::SplitNotFound)?;

    // Authorization check - only creator can execute
    split_rule.from_address.require_auth();

    // Validate amount
    if amount <= 0 {
        return Err(Error::InsufficientFunds);
    }

    // Calculate split amounts
    let mut distributions: Vec<(Address, i128)> = Vec::new(env);
    
    for recipient in split_rule.recipients.iter() {
        let share = (amount * recipient.percentage as i128) / 100;
        distributions.push_back((recipient.address.clone(), share));
    }

    // Emit event for each recipient
    for (address, share) in distributions.iter() {
        env.events().publish(
            (symbol_short!("splt_done"), split_id.clone()),
            (address.clone(), share),
        );
    }

    Ok(distributions)
}

pub fn update_split(
    env: &Env,
    split_id: String,
    new_recipients: Vec<Recipient>,
) -> Result<(), Error> {
    // Get existing split
    let mut split_rule = storage::get_split(env, split_id.clone())
        .ok_or(Error::SplitNotFound)?;

    // Authorization check - only creator can modify
    split_rule.from_address.require_auth();

    // Validate new recipients
    validate_recipients(&new_recipients)?;

    // Calculate new total percentage
    let total_percentage: u32 = new_recipients.iter().map(|r| r.percentage).sum();

    // Update split rule
    split_rule.recipients = new_recipients;
    split_rule.total_percentage = total_percentage;

    // Save updated split
    storage::save_split(env, split_id.clone(), split_rule.clone());

    // Emit event
    env.events().publish(
        (symbol_short!("split_upd"), split_id),
        total_percentage,
    );

    Ok(())
}

pub fn get_split(env: &Env, split_id: String) -> Result<SplitRule, Error> {
    storage::get_split(env, split_id)
        .ok_or(Error::SplitNotFound)
}

fn validate_recipients(recipients: &Vec<Recipient>) -> Result<(), Error> {
    // Check for empty recipients
    if recipients.is_empty() {
        return Err(Error::InvalidPercentage);
    }

    // Check for duplicate addresses
    let mut seen = Vec::new(&recipients.env());
    for recipient in recipients.iter() {
        if seen.contains(&recipient.address) {
            return Err(Error::DuplicateRecipient);
        }
        seen.push_back(recipient.address.clone());
    }

    // Check percentages sum to 100
    let total: u32 = recipients.iter().map(|r| r.percentage).sum();
    if total != 100 {
        return Err(Error::InvalidPercentage);
    }

    // Check individual percentages are valid
    for recipient in recipients.iter() {
        if recipient.percentage == 0 || recipient.percentage > 100 {
            return Err(Error::InvalidPercentage);
        }
    }

    Ok(())
}
