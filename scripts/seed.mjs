import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/seed.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding database...\n');

  // User config
  console.log('Adding user config...');
  const { error: userError } = await supabase.from('user_config').upsert({
    name: 'Nico',
    net_monthly_income: 11840.00,
    pay_schedule: 'semi-monthly-15-last'
  });
  if (userError) console.error('  Error:', userError.message);
  else console.log('  ✓ User config added');

  // Debts
  console.log('Adding debts...');
  const { error: debtsError } = await supabase.from('debts').upsert([
    {
      name: 'IRS 2023 Taxes',
      type: 'irs',
      original_amount: 54876.00,
      current_balance: 18137.37,
      interest_rate: 8.0,
      monthly_payment: 426.00,
      payment_day: 16,
      notes: 'AMT on NewtonX stock. Consider paying off early to save ~$3,400 in interest.'
    },
    {
      name: 'Car Loan (CSL 1802)',
      type: 'car_loan',
      original_amount: null,
      current_balance: null,
      interest_rate: null,
      monthly_payment: 568.00,
      payment_day: null,
      notes: '1995 Honda Civic'
    },
    {
      name: 'LendingClub',
      type: 'personal_loan',
      original_amount: null,
      current_balance: null,
      interest_rate: null,
      monthly_payment: 325.00,
      payment_day: null,
      notes: null
    }
  ]);
  if (debtsError) console.error('  Error:', debtsError.message);
  else console.log('  ✓ Debts added');

  // Budget categories
  console.log('Adding budget categories...');
  const { error: budgetError } = await supabase.from('budget_categories').upsert([
    { name: 'Rent', monthly_budget: 3495.00, is_fixed: true, is_excluded: false },
    { name: 'Loans', monthly_budget: 1319.00, is_fixed: true, is_excluded: false },
    { name: 'Utilities', monthly_budget: 300.00, is_fixed: true, is_excluded: false },
    { name: 'Insurance', monthly_budget: 213.00, is_fixed: true, is_excluded: false },
    { name: 'Gym', monthly_budget: 335.00, is_fixed: true, is_excluded: false },
    { name: 'Groceries', monthly_budget: 400.00, is_fixed: false, is_excluded: false },
    { name: 'Restaurants', monthly_budget: 400.00, is_fixed: false, is_excluded: false },
    { name: 'Delivery', monthly_budget: 150.00, is_fixed: false, is_excluded: false },
    { name: 'Transportation', monthly_budget: 250.00, is_fixed: false, is_excluded: false },
    { name: 'Subscriptions', monthly_budget: 350.00, is_fixed: false, is_excluded: false },
    { name: 'Pets', monthly_budget: 175.00, is_fixed: false, is_excluded: false },
    { name: 'Healthcare', monthly_budget: 200.00, is_fixed: false, is_excluded: false },
    { name: 'Entertainment', monthly_budget: 100.00, is_fixed: false, is_excluded: false },
    { name: 'Bars & Nightlife', monthly_budget: 100.00, is_fixed: false, is_excluded: false },
    { name: 'Shops', monthly_budget: 150.00, is_fixed: false, is_excluded: false },
    { name: 'Personal Care', monthly_budget: 50.00, is_fixed: false, is_excluded: false },
    { name: 'Other', monthly_budget: 200.00, is_fixed: false, is_excluded: false },
    { name: 'Moving (one off)', monthly_budget: 0, is_fixed: false, is_excluded: true },
    { name: 'Work Expenses', monthly_budget: 0, is_fixed: false, is_excluded: true }
  ]);
  if (budgetError) console.error('  Error:', budgetError.message);
  else console.log('  ✓ Budget categories added');

  // Goals
  console.log('Adding goals...');
  const { error: goalsError } = await supabase.from('goals').upsert([
    {
      name: 'Emergency Fund',
      target_amount: 25000.00,
      current_amount: 0,
      priority: 1,
      notes: '3 months of expenses'
    },
    {
      name: 'Travel',
      target_amount: 4000.00,
      current_amount: 0,
      priority: 2,
      notes: '1-2 trips per year'
    },
    {
      name: 'Car Maintenance',
      target_amount: 2000.00,
      current_amount: 0,
      priority: 3,
      notes: 'Oil, tires, repairs for older car'
    }
  ]);
  if (goalsError) console.error('  Error:', goalsError.message);
  else console.log('  ✓ Goals added');

  // Rules
  console.log('Adding rules...');
  const { error: rulesError } = await supabase.from('rules').upsert([
    {
      name: 'Low savings block',
      condition: 'savings < 5000',
      action: 'block_discretionary_over_100',
      is_active: true
    },
    {
      name: 'Emergency fund priority',
      condition: 'emergency_fund < 25000',
      action: 'warn_large_purchases',
      is_active: true
    },
    {
      name: 'Delivery warning',
      condition: 'delivery_mtd > 100',
      action: 'warn_delivery_spending',
      is_active: true
    }
  ]);
  if (rulesError) console.error('  Error:', rulesError.message);
  else console.log('  ✓ Rules added');

  // Add a sample checking account
  console.log('Adding sample account...');
  const { error: accountError } = await supabase.from('accounts').upsert({
    name: 'Main Checking',
    type: 'checking',
    institution: 'Bank of America',
    current_balance: 2100.00
  });
  if (accountError) console.error('  Error:', accountError.message);
  else console.log('  ✓ Sample account added');

  console.log('\n✓ Database seeded successfully!');
}

seed().catch(console.error);
