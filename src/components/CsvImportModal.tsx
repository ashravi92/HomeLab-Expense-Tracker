import React, { useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  X, 
  Check, 
  RotateCw,
  HelpCircle,
  CheckSquare,
  Square
} from 'lucide-react';
import { Transaction, Category, CategoryRule, CSVRowPreview, PaymentMethod } from '../types';
import { CSVParser, ParsedCSV } from '../lib/csvParser';
import { CategorizerEngine } from '../lib/categorizer';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  rules: CategoryRule[];
  existingTransactions: Transaction[];
  onConfirmImport: (imported: Transaction[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  rules,
  existingTransactions,
  onConfirmImport,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rawText, setRawText] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);

  // Column Mapping State
  const [dateCol, setDateCol] = useState<string>('');
  const [descCol, setDescCol] = useState<string>('');
  const [amountCol, setAmountCol] = useState<string>('');
  const [amountType, setAmountType] = useState<'single' | 'separate'>('single');
  const [outflowCol, setOutflowCol] = useState<string>('');
  const [inflowCol, setInflowCol] = useState<string>('');
  const [merchantCol, setMerchantCol] = useState<string>('');
  const [paymentCol, setPaymentCol] = useState<string>('');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>('Credit Card');

  // Preview & Categorized Rows
  const [rowPreviews, setRowPreviews] = useState<CSVRowPreview[]>([]);
  const [isCategorizingAI, setIsCategorizingAI] = useState<boolean>(false);

  if (!isOpen) return null;

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        processCsvText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        processCsvText(text);
      }
    };
    reader.readAsText(file);
  };

  const processCsvText = (text: string) => {
    setRawText(text);
    const parsed = CSVParser.parse(text);
    setParsedData(parsed);

    // Apply detected mapping
    const m = parsed.suggestedMapping;
    setDateCol(m.dateColumn);
    setDescCol(m.descriptionColumn);
    setAmountCol(m.amountColumn);
    setMerchantCol(m.merchantColumn || '');
    setPaymentCol(m.paymentMethodColumn || '');
    if (m.amountType === 'separate_columns') {
      setAmountType('separate');
      setOutflowCol(m.outflowColumn);
      setInflowCol(m.inflowColumn);
    } else {
      setAmountType('single');
    }

    setStep(2);
  };

  // Build Previews and Categorize
  const handleProceedToCategorize = async () => {
    if (!parsedData) return;

    const categoryNames = categories.map((c) => c.name);

    const previews: CSVRowPreview[] = parsedData.rows.map((row) => {
      const dateStr = CSVParser.parseFlexibleDate(row[dateCol] || '');
      const rawDesc = row[descCol] || 'Unlabeled Expense';
      const rawMerch = merchantCol ? row[merchantCol] : '';
      const cleanMerch = rawMerch ? CategorizerEngine.cleanMerchantName(rawMerch) : CategorizerEngine.cleanMerchantName(rawDesc);

      let amount = 0;
      let type: 'expense' | 'income' = 'expense';

      if (amountType === 'single') {
        const rawAmtStr = (row[amountCol] || '0').replace(/[\$,]/g, '').trim();
        const num = parseFloat(rawAmtStr);
        if (!isNaN(num)) {
          if (num < 0) {
            amount = Math.abs(num);
            type = 'expense';
          } else {
            amount = Math.abs(num);
            type = 'expense'; // default outflow or detect inflow
          }
        }
      } else {
        const outVal = parseFloat((row[outflowCol] || '0').replace(/[\$,]/g, ''));
        const inVal = parseFloat((row[inflowCol] || '0').replace(/[\$,]/g, ''));

        if (!isNaN(inVal) && inVal > 0) {
          amount = inVal;
          type = 'income';
        } else if (!isNaN(outVal) && outVal > 0) {
          amount = outVal;
          type = 'expense';
        }
      }

      // 1. Try local rules
      const ruleMatch = CategorizerEngine.matchLocalRule(rawDesc, rules);

      let matchedCat = ruleMatch ? ruleMatch.category : 'Miscellaneous';
      let matchMethod: 'rule' | 'ai' | 'fallback' = ruleMatch ? 'rule' : 'fallback';
      let confidence = ruleMatch ? ruleMatch.confidence : 0.5;

      if (type === 'income' && !ruleMatch) {
        matchedCat = 'Income & Salary';
      }

      // Check duplicate
      const isDuplicate = existingTransactions.some(
        (t) => t.date === dateStr && Math.abs(t.amount - amount) < 0.01 && (t.merchant.toLowerCase() === cleanMerch.toLowerCase() || t.description.toLowerCase() === rawDesc.toLowerCase())
      );

      return {
        raw: row,
        parsed: {
          date: dateStr,
          description: rawDesc,
          merchant: cleanMerch,
          amount,
          type,
          category: matchedCat,
          paymentMethod: defaultPaymentMethod,
          tags: ['csv-import'],
        },
        matchedCategory: matchedCat,
        matchMethod,
        confidence,
        isDuplicate,
        selected: !isDuplicate, // auto deselect duplicate
      };
    });

    setRowPreviews(previews);
    setStep(3);
  };

  // Trigger Gemini AI Categorizer on items not matched by strict local rules
  const handleRunAICategorization = async () => {
    setIsCategorizingAI(true);

    try {
      const itemsToCategorize = rowPreviews.map((p) => p.parsed.description || '');
      const availableCategoryNames = categories.map((c) => c.name);

      const aiResults = await CategorizerEngine.categorizeBatchWithAI(
        itemsToCategorize,
        availableCategoryNames
      );

      setRowPreviews((prev) =>
        prev.map((item, idx) => {
          const aiMatch = aiResults.find((r) => r.itemIndex === idx);
          if (aiMatch && aiMatch.category) {
            return {
              ...item,
              matchedCategory: aiMatch.category,
              matchMethod: 'ai',
              confidence: aiMatch.confidence || 0.9,
              parsed: {
                ...item.parsed,
                category: aiMatch.category,
                merchant: aiMatch.cleanedMerchant || item.parsed.merchant,
              },
            };
          }
          return item;
        })
      );
    } catch (err) {
      console.error('AI categorization error:', err);
    } finally {
      setIsCategorizingAI(false);
    }
  };

  const handleFinalConfirm = () => {
    const selected = rowPreviews.filter((p) => p.selected);

    const finalTxList: Transaction[] = selected.map((p, index) => ({
      id: `tx-import-${Date.now()}-${index}`,
      date: p.parsed.date || new Date().toISOString().split('T')[0],
      description: p.parsed.description || 'Imported Transaction',
      merchant: p.parsed.merchant || 'Merchant',
      amount: p.parsed.amount || 0,
      type: p.parsed.type || 'expense',
      category: p.matchedCategory || 'Miscellaneous',
      paymentMethod: p.parsed.paymentMethod || defaultPaymentMethod,
      tags: p.parsed.tags || ['csv-import'],
      isAutoCategorized: p.matchMethod !== 'fallback',
      aiConfidence: p.confidence,
      createdAt: new Date().toISOString(),
    }));

    onConfirmImport(finalTxList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-lg">CSV Statement Importer</h2>
              <p className="text-xs text-slate-400">Step {step} of 3: {
                step === 1 ? 'Upload File' : step === 2 ? 'Map Columns' : 'Preview & AI Auto-Categorize'
              }</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-800/40 rounded-2xl p-8 text-center transition cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-200 text-sm mb-1">
                  Drag and drop your bank or credit card CSV statement here
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Supports Chase, Bank of America, Capital One, Wells Fargo, Amex, and custom CSVs
                </p>

                <label className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer transition">
                  <span>Browse CSV File</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">💡 Homelab Privacy Guarantee</p>
                <p>Your statement CSV is processed entirely in your local browser and server instance. No financial logs leave your homelab.</p>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapper */}
          {step === 2 && parsedData && (
            <div className="space-y-5">
              <div className="text-xs text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                Found <strong>{parsedData.rows.length} rows</strong> and headers: <span className="font-mono text-indigo-300">{parsedData.headers.join(', ')}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Date Col */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Date Column *</label>
                  <select
                    value={dateCol}
                    onChange={(e) => setDateCol(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                  >
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Description Col */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Description / Transaction Name *</label>
                  <select
                    value={descCol}
                    onChange={(e) => setDescCol(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                  >
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Amount Format Toggle */}
                <div className="md:col-span-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800 space-y-3">
                  <label className="block text-slate-300 font-semibold">Amount Format</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="amountType"
                        checked={amountType === 'single'}
                        onChange={() => setAmountType('single')}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <span>Single Amount Column (+ / -)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="amountType"
                        checked={amountType === 'separate'}
                        onChange={() => setAmountType('separate')}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <span>Separate Outflow & Inflow Columns</span>
                    </label>
                  </div>

                  {amountType === 'single' ? (
                    <div>
                      <label className="block text-slate-400 mb-1">Amount Column</label>
                      <select
                        value={amountCol}
                        onChange={(e) => setAmountCol(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                      >
                        {parsedData.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Outflow / Expense Column</label>
                        <select
                          value={outflowCol}
                          onChange={(e) => setOutflowCol(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                        >
                          <option value="">None</option>
                          {parsedData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Inflow / Deposit Column</label>
                        <select
                          value={inflowCol}
                          onChange={(e) => setInflowCol(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                        >
                          <option value="">None</option>
                          {parsedData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Default Payment Method */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Default Payment Method</label>
                  <select
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Digital Wallet">Digital Wallet</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleProceedToCategorize}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <span>Auto-Categorize & Preview</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Auto-Categorization */}
          {step === 3 && (
            <div className="space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="font-bold text-slate-200 text-sm">Previewing {rowPreviews.length} Rows</div>
                  <div className="text-xs text-slate-400">
                    {rowPreviews.filter((r) => r.matchMethod === 'rule').length} matched by local rules
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunAICategorization}
                    disabled={isCategorizingAI}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition"
                  >
                    {isCategorizingAI ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>AI Categorizing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Smart Gemini AI Categorize</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/90 text-slate-400 font-semibold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-3 w-8">Import</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Merchant / Description</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {rowPreviews.map((preview, index) => (
                      <tr
                        key={index}
                        className={`hover:bg-slate-800/40 transition ${
                          preview.isDuplicate ? 'bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={preview.selected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setRowPreviews((prev) =>
                                prev.map((item, idx) =>
                                  idx === index ? { ...item, selected: checked } : item
                                )
                              );
                            }}
                            className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                          />
                        </td>

                        <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                          {preview.parsed.date}
                        </td>

                        <td className="p-3 max-w-xs">
                          <div className="font-semibold text-slate-200 truncate">{preview.parsed.merchant}</div>
                          <div className="text-[10px] text-slate-500 truncate">{preview.parsed.description}</div>
                        </td>

                        <td className="p-3">
                          <select
                            value={preview.matchedCategory}
                            onChange={(e) => {
                              const newCat = e.target.value;
                              setRowPreviews((prev) =>
                                prev.map((item, idx) =>
                                  idx === index ? { ...item, matchedCategory: newCat } : item
                                )
                              );
                            }}
                            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </td>

                        <td className="p-3 text-right font-bold text-slate-100 whitespace-nowrap">
                          ${(preview.parsed.amount || 0).toFixed(2)}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          {preview.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-semibold">
                              <AlertTriangle className="w-3 h-3" /> Duplicate
                            </span>
                          ) : preview.matchMethod === 'ai' ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-semibold">
                              <Sparkles className="w-3 h-3 text-cyan-400" /> AI Matched
                            </span>
                          ) : preview.matchMethod === 'rule' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Rule
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Manual</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Back
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    Ready to import {rowPreviews.filter((p) => p.selected).length} items
                  </span>
                  <button
                    onClick={handleFinalConfirm}
                    disabled={rowPreviews.filter((p) => p.selected).length === 0}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20"
                  >
                    Confirm Import
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
