import { NextResponse } from 'next/server';
import { getFinancialSnapshot } from '@/lib/financial-context';

export async function GET() {
  try {
    const snapshot = await getFinancialSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Error fetching financial status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial status' },
      { status: 500 }
    );
  }
}
