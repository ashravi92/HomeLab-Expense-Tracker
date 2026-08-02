import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  PieChart as PieChartIcon, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Upload,
  Zap,
  Server,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2
} from 'lucide-react';
import { Transaction, BudgetGoal, Category, UserSettings } from '../types';
import { ExportUtils } from '../lib/exportUtils';

interface DashboardViewProps {
  transactions: Transaction[];
  categories: Category[];
  budgets: BudgetGoal[];
  settings: UserSettings;
  onOpenQuickAdd: () => void;
  onOpenCsvImport: () => void;
  onNavigateToTab: (tab: string) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  categories,
  budgets,
  settings,
  onOpenQuickAdd,
  onOpenCsvImport,
  onNavigateToTab,
  onDeleteTransaction,
  onEditTransaction,
}) => {
  // Current Month String YYYY-MM
  const now = new Date();
  const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultYearMonth);

  const report = ExportUtils.generateMonthlyReport(selectedMonth, transactions, budgets);

  // Available Months in dataset for selector
  const availableMonths = Array.from<string>(
    new Set(transactions.map((t) => t.date.substring(0, 7)))
  ).sort().reverse();

  if (!availableMonths.includes(defaultYearMonth)) {
    availableMonths.unshift(defaultYearMonth);
  }

  // Recent transactions in selected month
  const monthTransactions = transactions
    .filter((t) => t.date.startsWith(selectedMonth))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Recent 6 transactions for feed
  const recentFeed = monthTransactions.slice(0, 6);

  const currency = settings.currencySymbol || '$';

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner & Month Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
            Spending Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Overview for {report.monthName} ({report.transactionCount} transactions)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              {availableMonths.map((m) => {
                const [y, mm] = m.split('-').map(Number);
                const d = new Date(y, mm - 1, 1);
                const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return (
                  <option key={m} value={m} className="bg-slate-900 text-slate-200">
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={onOpenQuickAdd}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Record Spend</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Expense */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Spent</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {currency}{report.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span>Avg {currency}{report.dailyExpenseAverage.toFixed(2)}/day</span>
          </p>
        </div>

        {/* Total Income */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Income</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">
            {currency}{report.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {report.totalIncome > 0 ? `Savings Rate: ${report.savingsRatePercent}%` : 'No income recorded'}
          </p>
        </div>

        {/* Net Flow */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Net Savings</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-bold tracking-tight ${report.netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {report.netSavings >= 0 ? '+' : ''}{currency}{report.netSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {report.netSavings >= 0 ? 'Positive cash flow' : 'Deficit this month'}
          </p>
        </div>

        {/* Top Category */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Top Category</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <PieChartIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white truncate">
            {report.topCategory.name}
          </div>
          <p className="text-xs text-amber-400 font-bold mt-2">
            {currency}{report.topCategory.amount.toLocaleString()} ({report.topCategory.percent}% of total)
          </p>
        </div>

      </div>

      {/* Main Charts & Category Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Category Breakdown Progress Bars */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100">Category Budgets & Spending</h2>
              <p className="text-xs text-slate-400">Spending limits vs actuals for {report.monthName}</p>
            </div>
            <button
              onClick={() => onNavigateToTab('budgets')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Manage Limits <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {report.categoryBreakdown.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs space-y-2">
              <p>No expense data recorded for this month.</p>
              <button
                onClick={onOpenCsvImport}
                className="inline-flex items-center gap-1.5 text-indigo-400 font-medium hover:underline"
              >
                <Upload className="w-3.5 h-3.5" /> Import CSV Statement
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {report.categoryBreakdown.slice(0, 7).map((item) => {
                const catInfo = categories.find((c) => c.name === item.category);
                const limit = item.budgetLimit;
                const percentSpentOfLimit = limit > 0 ? Math.min(100, Math.round((item.amount / limit) * 100)) : 0;

                return (
                  <div key={item.category} className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${catInfo?.bgColor || 'bg-slate-500'}`} />
                        <span className="font-semibold text-slate-200">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="font-bold text-slate-100">
                          {currency}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {limit > 0 ? (
                          <span className="text-slate-400 text-[11px]">
                            / {currency}{limit}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">No limit</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          item.status === 'exceeded'
                            ? 'bg-rose-500'
                            : item.status === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${limit > 0 ? percentSpentOfLimit : Math.min(100, item.percentOfTotal)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{item.percentOfTotal}% of total expenses</span>
                      {limit > 0 && (
                        <span className={`font-semibold ${
                          item.status === 'exceeded' ? 'text-rose-400' : item.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {item.status === 'exceeded' ? 'Over limit!' : `${percentSpentOfLimit}% used`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Top Merchant & Quick Shortcuts */}
        <div className="space-y-6">
          
          {/* Top Merchant Stat Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Merchant</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-slate-100">{report.topMerchant.name}</div>
                <div className="text-xs text-slate-400">{report.topMerchant.count} transactions this month</div>
              </div>
              <div className="text-right">
                <div className="text-base font-extrabold text-amber-400">
                  {currency}{report.topMerchant.amount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Homelab Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenCsvImport}
                className="flex flex-col items-start p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition text-left"
              >
                <Upload className="w-4 h-4 text-cyan-400 mb-1" />
                <span className="text-xs font-bold text-slate-200">Import CSV</span>
                <span className="text-[10px] text-slate-400">Statement parsing</span>
              </button>

              <button
                onClick={() => onNavigateToTab('rules')}
                className="flex flex-col items-start p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition text-left"
              >
                <Zap className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-xs font-bold text-slate-200">Auto-Rules</span>
                <span className="text-[10px] text-slate-400">Keyword matching</span>
              </button>

              <button
                onClick={() => onNavigateToTab('reports')}
                className="flex flex-col items-start p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition text-left"
              >
                <PieChartIcon className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-xs font-bold text-slate-200">Monthly PDF</span>
                <span className="text-[10px] text-slate-400">Printable report</span>
              </button>

              <button
                onClick={() => onNavigateToTab('docker')}
                className="flex flex-col items-start p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition text-left"
              >
                <Server className="w-4 h-4 text-indigo-400 mb-1" />
                <span className="text-xs font-bold text-slate-200">Docker Config</span>
                <span className="text-[10px] text-slate-400">Compose & setup</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Recent Transactions Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100">Recent Transactions</h2>
            <p className="text-xs text-slate-400">Latest activity in {report.monthName}</p>
          </div>
          <button
            onClick={() => onNavigateToTab('transactions')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            View All ({transactions.length}) <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentFeed.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No transactions found for this month.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {recentFeed.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-lg transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 text-sm truncate">
                      {tx.merchant || tx.description}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{tx.date}</span>
                      <span>•</span>
                      <span className="bg-slate-800 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-700">
                        {tx.category}
                      </span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-500">{tx.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`font-bold text-sm text-right ${
                    tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}{currency}{tx.amount.toFixed(2)}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
