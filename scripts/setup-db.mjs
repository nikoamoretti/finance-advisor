import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  // User profile and config
  `CREATE TABLE IF NOT EXISTS user_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    net_monthly_income DECIMAL(10,2) NOT NULL,
    pay_schedule TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // Bank accounts and balances
  `CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    institution TEXT NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW()
  )`,

  // Debts
  `CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    original_amount DECIMAL(10,2),
    current_balance DECIMAL(10,2),
    interest_rate DECIMAL(5,2),
    monthly_payment DECIMAL(10,2) NOT NULL,
    payment_day INTEGER,
    notes TEXT,
    last_updated TIMESTAMP DEFAULT NOW()
  )`,

  // Budget categories
  `CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    monthly_budget DECIMAL(10,2) NOT NULL,
    is_fixed BOOLEAN DEFAULT FALSE,
    is_excluded BOOLEAN DEFAULT FALSE
  )`,

  // Financial goals
  `CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0,
    priority INTEGER NOT NULL,
    target_date DATE,
    notes TEXT
  )`,

  // Transaction history
  `CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    is_excluded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // Monthly summaries
  `CREATE TABLE IF NOT EXISTS monthly_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month DATE NOT NULL,
    total_income DECIMAL(10,2),
    total_spent DECIMAL(10,2),
    total_saved DECIMAL(10,2),
    by_category JSONB
  )`,

  // Decision rules
  `CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    condition TEXT NOT NULL,
    action TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
  )`,

  // Chat history
  `CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`
];

async function setupDatabase() {
  console.log('Setting up database tables...\n');

  for (const sql of tables) {
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
    console.log(`Creating table: ${tableName}...`);

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // Try direct query if RPC doesn't exist
      const { error: directError } = await supabase.from('_migrations').select().limit(0);
      if (directError) {
        console.log(`  Note: Cannot run DDL via client. Please run SQL in Supabase dashboard.`);
        console.log(`  SQL: ${sql.substring(0, 50)}...`);
      }
    } else {
      console.log(`  ✓ ${tableName} created`);
    }
  }

  console.log('\nDatabase setup complete!');
}

setupDatabase().catch(console.error);
