import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  RefreshCw, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Calendar, 
  CreditCard, 
  DownloadCloud, 
  Zap, 
  Link2, 
  Unlink, 
  Eye, 
  EyeOff,
  Sparkles,
  Database,
  Info
} from 'lucide-react';
import { UserSettings, Transaction, CategoryRule, Category, SimpleFinAccount } from '../types';
import { SimpleFinService } from '../lib/simplefin';

interface SimpleFinViewProps {
  settings: UserSettings;
  rules: CategoryRule[];
  categories: Category[];
  existingTransactions: Transaction[];
  onUpdateSettings: (newSettings: UserSettings) => void;
  onImportTransactions: (transactions: Transaction[]) => void;
  onOpenAiCategorizer?: () => void;
}

export const SimpleFinView: React.FC<SimpleFinViewProps> = ({
  settings,
  rules,
  categories,
  existingTransactions,
  onUpdateSettings,
  onImportTransactions,
}) => {
  const [claimTokenInput, setClaimTokenInput] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const [isFetchingAccounts, setIsFetchingAccounts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SimpleFinAccount[]>([]);
  
  const [showAccessUrl, setShowAccessUrl] = useState(false);
  const [syncDays, setSyncDays] = useState<number>(30);
  const [useAiCategorization, setUseAiCategorization] = useState(true);

  const [lastSyncResult, setLastSyncResult] = useState<{
    newCount: number;
    duplicateCount: number;
    timestamp: string;
  } | null>(null);

  const isConnected = Boolean(settings.simpleFinAccessUrl);

  // Auto fetch accounts on mount if connected
  useEffect(() => {
    if (isConnected) {
      handleFetchAccounts();
    }
  }, [settings.simpleFinAccessUrl]);

  // Claim Setup Token
  const handleClaimToken = async (tokenToUse?: string) => {
    const token = tokenToUse || claimTokenInput;
    if (!token.trim()) return;

    setIsClaiming(true);
    setClaimError(null);
    setClaimSuccess(null);

    const result = await SimpleFinService.claimToken(token.trim());
    setIsClaiming(false);

    if (!result.success || !result.accessUrl) {
      setClaimError(result.error || 'Failed to claim token');
    } else {
      setClaimSuccess('Successfully claimed SimpleFIN Access URL!');
      onUpdateSettings({
        ...settings,
        simpleFinAccessUrl: result.accessUrl,
      });
      setClaimTokenInput('');
    }
  };

  // Fetch Accounts & Transactions
  const handleFetchAccounts = async () => {
    if (!settings.simpleFinAccessUrl) return;

    setIsFetchingAccounts(true);
    setFetchError(null);

    // Calculate unix timestamp for start date
    const now = Math.floor(Date.now() / 1000);
    const startDate = now - syncDays * 86400;

    const result = await SimpleFinService.fetchAccounts(
      settings.simpleFinAccessUrl,
      startDate
    );

    setIsFetchingAccounts(false);

    if (!result.success) {
      setFetchError(result.error || 'Error contacting SimpleFIN Bridge');
    } else {
      setAccounts(result.accounts || []);
    }
  };

  // Perform Bank Sync & Merge Transactions
  const handleSyncAndMerge = async () => {
    if (!accounts.length) {
      await handleFetchAccounts();
    }

    if (!accounts.length) return;

    setIsFetchingAccounts(true);

    const { newTransactions, duplicateCount } = SimpleFinService.convertToAppTransactions(
      accounts,
      rules,
      categories,
      existingTransactions
    );

    let finalTransactions = newTransactions;

    // Optional Gemini AI enhancement on un-categorized items
    if (useAiCategorization && newTransactions.length > 0 && settings.autoRunAIOnImport) {
      try {
        const uncategorizedItems = newTransactions
          .filter((t) => t.category === 'Miscellaneous' || !t.isAutoCategorized)
          .map((t, idx) => ({
            index: idx,
            description: t.description,
            amount: t.amount,
          }));

        if (uncategorizedItems.length > 0) {
          const aiRes = await fetch('/api/categorize/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: uncategorizedItems,
              availableCategories: categories.map((c) => c.name),
            }),
          });
          const aiData = await aiRes.json();
          if (aiData.success && Array.isArray(aiData.results)) {
            const aiResultsMap = new Map<number, { category?: string; cleanedMerchant?: string; confidence?: number }>();
            aiData.results.forEach((r: any) => {
              if (typeof r.itemIndex === 'number') {
                aiResultsMap.set(r.itemIndex, r);
              }
            });

            finalTransactions = newTransactions.map((tx, idx) => {
              const aiMatch = aiResultsMap.get(idx);
              if (aiMatch) {
                return {
                  ...tx,
                  category: aiMatch.category || tx.category,
                  merchant: aiMatch.cleanedMerchant || tx.merchant,
                  isAutoCategorized: true,
                  aiConfidence: aiMatch.confidence || 0.85,
                };
              }
              return tx;
            });
          }
        }
      } catch (e) {
        console.warn('AI enrichment skipped:', e);
      }
    }

    if (finalTransactions.length > 0) {
      onImportTransactions(finalTransactions);
    }

    const syncTime = new Date().toLocaleString();
    onUpdateSettings({
      ...settings,
      simpleFinLastSync: syncTime,
    });

    setLastSyncResult({
      newCount: finalTransactions.length,
      duplicateCount,
      timestamp: syncTime,
    });

    setIsFetchingAccounts(false);
  };

  // Disconnect SimpleFIN
  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect SimpleFIN Bridge? Your saved access URL will be removed.')) {
      onUpdateSettings({
        ...settings,
        simpleFinAccessUrl: undefined,
        simpleFinLastSync: undefined,
      });
      setAccounts([]);
      setClaimSuccess(null);
      setLastSyncResult(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* View Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">SimpleFIN Bank Sync</h1>
                <span className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded-full border ${
                  isConnected 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {isConnected ? 'Connected' : 'Setup Required'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated bank account feeds & spend sync via the open SimpleFIN Bridge standard
              </p>
            </div>
          </div>

          {isConnected && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleFetchAccounts}
                disabled={isFetchingAccounts}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isFetchingAccounts ? 'animate-spin' : ''}`} />
                <span>Refresh Feeds</span>
              </button>

              <button
                onClick={handleSyncAndMerge}
                disabled={isFetchingAccounts}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Sync Spend Now</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Connection Status / Setup Card */}
      {!isConnected ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">Connect Your SimpleFIN Setup Token</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                SimpleFIN allows privacy-focused automated connection to thousands of US & Canadian financial institutions without storing passwords in your homelab.
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                SimpleFIN Setup Token (Claim URL or Base64 string)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste your setup token (e.g. aHR0cHM6Ly9icmlkZ2Uuc2ltcGxlZmluLm9yZy...)"
                  value={claimTokenInput}
                  onChange={(e) => setClaimTokenInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleClaimToken()}
                  disabled={isClaiming || !claimTokenInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-indigo-600/20 shrink-0"
                >
                  {isClaiming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  <span>Claim & Connect</span>
                </button>
              </div>
            </div>

            {/* Quick Demo Token Action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">Want to test without a real SimpleFIN account?</span>
              <button
                onClick={() => handleClaimToken('demo-token')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg border border-cyan-500/20 transition"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Try Demo Bank Connection</span>
              </button>
            </div>

            {claimError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{claimError}</span>
              </div>
            )}

            {claimSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{claimSuccess}</span>
              </div>
            )}
          </div>

          {/* SimpleFIN Information Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 space-y-1">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Privacy First
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Credentials are saved locally in your homelab. No third party tracks your financial records.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 space-y-1">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Smart Auto-Categorization
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Incoming bank transactions pass through your custom rules and optional Gemini AI engine.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 space-y-1">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-400" /> Duplicate Safe
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Smart deduplication algorithms prevent importing duplicate transactions across multiple syncs.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Connected Status & Controls */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>SimpleFIN Access URL Configured</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>Last sync: {settings.simpleFinLastSync || 'Never'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              className="text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Disconnect Access URL</span>
            </button>
          </div>

          {/* Sync Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Sync History Window
              </label>
              <select
                value={syncDays}
                onChange={(e) => setSyncDays(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={7}>Last 7 Days</option>
                <option value={14}>Last 14 Days</option>
                <option value={30}>Last 30 Days (Default)</option>
                <option value={90}>Last 90 Days</option>
                <option value={180}>Last 180 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                AI Auto-Categorizer
              </label>
              <label className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={useAiCategorization}
                  onChange={(e) => setUseAiCategorization(e.target.checked)}
                  className="rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500"
                />
                <span>Run Gemini AI on uncategorized items</span>
              </label>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSyncAndMerge}
                disabled={isFetchingAccounts}
                className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Import & Merge Transactions</span>
              </button>
            </div>
          </div>

          {lastSyncResult && (
            <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Sync complete! Imported <strong>{lastSyncResult.newCount}</strong> new transactions ({lastSyncResult.duplicateCount} duplicates skipped).
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{lastSyncResult.timestamp}</span>
            </div>
          )}

          {fetchError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}

          {/* Masked Access URL inspection */}
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <span>Access Endpoint:</span>
              <span className="font-mono text-slate-300">
                {showAccessUrl 
                  ? settings.simpleFinAccessUrl 
                  : settings.simpleFinAccessUrl.replace(/\/\/[^@]+@/, '//••••:••••@')}
              </span>
              <button
                onClick={() => setShowAccessUrl(!showAccessUrl)}
                className="text-slate-500 hover:text-slate-300 ml-1"
                title="Toggle Visibility"
              >
                {showAccessUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Synced Bank Accounts Cards */}
      {accounts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <span>Connected Accounts ({accounts.length})</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const balanceNum = parseFloat(acc.balance || '0');
              const availNum = acc['available-balance'] ? parseFloat(acc['available-balance']) : null;
              const txCount = acc.transactions?.length || 0;

              return (
                <div
                  key={acc.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {acc.org?.name || 'Financial Institution'}
                      </span>
                      <h3 className="text-base font-bold text-white truncate max-w-[200px]">{acc.name}</h3>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                      <Landmark className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="text-xs text-slate-400 font-medium">Current Balance</div>
                    <div className={`text-2xl font-bold tracking-tight ${balanceNum >= 0 ? 'text-white' : 'text-amber-400'}`}>
                      ${Math.abs(balanceNum).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {balanceNum < 0 && <span className="text-xs font-normal text-amber-400 ml-1">(Owed)</span>}
                    </div>

                    {availNum !== null && (
                      <div className="text-[11px] text-slate-400 mt-1">
                        Available: ${availNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/50">
                    <span>{txCount} fetched transactions</span>
                    <span className="font-mono text-slate-400">{acc.currency || 'USD'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Synced Transactions Preview Table */}
      {accounts.some((a) => (a.transactions?.length || 0) > 0) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <DownloadCloud className="w-5 h-5 text-cyan-400" />
              <span>Live SimpleFIN Stream Preview</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Total Streamed: {accounts.reduce((sum, a) => sum + (a.transactions?.length || 0), 0)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Posted Date</th>
                  <th className="p-3">Payee / Description</th>
                  <th className="p-3">Account</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {accounts.flatMap((acc) =>
                  (acc.transactions || []).map((sftx) => {
                    const dateStr = sftx.posted ? new Date(sftx.posted * 1000).toISOString().split('T')[0] : 'N/A';
                    const amt = parseFloat(sftx.amount || '0');
                    return (
                      <tr key={sftx.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 font-mono text-slate-400">{dateStr}</td>
                        <td className="p-3">
                          <div className="font-medium text-slate-200">{sftx.payee || sftx.description}</div>
                          {sftx.memo && <div className="text-[10px] text-slate-500">{sftx.memo}</div>}
                        </td>
                        <td className="p-3 text-slate-400">{acc.name}</td>
                        <td className={`p-3 text-right font-bold ${amt < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {amt < 0 ? '-' : '+'}${Math.abs(amt).toFixed(2)}
                        </td>
                        <td className="p-3 text-right">
                          <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                            {sftx.pending ? 'Pending' : 'Posted'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
