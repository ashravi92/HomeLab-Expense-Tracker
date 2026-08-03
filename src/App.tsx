import React, { useState, useEffect } from 'react';
import { 
  Transaction, 
  Category, 
  CategoryRule, 
  BudgetGoal, 
  UserSettings, 
  HomelabStats 
} from './types';
import { StorageService } from './lib/storage';
import { CategorizerEngine } from './lib/categorizer';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { CsvImportModal } from './components/CsvImportModal';
import { BudgetsView } from './components/BudgetsView';
import { RulesView } from './components/RulesView';
import { ReportsView } from './components/ReportsView';
import { DockerView } from './components/DockerView';
import { SettingsView } from './components/SettingsView';
import { SimpleFinView } from './components/SimpleFinView';
import { QuickAddModal } from './components/QuickAddModal';
import { AuthModal } from './components/AuthModal';

export default function App() {
  // Application Primary Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [budgets, setBudgets] = useState<BudgetGoal[]>([]);
  const [settings, setSettings] = useState<UserSettings>(StorageService.getSettings());

  // App UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isCsvImportOpen, setIsCsvImportOpen] = useState<boolean>(false);

  const [isLocked, setIsLocked] = useState<boolean>(StorageService.isLocked());

  const [homelabStats, setHomelabStats] = useState<HomelabStats | null>(null);

  // Initial Data Load
  const refreshAllData = () => {
    setTransactions(StorageService.getTransactions());
    setCategories(StorageService.getCategories());
    setRules(StorageService.getRules());
    setBudgets(StorageService.getBudgets());
    setSettings(StorageService.getSettings());
  };

  useEffect(() => {
    refreshAllData();

    // Fetch Express backend health
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHomelabStats({
          uptimeSeconds: data.uptimeSeconds || 0,
          memoryUsage: data.memoryUsage || { rssMB: 0, heapUsedMB: 0, heapTotalMB: 0 },
          totalTransactionsCount: StorageService.getTransactions().length,
          totalCategoriesCount: StorageService.getCategories().length,
          activeRulesCount: StorageService.getRules().length,
          storageKB: StorageService.getStorageStatsKB(),
          hasGeminiKey: Boolean(data.hasGeminiKey),
          environment: data.environment || 'development',
        });
      })
      .catch(() => null);
  }, []);

  // Sync Transactions changes
  const updateTransactions = (newTxList: Transaction[]) => {
    setTransactions(newTxList);
    StorageService.saveTransactions(newTxList);
  };

  const handleSaveTransaction = (tx: Transaction) => {
    const exists = transactions.some((t) => t.id === tx.id);
    let updated: Transaction[];
    if (exists) {
      updated = transactions.map((t) => (t.id === tx.id ? tx : t));
    } else {
      updated = [tx, ...transactions];
    }
    updateTransactions(updated);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    updateTransactions(updated);
  };

  const handleBulkDeleteTransactions = (ids: string[]) => {
    const updated = transactions.filter((t) => !ids.includes(t.id));
    updateTransactions(updated);
  };

  const handleBulkCategoryChange = (ids: string[], newCategory: string) => {
    const updated = transactions.map((t) =>
      ids.includes(t.id) ? { ...t, category: newCategory } : t
    );
    updateTransactions(updated);
  };

  const handleConfirmCSVImport = (importedList: Transaction[]) => {
    const merged = [...importedList, ...transactions];
    updateTransactions(merged);
  };

  // Sync Rules changes
  const handleSaveRules = (updatedRules: CategoryRule[]) => {
    setRules(updatedRules);
    StorageService.saveRules(updatedRules);
  };

  // Retroactively apply current rules to all transactions
  const handleApplyRulesToAll = () => {
    let matchCount = 0;
    const updated = transactions.map((tx) => {
      const match = CategorizerEngine.matchLocalRule(tx.description || tx.merchant, rules);
      if (match) {
        matchCount++;
        return {
          ...tx,
          category: match.category,
          merchant: match.cleanedMerchant || tx.merchant,
          isAutoCategorized: true,
        };
      }
      return tx;
    });

    updateTransactions(updated);
    alert(`Successfully applied rules! Re-categorized ${matchCount} transactions.`);
  };

  // Sync Budgets changes
  const handleUpdateBudgets = (updatedBudgets: BudgetGoal[]) => {
    setBudgets(updatedBudgets);
    StorageService.saveBudgets(updatedBudgets);
  };

  // Sync Settings changes
  const handleUpdateSettings = (updatedSettings: UserSettings) => {
    setSettings(updatedSettings);
    StorageService.saveSettings(updatedSettings);
  };

  // Lock session
  const handleLockSession = () => {
    StorageService.setSessionAuthenticated(false);
    setIsLocked(true);
  };

  const handleUnlockSession = () => {
    StorageService.setSessionAuthenticated(true);
    setIsLocked(false);
  };

  // Count uncategorized
  const uncategorizedCount = transactions.filter((t) => t.category === 'Miscellaneous').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      
      {/* Top Navbar */}
      <Navbar
        settings={settings}
        stats={homelabStats}
        onOpenQuickAdd={() => {
          setEditingTransaction(null);
          setIsQuickAddOpen(true);
        }}
        onOpenCsvImport={() => setIsCsvImportOpen(true)}
        onLockApp={handleLockSession}
        searchQuery={searchQuery}
        setSearchQuery={(q) => {
          setSearchQuery(q);
          if (q && activeTab !== 'transactions') setActiveTab('transactions');
        }}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        activeTab={activeTab}
      />

      {/* Main Container Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
          uncategorizedCount={uncategorizedCount}
        />

        {/* Dynamic View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              categories={categories}
              budgets={budgets}
              settings={settings}
              onOpenQuickAdd={() => {
                setEditingTransaction(null);
                setIsQuickAddOpen(true);
              }}
              onOpenCsvImport={() => setIsCsvImportOpen(true)}
              onNavigateToTab={setActiveTab}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={(tx) => {
                setEditingTransaction(tx);
                setIsQuickAddOpen(true);
              }}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              categories={categories}
              settings={settings}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onOpenQuickAdd={() => {
                setEditingTransaction(null);
                setIsQuickAddOpen(true);
              }}
              onEditTransaction={(tx) => {
                setEditingTransaction(tx);
                setIsQuickAddOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
              onBulkDelete={handleBulkDeleteTransactions}
              onBulkCategoryChange={handleBulkCategoryChange}
            />
          )}

          {activeTab === 'simplefin' && (
            <SimpleFinView
              settings={settings}
              rules={rules}
              categories={categories}
              existingTransactions={transactions}
              onUpdateSettings={handleUpdateSettings}
              onImportTransactions={handleConfirmCSVImport}
            />
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
                <h1 className="text-2xl font-bold text-slate-100">Statement CSV Import Wizard</h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                  Import transactions from your bank statements with automated keyword and Gemini AI categorization
                </p>
                <button
                  onClick={() => setIsCsvImportOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 py-3 font-bold text-sm shadow-lg shadow-indigo-600/20"
                >
                  Launch CSV Importer
                </button>
              </div>
            </div>
          )}

          {activeTab === 'budgets' && (
            <BudgetsView
              categories={categories}
              budgets={budgets}
              transactions={transactions}
              settings={settings}
              onUpdateBudgets={handleUpdateBudgets}
            />
          )}

          {activeTab === 'rules' && (
            <RulesView
              rules={rules}
              categories={categories}
              transactions={transactions}
              onSaveRules={handleSaveRules}
              onApplyRulesToTransactions={handleApplyRulesToAll}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              transactions={transactions}
              budgets={budgets}
              settings={settings}
            />
          )}

          {activeTab === 'docker' && <DockerView />}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onRefreshData={refreshAllData}
            />
          )}
        </main>
      </div>

      {/* Quick Add / Edit Transaction Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => {
          setIsQuickAddOpen(false);
          setEditingTransaction(null);
        }}
        categories={categories}
        rules={rules}
        editingTransaction={editingTransaction}
        onSave={handleSaveTransaction}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        categories={categories}
        rules={rules}
        existingTransactions={transactions}
        onConfirmImport={handleConfirmCSVImport}
      />

      {/* Auth Security Modal if locked */}
      <AuthModal
        isLocked={isLocked}
        settings={settings}
        onUnlock={handleUnlockSession}
      />

    </div>
  );
}
