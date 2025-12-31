import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: userConfig } = await supabase
      .from('user_config')
      .select('onboarding_complete, last_balance_update, last_transaction_import')
      .single();

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, current_balance');

    const { data: debts } = await supabase
      .from('debts')
      .select('id, current_balance');

    const { data: goals } = await supabase
      .from('goals')
      .select('id, current_amount');

    // Determine what data is missing
    const missingData: string[] = [];

    const hasAccountBalances = accounts && accounts.length > 0 &&
      accounts.some(a => a.current_balance && Number(a.current_balance) > 0);
    if (!hasAccountBalances) missingData.push('account_balances');

    const hasDebtBalances = debts && debts.length > 0 &&
      debts.every(d => d.current_balance !== null);
    if (!hasDebtBalances) missingData.push('debt_balances');

    const hasGoalProgress = goals && goals.length > 0;
    if (!hasGoalProgress) missingData.push('goals');

    return NextResponse.json({
      complete: userConfig?.onboarding_complete ?? false,
      missingData,
      lastBalanceUpdate: userConfig?.last_balance_update,
      lastTransactionImport: userConfig?.last_transaction_import
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}
