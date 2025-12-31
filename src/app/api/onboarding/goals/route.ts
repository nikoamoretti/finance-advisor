import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .order('priority');

    if (error) throw error;

    return NextResponse.json(goals || []);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { goals } = await request.json();

    if (!Array.isArray(goals)) {
      return NextResponse.json(
        { error: 'Goals must be an array' },
        { status: 400 }
      );
    }

    // Update each goal with the new current amount
    for (const goal of goals) {
      if (goal.id) {
        await supabase
          .from('goals')
          .update({ current_amount: goal.currentAmount })
          .eq('id', goal.id);
      } else if (goal.name) {
        // New goal
        await supabase.from('goals').insert({
          name: goal.name,
          target_amount: goal.targetAmount,
          current_amount: goal.currentAmount || 0,
          priority: goal.priority || 99,
          notes: goal.notes
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving goals:', error);
    return NextResponse.json(
      { error: 'Failed to save goals' },
      { status: 500 }
    );
  }
}
