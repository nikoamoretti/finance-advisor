import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

function generateHash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseDate(dateStr: string): string {
  // Handle various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  return dateStr;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const content = await file.text();
    const rows = parseCSV(content);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid transactions found in CSV' },
        { status: 400 }
      );
    }

    // Map Copilot CSV columns to our schema
    const transactions = rows.map(row => {
      const date = parseDate(row['Date'] || row['date'] || '');
      const description = row['Description'] || row['description'] || row['Merchant'] || '';
      const amount = parseFloat(row['Amount'] || row['amount'] || '0');
      const category = row['Category'] || row['category'] || 'Other';

      const hash = generateHash(`${date}${description}${amount}`);

      return {
        date,
        description,
        amount,
        category,
        hash,
        is_excluded: false
      };
    }).filter(t => t.date && t.description && !isNaN(t.amount));

    // Get existing transaction hashes
    const { data: existing } = await supabase
      .from('transactions')
      .select('hash');

    const existingHashes = new Set((existing || []).map(t => t.hash));

    // Filter out duplicates
    const newTransactions = transactions.filter(t => !existingHashes.has(t.hash));
    const duplicateCount = transactions.length - newTransactions.length;

    // Insert new transactions
    if (newTransactions.length > 0) {
      const { error } = await supabase
        .from('transactions')
        .insert(newTransactions);

      if (error) throw error;
    }

    // Update last import timestamp
    await supabase
      .from('user_config')
      .update({ last_transaction_import: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Calculate date range and categories
    const dates = newTransactions.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()));
    const categories = [...new Set(newTransactions.map(t => t.category))];
    const totalSpend = newTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return NextResponse.json({
      imported: newTransactions.length,
      duplicates: duplicateCount,
      dateRange: dates.length > 0 ? {
        start: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0],
        end: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0]
      } : null,
      categories,
      totalSpend: Math.round(totalSpend * 100) / 100
    });
  } catch (error) {
    console.error('Error importing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    );
  }
}
