import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Sparkles, DollarSign, Calendar, Tag } from 'lucide-react';
import { Transaction, Category, CategoryRule, PaymentMethod, TransactionType } from '../types';
import { CategorizerEngine } from '../lib/categorizer';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  rules: CategoryRule[];
  editingTransaction: Transaction | null;
  onSave: (tx: Transaction) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  categories,
  rules,
  editingTransaction,
  onSave,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<TransactionType>('expense');
  const [merchant, setMerchant] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>(categories[0]?.name || 'Groceries');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [notes, setNotes] = useState<string>('');
  const [autoMatched, setAutoMatched] = useState<boolean>(false);

  useEffect(() => {
    if (editingTransaction) {
      setAmount(editingTransaction.amount.toString());
      setType(editingTransaction.type);
      setMerchant(editingTransaction.merchant);
      setDescription(editingTransaction.description);
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setPaymentMethod(editingTransaction.paymentMethod);
      setNotes(editingTransaction.notes || '');
    } else {
      setAmount('');
      setType('expense');
      setMerchant('');
      setDescription('');
      setCategory(categories[0]?.name || 'Groceries');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Credit Card');
      setNotes('');
      setAutoMatched(false);
    }
  }, [editingTransaction, isOpen, categories]);

  if (!isOpen) return null;

  // Auto-suggest category on typing merchant or description
  const handleMerchantChange = (val: string) => {
    setMerchant(val);
    if (!editingTransaction && val.length > 2) {
      const match = CategorizerEngine.matchLocalRule(val, rules);
      if (match) {
        setCategory(match.category);
        setAutoMatched(true);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    const cleanMerch = merchant.trim() || description.trim() || 'Merchant';

    const tx: Transaction = {
      id: editingTransaction ? editingTransaction.id : `tx-${Date.now()}`,
      date,
      description: description.trim() || cleanMerch,
      merchant: cleanMerch,
      amount: numAmt,
      type,
      category,
      paymentMethod,
      tags: editingTransaction ? editingTransaction.tags : ['manual'],
      notes: notes.trim(),
      isAutoCategorized: autoMatched,
      createdAt: editingTransaction ? editingTransaction.createdAt : new Date().toISOString(),
    };

    onSave(tx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="font-bold text-slate-100 text-lg">
            {editingTransaction ? 'Edit Transaction' : 'Record New Spend'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Amount & Type Toggle */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-400 font-medium mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-slate-100 text-base font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2.5 text-slate-100 font-semibold focus:outline-none"
              >
                <option value="expense">Expense (-)</option>
                <option value="income">Income (+)</option>
              </select>
            </div>
          </div>

          {/* Merchant / Payee */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Merchant / Payee *</label>
            <input
              type="text"
              placeholder="e.g. Starbucks, Micro Center, Trader Joe's"
              value={merchant}
              onChange={(e) => handleMerchantChange(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-400 font-medium">Category *</label>
              {autoMatched && (
                <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto-suggested
                </span>
              )}
            </div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setAutoMatched(false);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Digital Wallet">Digital Wallet</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Description & Notes */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Memo / Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Weekly grocieries, Homelab Truenas drive"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{editingTransaction ? 'Update' : 'Save Spend'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
