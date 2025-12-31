-- Add onboarding tracking columns to user_config
-- Run this in Supabase SQL Editor

ALTER TABLE user_config ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS last_balance_update TIMESTAMP;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS last_transaction_import TIMESTAMP;

-- Add hash column to transactions for deduplication
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS hash TEXT;
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(hash);

-- Update existing user_config to mark onboarding incomplete
UPDATE user_config SET onboarding_complete = FALSE WHERE onboarding_complete IS NULL;
