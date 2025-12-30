'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface StatusData {
  totalSavings: number;
  budgetRemaining: number;
  daysUntilPayday: number;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus({
        totalSavings: data.totalSavings,
        budgetRemaining: data.currentMonth.budgetRemaining,
        daysUntilPayday: data.daysUntilPayday
      });
    } catch (error) {
      console.error('Failed to fetch status:', error);
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
    } catch (error) {
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

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold text-zinc-100">Financial Advisor</h1>
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
    </div>
  );
}
