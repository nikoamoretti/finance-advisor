'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface StatusData {
  totalSavings: number;
  budgetRemaining: number;
  daysUntilPayday: number;
  lastBalanceUpdate?: string;
  lastTransactionImport?: string;
}

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showStaleWarning, setShowStaleWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkOnboardingAndFetchStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkOnboardingAndFetchStatus = async () => {
    try {
      // Check onboarding status
      const onboardingRes = await fetch('/api/onboarding/status');
      const onboarding = await onboardingRes.json();

      if (!onboarding.complete) {
        router.push('/onboarding');
        return;
      }

      // Check if balances are stale (>7 days old)
      if (onboarding.lastBalanceUpdate) {
        const lastUpdate = new Date(onboarding.lastBalanceUpdate);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 7) {
          setShowStaleWarning(true);
        }
      }

      // Fetch financial status
      const statusRes = await fetch('/api/status');
      const data = await statusRes.json();
      setStatus({
        totalSavings: data.totalSavings,
        budgetRemaining: data.currentMonth.budgetRemaining,
        daysUntilPayday: data.daysUntilPayday
      });
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error}`
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message
        }]);
        if (data.snapshot) {
          setStatus(data.snapshot);
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to get response. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const quickActions = [
    { label: 'How am I doing?', message: 'How am I doing this month?' },
    { label: 'Goal progress', message: 'Show me my goal progress' },
    { label: 'Can I afford...', message: 'Can I afford ' }
  ];

  if (checkingOnboarding) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Stale data warning */}
      {showStaleWarning && (
        <div className="bg-amber-900/50 border-b border-amber-800 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center justify-between text-sm">
            <span className="text-amber-200">
              ⏰ Your balances may be outdated
            </span>
            <button
              onClick={() => setShowUpdateModal(true)}
              className="text-amber-400 hover:text-amber-300 font-medium"
            >
              Update now
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-zinc-100">Financial Advisor</h1>
            <Link
              href="/settings"
              className="text-zinc-400 hover:text-zinc-300 text-sm"
            >
              Settings
            </Link>
          </div>
          {status && (
            <div className="flex gap-4 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">Savings:</span>
                <span className="text-emerald-400 font-medium">
                  ${status.totalSavings.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">Budget left:</span>
                <span className={status.budgetRemaining > 0 ? 'text-emerald-400' : 'text-red-400'}>
                  ${status.budgetRemaining.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">Payday:</span>
                <span className="text-zinc-300">{status.daysUntilPayday}d</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-lg">Ask me anything about your finances</p>
              <p className="text-zinc-600 text-sm mt-2">
                &quot;Can I buy...&quot;, &quot;How am I doing?&quot;, &quot;Should I pay off...&quot;
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  if (action.message.endsWith(' ')) {
                    setInput(action.message);
                  } else {
                    sendMessage(action.message);
                  }
                }}
                className="flex-shrink-0 px-4 py-2 rounded-full border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <footer className="flex-shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </footer>

      {/* Update Balances Modal */}
      {showUpdateModal && (
        <UpdateBalancesModal
          onClose={() => {
            setShowUpdateModal(false);
            setShowStaleWarning(false);
            checkOnboardingAndFetchStatus();
          }}
        />
      )}
    </div>
  );
}

function UpdateBalancesModal({ onClose }: { onClose: () => void }) {
  const [accounts, setAccounts] = useState<{ id: string; name: string; current_balance: number }[]>([]);
  const [debts, setDebts] = useState<{ id: string; name: string; current_balance: number | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, debtsRes] = await Promise.all([
        fetch('/api/onboarding/accounts'),
        fetch('/api/onboarding/debts')
      ]);
      const accountsData = await accountsRes.json();
      const debtsData = await debtsRes.json();
      setAccounts(accountsData);
      setDebts(debtsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch('/api/onboarding/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accounts: accounts.map(a => ({
              name: a.name,
              type: 'checking',
              balance: a.current_balance
            }))
          })
        }),
        fetch('/api/onboarding/debts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            debts: debts.map(d => ({
              id: d.id,
              currentBalance: d.current_balance
            }))
          })
        })
      ]);
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold">Update Balances</h2>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-400">Loading...</div>
          ) : (
            <>
              {accounts.map((account, i) => (
                <div key={account.id} className="flex items-center gap-3">
                  <span className="flex-1 text-zinc-300">{account.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500">$</span>
                    <input
                      type="number"
                      value={account.current_balance || ''}
                      onChange={(e) => {
                        const updated = [...accounts];
                        updated[i].current_balance = parseFloat(e.target.value) || 0;
                        setAccounts(updated);
                      }}
                      className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-right focus:outline-none"
                    />
                  </div>
                </div>
              ))}

              {debts.length > 0 && (
                <div className="border-t border-zinc-800 pt-4 mt-4">
                  <div className="text-zinc-500 text-sm mb-3">Debts</div>
                  {debts.map((debt, i) => (
                    <div key={debt.id} className="flex items-center gap-3 mb-3">
                      <span className="flex-1 text-zinc-300">{debt.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500">$</span>
                        <input
                          type="number"
                          value={debt.current_balance ?? ''}
                          onChange={(e) => {
                            const updated = [...debts];
                            updated[i].current_balance = parseFloat(e.target.value) || null;
                            setDebts(updated);
                          }}
                          className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-right focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-full border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 py-2 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
