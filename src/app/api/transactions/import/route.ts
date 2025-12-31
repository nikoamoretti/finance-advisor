import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { transactionCategorizer } from '@/lib/categorization-engine';
import crypto from 'crypto';

function generateHash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

function parseCSV(content: string): { headers: string[], rows: Record<string, string>[] } {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };

  // Parse headers - handle quoted headers
  const headerLine = lines[0];
  const headers: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of headerLine) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  headers.push(current.trim().replace(/^"|"$/g, ''));

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    current = '';
    inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function findColumn(row: Record<string, string>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    // Try exact match first
    if (row[name] !== undefined) return row[name];
    // Try case-insensitive match
    const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
    if (key) return row[key];
  }
  return '';
}

function parseDate(dateStr: string): string {
  if (!dateStr) return '';

  // Handle MM/DD/YYYY format
  const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Handle YYYY-MM-DD format
  const isoFormat = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoFormat) {
    return dateStr;
  }

  // Try standard date parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return '';
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  // Remove currency symbols, spaces, and handle parentheses for negatives
  let cleaned = amountStr.replace(/[$,\s]/g, '');
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  return parseFloat(cleaned) || 0;
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
    const { headers, rows } = parseCSV(content);

    console.log('CSV Headers found:', headers);
    console.log('First row sample:', rows[0]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `No data rows found. Headers detected: ${headers.join(', ')}` },
        { status: 400 }
      );
    }

    // Flexible column mapping - try many possible names
    // Copilot Money exports use these columns based on their format
    const dateColumns = ['date', 'Date', 'DATE', 'Transaction Date', 'transaction_date', 'posted_date', 'Posted Date'];
    const descColumns = ['name', 'Name', 'NAME', 'description', 'Description', 'DESCRIPTION', 'merchant', 'Merchant', 'MERCHANT', 'payee', 'Payee'];
    const amountColumns = ['amount', 'Amount', 'AMOUNT', 'transaction_amount', 'value', 'Value'];
    const categoryColumns = ['category', 'Category', 'CATEGORY', 'type', 'Type'];

    // Check if we can find required columns
    const sampleRow = rows[0];
    const hasDate = dateColumns.some(col => Object.keys(sampleRow).some(k => k.toLowerCase() === col.toLowerCase()));
    const hasDesc = descColumns.some(col => Object.keys(sampleRow).some(k => k.toLowerCase() === col.toLowerCase()));
    const hasAmount = amountColumns.some(col => Object.keys(sampleRow).some(k => k.toLowerCase() === col.toLowerCase()));

    if (!hasDate || !hasAmount) {
      return NextResponse.json(
        {
          error: `Could not find required columns. Found: [${headers.join(', ')}]. Need: date column and amount column.`,
          headers: headers
        },
        { status: 400 }
      );
    }

    // Map rows to transactions with intelligent categorization
    const transactions = rows.map(row => {
      const dateStr = findColumn(row, dateColumns);
      const description = findColumn(row, descColumns) || 'Unknown';
      const amountStr = findColumn(row, amountColumns);
      const originalCategory = findColumn(row, categoryColumns) || 'Other';

      const date = parseDate(dateStr);
      const amount = parseAmount(amountStr);

      // Apply intelligent categorization
      const categoryPrediction = transactionCategorizer.categorizeTransaction(
        description, 
        amount, 
        originalCategory
      );

      const hash = generateHash(`${date}${description}${amount}`);

      return {
        date,
        description,
        amount,
        category: categoryPrediction.category,
        category_confidence: categoryPrediction.confidence,
        category_reasoning: categoryPrediction.reasoning,
        original_category: originalCategory,
        hash,
        is_excluded: false
      };
    }).filter(t => t.date && !isNaN(t.amount) && t.amount !== 0);

    console.log(`Parsed ${transactions.length} valid transactions from ${rows.length} rows`);

    if (transactions.length === 0) {
      return NextResponse.json(
        {
          error: `0 valid transactions found. Check that dates are in MM/DD/YYYY or YYYY-MM-DD format. Headers found: [${headers.join(', ')}]`,
          headers: headers,
          sampleRow: rows[0]
        },
        { status: 400 }
      );
    }

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

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
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
      totalParsed: transactions.length,
      dateRange: dates.length > 0 ? {
        start: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0],
        end: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0]
      } : null,
      categories,
      totalSpend: Math.round(totalSpend * 100) / 100,
      headers: headers
    });
  } catch (error) {
    console.error('Error importing transactions:', error);
    return NextResponse.json(
      { error: `Failed to import transactions: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
