import { 
  SimpleFinAccount, 
  SimpleFinTransaction, 
  Transaction, 
  CategoryRule, 
  Category, 
  PaymentMethod 
} from '../types';
import { CategorizerEngine } from './categorizer';

export interface SimpleFinClaimResponse {
  success: boolean;
  accessUrl?: string;
  message?: string;
  error?: string;
}

export interface SimpleFinAccountsResponse {
  success: boolean;
  accounts?: SimpleFinAccount[];
  errors?: string[];
  error?: string;
}

export class SimpleFinService {
  /**
   * Claim a SimpleFIN setup token to obtain an access URL
   */
  static async claimToken(claimToken: string): Promise<SimpleFinClaimResponse> {
    try {
      const res = await fetch('/api/simplefin/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to claim SimpleFIN token',
        };
      }

      return {
        success: true,
        accessUrl: data.accessUrl,
        message: data.message,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || 'Network error claiming SimpleFIN token',
      };
    }
  }

  /**
   * Fetch connected bank accounts & transactions from SimpleFIN
   */
  static async fetchAccounts(
    accessUrl?: string,
    startDate?: number,
    endDate?: number
  ): Promise<SimpleFinAccountsResponse> {
    try {
      const res = await fetch('/api/simplefin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessUrl,
          startDate,
          endDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to fetch SimpleFIN accounts',
        };
      }

      return {
        success: true,
        accounts: data.accounts || [],
        errors: data.errors || [],
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || 'Network error fetching SimpleFIN accounts',
      };
    }
  }

  /**
   * Convert SimpleFIN payload to application Transaction format with auto-categorization and de-duplication
   */
  static convertToAppTransactions(
    accounts: SimpleFinAccount[],
    rules: CategoryRule[],
    categories: Category[],
    existingTransactions: Transaction[]
  ): {
    newTransactions: Transaction[];
    duplicateCount: number;
    accountCount: number;
  } {
    const existingIds = new Set(existingTransactions.map((t) => t.id));
    const existingSignatures = new Set(
      existingTransactions.map((t) => `${t.date}_${t.amount.toFixed(2)}_${t.description.toLowerCase().trim()}`)
    );

    const newTransactions: Transaction[] = [];
    let duplicateCount = 0;

    for (const acc of accounts) {
      if (!acc.transactions || !Array.isArray(acc.transactions)) continue;

      const orgName = acc.org?.name || 'Bank';
      const accName = acc.name || 'Account';

      // Infer payment method
      let paymentMethod: PaymentMethod = 'Bank Transfer';
      const lowerAcc = accName.toLowerCase();
      if (lowerAcc.includes('credit') || lowerAcc.includes('card')) {
        paymentMethod = 'Credit Card';
      } else if (lowerAcc.includes('debit') || lowerAcc.includes('checking')) {
        paymentMethod = 'Debit Card';
      }

      for (const sftx of acc.transactions) {
        const txId = `sfin_${sftx.id}`;

        // Date from Unix timestamp (seconds)
        const dateObj = sftx.posted ? new Date(sftx.posted * 1000) : new Date();
        const dateStr = dateObj.toISOString().split('T')[0];

        // Parse amount
        const rawAmount = parseFloat(sftx.amount || '0');
        const absAmount = Math.abs(rawAmount);
        const type = rawAmount < 0 ? 'expense' : 'income';

        const description = (sftx.description || sftx.payee || sftx.memo || 'SimpleFIN Transaction').trim();
        const merchant = (sftx.payee || sftx.description || 'Bank Merchant').trim();

        const signature = `${dateStr}_${absAmount.toFixed(2)}_${description.toLowerCase()}`;

        if (existingIds.has(txId) || existingSignatures.has(signature)) {
          duplicateCount++;
          continue;
        }

        // Categorize using rules
        const ruleMatch = CategorizerEngine.matchLocalRule(description || merchant, rules);
        const cleanedMerchant = CategorizerEngine.cleanMerchantName(merchant || description);

        const category = ruleMatch ? ruleMatch.category : 'Miscellaneous';
        const isAuto = Boolean(ruleMatch);
        const confidence = ruleMatch ? ruleMatch.confidence : 0.5;

        const newTx: Transaction = {
          id: txId,
          date: dateStr,
          description: description,
          merchant: ruleMatch?.cleanedMerchant || cleanedMerchant,
          amount: absAmount,
          type: type,
          category: category,
          paymentMethod,
          tags: ['SimpleFIN', orgName, accName],
          notes: sftx.memo ? `SimpleFIN Memo: ${sftx.memo}` : `Imported from ${orgName} (${accName})`,
          isAutoCategorized: isAuto,
          aiConfidence: confidence,
          createdAt: new Date().toISOString(),
        };

        newTransactions.push(newTx);
      }
    }

    return {
      newTransactions,
      duplicateCount,
      accountCount: accounts.length,
    };
  }
}
