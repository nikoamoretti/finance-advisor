import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: debts, error } = await supabase
      .from('debts')
      .select('*')
      .order('name');

    if (error) throw error;

    return NextResponse.json(debts || []);
  } catch (error) {
    console.error('Error fetching debts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { debts } = await request.json();

    if (!Array.isArray(debts)) {
      return NextResponse.json(
        { error: 'Debts must be an array' },
        { status: 400 }
      );
    }

    // Update each debt with the new balance and interest rate
    for (const debt of debts) {
      const updateData: Record<string, unknown> = {
        last_updated: new Date().toISOString()
      };

      if (debt.currentBalance !== undefined) {
        updateData.current_balance = debt.currentBalance;
      }
      if (debt.interestRate !== undefined) {
        updateData.interest_rate = debt.interestRate;
      }

      if (debt.id) {
        await supabase
          .from('debts')
          .update(updateData)
          .eq('id', debt.id);
      } else if (debt.name) {
        // New debt
        await supabase.from('debts').insert({
          name: debt.name,
          type: debt.type || 'other',
          current_balance: debt.currentBalance,
          interest_rate: debt.interestRate,
          monthly_payment: debt.monthlyPayment || 0,
          ...updateData
        });
      }
    }

    // Update last balance update timestamp
    await supabase
      .from('user_config')
      .update({ last_balance_update: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving debts:', error);
    return NextResponse.json(
      { error: 'Failed to save debts' },
      { status: 500 }
    );
  }
}
