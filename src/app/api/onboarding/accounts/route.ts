import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .order('name');

    if (error) throw error;

    return NextResponse.json(accounts || []);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accounts } = await request.json();

    if (!Array.isArray(accounts)) {
      return NextResponse.json(
        { error: 'Accounts must be an array' },
        { status: 400 }
      );
    }

    // Delete existing accounts and insert new ones
    await supabase.from('accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const accountsToInsert = accounts.map((a: { name: string; type: string; balance: number; institution?: string }) => ({
      name: a.name,
      type: a.type,
      institution: a.institution || 'Not specified',
      current_balance: a.balance,
      last_updated: new Date().toISOString()
    }));

    const { error } = await supabase.from('accounts').insert(accountsToInsert);

    if (error) throw error;

    // Update last balance update timestamp
    await supabase
      .from('user_config')
      .update({ last_balance_update: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return NextResponse.json({ success: true, count: accounts.length });
  } catch (error) {
    console.error('Error saving accounts:', error);
    return NextResponse.json(
      { error: 'Failed to save accounts' },
      { status: 500 }
    );
  }
}
