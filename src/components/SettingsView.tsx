import React, { useState } from 'react';
import { Settings, Lock, Shield, Key, Download, Upload, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { UserSettings } from '../types';
import { StorageService } from '../lib/storage';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (updated: UserSettings) => void;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRefreshData,
}) => {
  const [pinInput, setPinInput] = useState<string>(settings.pinCode || '1234');
  const [currencyInput, setCurrencyInput] = useState<string>(settings.currencySymbol || '$');
  const [isAuthEnabled, setIsAuthEnabled] = useState<boolean>(settings.isAuthEnabled);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserSettings = {
      ...settings,
      isAuthEnabled,
      pinCode: pinInput.trim(),
      currencySymbol: currencyInput.trim(),
    };

    onUpdateSettings(updated);
    setSaveSuccessMsg('Settings updated successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleExportJSON = () => {
    const jsonStr = StorageService.exportFullBackupJSON();
    const filename = `homelab_spend_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = StorageService.importFullBackupJSON(content);
        if (ok) {
          setImportStatus('Backup restored successfully!');
          onRefreshData();
        } else {
          setImportStatus('Error restoring backup file. Check JSON structure.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all data back to the default initial sample?')) {
      StorageService.resetToDefaultSample();
      onRefreshData();
      alert('Data reset to default sample set!');
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" /> Settings & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure local session security, currency formatting, and homelab data backups
        </p>
      </div>

      {/* Security & Lock Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Shield className="w-4 h-4 text-amber-400" /> Local Session Lock & Security
        </div>

        <form onSubmit={handleSaveSecurity} className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-800">
            <div>
              <div className="font-bold text-slate-200">Require PIN / Master Key to Unlock</div>
              <div className="text-[11px] text-slate-400">Prompts for security code when opening session</div>
            </div>
            <input
              type="checkbox"
              checked={isAuthEnabled}
              onChange={(e) => setIsAuthEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Master Lock PIN / Code</label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="4-8 digit PIN"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Currency Symbol</label>
              <input
                type="text"
                value={currencyInput}
                onChange={(e) => setCurrencyInput(e.target.value)}
                placeholder="$, €, £, ¥"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-bold shadow-md shadow-indigo-600/20 transition"
            >
              Save Preferences
            </button>

            {saveSuccessMsg && (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> {saveSuccessMsg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Homelab Data Backup & Restore */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Download className="w-4 h-4 text-cyan-400" /> Data Backup & Migration (JSON)
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Export your entire spend history, category rules, and budget goals into a single portable JSON file.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportJSON}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-cyan-400" /> Export JSON Backup
          </button>

          <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer transition">
            <Upload className="w-4 h-4 text-indigo-400" /> Restore JSON Backup
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          <button
            onClick={handleResetData}
            className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2 transition ml-auto"
          >
            <RefreshCw className="w-4 h-4" /> Reset Sample Data
          </button>
        </div>

        {importStatus && (
          <div className="p-3 bg-slate-800 rounded-xl text-xs font-medium text-slate-200 border border-slate-700">
            {importStatus}
          </div>
        )}
      </div>

    </div>
  );
};
