export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 
  | 'Credit Card' 
  | 'Debit Card' 
  | 'Bank Transfer' 
  | 'Cash' 
  | 'Digital Wallet' 
  | 'Other';

export interface Transaction {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  description: string;
  merchant: string;
  amount: number; // Always positive number
  type: TransactionType;
  category: string;
  subcategory?: string;
  paymentMethod: PaymentMethod;
  tags: string[];
  notes?: string;
  isAutoCategorized?: boolean;
  aiConfidence?: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  isSystem?: boolean;
}

export interface BudgetGoal {
  categoryId: string;
  categoryName: string;
  monthlyLimit: number;
  warnThresholdPercent: number; // default 80
}

export interface CategoryRule {
  id: string;
  keyword: string;
  categoryName: string;
  isRegex?: boolean;
  exactMatch?: boolean;
  active: boolean;
  createdAt: string;
}

export interface CSVMapping {
  dateColumn: string;
  amountColumn: string;
  descriptionColumn: string;
  merchantColumn: string;
  categoryColumn: string;
  paymentMethodColumn: string;
  amountType: 'single_signed' | 'separate_columns';
  outflowColumn: string;
  inflowColumn: string;
  dateFormat: string;
}

export interface CSVRowPreview {
  raw: Record<string, string>;
  parsed: Partial<Transaction>;
  matchedCategory: string;
  matchMethod: 'rule' | 'ai' | 'fallback';
  confidence: number;
  isDuplicate: boolean;
  selected: boolean;
}

export interface UserSettings {
  isAuthEnabled: boolean;
  username: string;
  passwordHash: string;
  pinCode: string;
  currencySymbol: string;
  currencyCode: string;
  themeMode: 'dark' | 'light' | 'system';
  autoRunAIOnImport: boolean;
  autoSaveSession: boolean;
  simpleFinAccessUrl?: string;
  simpleFinLastSync?: string;
  simpleFinAutoSyncDays?: number;
}

export interface SimpleFinAccount {
  id: string;
  name: string;
  currency: string;
  balance: string;
  'available-balance'?: string;
  'balance-date'?: number;
  org?: {
    name?: string;
    id?: string;
    sorg?: string;
    url?: string;
  };
  transactions?: SimpleFinTransaction[];
}

export interface SimpleFinTransaction {
  id: string;
  posted: number; // Unix timestamp in seconds
  amount: string; // Negative = outflow/expense, Positive = inflow/income
  description: string;
  payee?: string;
  memo?: string;
  pending?: boolean;
}

export interface SimpleFinSyncResult {
  success: boolean;
  accounts: SimpleFinAccount[];
  importedTransactions: Transaction[];
  duplicateCount: number;
  errors?: string[];
}

export interface MonthlyReport {
  monthKey: string; // YYYY-MM
  monthName: string;
  totalExpense: number;
  totalIncome: number;
  netSavings: number;
  savingsRatePercent: number;
  dailyExpenseAverage: number;
  transactionCount: number;
  topCategory: { name: string; amount: number; percent: number };
  topMerchant: { name: string; amount: number; count: number };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentOfTotal: number;
    budgetLimit: number;
    status: 'under' | 'warning' | 'exceeded';
  }>;
  paymentMethodBreakdown: Array<{
    method: PaymentMethod;
    amount: number;
    percent: number;
  }>;
}

export interface HomelabStats {
  uptimeSeconds: number;
  memoryUsage: { rssMB: number; heapUsedMB: number; heapTotalMB: number };
  totalTransactionsCount: number;
  totalCategoriesCount: number;
  activeRulesCount: number;
  storageKB: number;
  hasGeminiKey: boolean;
  environment: string;
}
