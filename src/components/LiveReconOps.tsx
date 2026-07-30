import React, { useState } from 'react';
import { Search, Globe, Shield, Terminal, ArrowRight, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Plus, RefreshCw, Cpu } from 'lucide-react';
import { motion } from 'motion/react';
import { InvestigationState, TargetData } from '../types';

interface LiveReconOpsProps {
  state: InvestigationState;
  onUpdateState: (newState: Partial<InvestigationState>) => void;
}

export function LiveReconOps({ state, onUpdateState }: LiveReconOpsProps) {
  const [targetDomain, setTargetDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [dnsResults, setDnsResults] = useState<any>(null);
  const [headerResults, setHeaderResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'dns' | 'headers'>('dns');

  const executeRecon = async () => {
    if (!targetDomain) return;
    setLoading(true);
    setError(null);
    setDnsResults(null);
    setHeaderResults(null);

    const clean = targetDomain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');

    try {
      if (activeSubTab === 'dns') {
        const res = await fetch('/api/ops/dns-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: clean })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'DNS lookup failed');
        setDnsResults(data);
      } else {
        const res = await fetch('/api/ops/headers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: clean })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Header lookup failed');
        setHeaderResults(data);
      }
    } catch (err: any) {
      setError(err.message || 'Live recon request failed');
    } finally {
      setLoading(false);
    }
  };

  const addDomainToTargets = (val: string, type: keyof TargetData = 'domains') => {
    if (!val) return;
    const existing = state.targets[type];
    if (!existing.includes(val)) {
      onUpdateState({
        targets: {
          ...state.targets,
          [type]: [...existing, val]
        }
      });
    }
  };

  return (
    <div className="bg-zinc-950 border border-red-900/40 p-5 rounded-lg space-y-4 font-sans shadow-2xl">
      {/* Header & Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-950/60 border border-red-700/60 rounded text-red-500 glow-red-sm">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-100 font-mono">
              Live Network & Infrastructure Recon Engine
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              Direct DNS resolution & HTTP security headers probe
            </p>
          </div>
        </div>

        <div className="flex bg-black border border-zinc-800 rounded p-0.5 text-xs font-mono">
          <button
            onClick={() => setActiveSubTab('dns')}
            className={`px-3 py-1 rounded transition-colors ${activeSubTab === 'dns' ? 'bg-red-950 text-red-400 font-bold border border-red-800/60' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            DNS RESOLVER
          </button>
          <button
            onClick={() => setActiveSubTab('headers')}
            className={`px-3 py-1 rounded transition-colors ${activeSubTab === 'headers' ? 'bg-red-950 text-red-400 font-bold border border-red-800/60' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            HTTP HEADERS & SECURITY
          </button>
        </div>
      </div>

      {/* Target Input Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={targetDomain}
            onChange={(e) => setTargetDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeRecon()}
            placeholder={activeSubTab === 'dns' ? "Enter domain (e.g. example.com)..." : "Enter URL or domain (e.g. https://example.com)..."}
            className="w-full bg-black border border-zinc-800 rounded py-2 pl-9 pr-4 text-xs font-mono text-zinc-200 outline-none focus:border-red-600 transition-colors placeholder:text-zinc-600"
          />
        </div>
        <button
          onClick={executeRecon}
          disabled={loading || !targetDomain}
          className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-mono font-bold text-xs px-5 py-2 rounded uppercase tracking-wider transition-all flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
          {loading ? 'Probing...' : 'Execute Probe'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-900/80 rounded text-red-400 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-3 font-mono text-xs">
        {activeSubTab === 'dns' && dnsResults && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800 pb-1">
              <span>Domain: <strong className="text-zinc-100">{dnsResults.domain}</strong></span>
              <button
                onClick={() => addDomainToTargets(dnsResults.domain, 'domains')}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> ADD TO TARGETS
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* A Records */}
              <div className="bg-black/70 border border-zinc-800 p-3 rounded space-y-1">
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">A Records (IPv4)</span>
                {dnsResults.records.A.length > 0 ? (
                  dnsResults.records.A.map((ip: string, i: number) => (
                    <div key={i} className="flex items-center justify-between py-0.5 border-b border-zinc-900 last:border-none text-zinc-300">
                      <span>{ip}</span>
                      <button
                        onClick={() => addDomainToTargets(ip, 'domains')}
                        className="text-[9px] text-zinc-500 hover:text-red-400"
                      >
                        +Target
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-zinc-600 italic text-[10px]">No A records found</span>
                )}
              </div>

              {/* MX Records */}
              <div className="bg-black/70 border border-zinc-800 p-3 rounded space-y-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">MX Records (Mail Exchangers)</span>
                {dnsResults.records.MX.length > 0 ? (
                  dnsResults.records.MX.map((mx: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-0.5 border-b border-zinc-900 last:border-none text-zinc-300">
                      <span className="truncate">{mx.exchange} (Prio {mx.priority})</span>
                      <button
                        onClick={() => addDomainToTargets(mx.exchange, 'domains')}
                        className="text-[9px] text-zinc-500 hover:text-red-400 shrink-0"
                      >
                        +Target
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-zinc-600 italic text-[10px]">No MX records found</span>
                )}
              </div>

              {/* NS Records */}
              <div className="bg-black/70 border border-zinc-800 p-3 rounded space-y-1">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">NS Records (Nameservers)</span>
                {dnsResults.records.NS.length > 0 ? (
                  dnsResults.records.NS.map((ns: string, i: number) => (
                    <div key={i} className="text-zinc-300 py-0.5 border-b border-zinc-900 last:border-none truncate">
                      {ns}
                    </div>
                  ))
                ) : (
                  <span className="text-zinc-600 italic text-[10px]">No NS records found</span>
                )}
              </div>

              {/* TXT Records */}
              <div className="bg-black/70 border border-zinc-800 p-3 rounded space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">TXT Records</span>
                {dnsResults.records.TXT.length > 0 ? (
                  dnsResults.records.TXT.map((txt: string, i: number) => (
                    <div key={i} className="text-zinc-400 text-[10px] break-all py-0.5 border-b border-zinc-900 last:border-none">
                      {txt}
                    </div>
                  ))
                ) : (
                  <span className="text-zinc-600 italic text-[10px]">No TXT records found</span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'headers' && headerResults && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800 pb-1">
              <span>Target: <strong className="text-zinc-100">{headerResults.url}</strong></span>
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${headerResults.statusCode === 200 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                STATUS {headerResults.statusCode} {headerResults.statusText}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Security Header Checklist */}
              <div className="bg-black/70 border border-zinc-800 p-3 rounded space-y-2">
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Security Header Audit</span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between border-b border-zinc-900 pb-1">
                    <span className="text-zinc-400">Strict-Transport-Security (HSTS):</span>
                    <span className={headerResults.securityHeaders.hsts === 'Missing' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                      {headerResults.securityHeaders.hsts}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-1">
                    <span className="text-zinc-400">Content-Security-Policy (CSP):</span>
                    <span className={headerResults.securityHeaders.csp === 'Missing' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                      {headerResults.securityHeaders.csp.substring(0, 30)}...
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-1">
                    <span className="text-zinc-400">X-Frame-Options:</span>
                    <span className={headerResults.securityHeaders.xframe === 'Missing' ? 'text-amber-400' : 'text-emerald-400'}>
                      {headerResults.securityHeaders.xframe}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Server Banner:</span>
                    <span className="text-zinc-200">{headerResults.securityHeaders.server}</span>
                  </div>
                </div>
              </div>

              {/* Raw Headers JSON */}
              <div className="bg-black/70 border border-zinc-800 p-3 rounded space-y-1 overflow-x-auto max-h-48">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Raw Response Headers</span>
                <pre className="text-[10px] text-zinc-300 font-mono whitespace-pre-wrap">
                  {JSON.stringify(headerResults.rawHeaders, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {!loading && !dnsResults && !headerResults && !error && (
          <div className="p-8 border border-dashed border-zinc-800/80 rounded flex flex-col items-center justify-center text-zinc-600 gap-2 text-center italic">
            <Terminal className="w-6 h-6 opacity-40 text-red-500" />
            <span>Ready for target probe. Enter a domain or URL above to initiate live network recon.</span>
          </div>
        )}
      </div>
    </div>
  );
}
