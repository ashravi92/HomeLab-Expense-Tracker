import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  UploadCloud, 
  PieChart, 
  Zap, 
  FileSpreadsheet, 
  Server, 
  Settings,
  X,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  uncategorizedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
  uncategorizedCount = 0,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText, badge: uncategorizedCount > 0 ? uncategorizedCount : undefined },
    { id: 'import', label: 'CSV Import', icon: UploadCloud, highlight: true },
    { id: 'budgets', label: 'Budget Limits', icon: PieChart },
    { id: 'rules', label: 'Auto-Rules', icon: Zap },
    { id: 'reports', label: 'Monthly Reports', icon: FileSpreadsheet },
    { id: 'docker', label: 'Homelab & Docker', icon: Server },
    { id: 'settings', label: 'Settings & Security', icon: Settings },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 min-h-[calc(100vh-65px)] p-4">
        <nav className="flex-1 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Main Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/30">
                    {item.badge}
                  </span>
                )}

                {item.highlight && !isActive && (
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Homelab Info Box */}
        <div className="mt-auto pt-4 border-t border-slate-800/80 px-2">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-800 text-xs text-slate-400">
            <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
              <span>Local Container</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Data strictly stays on your local machine. No external telemetry.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs bg-slate-900 border-r border-slate-800 h-full p-4 flex flex-col z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-slate-100">Homelab Spend</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1 flex-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-md'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="bg-amber-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 flex items-center justify-around text-slate-400">
        {[
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'transactions', label: 'Spends', icon: ReceiptText },
          { id: 'import', label: 'CSV', icon: UploadCloud },
          { id: 'budgets', label: 'Budgets', icon: PieChart },
          { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center gap-1 min-w-[56px] py-1 px-2 rounded-lg transition ${
                isActive ? 'text-indigo-400 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
