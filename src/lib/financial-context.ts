import { supabase } from './supabase';

// Discretionary budget categories (semi-monthly amounts based on financial plan)
export const DISCRETIONARY_CATEGORIES: Record<string, { monthly: number; semiMonthly: number }> = {
  'Groceries': { monthly: 350, semiMonthly: 175 },
  'Delivery': { monthly: 200, semiMonthly: 100 },
  'Transportation': { monthly: 375, semiMonthly: 187.50 },
  'Restaurants': { monthly: 300, semiMonthly: 150 },
  'Entertainment': { monthly: 150, semiMonthly: 75 },
  'Bars & Nightlife': { monthly: 150, semiMonthly: 75 },
  'Shops': { monthly: 150, semiMonthly: 75 },
  'Other': { monthly: 100, semiMonthly: 50 },
  'Healthcare': { monthly: 200, semiMonthly: 100 },
  'Pets': { monthly: 275, semiMonthly: 137.50 },
};

export const TOTAL_DISCRETIONARY_SEMI_MONTHLY = Object.values(DISCRETIONARY_CATEGORIES)
  .reduce((sum, cat) => sum + cat.semiMonthly, 0); // $1,125

export interface CategorySpending {
  category: string;
  spent: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  isOver: boolean;
}

export interface PayPeriodInfo {
  startDate: Date;
  endDate: Date;
  dayInPeriod: number;
  totalDays: number;
  daysRemaining: number;
}

export interface FinancialSnapshot {
  user: {
    name: string;
    netMonthlyIncome: number;
    paySchedule: string;
  };
  accounts: {
    name: string;
    type: string;
    balance: number;
  }[];
  totalSavings: number;
  totalCash: number; // Checking + Savings (spendable)
  totalInvestments: number;
  totalCreditCardDebt: number;
  debts: {
    name: string;
    type: string;
    balance: number | null;
    interestRate: number | null;
    monthlyPayment: number;
    notes: string | null;
    promoEndDate: string | null;
    promoRate: number | null;
    postPromoRate: number | null;
  }[];
  totalDebtPayments: number;
  budget: {
    fixed: { name: string; amount: number }[];
    variable: { name: string; amount: number }[];
    totalFixed: number;
    totalVariable: number;
    totalBudget: number;
  };
  goals: {
    name: string;
    target: number;
    current: number;
    priority: number;
    percentComplete: number;
  }[];
  rules: {
    name: string;
    condition: string;
    action: string;
  }[];
  currentMonth: {
    spending: Record<string, number>;
    totalSpent: number;
    budgetRemaining: number;
    daysInMonth: number;
    dayOfMonth: number;
    daysRemaining: number;
  };
  daysUntilPayday: number;
  targetMonthlySavings: number;
  // Daily spending limit - THE CORE FEATURE (now properly calculated)
  dailySpendingLimit: number;
  canSpendToday: boolean;
  spendingStatus: 'safe' | 'caution' | 'stop';
  // New: detailed pay period spending info
  payPeriod: PayPeriodInfo;
  discretionarySpending: {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    byCategory: CategorySpending[];
  };
}

function getDaysUntilPayday(): number {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();

  // Pay days are 15th and last day of month
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  if (day < 15) {
    return 15 - day;
  } else if (day < lastDayOfMonth) {
    return lastDayOfMonth - day;
  } else {
    // It's payday or we calculate to next month's 15th
    return 15;
  }
}

// Get current pay period info (1st-15th or 16th-last)
function getPayPeriodInfo(): PayPeriodInfo {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  let startDate: Date;
  let endDate: Date;

  if (day <= 15) {
    // First half: 1st - 15th
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month, 15);
  } else {
    // Second half: 16th - last day
    startDate = new Date(year, month, 16);
    endDate = new Date(year, month, lastDayOfMonth);
  }

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dayInPeriod = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysRemaining = totalDays - dayInPeriod + 1; // Include today

  return {
    startDate,
    endDate,
    dayInPeriod,
    totalDays,
    daysRemaining: Math.max(1, daysRemaining)
  };
}

// Format date as YYYY-MM-DD for database queries
function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function getFinancialSnapshot(): Promise<FinancialSnapshot> {
  // Get pay period info first (needed for transaction query)
  const payPeriod = getPayPeriodInfo();
  const payPeriodStart = formatDateForDB(payPeriod.startDate);
  const payPeriodEnd = formatDateForDB(payPeriod.endDate);

  // Fetch all data in parallel
  const [
    { data: userConfig },
    { data: accounts },
    { data: debts },
    { data: budgetCategories },
    { data: goals },
    { data: rules },
    { data: monthTransactions },
    { data: payPeriodTransactions }
  ] = await Promise.all([
    supabase.from('user_config').select('*').single(),
    supabase.from('accounts').select('*'),
    supabase.from('debts').select('*'),
    supabase.from('budget_categories').select('*'),
    supabase.from('goals').select('*').order('priority'),
    supabase.from('rules').select('*').eq('is_active', true),
    // Full month transactions (for backward compatibility)
    supabase.from('transactions').select('*').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
    // Pay period transactions (for daily spending limit)
    supabase.from('transactions').select('*').gte('date', payPeriodStart).lte('date', payPeriodEnd)
  ]);

  // Calculate totals
  const totalCash = (accounts || [])
    .filter(a => a.type === 'checking' || a.type === 'savings')
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  const totalInvestments = (accounts || [])
    .filter(a => a.type === 'investment')
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  const totalSavings = totalCash; // For backwards compatibility

  const totalCreditCardDebt = (debts || [])
    .filter(d => d.type === 'credit_card')
    .reduce((sum, d) => sum + Number(d.current_balance || 0), 0);

  const totalDebtPayments = (debts || [])
    .reduce((sum, d) => sum + Number(d.monthly_payment), 0);

  // Organize budget
  const fixedBudget = (budgetCategories || [])
    .filter(c => c.is_fixed && !c.is_excluded)
    .map(c => ({ name: c.name, amount: Number(c.monthly_budget) }));

  const variableBudget = (budgetCategories || [])
    .filter(c => !c.is_fixed && !c.is_excluded)
    .map(c => ({ name: c.name, amount: Number(c.monthly_budget) }));

  const totalFixed = fixedBudget.reduce((sum, c) => sum + c.amount, 0);
  const totalVariable = variableBudget.reduce((sum, c) => sum + c.amount, 0);
  const totalBudget = totalFixed + totalVariable;

  // Calculate current month spending by category (for backward compatibility)
  const spending: Record<string, number> = {};
  (monthTransactions || [])
    .filter(t => !t.is_excluded && Number(t.amount) < 0)
    .forEach(t => {
      const category = t.category;
      spending[category] = (spending[category] || 0) + Math.abs(Number(t.amount));
    });

  const totalSpent = Object.values(spending).reduce((sum, v) => sum + v, 0);

  // Date calculations
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  // Target savings
  const targetMonthlySavings = (userConfig?.net_monthly_income || 0) - totalBudget;

  // ============================================
  // DAILY SPENDING LIMIT - THE CORE FEATURE
  // Now based on DISCRETIONARY categories only
  // and calculated per PAY PERIOD (not month)
  // ============================================

  // Calculate spending by discretionary category for THIS PAY PERIOD
  const payPeriodSpending: Record<string, number> = {};
  (payPeriodTransactions || [])
    .filter(t => !t.is_excluded && Number(t.amount) > 0) // Positive = expense in Copilot
    .forEach(t => {
      const category = t.category || 'Other';
      payPeriodSpending[category] = (payPeriodSpending[category] || 0) + Math.abs(Number(t.amount));
    });

  // Also handle negative amounts (some systems use negative for expenses)
  (payPeriodTransactions || [])
    .filter(t => !t.is_excluded && Number(t.amount) < 0 && t.type !== 'income' && t.type !== 'internal transfer')
    .forEach(t => {
      const category = t.category || 'Other';
      payPeriodSpending[category] = (payPeriodSpending[category] || 0) + Math.abs(Number(t.amount));
    });

  // Build category spending breakdown for discretionary categories
  const categorySpending: CategorySpending[] = Object.entries(DISCRETIONARY_CATEGORIES).map(([category, budget]) => {
    const spent = payPeriodSpending[category] || 0;
    const remaining = budget.semiMonthly - spent;
    return {
      category,
      spent,
      budget: budget.semiMonthly,
      remaining,
      percentUsed: budget.semiMonthly > 0 ? Math.round((spent / budget.semiMonthly) * 100) : 0,
      isOver: spent > budget.semiMonthly
    };
  });

  // Calculate total discretionary spending this pay period
  const totalDiscretionarySpent = categorySpending.reduce((sum, c) => sum + c.spent, 0);
  const totalDiscretionaryRemaining = TOTAL_DISCRETIONARY_SEMI_MONTHLY - totalDiscretionarySpent;

  // Calculate REAL daily spending limit
  const dailySpendingLimit = Math.max(0, Math.round(totalDiscretionaryRemaining / payPeriod.daysRemaining));

  // Determine spending status based on daily limit and problem categories
  const deliveryCategory = categorySpending.find(c => c.category === 'Delivery');
  const hasDeliveryProblem = deliveryCategory && deliveryCategory.isOver;

  let spendingStatus: 'safe' | 'caution' | 'stop' = 'safe';
  if (dailySpendingLimit < 10 || totalDiscretionaryRemaining < 0) {
    spendingStatus = 'stop';
  } else if (dailySpendingLimit < 30 || hasDeliveryProblem) {
    spendingStatus = 'caution';
  }

  const canSpendToday = spendingStatus !== 'stop' && dailySpendingLimit > 0;

  return {
    user: {
      name: userConfig?.name || 'User',
      netMonthlyIncome: Number(userConfig?.net_monthly_income || 0),
      paySchedule: userConfig?.pay_schedule || 'unknown'
    },
    accounts: (accounts || []).map(a => ({
      name: a.name,
      type: a.type,
      balance: Number(a.current_balance)
    })),
    totalSavings,
    totalCash,
    totalInvestments,
    totalCreditCardDebt,
    debts: (debts || []).map(d => ({
      name: d.name,
      type: d.type,
      balance: d.current_balance ? Number(d.current_balance) : null,
      interestRate: d.interest_rate ? Number(d.interest_rate) : null,
      monthlyPayment: Number(d.monthly_payment),
      notes: d.notes,
      promoEndDate: d.promo_end_date,
      promoRate: d.promo_rate ? Number(d.promo_rate) : null,
      postPromoRate: d.post_promo_rate ? Number(d.post_promo_rate) : null
    })),
    totalDebtPayments,
    budget: {
      fixed: fixedBudget,
      variable: variableBudget,
      totalFixed,
      totalVariable,
      totalBudget
    },
    goals: (goals || []).map(g => ({
      name: g.name,
      target: Number(g.target_amount),
      current: Number(g.current_amount),
      priority: g.priority,
      percentComplete: Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)
    })),
    rules: (rules || []).map(r => ({
      name: r.name,
      condition: r.condition,
      action: r.action
    })),
    currentMonth: {
      spending,
      totalSpent,
      budgetRemaining: totalBudget - totalSpent,
      daysInMonth,
      dayOfMonth,
      daysRemaining
    },
    daysUntilPayday: getDaysUntilPayday(),
    targetMonthlySavings,
    // Daily spending limit - THE CORE FEATURE
    dailySpendingLimit,
    canSpendToday,
    spendingStatus,
    // New: detailed pay period info
    payPeriod,
    discretionarySpending: {
      totalBudget: TOTAL_DISCRETIONARY_SEMI_MONTHLY,
      totalSpent: totalDiscretionarySpent,
      remaining: totalDiscretionaryRemaining,
      byCategory: categorySpending
    }
  };
}

export function buildSystemPrompt(snapshot: FinancialSnapshot): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const statusEmoji = snapshot.spendingStatus === 'safe' ? '🟢' : snapshot.spendingStatus === 'caution' ? '🟡' : '🔴';

  return `You are ${snapshot.user.name}'s personal financial advisor. Your PRIMARY job is to tell him how much he can spend TODAY and whether he should save or spend.

## TODAY'S SPENDING STATUS ${statusEmoji}
**Daily spending limit: $${snapshot.dailySpendingLimit}**
Status: ${snapshot.spendingStatus.toUpperCase()} ${snapshot.canSpendToday ? '- Can spend up to daily limit' : '- STOP discretionary spending'}

## Current Date
${today}

## ${snapshot.user.name}'s Financial Profile

**Income:** $${snapshot.user.netMonthlyIncome.toLocaleString()}/month net ($${(snapshot.user.netMonthlyIncome / 2).toLocaleString()} per paycheck on 15th and last day of month)
**Days until next payday:** ${snapshot.daysUntilPayday}

**Cash Available:** $${snapshot.totalCash.toLocaleString()}
${snapshot.accounts.filter(a => a.type === 'checking' || a.type === 'savings').map(a => `- ${a.name}: $${a.balance.toLocaleString()}`).join('\n')}

**Investments:** $${snapshot.totalInvestments.toLocaleString()}
${snapshot.accounts.filter(a => a.type === 'investment').map(a => `- ${a.name}: $${a.balance.toLocaleString()}`).join('\n')}

**Credit Card Debt:** $${snapshot.totalCreditCardDebt.toLocaleString()}

**Monthly Budget:** $${snapshot.budget.totalBudget.toLocaleString()} total
- Fixed costs: $${snapshot.budget.totalFixed.toLocaleString()} (${snapshot.budget.fixed.map(f => `${f.name} $${f.amount.toLocaleString()}`).join(', ')})
- Variable: $${snapshot.budget.totalVariable.toLocaleString()} (${snapshot.budget.variable.map(v => `${v.name} $${v.amount}`).join(', ')})

**Target Savings:** $${snapshot.targetMonthlySavings.toLocaleString()}/month

**Debts:**
${snapshot.debts.map(d => {
  let debtLine = `- ${d.name}: ${d.balance ? `$${d.balance.toLocaleString()} remaining` : 'balance unknown'}`;
  if (d.promoEndDate) {
    const promoEnd = new Date(d.promoEndDate);
    const today = new Date();
    const monthsLeft = Math.ceil((promoEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));
    debtLine += ` at ${d.promoRate || 0}% (PROMO ends ${promoEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${monthsLeft} months left, then ${d.postPromoRate}%)`;
  } else if (d.interestRate) {
    debtLine += ` at ${d.interestRate}%`;
  }
  debtLine += `, paying $${d.monthlyPayment}/month`;
  if (d.notes) debtLine += `. ${d.notes}`;
  return debtLine;
}).join('\n')}

**Goals (in priority order):**
${snapshot.goals.map(g => `${g.priority}. ${g.name}: $${g.current.toLocaleString()}/$${g.target.toLocaleString()} (${g.percentComplete}%)`).join('\n')}

**This Month (Day ${snapshot.currentMonth.dayOfMonth}/${snapshot.currentMonth.daysInMonth}):**
- Total spent: $${snapshot.currentMonth.totalSpent.toLocaleString()}
- Budget remaining: $${snapshot.currentMonth.budgetRemaining.toLocaleString()}
${Object.entries(snapshot.currentMonth.spending).length > 0
  ? '- By category: ' + Object.entries(snapshot.currentMonth.spending).map(([cat, amt]) => `${cat}: $${amt}`).join(', ')
  : '- No transactions recorded this month yet'}

**Active Rules:**
${snapshot.rules.map(r => `- ${r.name}: if ${r.condition} then ${r.action}`).join('\n')}

## Your Role

1. **DAILY SPENDING ADVISOR (PRIMARY):** Always lead with how much Nico can spend today. The daily limit of $${snapshot.dailySpendingLimit} is based on variable budget remaining divided by days left in month.

2. **Purchase Decisions:** When asked "Can I buy X?":
   - If cost <= daily limit: "Yes, this fits within today's $${snapshot.dailySpendingLimit} limit"
   - If cost > daily limit but <= weekly (daily * 7): "This would use X days of budget. Can you wait?"
   - If cost is large: Calculate impact on goals and savings

3. **Save vs Spend Advice:** Be direct. "Save" or "Spend" with clear reasoning.

4. **Future Planning:** Help plan for upcoming expenses (like moving costs, free rent periods) by calculating how they affect cash flow.

5. **Debt Optimization:** Always consider interest rates and promo periods.

## Rules to Enforce

- If savings < $5,000: Block discretionary purchases over $100
- If emergency fund < $10,000: Strongly discourage non-essential large purchases
- If delivery spending MTD > $100: Warn about delivery habit
- If dining + bars MTD > $400: Flag food spending

## CRITICAL: Capital One Promo Alert
${snapshot.debts.filter(d => d.promoEndDate).map(d => {
  const promoEnd = new Date(d.promoEndDate!);
  const today = new Date();
  const monthsLeft = Math.ceil((promoEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const monthlyNeeded = d.balance ? Math.ceil(d.balance / monthsLeft) : 0;
  return `The ${d.name} has $${d.balance?.toLocaleString()} at 0% APR that MUST be paid off by ${promoEnd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} or it jumps to ${d.postPromoRate}% APR.
- ${monthsLeft} months remaining
- Need to pay ~$${monthlyNeeded.toLocaleString()}/month to pay off in time
- Current payment: $${d.monthlyPayment}/month
- ${d.monthlyPayment >= monthlyNeeded ? '✅ ON TRACK' : '⚠️ NEED TO INCREASE PAYMENTS'}`;
}).join('\n\n')}

## Response Style

- Be direct and concise
- Lead with the answer (yes/no), then explain
- Use specific numbers from his actual data
- Don't lecture - he knows his problems
- Celebrate progress when warranted
- Push back on bad decisions, but respect autonomy`;
}
