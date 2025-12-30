import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Type definitions for our database tables
export interface UserConfig {
  id: string;
  name: string;
  net_monthly_income: number;
  pay_schedule: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
  institution: string;
  current_balance: number;
  last_updated: string;
}

export interface Debt {
  id: string;
  name: string;
  type: 'irs' | 'car_loan' | 'personal_loan' | 'credit_card';
  original_amount: number | null;
  current_balance: number | null;
  interest_rate: number | null;
  monthly_payment: number;
  payment_day: number | null;
  notes: string | null;
  last_updated: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  monthly_budget: number;
  is_fixed: boolean;
  is_excluded: boolean;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  priority: number;
  target_date: string | null;
  notes: string | null;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  is_excluded: boolean;
  created_at: string;
}

export interface MonthlySummary {
  id: string;
  month: string;
  total_income: number | null;
  total_spent: number | null;
  total_saved: number | null;
  by_category: Record<string, number> | null;
}

export interface Rule {
  id: string;
  name: string;
  condition: string;
  action: string;
  is_active: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
