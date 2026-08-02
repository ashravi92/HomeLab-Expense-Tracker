import { Transaction, CategoryRule, BudgetGoal, UserSettings, Category } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_RULES, DEFAULT_BUDGETS } from './constants';
import { generateInitialSampleTransactions } from './sampleData';

const STORAGE_KEYS = {
  TRANSACTIONS: 'homelab_spend_transactions_v1',
  CATEGORIES: 'homelab_spend_categories_v1',
  RULES: 'homelab_spend_rules_v1',
  BUDGETS: 'homelab_spend_budgets_v1',
  SETTINGS: 'homelab_spend_settings_v1',
  SESSION: 'homelab_spend_session_v1',
};

export const DEFAULT_SETTINGS: UserSettings = {
  isAuthEnabled: false,
  username: 'homelab_admin',
  passwordHash: '',
  pinCode: '1234',
  currencySymbol: '$',
  currencyCode: 'USD',
  themeMode: 'dark',
  autoRunAIOnImport: true,
  autoSaveSession: true,
};

export class StorageService {
  // Load Transactions
  static getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) {
        const initial = generateInitialSampleTransactions();
        StorageService.saveTransactions(initial);
        return initial;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading transactions:', e);
      return [];
    }
  }

  static saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  // Load Categories
  static getCategories(): Category[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (!data) {
        StorageService.saveCategories(DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES;
      }
      return JSON.parse(data);
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  }

  static saveCategories(categories: Category[]): void {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }

  // Load Rules
  static getRules(): CategoryRule[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RULES);
      if (!data) {
        StorageService.saveRules(DEFAULT_RULES);
        return DEFAULT_RULES;
      }
      return JSON.parse(data);
    } catch (e) {
      return DEFAULT_RULES;
    }
  }

  static saveRules(rules: CategoryRule[]): void {
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
  }

  // Load Budgets
  static getBudgets(): BudgetGoal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      if (!data) {
        StorageService.saveBudgets(DEFAULT_BUDGETS);
        return DEFAULT_BUDGETS;
      }
      return JSON.parse(data);
    } catch (e) {
      return DEFAULT_BUDGETS;
    }
  }

  static saveBudgets(budgets: BudgetGoal[]): void {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  }

  // Load User Settings
  static getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        StorageService.saveSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: UserSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Session lock status
  static isLocked(): boolean {
    const settings = StorageService.getSettings();
    if (!settings.isAuthEnabled) return false;
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    return session !== 'authenticated';
  }

  static setSessionAuthenticated(auth: boolean): void {
    if (auth) {
      localStorage.setItem(STORAGE_KEYS.SESSION, 'authenticated');
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  }

  // Full Database Backup & Restore for Homelab
  static exportFullBackupJSON(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      transactions: StorageService.getTransactions(),
      categories: StorageService.getCategories(),
      rules: StorageService.getRules(),
      budgets: StorageService.getBudgets(),
      settings: StorageService.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  }

  static importFullBackupJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.transactions && Array.isArray(data.transactions)) {
        StorageService.saveTransactions(data.transactions);
      }
      if (data.categories && Array.isArray(data.categories)) {
        StorageService.saveCategories(data.categories);
      }
      if (data.rules && Array.isArray(data.rules)) {
        StorageService.saveRules(data.rules);
      }
      if (data.budgets && Array.isArray(data.budgets)) {
        StorageService.saveBudgets(data.budgets);
      }
      if (data.settings) {
        StorageService.saveSettings(data.settings);
      }
      return true;
    } catch (e) {
      console.error('Failed to parse import backup JSON:', e);
      return false;
    }
  }

  static resetToDefaultSample(): void {
    StorageService.saveTransactions(generateInitialSampleTransactions());
    StorageService.saveCategories(DEFAULT_CATEGORIES);
    StorageService.saveRules(DEFAULT_RULES);
    StorageService.saveBudgets(DEFAULT_BUDGETS);
  }

  static getStorageStatsKB(): number {
    let total = 0;
    for (const key in localStorage) {
      if (key.startsWith('homelab_spend_')) {
        total += (localStorage.getItem(key) || '').length;
      }
    }
    return Math.round((total * 2) / 1024); // approx KB
  }
}
