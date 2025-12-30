import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { balance } = await request.json();

    if (typeof balance !== 'number') {
      return NextResponse.json(
        { error: 'Balance must be a number' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('accounts')
      .update({
        current_balance: balance,
        last_updated: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      name: data.name,
      type: data.type,
      balance: Number(data.current_balance),
      lastUpdated: data.last_updated
    });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}
