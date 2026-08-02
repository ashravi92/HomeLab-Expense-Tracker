import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Trash2, 
  Edit2, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight,
  CheckSquare,
  Square,
  Tag,
  CreditCard
} from 'lucide-react';
import { Transaction, Category, UserSettings } from '../types';
import { ExportUtils } from '../lib/exportUtils';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  settings: UserSettings;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenQuickAdd: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkCategoryChange: (ids: string[], newCategory: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  settings,
  searchQuery,
  setSearchQuery,
  onOpenQuickAdd,
  onEditTransaction,
  onDeleteTransaction,
  onBulkDelete,
  onBulkCategoryChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategoryInput, setBulkCategoryInput] = useState<string>('');

  const currency = settings.currencySymbol || '$';

  // Filter Transactions Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchMerch = tx.merchant.toLowerCase().includes(q);
        const matchCat = tx.category.toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        const matchAmount = tx.amount.toString().includes(q);
        if (!matchDesc && !matchMerch && !matchCat && !matchNotes && !matchAmount) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) {
        return false;
      }

      // Payment Method
      if (selectedPaymentMethod !== 'all' && tx.paymentMethod !== selectedPaymentMethod) {
        return false;
      }

      // Type
      if (selectedType !== 'all' && tx.type !== selectedType) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, selectedCategory, selectedPaymentMethod, selectedType]);

  // Selection Checkboxes
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map((t) => t.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkCategory = () => {
    if (!bulkCategoryInput || selectedIds.length === 0) return;
    onBulkCategoryChange(selectedIds, bulkCategoryInput);
    setSelectedIds([]);
    setBulkCategoryInput('');
  };

  const handleExecuteBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} transactions?`)) {
      onBulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">All Transactions</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Showing {filteredTransactions.length} of {transactions.length} total records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => ExportUtils.exportTransactionsToCSV(filteredTransactions)}
            className="bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Export filtered transactions to CSV"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenQuickAdd}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search description, merchant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Payment Methods</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Digital Wallet">Digital Wallet</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Type Dropdown */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Expenses & Income</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
            </select>
          </div>

        </div>

        {/* Bulk Actions Bar if items selected */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-950/60 border border-indigo-800/80 rounded-xl p-3 text-xs text-indigo-200 animate-fadeIn">
            <div className="flex items-center gap-2 font-semibold">
              <span>{selectedIds.length} item(s) selected</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bulkCategoryInput}
                onChange={(e) => setBulkCategoryInput(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">Change Category to...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              <button
                onClick={handleExecuteBulkCategory}
                disabled={!bulkCategoryInput}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-2.5 py-1 text-xs font-semibold"
              >
                Apply
              </button>

              <button
                onClick={handleExecuteBulkDelete}
                className="bg-rose-600 hover:bg-rose-500 text-white rounded-lg px-2.5 py-1 text-xs font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-10">
                  <button onClick={handleToggleSelectAll} className="text-slate-400 hover:text-slate-200">
                    {selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Merchant / Payee</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5 w-20 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isSelected = selectedIds.includes(tx.id);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isSelected ? 'bg-indigo-950/30' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <button onClick={() => handleToggleSelect(tx.id)} className="text-slate-400 hover:text-slate-200">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                        {tx.date}
                      </td>

                      <td className="p-3.5 font-medium text-slate-100 max-w-xs">
                        <div className="truncate font-semibold">{tx.merchant || tx.description}</div>
                        {tx.description && tx.merchant && tx.description !== tx.merchant && (
                          <div className="text-[10px] text-slate-500 truncate">{tx.description}</div>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-slate-800 text-indigo-300 font-medium px-2.5 py-1 rounded-lg border border-slate-700/80">
                          {tx.category}
                          {tx.isAutoCategorized && (
                            <Sparkles className="w-3 h-3 text-cyan-400" title="Auto-Categorized" />
                          )}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                        {tx.paymentMethod}
                      </td>

                      <td className={`p-3.5 text-right font-bold text-sm whitespace-nowrap ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}{currency}{tx.amount.toFixed(2)}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
