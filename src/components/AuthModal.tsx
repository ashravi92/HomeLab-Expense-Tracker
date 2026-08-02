import React, { useState } from 'react';
import { Lock, Server, Shield, KeyRound, AlertCircle } from 'lucide-react';
import { UserSettings } from '../types';

interface AuthModalProps {
  isLocked: boolean;
  settings: UserSettings;
  onUnlock: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isLocked,
  settings,
  onUnlock,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isLocked) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === (settings.pinCode || '1234')) {
      setErrorMsg(null);
      setPinInput('');
      onUnlock();
    } else {
      setErrorMsg('Invalid PIN or password. Please try again.');
      setPinInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-100">Homelab Spend Lock</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter your local security PIN to access financial records
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Enter PIN code"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              autoFocus
              className="w-full text-center tracking-widest text-lg font-mono bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-400 font-semibold flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" /> {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-3 transition shadow-md shadow-indigo-600/20"
          >
            Unlock Session
          </button>
        </form>

        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
          Default initial PIN is <code className="text-indigo-400 font-mono">1234</code> if unconfigured.
        </div>

      </div>
    </div>
  );
};
