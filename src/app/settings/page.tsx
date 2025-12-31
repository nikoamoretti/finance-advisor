'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Account {
  id: string;
  name: string;
  type: string;
  current_balance: number;
}

interface Debt {
  id: string;
  name: string;
  type: string;
  current_balance: number | null;
  interest_rate: number | null;
  monthly_payment: number;
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  priority: number;
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number } | null>(null);
  const [lastImport, setLastImport] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, debtsRes, goalsRes, statusRes] = await Promise.all([
        fetch('/api/onboarding/accounts'),
        fetch('/api/onboarding/debts'),
        fetch('/api/onboarding/goals'),
        fetch('/api/onboarding/status')
      ]);

      const [accountsData, debtsData, goalsData, statusData] = await Promise.all([
        accountsRes.json(),
        debtsRes.json(),
        goalsRes.json(),
        statusRes.json()
      ]);

      setAccounts(accountsData);
      setDebts(debtsData);
      setGoals(goalsData);
      setLastImport(statusData.lastTransactionImport);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

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
        setLastImport(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Failed to import transactions');
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold">Settings</h1>
          <Link href="/" className="text-zinc-400 hover:text-zinc-300 text-sm">
            ← Back
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Accounts */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Accounts
          </h2>
          <div className="bg-zinc-900 rounded-xl divide-y divide-zinc-800">
            {accounts.map(account => (
              <div key={account.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-zinc-500">{account.type}</div>
                </div>
                <div className="text-emerald-400 font-medium">
                  ${Number(account.current_balance).toLocaleString()}
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="px-4 py-6 text-center text-zinc-500">
                No accounts configured
              </div>
            )}
          </div>
        </section>

        {/* Debts */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Debts
          </h2>
          <div className="bg-zinc-900 rounded-xl divide-y divide-zinc-800">
            {debts.map(debt => (
              <div key={debt.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">{debt.name}</div>
                  <div className="text-sm text-zinc-500">
                    ${debt.monthly_payment}/mo
                    {debt.interest_rate && ` · ${debt.interest_rate}%`}
                  </div>
                </div>
                <div className="text-red-400 font-medium">
                  {debt.current_balance !== null
                    ? `$${Number(debt.current_balance).toLocaleString()}`
                    : '—'
                  }
                </div>
              </div>
            ))}
            {debts.length === 0 && (
              <div className="px-4 py-6 text-center text-zinc-500">
                No debts configured
              </div>
            )}
          </div>
        </section>

        {/* Goals */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Goals
          </h2>
          <div className="bg-zinc-900 rounded-xl divide-y divide-zinc-800">
            {goals.map(goal => {
              const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
              return (
                <div key={goal.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{goal.name}</div>
                    <div className="text-sm">
                      <span className="text-emerald-400">
                        ${Number(goal.current_amount).toLocaleString()}
                      </span>
                      <span className="text-zinc-500">
                        {' / $'}{Number(goal.target_amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && (
              <div className="px-4 py-6 text-center text-zinc-500">
                No goals configured
              </div>
            )}
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Data
          </h2>
          <div className="bg-zinc-900 rounded-xl divide-y divide-zinc-800">
            <label className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-800/50">
              <div>
                <div className="font-medium">Import transactions from Copilot</div>
                <div className="text-sm text-zinc-500">
                  Last import: {formatDate(lastImport)}
                </div>
              </div>
              <div className="text-blue-400">
                {importing ? 'Importing...' : 'Upload CSV'}
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={importing}
              />
            </label>

            {importResult && (
              <div className="px-4 py-3 bg-emerald-900/20">
                <div className="text-emerald-400">
                  ✓ {importResult.imported} transactions imported
                </div>
                {importResult.duplicates > 0 && (
                  <div className="text-sm text-zinc-500">
                    {importResult.duplicates} duplicates skipped
                  </div>
                )}
              </div>
            )}

            <Link
              href="/onboarding"
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50"
            >
              <div className="font-medium">Run setup wizard again</div>
              <span className="text-zinc-500">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
