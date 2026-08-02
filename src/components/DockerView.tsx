import React, { useState, useEffect } from 'react';
import { Server, Copy, Check, Download, Terminal, Shield, RefreshCw } from 'lucide-react';

export const DockerView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [dockerConfigs, setDockerConfigs] = useState<{
    dockerCompose: string;
    dockerfile: string;
    envExample: string;
  }>({
    dockerCompose: '',
    dockerfile: '',
    envExample: '',
  });
  const [serverHealth, setServerHealth] = useState<any>(null);

  useEffect(() => {
    fetch('/api/docker/config')
      .then((res) => res.json())
      .then((data) => setDockerConfigs(data))
      .catch((err) => console.error('Failed to load docker configs:', err));

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setServerHealth(data))
      .catch(() => null);
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Server className="w-6 h-6 text-indigo-400" /> Self-Hosted Docker Deployment Kit
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configurations and Docker files to run this Spend Tracker in your own homelab (Portainer, Docker Compose, Unraid)
          </p>
        </div>

        {serverHealth && (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-slate-200">Local Container Active</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Uptime: {Math.floor(serverHealth.uptimeSeconds / 60)} mins | RAM: {serverHealth.memoryUsage?.heapUsedMB}MB
            </div>
          </div>
        )}
      </div>

      {/* Quick Launch Command Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" /> One-Command Homelab Deploy
        </h2>
        
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs font-mono text-cyan-300">
          <code>docker compose up -d --build</code>
          <button
            onClick={() => handleCopy('docker compose up -d --build', 'cmd')}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            {copiedKey === 'cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Docker Compose YAML Code Block */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 font-mono">docker-compose.yml</h2>
          <button
            onClick={() => handleCopy(dockerConfigs.dockerCompose, 'compose')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {copiedKey === 'compose' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-400" /> Copy YAML
              </>
            )}
          </button>
        </div>

        <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
          {dockerConfigs.dockerCompose || '# Loading docker-compose.yml...'}
        </pre>
      </div>

      {/* Dockerfile Block */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 font-mono">Dockerfile</h2>
          <button
            onClick={() => handleCopy(dockerConfigs.dockerfile, 'df')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {copiedKey === 'df' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-400" /> Copy Dockerfile
              </>
            )}
          </button>
        </div>

        <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
          {dockerConfigs.dockerfile || '# Loading Dockerfile...'}
        </pre>
      </div>

    </div>
  );
};
