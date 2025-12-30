import { supabase } from './supabase';

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
  debts: {
    name: string;
    type: string;
    balance: number | null;
    interestRate: number | null;
    monthlyPayment: number;
    notes: string | null;
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

export async function getFinancialSnapshot(): Promise<FinancialSnapshot> {
  // Fetch all data in parallel
  const [
    { data: userConfig },
    { data: accounts },
    { data: debts },
    { data: budgetCategories },
    { data: goals },
    { data: rules },
    { data: transactions }
  ] = await Promise.all([
    supabase.from('user_config').select('*').single(),
    supabase.from('accounts').select('*'),
    supabase.from('debts').select('*'),
    supabase.from('budget_categories').select('*'),
    supabase.from('goals').select('*').order('priority'),
    supabase.from('rules').select('*').eq('is_active', true),
    supabase.from('transactions').select('*').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  ]);

  // Calculate totals
  const totalSavings = (accounts || [])
    .filter(a => a.type === 'checking' || a.type === 'savings')
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

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

  // Calculate current month spending by category
  const spending: Record<string, number> = {};
  (transactions || [])
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
    debts: (debts || []).map(d => ({
      name: d.name,
      type: d.type,
      balance: d.current_balance ? Number(d.current_balance) : null,
      interestRate: d.interest_rate ? Number(d.interest_rate) : null,
      monthlyPayment: Number(d.monthly_payment),
      notes: d.notes
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
    targetMonthlySavings
  };
}

export function buildSystemPrompt(snapshot: FinancialSnapshot): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `You are ${snapshot.user.name}'s personal financial advisor. You have complete knowledge of his financial situation and help him make smart money decisions.

## Current Date
${today}

## ${snapshot.user.name}'s Financial Profile

**Income:** $${snapshot.user.netMonthlyIncome.toLocaleString()}/month net ($${(snapshot.user.netMonthlyIncome / 2).toLocaleString()} per paycheck on 15th and last day of month)
**Days until next payday:** ${snapshot.daysUntilPayday}

**Current Cash:** $${snapshot.totalSavings.toLocaleString()}
${snapshot.accounts.map(a => `- ${a.name} (${a.type}): $${a.balance.toLocaleString()}`).join('\n')}

**Monthly Budget:** $${snapshot.budget.totalBudget.toLocaleString()} total
- Fixed costs: $${snapshot.budget.totalFixed.toLocaleString()} (${snapshot.budget.fixed.map(f => `${f.name} $${f.amount.toLocaleString()}`).join(', ')})
- Variable: $${snapshot.budget.totalVariable.toLocaleString()} (${snapshot.budget.variable.map(v => `${v.name} $${v.amount}`).join(', ')})

**Target Savings:** $${snapshot.targetMonthlySavings.toLocaleString()}/month

**Debts:**
${snapshot.debts.map(d => `- ${d.name}: ${d.balance ? `$${d.balance.toLocaleString()} remaining` : 'balance unknown'}${d.interestRate ? ` at ${d.interestRate}% interest` : ''}, paying $${d.monthlyPayment}/month${d.notes ? `. ${d.notes}` : ''}`).join('\n')}

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

1. **Purchase Decisions:** When asked "Can I buy X?", check current savings, goal progress, and budget status. Give a clear yes/no with reasoning.

2. **Budget Check-ins:** Report spending vs budget, flag problem categories, celebrate wins.

3. **Debt Optimization:** Run the math on payoff scenarios. Always consider interest rates.

4. **Goal Tracking:** Show progress toward goals, estimate completion dates.

5. **Trend Analysis:** Compare month-over-month spending, identify patterns.

## Rules to Enforce

- If savings < $5,000: Block discretionary purchases over $100
- If emergency fund < $10,000: Strongly discourage non-essential large purchases
- If delivery spending MTD > $100: Warn about delivery habit
- If dining + bars MTD > $400: Flag food spending

## Response Style

- Be direct and concise
- Lead with the answer (yes/no), then explain
- Use specific numbers from his actual data
- Don't lecture - he knows his problems
- Celebrate progress when warranted
- Push back on bad decisions, but respect autonomy`;
}
