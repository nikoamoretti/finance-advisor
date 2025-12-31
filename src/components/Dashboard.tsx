'use client';

interface Debt {
  name: string;
  type: string;
  balance: number | null;
  interestRate: number | null;
  monthlyPayment: number;
  promoEndDate: string | null;
  promoRate: number | null;
  postPromoRate: number | null;
}

interface Goal {
  name: string;
  target: number;
  current: number;
  priority: number;
  percentComplete: number;
}

interface CategorySpending {
  category: string;
  spent: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  isOver: boolean;
}

interface PayPeriodInfo {
  startDate: Date;
  endDate: Date;
  dayInPeriod: number;
  totalDays: number;
  daysRemaining: number;
}

interface DiscretionarySpending {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  byCategory: CategorySpending[];
}

interface DashboardProps {
  debts: Debt[];
  goals: Goal[];
  totalSavings: number;
  totalCash?: number;
  totalInvestments?: number;
  totalCreditCardDebt?: number;
  budgetRemaining: number;
  totalBudget: number;
  daysUntilPayday: number;
  dailySpendingLimit?: number;
  spendingStatus?: 'safe' | 'caution' | 'stop';
  payPeriod?: PayPeriodInfo;
  discretionarySpending?: DiscretionarySpending;
}

export default function Dashboard({
  debts,
  goals,
  totalSavings,
  totalCash,
  totalInvestments,
  totalCreditCardDebt,
  budgetRemaining,
  totalBudget,
  daysUntilPayday,
  dailySpendingLimit = 0,
  spendingStatus = 'safe',
  payPeriod,
  discretionarySpending
}: DashboardProps) {
  // Find Capital One or any promo debt
  const promoDebt = debts.find(d => d.promoEndDate);

  let promoMonthsLeft = 0;
  let promoMonthlyNeeded = 0;
  let promoOnTrack = false;

  if (promoDebt && promoDebt.promoEndDate && promoDebt.balance) {
    const promoEnd = new Date(promoDebt.promoEndDate);
    const today = new Date();
    promoMonthsLeft = Math.ceil((promoEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));
    promoMonthlyNeeded = Math.ceil(promoDebt.balance / promoMonthsLeft);
    promoOnTrack = promoDebt.monthlyPayment >= promoMonthlyNeeded;
  }

  const budgetPercentUsed = totalBudget > 0 ? ((totalBudget - budgetRemaining) / totalBudget) * 100 : 0;

  const statusColors = {
    safe: { bg: 'bg-emerald-900/50', border: 'border-emerald-700', text: 'text-emerald-400', label: 'SAFE TO SPEND' },
    caution: { bg: 'bg-amber-900/50', border: 'border-amber-700', text: 'text-amber-400', label: 'CAUTION' },
    stop: { bg: 'bg-red-900/50', border: 'border-red-700', text: 'text-red-400', label: 'STOP SPENDING' }
  };

  const colors = statusColors[spendingStatus];

  // Get problem categories (over budget)
  const problemCategories = discretionarySpending?.byCategory.filter(c => c.isOver) || [];
  const warningCategories = discretionarySpending?.byCategory.filter(c => c.percentUsed >= 80 && !c.isOver) || [];

  return (
    <div className="space-y-4">
      {/* DAILY SPENDING LIMIT - THE MAIN FEATURE */}
      <div className={`rounded-xl p-4 ${colors.bg} border ${colors.border}`}>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-zinc-400 mb-1">
            Today You Can Spend
          </div>
          <div className={`text-4xl font-bold ${colors.text}`}>
            ${dailySpendingLimit.toLocaleString()}
          </div>
          {payPeriod && discretionarySpending && (
            <div className="text-xs text-zinc-500 mt-2">
              ${discretionarySpending.remaining.toLocaleString()} left ÷ {payPeriod.daysRemaining} days
            </div>
          )}
          <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${colors.bg} ${colors.text}`}>
            {colors.label}
          </div>
        </div>
      </div>

      {/* Pay Period Progress */}
      {payPeriod && discretionarySpending && (
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Pay Period</span>
            <span className="text-xs text-zinc-400">
              Day {payPeriod.dayInPeriod} of {payPeriod.totalDays}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${(payPeriod.dayInPeriod / payPeriod.totalDays) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">
              Spent: <span className="text-zinc-200">${discretionarySpending.totalSpent.toLocaleString()}</span>
            </span>
            <span className="text-zinc-400">
              Budget: <span className="text-zinc-200">${discretionarySpending.totalBudget.toLocaleString()}</span>
            </span>
          </div>
        </div>
      )}

      {/* Problem Categories Alert */}
      {problemCategories.length > 0 && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-3">
          <div className="text-xs text-red-400 uppercase tracking-wider mb-2">⚠️ Over Budget</div>
          {problemCategories.map((cat, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-red-300">{cat.category}</span>
              <span className="text-red-400">
                ${cat.spent.toLocaleString()} / ${cat.budget.toLocaleString()} (+{cat.percentUsed - 100}%)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Warning Categories */}
      {warningCategories.length > 0 && (
        <div className="bg-amber-900/30 border border-amber-800 rounded-xl p-3">
          <div className="text-xs text-amber-400 uppercase tracking-wider mb-2">⚡ Almost at Limit</div>
          {warningCategories.map((cat, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-amber-300">{cat.category}</span>
              <span className="text-amber-400">
                ${cat.spent.toLocaleString()} / ${cat.budget.toLocaleString()} ({cat.percentUsed}%)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Money Overview */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-3">
          Money
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-zinc-400 text-sm">Cash Available</span>
            <span className="text-emerald-400 font-medium">${(totalCash || totalSavings).toLocaleString()}</span>
          </div>
          {totalInvestments !== undefined && totalInvestments > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-400 text-sm">Investments</span>
              <span className="text-blue-400 font-medium">${totalInvestments.toLocaleString()}</span>
            </div>
          )}
          {totalCreditCardDebt !== undefined && totalCreditCardDebt > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-400 text-sm">Credit Card Debt</span>
              <span className="text-red-400 font-medium">-${totalCreditCardDebt.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-zinc-800">
            <span className="text-zinc-300 text-sm">Net Worth</span>
            <span className="text-zinc-100 font-bold">
              ${((totalCash || totalSavings) + (totalInvestments || 0) - (totalCreditCardDebt || 0)).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 rounded-xl p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Budget Left</div>
          <div className={`text-lg font-bold ${budgetRemaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${budgetRemaining.toLocaleString()}
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Next Payday</div>
          <div className="text-lg font-bold text-zinc-200">
            {daysUntilPayday} days
          </div>
        </div>
      </div>

      {/* Capital One Countdown - Only show if exists */}
      {promoDebt && promoDebt.balance && (
        <div className={`rounded-xl p-4 ${promoOnTrack ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-amber-900/30 border border-amber-800'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-zinc-300">
              {promoDebt.name}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full ${promoOnTrack ? 'bg-emerald-800 text-emerald-200' : 'bg-amber-800 text-amber-200'}`}>
              {promoOnTrack ? 'On Track' : 'Needs Attention'}
            </span>
          </div>

          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">{promoMonthsLeft} months at 0%</span>
            <span className="text-zinc-200">${promoDebt.balance.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Need ${promoMonthlyNeeded}/mo</span>
            <span className="text-zinc-500">Paying ${promoDebt.monthlyPayment}/mo</span>
          </div>
        </div>
      )}

      {/* Goals Progress */}
      {goals.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-3">
            Goals
          </h3>
          <div className="space-y-3">
            {goals.map((goal, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-300">{goal.name}</span>
                  <span className="text-zinc-500 text-xs">
                    {goal.percentComplete}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${Math.min(100, goal.percentComplete)}%` }}
                  />
                </div>
                <div className="text-xs text-zinc-600 mt-1">
                  ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debts Overview */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-3">
          Debts
        </h3>
        <div className="space-y-2">
          {debts.map((debt, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="text-zinc-300 truncate mr-2">{debt.name}</div>
              <div className="text-red-400 font-medium whitespace-nowrap">
                {debt.balance ? `$${debt.balance.toLocaleString()}` : '—'}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-800 mt-3 pt-2 flex justify-between text-sm">
          <span className="text-zinc-400">Monthly Payments</span>
          <span className="text-zinc-200 font-medium">
            ${debts.reduce((sum, d) => sum + d.monthlyPayment, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
