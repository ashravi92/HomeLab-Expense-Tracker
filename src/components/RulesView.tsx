import React, { useState } from 'react';
import { Zap, Plus, Trash2, CheckCircle2, AlertCircle, Play, Sparkles } from 'lucide-react';
import { CategoryRule, Category, Transaction } from '../types';
import { CategorizerEngine } from '../lib/categorizer';

interface RulesViewProps {
  rules: CategoryRule[];
  categories: Category[];
  transactions: Transaction[];
  onSaveRules: (updated: CategoryRule[]) => void;
  onApplyRulesToTransactions: () => void;
}

export const RulesView: React.FC<RulesViewProps> = ({
  rules,
  categories,
  transactions,
  onSaveRules,
  onApplyRulesToTransactions,
}) => {
  const [newKeyword, setNewKeyword] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>(categories[0]?.name || 'Groceries');
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [exactMatch, setExactMatch] = useState<boolean>(false);

  // Test String Tester
  const [testString, setTestString] = useState<string>('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    const newRule: CategoryRule = {
      id: `rule-${Date.now()}`,
      keyword: newKeyword.trim(),
      categoryName: newCategory,
      isRegex,
      exactMatch,
      active: true,
      createdAt: new Date().toISOString(),
    };

    onSaveRules([newRule, ...rules]);
    setNewKeyword('');
  };

  const handleDeleteRule = (id: string) => {
    onSaveRules(rules.filter((r) => r.id !== id));
  };

  const handleToggleRule = (id: string) => {
    onSaveRules(
      rules.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const handleTestMatch = () => {
    if (!testString.trim()) {
      setTestResult(null);
      return;
    }
    const match = CategorizerEngine.matchLocalRule(testString, rules);
    if (match) {
      setTestResult(`Matched Rule! Category: "${match.category}" | Cleaned Merchant: "${match.cleanedMerchant}"`);
    } else {
      setTestResult('No local keyword rule matched this string.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" /> Auto-Categorization Rules
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Define keyword matching rules to categorize statement imports instantly
          </p>
        </div>

        <button
          onClick={onApplyRulesToTransactions}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition"
        >
          <Play className="w-4 h-4" />
          <span>Apply Rules to All Transactions</span>
        </button>
      </div>

      {/* Add New Rule Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-200">Create New Keyword Rule</h2>

        <form onSubmit={handleAddRule} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Keyword / Substring</label>
            <input
              type="text"
              placeholder="e.g. STARBUCKS, UBER, WALMART"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Assign Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 pt-5">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isRegex}
                onChange={(e) => setIsRegex(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600"
              />
              <span>Regex Mode</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={exactMatch}
                onChange={(e) => setExactMatch(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600"
              />
              <span>Exact Match</span>
            </label>
          </div>

          <div className="pt-4 sm:pt-5">
            <button
              type="submit"
              disabled={!newKeyword.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl py-2.5 transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" /> Add Rule
            </button>
          </div>
        </form>
      </div>

      {/* Live String Match Tester */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-200">Rule Match Simulator</h2>
        <div className="flex gap-2 text-xs">
          <input
            type="text"
            placeholder="Paste bank statement line here to test (e.g. POS DEBIT TRADER JOES #082)"
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 font-mono focus:outline-none"
          />
          <button
            onClick={handleTestMatch}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl px-4 py-2 font-semibold"
          >
            Test Match
          </button>
        </div>

        {testResult && (
          <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-mono text-indigo-300">
            {testResult}
          </div>
        )}
      </div>

      {/* Rules List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-800 font-bold text-slate-200 text-sm flex items-center justify-between">
          <span>Active Categorization Rules ({rules.length})</span>
        </div>

        <div className="divide-y divide-slate-800/80 text-xs">
          {rules.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No keyword rules defined yet.</div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={rule.active}
                    onChange={() => handleToggleRule(rule.id)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-mono font-bold text-indigo-300 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                      {rule.keyword}
                    </span>
                    {rule.isRegex && (
                      <span className="ml-2 text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        REGEX
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="bg-slate-800 text-slate-200 font-medium px-2.5 py-1 rounded-lg border border-slate-700">
                    {rule.categoryName}
                  </span>

                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
