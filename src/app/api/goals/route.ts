import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .order('priority');

    if (error) throw error;

    const goalsWithProgress = (goals || []).map(g => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.target_amount),
      currentAmount: Number(g.current_amount),
      priority: g.priority,
      targetDate: g.target_date,
      notes: g.notes,
      percentComplete: Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)
    }));

    return NextResponse.json(goalsWithProgress);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}
