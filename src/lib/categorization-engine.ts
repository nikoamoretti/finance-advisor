/**
 * Intelligent Transaction Categorization Engine
 * Designed by: Financial Data Architect Agent
 */

export interface CategoryRule {
  id: string;
  pattern: string | RegExp;
  category: string;
  confidence: number;
  source: 'merchant' | 'description' | 'amount_pattern';
}

export interface CategoryPrediction {
  category: string;
  confidence: number;
  reasoning: string;
  alternatives: { category: string; confidence: number }[];
}

export class TransactionCategorizer {
  private rules: CategoryRule[] = [];
  private merchantMappings = new Map<string, string>();
  private amountPatterns = new Map<string, number>();

  constructor() {
    this.initializeRules();
    this.initializeMerchantMappings();
    this.initializeAmountPatterns();
  }

  private initializeRules(): void {
    // High-confidence merchant patterns
    this.rules = [
      // Groceries
      { id: 'grocery-1', pattern: /walmart|target|kroger|safeway|whole foods|trader joe|costco/i, category: 'Groceries', confidence: 0.95, source: 'merchant' },
      
      // Restaurants
      { id: 'restaurant-1', pattern: /mcdonald|burger|pizza|starbucks|dunkin|chipotle/i, category: 'Restaurants', confidence: 0.90, source: 'merchant' },
      
      // Transportation
      { id: 'transport-1', pattern: /uber|lyft|shell|chevron|exxon|bp gas/i, category: 'Transportation', confidence: 0.90, source: 'merchant' },
      
      // Entertainment
      { id: 'entertainment-1', pattern: /netflix|spotify|amazon prime|disney|hulu/i, category: 'Subscriptions', confidence: 0.95, source: 'merchant' },
      
      // Utilities (common patterns)
      { id: 'utilities-1', pattern: /electric|water|gas company|internet|cable/i, category: 'Utilities', confidence: 0.90, source: 'description' },
      
      // Rent/Mortgage
      { id: 'rent-1', pattern: /rent|mortgage|property management/i, category: 'Rent', confidence: 0.95, source: 'description' },
    ];
  }

  private initializeMerchantMappings(): void {
    // Exact merchant name mappings (highest confidence)
    this.merchantMappings.set('AMAZON.COM', 'Shops');
    this.merchantMappings.set('PAYPAL', 'Other'); // Requires description analysis
    this.merchantMappings.set('VENMO', 'Other');
    this.merchantMappings.set('ZELLE', 'Internal Transfers');
  }

  private initializeAmountPatterns(): void {
    // Common recurring amounts that indicate category
    this.amountPatterns.set('3495.00', 0.95); // Rent amount from schema
    this.amountPatterns.set('568.00', 0.95);  // Car loan
    this.amountPatterns.set('426.00', 0.95);  // IRS payment
  }

  public categorizeTransaction(
    description: string,
    amount: number,
    existingCategory?: string
  ): CategoryPrediction {
    const candidates: Array<{ category: string; confidence: number; reasoning: string }> = [];

    // Check exact merchant mappings first
    const upperDesc = description.toUpperCase();
    if (this.merchantMappings.has(upperDesc)) {
      candidates.push({
        category: this.merchantMappings.get(upperDesc)!,
        confidence: 0.95,
        reasoning: 'Exact merchant match'
      });
    }

    // Check amount patterns for recurring payments
    const amountStr = Math.abs(amount).toFixed(2);
    if (this.amountPatterns.has(amountStr)) {
      const confidence = this.amountPatterns.get(amountStr)!;
      const category = this.categorizeByAmount(amount);
      if (category) {
        candidates.push({
          category,
          confidence,
          reasoning: `Recurring amount pattern: $${amountStr}`
        });
      }
    }

    // Apply pattern rules
    for (const rule of this.rules) {
      if (rule.pattern instanceof RegExp ? rule.pattern.test(description) : description.toLowerCase().includes(rule.pattern.toLowerCase())) {
        candidates.push({
          category: rule.category,
          confidence: rule.confidence,
          reasoning: `${rule.source} pattern match`
        });
      }
    }

    // Use existing category as fallback with lower confidence
    if (existingCategory && candidates.length === 0) {
      candidates.push({
        category: existingCategory,
        confidence: 0.3,
        reasoning: 'Existing category (low confidence)'
      });
    }

    // Default to 'Other' if no matches
    if (candidates.length === 0) {
      candidates.push({
        category: 'Other',
        confidence: 0.1,
        reasoning: 'No patterns matched - manual review needed'
      });
    }

    // Sort by confidence and return best prediction
    candidates.sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];
    const alternatives = candidates.slice(1, 4); // Top 3 alternatives

    return {
      category: best.category,
      confidence: best.confidence,
      reasoning: best.reasoning,
      alternatives: alternatives.map(alt => ({ category: alt.category, confidence: alt.confidence }))
    };
  }

  private categorizeByAmount(amount: number): string | null {
    const absAmount = Math.abs(amount);
    
    // Known fixed amounts from schema
    if (absAmount === 3495.00) return 'Rent';
    if (absAmount === 568.00) return 'Loans';
    if (absAmount === 426.00) return 'Loans';
    
    // Amount-based heuristics
    if (absAmount > 1000 && amount < 0) return 'Rent'; // Large expenses likely rent/mortgage
    if (absAmount < 5 && amount > 0) return 'Internal Transfers'; // Small deposits likely transfers
    
    return null;
  }

  public learnFromFeedback(
    description: string,
    amount: number,
    correctCategory: string,
    confidence: number
  ): void {
    // Machine learning feedback loop - update rules based on user corrections
    // This would integrate with a proper ML model in production
    console.log(`Learning: "${description}" -> ${correctCategory} (confidence: ${confidence})`);
    
    // For demo: add to merchant mappings if high confidence
    if (confidence > 0.8) {
      this.merchantMappings.set(description.toUpperCase(), correctCategory);
    }
  }
}

// Singleton instance
export const transactionCategorizer = new TransactionCategorizer();