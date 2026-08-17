pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/sha256.circom";
include "../node_modules/circomlib/circuits/merkle_tree.circom";

// Payment Verification Circuit
// This circuit verifies that a payment is valid without revealing sensitive details
template PaymentVerification() {
    // Private inputs
    signal input sender_private_key;
    signal input recipient_private_key;
    signal input amount;
    signal input timestamp;
    signal input nonce;
    
    // Public inputs
    signal input payment_hash;
    signal input merkle_root;
    signal input nullifier;
    signal input expected_amount;
    signal input min_timestamp;
    signal input max_timestamp;
    
    // Compute sender hash
    component sender_hash = Sha256(2);
    sender_hash.in[0] <== sender_private_key;
    sender_hash.in[1] <== nonce;
    
    // Verify sender hash matches payment hash
    sender_hash.out === payment_hash;
    
    // Verify amount is positive and matches expected
    signal amount_positive;
    amount_positive <== amount > 0;
    amount_positive === 1;
    
    signal amount_match;
    amount_match <== amount === expected_amount;
    amount_match === 1;
    
    // Verify timestamp is within valid range
    signal timestamp_valid;
    timestamp_valid <== timestamp >= min_timestamp;
    timestamp_valid === 1;
    
    signal timestamp_not_future;
    timestamp_not_future <== timestamp <= max_timestamp;
    timestamp_not_future === 1;
    
    // Generate nullifier to prevent double-spending
    component nullifier_hash = Sha256(3);
    nullifier_hash.in[0] <== sender_private_key;
    nullifier_hash.in[1] <== amount;
    nullifier_hash.in[2] <== timestamp;
    
    nullifier_hash.out === nullifier;
}

// Settlement Verification Circuit
template SettlementVerification() {
    // Private inputs
    signal input merchant_private_key;
    signal input payment_hash;
    signal input settlement_amount;
    signal input settlement_timestamp;
    
    // Public inputs
    signal input merchant_public_key;
    signal input expected_settlement_amount;
    signal input merkle_root;
    signal input settlement_nullifier;
    
    // Verify merchant ownership
    component merchant_hash = Sha256(1);
    merchant_hash.in[0] <== merchant_private_key;
    merchant_hash.out === merchant_public_key;
    
    // Verify settlement amount matches expected
    signal amount_match;
    amount_match <== settlement_amount === expected_settlement_amount;
    amount_match === 1;
    
    // Verify settlement amount is positive
    signal amount_positive;
    amount_positive <== settlement_amount > 0;
    amount_positive === 1;
    
    // Generate settlement nullifier
    component nullifier_hash = Sha256(3);
    nullifier_hash.in[0] <== merchant_private_key;
    nullifier_hash.in[1] <== payment_hash;
    nullifier_hash.in[2] <== settlement_timestamp;
    
    nullifier_hash.out === settlement_nullifier;
}

// Identity Verification Circuit
template IdentityVerification() {
    // Private inputs
    signal input identity_private_key;
    signal input identity_commitment;
    signal input age;
    signal input country_code;
    
    // Public inputs
    signal input identity_nullifier;
    signal input min_age;
    signal input allowed_countries;
    
    // Verify age requirement
    signal age_valid;
    age_valid <== age >= min_age;
    age_valid === 1;
    
    // Verify country is allowed (simplified check)
    signal country_valid;
    country_valid <== country_code === allowed_countries;
    country_valid === 1;
    
    // Generate identity nullifier
    component nullifier_hash = Sha256(2);
    nullifier_hash.in[0] <== identity_private_key;
    nullifier_hash.in[1] <== identity_commitment;
    
    nullifier_hash.out === identity_nullifier;
}

// Merkle Inclusion Proof Circuit
template MerkleInclusion(level) {
    signal input leaf;
    signal input path[level];
    signal input path_indices[level];
    signal input root;
    
    signal computed_root[level];
    
    computed_root[0] <== leaf;
    
    for (var i = 0; i < level; i++) {
        component hasher = Sha256(2);
        
        signal left;
        signal right;
        
        left <== path_indices[i] === 0 ? computed_root[i] : path[i];
        right <== path_indices[i] === 0 ? path[i] : computed_root[i];
        
        hasher.in[0] <== left;
        hasher.in[1] <== right;
        
        computed_root[i + 1] <== hasher.out;
    }
    
    computed_root[level] === root;
}

// Main circuit that combines all verifications
template MainPaymentCircuit() {
    signal input sender_private_key;
    signal input recipient_private_key;
    signal input amount;
    signal input timestamp;
    signal input nonce;
    signal input payment_hash;
    signal input merkle_root;
    signal input nullifier;
    signal input expected_amount;
    signal input min_timestamp;
    signal input max_timestamp;
    
    component payment = PaymentVerification();
    payment.sender_private_key <== sender_private_key;
    payment.recipient_private_key <== recipient_private_key;
    payment.amount <== amount;
    payment.timestamp <== timestamp;
    payment.nonce <== nonce;
    payment.payment_hash <== payment_hash;
    payment.merkle_root <== merkle_root;
    payment.nullifier <== nullifier;
    payment.expected_amount <== expected_amount;
    payment.min_timestamp <== min_timestamp;
    payment.max_timestamp <== max_timestamp;
}
