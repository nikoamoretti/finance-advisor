'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Account {
  id?: string;
  name: string;
  type: string;
  balance: number;
}

interface Debt {
  id: string;
  name: string;
  type: string;
  monthly_payment: number;
  current_balance: number | null;
  interest_rate: number | null;
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  notes: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 1: Accounts
  const [accounts, setAccounts] = useState<Account[]>([
    { name: 'Checking', type: 'checking', balance: 0 },
    { name: 'Savings', type: 'savings', balance: 0 }
  ]);

  // Step 2: Debts
  const [debts, setDebts] = useState<Debt[]>([]);

  // Step 3: Goals
  const [goals, setGoals] = useState<Goal[]>([]);

  // Step 4: Import
  const [importResult, setImportResult] = useState<{
    imported: number;
    duplicates: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [debtsRes, goalsRes] = await Promise.all([
        fetch('/api/onboarding/debts'),
        fetch('/api/onboarding/goals')
      ]);

      const debtsData = await debtsRes.json();
      const goalsData = await goalsRes.json();

      if (Array.isArray(debtsData)) setDebts(debtsData);
      if (Array.isArray(goalsData)) setGoals(goalsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveStep = async () => {
    setSaving(true);
    try {
      if (step === 1) {
        await fetch('/api/onboarding/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accounts })
        });
      } else if (step === 2) {
        await fetch('/api/onboarding/debts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            debts: debts.map(d => ({
              id: d.id,
              currentBalance: d.current_balance,
              interestRate: d.interest_rate
            }))
          })
        });
      } else if (step === 3) {
        await fetch('/api/onboarding/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goals: goals.map(g => ({
              id: g.id,
              currentAmount: g.current_amount
            }))
          })
        });
      }
      setStep(step + 1);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/transactions/import', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setImportResult(data);
      }
    } catch (error) {
      console.error('Error importing:', error);
    } finally {
      setImporting(false);
    }
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setSaving(false);
    }
  };

  const addAccount = () => {
    setAccounts([...accounts, { name: '', type: 'checking', balance: 0 }]);
  };

  const updateAccount = (index: number, field: keyof Account, value: string | number) => {
    const updated = [...accounts];
    updated[index] = { ...updated[index], [field]: value };
    setAccounts(updated);
  };

  const removeAccount = (index: number) => {
    setAccounts(accounts.filter((_, i) => i !== index));
  };

  const updateDebt = (index: number, field: 'current_balance' | 'interest_rate', value: number | null) => {
    const updated = [...debts];
    updated[index] = { ...updated[index], [field]: value };
    setDebts(updated);
  };

  const updateGoal = (index: number, value: number) => {
    const updated = [...goals];
    updated[index] = { ...updated[index], current_amount: value };
    setGoals(updated);
  };

  const totalCash = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalDebt = debts.reduce((sum, d) => sum + (d.current_balance || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2">
            {step <= 4 ? "Let's set up your finances" : "You're all set!"}
          </h1>
          {step <= 4 && (
            <p className="text-zinc-500">Step {step} of 4</p>
          )}
        </div>

        {/* Progress bar */}
        {step <= 4 && (
          <div className="flex gap-2 mb-8">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-blue-500' : 'bg-zinc-800'}`}
              />
            ))}
          </div>
        )}

        {/* Step 1: Accounts */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Account Balances</h2>

            <div className="space-y-4">
              {accounts.map((account, i) => (
                <div key={i} className="bg-zinc-900 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      value={account.name}
                      onChange={(e) => updateAccount(i, 'name', e.target.value)}
                      placeholder="Account name"
                      className="bg-transparent text-zinc-100 font-medium focus:outline-none"
                    />
                    {accounts.length > 1 && (
                      <button
                        onClick={() => removeAccount(i)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">$</span>
                    <input
                      type="number"
                      value={account.balance || ''}
                      onChange={(e) => updateAccount(i, 'balance', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-right focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                  <select
                    value={account.type}
                    onChange={(e) => updateAccount(i, 'type', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-400 focus:outline-none"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="investment">Investment</option>
                  </select>
                </div>
              ))}
            </div>

            <button
              onClick={addAccount}
              className="text-blue-400 hover:text-blue-300"
            >
              + Add another account
            </button>
          </div>
        )}

        {/* Step 2: Debts */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">Debt Balances</h2>
              <p className="text-zinc-500 text-sm mt-1">
                What&apos;s the current balance on each?
              </p>
            </div>

            <div className="space-y-4">
              {debts.map((debt, i) => (
                <div key={debt.id} className="bg-zinc-900 rounded-xl p-4 space-y-3">
                  <div>
                    <div className="font-medium">{debt.name}</div>
                    <div className="text-zinc-500 text-sm">
                      Monthly payment: ${debt.monthly_payment}
                      {debt.interest_rate && ` | ${debt.interest_rate}% interest`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">$</span>
                    <input
                      type="number"
                      value={debt.current_balance ?? ''}
                      onChange={(e) => updateDebt(i, 'current_balance', parseFloat(e.target.value) || null)}
                      placeholder="Current balance"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-right focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                  {!debt.interest_rate && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={debt.interest_rate ?? ''}
                        onChange={(e) => updateDebt(i, 'interest_rate', parseFloat(e.target.value) || null)}
                        placeholder="Interest rate %"
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-600"
                      />
                      <span className="text-zinc-500">%</span>
                    </div>
                  )}
                </div>
              ))}

              {debts.length === 0 && (
                <div className="text-zinc-500 text-center py-8">
                  No debts configured yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Goals */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">Savings Goals</h2>
              <p className="text-zinc-500 text-sm mt-1">
                How much progress have you made?
              </p>
            </div>

            <div className="space-y-4">
              {goals.map((goal, i) => (
                <div key={goal.id} className="bg-zinc-900 rounded-xl p-4 space-y-3">
                  <div>
                    <div className="font-medium">{goal.name}</div>
                    <div className="text-zinc-500 text-sm">
                      Target: ${goal.target_amount.toLocaleString()}
                      {goal.notes && ` · ${goal.notes}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">$</span>
                    <input
                      type="number"
                      value={goal.current_amount || ''}
                      onChange={(e) => updateGoal(i, parseFloat(e.target.value) || 0)}
                      placeholder="Current progress"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-right focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, (goal.current_amount / goal.target_amount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              {goals.length === 0 && (
                <div className="text-zinc-500 text-center py-8">
                  No goals configured yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Import */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">Import Transactions</h2>
              <p className="text-zinc-500 text-sm mt-1">
                Upload your transaction history from Copilot (optional)
              </p>
            </div>

            <div className="bg-zinc-900 rounded-xl p-6">
              {!importResult ? (
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-zinc-600 transition-colors">
                    {importing ? (
                      <div className="text-zinc-400">Importing...</div>
                    ) : (
                      <>
                        <div className="text-3xl mb-2">📄</div>
                        <div className="text-zinc-300">Drop CSV here or click to upload</div>
                        <div className="text-zinc-500 text-sm mt-2">
                          Copilot → Transactions → Export
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={importing}
                  />
                </label>
              ) : (
                <div className="text-center">
                  <div className="text-3xl mb-2">✓</div>
                  <div className="text-emerald-400 font-medium">
                    {importResult.imported} transactions imported
                  </div>
                  {importResult.duplicates > 0 && (
                    <div className="text-zinc-500 text-sm mt-1">
                      {importResult.duplicates} duplicates skipped
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 5 && (
          <div className="space-y-6 text-center">
            <div className="text-4xl">✓</div>

            <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Cash</span>
                <span className="text-emerald-400 font-medium">
                  ${totalCash.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Debt</span>
                <span className="text-red-400 font-medium">
                  ${totalDebt.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-zinc-800 pt-4">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Net Worth</span>
                  <span className={totalCash - totalDebt >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    ${(totalCash - totalDebt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && step <= 4 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-full border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              ← Back
            </button>
          )}

          {step < 4 && (
            <button
              onClick={saveStep}
              disabled={saving}
              className="flex-1 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Next →'}
            </button>
          )}

          {step === 4 && (
            <>
              <button
                onClick={() => setStep(5)}
                className="flex-1 py-3 rounded-full border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={() => {
                  saveStep();
                  setStep(5);
                }}
                disabled={saving}
                className="flex-1 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {importing ? 'Importing...' : 'Finish Setup →'}
              </button>
            </>
          )}

          {step === 5 && (
            <button
              onClick={completeOnboarding}
              disabled={saving}
              className="flex-1 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Loading...' : 'Go to Dashboard →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
