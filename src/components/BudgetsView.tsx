import React, { useState } from 'react';
import { PieChart, DollarSign, AlertCircle, Edit3, Save, Check } from 'lucide-react';
import { BudgetGoal, Category, Transaction, UserSettings } from '../types';
import { ExportUtils } from '../lib/exportUtils';

interface BudgetsViewProps {
  categories: Category[];
  budgets: BudgetGoal[];
  transactions: Transaction[];
  settings: UserSettings;
  onUpdateBudgets: (updated: BudgetGoal[]) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  categories,
  budgets,
  transactions,
  settings,
  onUpdateBudgets,
}) => {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const report = ExportUtils.generateMonthlyReport(currentMonthKey, transactions, budgets);

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editLimitInput, setEditLimitInput] = useState<number>(0);
  const [editWarnInput, setEditWarnInput] = useState<number>(80);

  const currency = settings.currencySymbol || '$';

  const handleStartEdit = (bGoal: BudgetGoal) => {
    setEditingCategory(bGoal.categoryId);
    setEditLimitInput(bGoal.monthlyLimit);
    setEditWarnInput(bGoal.warnThresholdPercent || 80);
  };

  const handleSaveEdit = (categoryId: string) => {
    const updatedList = budgets.map((b) => {
      if (b.categoryId === categoryId) {
        return {
          ...b,
          monthlyLimit: Math.max(0, editLimitInput),
          warnThresholdPercent: Math.min(100, Math.max(50, editWarnInput)),
        };
      }
      return b;
    });

    onUpdateBudgets(updatedList);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Monthly Budget Limits</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Set target spend thresholds for each category to prevent overspending
          </p>
        </div>
      </div>

      {/* Categories Budget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.filter((c) => c.name !== 'Income & Salary').map((cat) => {
          const bGoal = budgets.find((b) => b.categoryName === cat.name) || {
            categoryId: cat.id,
            categoryName: cat.name,
            monthlyLimit: 0,
            warnThresholdPercent: 80,
          };

          const catReport = report.categoryBreakdown.find((cb) => cb.category === cat.name);
          const currentSpent = catReport ? catReport.amount : 0;
          const limit = bGoal.monthlyLimit;
          const isOver = limit > 0 && currentSpent >= limit;
          const isNear = limit > 0 && !isOver && currentSpent >= (limit * (bGoal.warnThresholdPercent / 100));

          const percentUsed = limit > 0 ? Math.min(100, Math.round((currentSpent / limit) * 100)) : 0;

          const isEditing = editingCategory === cat.id;

          return (
            <div
              key={cat.id}
              className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition ${
                isOver
                  ? 'border-rose-500/50 shadow-rose-500/5'
                  : isNear
                  ? 'border-amber-500/50 shadow-amber-500/5'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${cat.bgColor}`} />
                  <h3 className="font-bold text-slate-100 text-sm">{cat.name}</h3>
                </div>

                {!isEditing ? (
                  <button
                    onClick={() => handleStartEdit(bGoal)}
                    className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
                    title="Edit Limit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSaveEdit(cat.id)}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" /> Save
                  </button>
                )}
              </div>

              {/* Limit Editor or Display */}
              {isEditing ? (
                <div className="space-y-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Monthly Limit ({currency})</label>
                    <input
                      type="number"
                      value={editLimitInput}
                      onChange={(e) => setEditLimitInput(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Warn Alert Threshold (%)</label>
                    <input
                      type="number"
                      value={editWarnInput}
                      onChange={(e) => setEditWarnInput(parseInt(e.target.value, 10) || 80)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-black text-slate-100">
                        {currency}{currentSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-400">Spent this month</div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-300">
                        {limit > 0 ? `${currency}${limit.toLocaleString()}` : 'Unset'}
                      </div>
                      <div className="text-[11px] text-slate-500">Target Budget</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {limit > 0 && (
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isOver ? 'bg-rose-500' : isNear ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    {limit > 0 ? (
                      <span className={`font-semibold ${
                        isOver ? 'text-rose-400' : isNear ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {isOver ? 'OVER BUDGET' : isNear ? `Near alert threshold (${percentUsed}%)` : `${percentUsed}% of budget spent`}
                      </span>
                    ) : (
                      <span className="text-slate-500">No monthly target configured</span>
                    )}

                    {limit > currentSpent && (
                      <span className="text-slate-400 font-medium">
                        {currency}{(limit - currentSpent).toFixed(2)} remaining
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
