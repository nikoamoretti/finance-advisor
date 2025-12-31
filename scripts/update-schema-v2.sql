-- Schema updates for v2
-- Run this in Supabase SQL Editor

-- Add monthly contribution to goals
ALTER TABLE goals ADD COLUMN IF NOT EXISTS monthly_contribution DECIMAL(10,2) DEFAULT 0;

-- Add promo end date to debts (for Capital One 0% APR tracking)
ALTER TABLE debts ADD COLUMN IF NOT EXISTS promo_end_date DATE;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS promo_rate DECIMAL(5,2);
ALTER TABLE debts ADD COLUMN IF NOT EXISTS post_promo_rate DECIMAL(5,2);
ALTER TABLE debts ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10,2);

-- Clear existing data and insert fresh
DELETE FROM debts;
DELETE FROM goals;
DELETE FROM accounts;
DELETE FROM user_config;

-- User config
INSERT INTO user_config (name, net_monthly_income, pay_schedule, onboarding_complete)
VALUES ('Nico', 11840.00, 'semi-monthly-15-last', TRUE);

-- Accounts
INSERT INTO accounts (name, type, institution, current_balance) VALUES
('Checking', 'checking', 'Bank', 0),
('Savings (HYSA)', 'savings', 'Marcus/Ally/Wealthfront', 0),
('Investment', 'investment', 'Brokerage', 19000),
('Oportun', 'savings', 'Oportun', 0);

-- Debts with all details
INSERT INTO debts (name, type, original_amount, current_balance, interest_rate, monthly_payment, payment_day, notes, promo_end_date, promo_rate, post_promo_rate, credit_limit) VALUES
('IRS 2023 Taxes', 'irs', 54876.00, 18137.37, 8.0, 426.00, 16, 'AMT on NewtonX stock. Paying off early saves ~$3,400 in interest.', NULL, NULL, NULL, NULL),
('Car Loan', 'car_loan', NULL, 23704.83, 9.64, 568.00, NULL, '1995 Honda Civic', NULL, NULL, NULL, NULL),
('Capital One Quicksilver', 'credit_card', NULL, 6598.40, 0.0, 660.00, NULL, 'MUST pay off before promo ends Oct 2026', '2026-10-31', 0.0, 29.24, 10000.00);

-- Goals with monthly contributions
INSERT INTO goals (name, target_amount, current_amount, priority, notes, monthly_contribution) VALUES
('Emergency Fund', 50000.00, 0, 1, '~6 months of expenses. Goes to HYSA.', 1200.00),
('Cabin Down Payment', 70000.00, 19000.00, 2, '20% down on ~$300K mountain cabin (Big Bear, Arrowhead, Idyllwild). Investment account counts toward this.', 1800.00);

-- Budget categories (updated)
DELETE FROM budget_categories;
INSERT INTO budget_categories (name, monthly_budget, is_fixed, is_excluded) VALUES
('Rent', 3495.00, TRUE, FALSE),
('Loans', 1319.00, TRUE, FALSE),
('Utilities', 300.00, TRUE, FALSE),
('Insurance', 213.00, TRUE, FALSE),
('Gym', 335.00, TRUE, FALSE),
('Groceries', 400.00, FALSE, FALSE),
('Restaurants', 400.00, FALSE, FALSE),
('Delivery', 150.00, FALSE, FALSE),
('Transportation', 250.00, FALSE, FALSE),
('Subscriptions', 350.00, FALSE, FALSE),
('Pets', 175.00, FALSE, FALSE),
('Healthcare', 200.00, FALSE, FALSE),
('Entertainment', 100.00, FALSE, FALSE),
('Bars & Nightlife', 100.00, FALSE, FALSE),
('Shops', 150.00, FALSE, FALSE),
('Personal Care', 50.00, FALSE, FALSE),
('Other', 200.00, FALSE, FALSE),
('Moving', 0, FALSE, TRUE),
('Work Expenses', 0, FALSE, TRUE),
('Savings Transfer', 0, FALSE, TRUE),
('Internal Transfers', 0, FALSE, TRUE);

-- Rules
DELETE FROM rules;
INSERT INTO rules (name, condition, action, is_active) VALUES
('Low savings block', 'savings < 5000', 'block_discretionary_over_100', TRUE),
('Emergency fund priority', 'emergency_fund < 10000', 'warn_large_purchases', TRUE),
('Delivery warning', 'delivery_mtd > 100', 'warn_delivery_spending', TRUE),
('Dining warning', 'dining_bars_mtd > 400', 'flag_food_spending', TRUE),
('Capital One alert', 'capital_one_not_on_track', 'urgent_payoff_warning', TRUE);
