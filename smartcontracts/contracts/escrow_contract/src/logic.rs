use soroban_sdk::{Env, Address, String, Symbol, symbol_short, xdr::ToXdr};
use crate::storage;
use crate::types::{Error, Escrow, EscrowStatus};

pub fn initialize(env: &Env, admin: Address) {
    if storage::get_admin(env).is_none() {
        storage::set_admin(env, &admin);
    }
}

fn generate_escrow_id(env: &Env, sender: Address, recipient: Address) -> String {
    let timestamp = env.ledger().timestamp();
    let tuple = (sender, recipient, timestamp);
    let hash = env.crypto().sha256(&tuple.to_xdr(env));
    
    let hex_chars = b"0123456789abcdef";
    let mut hex_bytes = [0u8; 64];
    for (i, &b) in hash.to_array().iter().enumerate() {
        hex_bytes[i * 2] = hex_chars[(b >> 4) as usize];
        hex_bytes[i * 2 + 1] = hex_chars[(b & 0x0F) as usize];
    }
    String::from_str(env, core::str::from_utf8(&hex_bytes).unwrap())
}

pub fn create_escrow(
    env: &Env,
    sender: Address,
    recipient: Address,
    amount: i128,
    release_condition: Symbol,
) -> Result<String, Error> {
    sender.require_auth();
    
    let escrow_id = generate_escrow_id(env, sender.clone(), recipient.clone());
    
    if storage::escrow_exists(env, escrow_id.clone()) {
        return Err(Error::EscrowNotFound);
    }
    
    let escrow = Escrow {
        escrow_id: escrow_id.clone(),
        sender: sender.clone(),
        recipient,
        amount,
        status: EscrowStatus::Created,
        created_at: env.ledger().timestamp(),
        release_condition,
    };
    
    storage::save_escrow(env, escrow_id.clone(), escrow);
    
    env.events().publish(
        (symbol_short!("escrow_created"), escrow_id.clone()),
        sender
    );
    
    Ok(escrow_id)
}

pub fn fund_escrow(env: &Env, escrow_id: String, sender: Address) -> Result<(), Error> {
    sender.require_auth();
    
    let mut escrow = storage::get_escrow(env, escrow_id.clone())
        .ok_or(Error::EscrowNotFound)?;
    
    if escrow.sender != sender {
        return Err(Error::NotAuthorized);
    }
    
    if escrow.status != EscrowStatus::Created {
        return Err(Error::InvalidStatus);
    }
    
    escrow.status = EscrowStatus::Funded;
    storage::save_escrow(env, escrow_id, escrow);
    
    Ok(())
}

pub fn release_escrow(env: &Env, escrow_id: String, admin: Address) -> Result<(), Error> {
    admin.require_auth();
    
    let admin_check = storage::get_admin(env).ok_or(Error::NotAuthorized)?;
    if admin_check != admin {
        return Err(Error::NotAuthorized);
    }
    
    let mut escrow = storage::get_escrow(env, escrow_id.clone())
        .ok_or(Error::EscrowNotFound)?;
    
    if escrow.status != EscrowStatus::Funded {
        return Err(Error::InvalidStatus);
    }
    
    escrow.status = EscrowStatus::Released;
    storage::save_escrow(env, escrow_id, escrow);
    
    Ok(())
}

pub fn refund_escrow(env: &Env, escrow_id: String, sender: Address) -> Result<(), Error> {
    sender.require_auth();
    
    let mut escrow = storage::get_escrow(env, escrow_id.clone())
        .ok_or(Error::EscrowNotFound)?;
    
    if escrow.sender != sender {
        return Err(Error::NotAuthorized);
    }
    
    if escrow.status != EscrowStatus::Funded {
        return Err(Error::InvalidStatus);
    }
    
    escrow.status = EscrowStatus::Refunded;
    storage::save_escrow(env, escrow_id, escrow);
    
    Ok(())
}

pub fn cancel_escrow(env: &Env, escrow_id: String, sender: Address) -> Result<(), Error> {
    sender.require_auth();
    
    let mut escrow = storage::get_escrow(env, escrow_id.clone())
        .ok_or(Error::EscrowNotFound)?;
    
    if escrow.sender != sender {
        return Err(Error::NotAuthorized);
    }
    
    if escrow.status != EscrowStatus::Created {
        return Err(Error::InvalidStatus);
    }
    
    escrow.status = EscrowStatus::Cancelled;
    storage::save_escrow(env, escrow_id, escrow);
    
    Ok(())
}
