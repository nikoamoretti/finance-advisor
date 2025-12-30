import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { getFinancialSnapshot, buildSystemPrompt } from '@/lib/financial-context';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get current financial snapshot
    const snapshot = await getFinancialSnapshot();
    const systemPrompt = buildSystemPrompt(snapshot);

    // Get recent chat history for context (last 20 messages)
    const { data: chatHistory } = await supabase
      .from('chat_history')
      .select('role, content')
      .order('created_at', { ascending: true })
      .limit(20);

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...(chatHistory || []).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Save both messages to chat history
    await supabase.from('chat_history').insert([
      { role: 'user', content: message },
      { role: 'assistant', content: assistantMessage }
    ]);

    return NextResponse.json({
      message: assistantMessage,
      snapshot: {
        totalSavings: snapshot.totalSavings,
        budgetRemaining: snapshot.currentMonth.budgetRemaining,
        daysUntilPayday: snapshot.daysUntilPayday
      }
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
