import { CategoryRule } from '../types';

export interface CategorizationResult {
  category: string;
  cleanedMerchant: string;
  matchMethod: 'rule' | 'ai' | 'fallback';
  confidence: number;
  matchedRuleId?: string;
}

export class CategorizerEngine {
  /**
   * Matches a raw transaction description against local keyword rules
   */
  static matchLocalRule(
    description: string,
    rules: CategoryRule[]
  ): CategorizationResult | null {
    if (!description) return null;
    const normalized = description.toUpperCase().trim();

    for (const rule of rules) {
      if (!rule.active || !rule.keyword) continue;

      const ruleKeyword = rule.keyword.toUpperCase().trim();

      if (rule.isRegex) {
        try {
          const rx = new RegExp(rule.keyword, 'i');
          if (rx.test(description)) {
            return {
              category: rule.categoryName,
              cleanedMerchant: CategorizerEngine.cleanMerchantName(description),
              matchMethod: 'rule',
              confidence: 0.98,
              matchedRuleId: rule.id,
            };
          }
        } catch (e) {
          // invalid regex ignored
        }
      } else if (rule.exactMatch) {
        if (normalized === ruleKeyword) {
          return {
            category: rule.categoryName,
            cleanedMerchant: rule.keyword,
            matchMethod: 'rule',
            confidence: 1.0,
            matchedRuleId: rule.id,
          };
        }
      } else {
        if (normalized.includes(ruleKeyword)) {
          return {
            category: rule.categoryName,
            cleanedMerchant: CategorizerEngine.cleanMerchantName(description),
            matchMethod: 'rule',
            confidence: 0.95,
            matchedRuleId: rule.id,
          };
        }
      }
    }

    return null;
  }

  /**
   * Cleans ugly bank statement text into human readable merchant
   * e.g., "TRADER JOES #082 SAN JOSE CA" -> "Trader Joes"
   */
  static cleanMerchantName(rawDescription: string): string {
    if (!rawDescription) return 'Unknown Merchant';

    let clean = rawDescription
      .replace(/^(POS|DEBIT|CREDIT|ACH|CHECK|PURCHASE|TST\*|SQ\*|PAYPAL\*|AMZN\*)/i, '')
      .replace(/#[0-9]+/g, '')
      .replace(/\b\d{4,}\b/g, '') // remove account/store numbers
      .replace(/\b(CA|NY|TX|FL|WA|IL|MA|OR|NV|GA|NC|NJ|CO)\b/g, '') // US state abbreviations
      .replace(/\b(STORE|LOCATION|INC|LLC|GMBH|CORP)\b/i, '')
      .replace(/[\*#_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) clean = rawDescription.trim();

    // Capitalize Words cleanly
    return clean
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Batch AI categorization via Express backend endpoint
   */
  static async categorizeBatchWithAI(
    items: string[],
    availableCategories: string[]
  ): Promise<
    Array<{
      itemIndex: number;
      originalDescription: string;
      category: string;
      cleanedMerchant: string;
      confidence: number;
      suggestedKeywordRule?: string;
    }>
  > {
    try {
      const response = await fetch('/api/categorize/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, availableCategories }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (err) {
      console.warn('Backend AI categorization failed or offline:', err);
      return [];
    }
  }
}
