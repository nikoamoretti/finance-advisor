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

interface DashboardProps {
  debts: Debt[];
  goals: Goal[];
  totalSavings: number;
  budgetRemaining: number;
  totalBudget: number;
  daysUntilPayday: number;
}

export default function Dashboard({
  debts,
  goals,
  totalSavings,
  budgetRemaining,
  totalBudget,
  daysUntilPayday
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

  return (
    <div className="space-y-6">
      {/* Capital One Countdown - Only show if exists */}
      {promoDebt && promoDebt.balance && (
        <div className={`rounded-xl p-4 ${promoOnTrack ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-amber-900/30 border border-amber-800'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-400">
              {promoDebt.name} Countdown
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full ${promoOnTrack ? 'bg-emerald-800 text-emerald-200' : 'bg-amber-800 text-amber-200'}`}>
              {promoOnTrack ? 'On Track' : 'Needs Attention'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-2xl font-bold text-zinc-100">
                {promoMonthsLeft}
              </div>
              <div className="text-xs text-zinc-500">months left at 0%</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-100">
                ${promoDebt.balance.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-500">remaining balance</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Current payment</span>
              <span className="text-zinc-200">${promoDebt.monthlyPayment}/mo</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Needed to pay off</span>
              <span className={promoOnTrack ? 'text-emerald-400' : 'text-amber-400'}>
                ${promoMonthlyNeeded.toLocaleString()}/mo
              </span>
            </div>
          </div>

          {!promoOnTrack && (
            <div className="mt-3 text-xs text-amber-300 bg-amber-900/50 rounded-lg p-2">
              Increase payment by ${(promoMonthlyNeeded - promoDebt.monthlyPayment).toLocaleString()}/mo to pay off before {promoDebt.postPromoRate}% APR kicks in
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Savings</div>
          <div className="text-xl font-bold text-emerald-400">
            ${totalSavings.toLocaleString()}
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Next Payday</div>
          <div className="text-xl font-bold text-zinc-200">
            {daysUntilPayday} days
          </div>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-400">
            Monthly Budget
          </h3>
          <span className={`text-sm font-medium ${budgetRemaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${budgetRemaining.toLocaleString()} left
          </span>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${budgetPercentUsed > 100 ? 'bg-red-500' : budgetPercentUsed > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, budgetPercentUsed)}%` }}
          />
        </div>
        <div className="text-xs text-zinc-500 mt-2">
          {Math.round(budgetPercentUsed)}% of ${totalBudget.toLocaleString()} used
        </div>
      </div>

      {/* Goals Progress */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-4">
          Goals
        </h3>
        <div className="space-y-4">
          {goals.map((goal, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-300">{goal.name}</span>
                <span className="text-zinc-500">
                  ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${Math.min(100, goal.percentComplete)}%` }}
                />
              </div>
              <div className="text-xs text-zinc-600 mt-1">
                {goal.percentComplete}% complete
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debts Overview */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-4">
          Debts
        </h3>
        <div className="space-y-3">
          {debts.map((debt, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-300">{debt.name}</div>
                <div className="text-xs text-zinc-500">
                  ${debt.monthlyPayment}/mo
                  {debt.interestRate ? ` · ${debt.interestRate}%` : ''}
                  {debt.promoEndDate && ' · 0% promo'}
                </div>
              </div>
              <div className="text-sm font-medium text-red-400">
                {debt.balance ? `$${debt.balance.toLocaleString()}` : '—'}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-800 mt-4 pt-3 flex justify-between">
          <span className="text-sm text-zinc-400">Total Monthly</span>
          <span className="text-sm font-medium text-zinc-200">
            ${debts.reduce((sum, d) => sum + d.monthlyPayment, 0).toLocaleString()}/mo
          </span>
        </div>
      </div>
    </div>
  );
}
