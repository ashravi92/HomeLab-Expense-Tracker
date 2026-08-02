import React from 'react';
import { 
  Server, 
  Plus, 
  Lock, 
  Unlock, 
  Search, 
  Menu, 
  ShieldCheck, 
  Terminal, 
  Sparkles,
  Download
} from 'lucide-react';
import { UserSettings, HomelabStats } from '../types';

interface NavbarProps {
  settings: UserSettings;
  stats: HomelabStats | null;
  onOpenQuickAdd: () => void;
  onOpenCsvImport: () => void;
  onLockApp: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onToggleMobileSidebar: () => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  stats,
  onOpenQuickAdd,
  onOpenCsvImport,
  onLockApp,
  searchQuery,
  setSearchQuery,
  onToggleMobileSidebar,
  activeTab,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 text-slate-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Mobile Toggle & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-lg sm:text-xl">
                  HOMELAB<span className="text-indigo-400 font-extrabold">SPEND</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                  v1.2.4-stable
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search transactions, merchants, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions & Server Status */}
        <div className="flex items-center gap-3">
          
          {/* Homelab Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[10px] uppercase text-slate-400">
              {stats ? `RAM ${stats.memoryUsage.heapUsedMB}MB` : 'Local Node: Active'}
            </span>
            {stats?.hasGeminiKey && (
              <span className="flex items-center gap-0.5 text-[10px] text-indigo-400 font-medium bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20" title="Gemini AI Active">
                <Sparkles className="w-3 h-3" /> AI
              </span>
            )}
          </div>

          {/* Import CSV Quick Action */}
          <button
            onClick={onOpenCsvImport}
            className="hidden sm:inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg px-4 py-2 text-sm font-medium transition active:scale-95"
            title="Import Bank CSV Statements"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>CSV Import</span>
          </button>

          {/* Quick Add Button */}
          <button
            onClick={onOpenQuickAdd}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Spend</span>
          </button>

          {/* Lock App / Auth Button */}
          {settings.isAuthEnabled && (
            <button
              onClick={onLockApp}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-lg transition"
              title="Lock Homelab Session"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
