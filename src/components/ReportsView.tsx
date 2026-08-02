import React, { useState } from 'react';
import { FileSpreadsheet, Printer, Download, Calendar, DollarSign, TrendingDown, TrendingUp, Award } from 'lucide-react';
import { Transaction, BudgetGoal, UserSettings } from '../types';
import { ExportUtils } from '../lib/exportUtils';

interface ReportsViewProps {
  transactions: Transaction[];
  budgets: BudgetGoal[];
  settings: UserSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  budgets,
  settings,
}) => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  const currency = settings.currencySymbol || '$';

  const availableMonths = Array.from<string>(
    new Set(transactions.map((t) => t.date.substring(0, 7)))
  ).sort().reverse();

  if (!availableMonths.includes(defaultMonth)) {
    availableMonths.unshift(defaultMonth);
  }

  const report = ExportUtils.generateMonthlyReport(selectedMonth, transactions, budgets);

  const handlePrint = () => {
    ExportUtils.printMonthlyReport(report, currency);
  };

  const handleExportMonthCSV = () => {
    const monthTx = transactions.filter((t) => t.date.startsWith(selectedMonth));
    ExportUtils.exportTransactionsToCSV(monthTx, `homelab_spend_report_${selectedMonth}.csv`);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" /> Monthly Budget Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Detailed financial summary and printable executive report for {report.monthName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200">
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
            onClick={handleExportMonthCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4 text-cyan-400" /> Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-400 mb-1">Total Expenses</div>
          <div className="text-2xl font-black text-rose-400">
            {currency}{report.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{report.transactionCount} transactions</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-400 mb-1">Total Income</div>
          <div className="text-2xl font-black text-emerald-400">
            {currency}{report.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Savings Rate: {report.savingsRatePercent}%</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-400 mb-1">Net Savings Delta</div>
          <div className={`text-2xl font-black ${report.netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {report.netSavings >= 0 ? '+' : ''}{currency}{report.netSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Income minus expenses</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-400 mb-1">Daily Average Spend</div>
          <div className="text-2xl font-black text-slate-100">
            {currency}{report.dailyExpenseAverage.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Per calendar day</div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 font-bold text-slate-200 text-sm">
          Category Spending vs Budget Targets
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Amount Spent</th>
                <th className="p-3.5 text-right">% Share</th>
                <th className="p-3.5 text-right">Monthly Target</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {report.categoryBreakdown.map((c) => (
                <tr key={c.category} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-bold text-slate-200">{c.category}</td>
                  <td className="p-3.5 text-right font-bold text-slate-100">
                    {currency}{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right text-slate-400">{c.percentOfTotal}%</td>
                  <td className="p-3.5 text-right text-slate-400">
                    {c.budgetLimit > 0 ? `${currency}${c.budgetLimit}` : 'Unset'}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'exceeded'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : c.status === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {c.status === 'exceeded' ? 'OVER BUDGET' : c.status === 'warning' ? 'NEAR LIMIT' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
