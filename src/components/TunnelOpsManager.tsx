import React, { useState, useEffect } from 'react';
import { Terminal, Cpu, Globe, Shield, Copy, Check, RefreshCw, Radio, Server, Zap, Lock, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

export function TunnelOpsManager() {
  const [tunnelInfo, setTunnelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [agencyCode, setAgencyCode] = useState('OP-ALPHA-709');
  const [opMode, setOpMode] = useState<'local' | 'tunnel' | 'airgap'>('tunnel');

  const fetchTunnelInfo = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/tunnel/info');
      const data = await res.json();
      const duration = Math.round(performance.now() - start);
      setPingMs(duration);
      setTunnelInfo(data);
    } catch (e) {
      console.error('Failed to fetch tunnel info', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTunnelInfo();
    const interval = setInterval(fetchTunnelInfo, 15000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const localCmd = 'cloudflared tunnel --url http://localhost:3000';
  const dockerCmd = 'docker run -d -p 3000:3000 -e GEMINI_API_KEY=$GEMINI_API_KEY rune-osint:latest';
  const tokenTunnelCmd = 'cloudflared tunnel run --token <AGENCY_CLOUDFLARED_TOKEN>';

  return (
    <div className="bg-zinc-950 border border-red-900/40 p-4 rounded-lg space-y-4 text-zinc-100 font-sans shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-950/40 border border-red-600/40 rounded text-red-500 glow-red-sm">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-100 font-mono">
                Agency Ops & Cloudflare Tunnel Command
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-950 text-red-400 border border-red-800/60 uppercase">
                v4.0 Tactical
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">
              Local port listener 3000 // Ingress tunnel matrix & zero-trust proxy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTunnelInfo}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 rounded text-[10px] font-mono transition-colors"
          >
            <RefreshCw className={`w-3 h-3 text-red-500 ${loading ? 'animate-spin' : ''}`} />
            REFRESH STATUS
          </button>
        </div>
      </div>

      {/* Grid Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Status Item 1: Ingress Status */}
        <div className="bg-black/60 border border-zinc-800 p-3 rounded flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono uppercase">
            <span>Ingress Tunnel</span>
            <Globe className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${tunnelInfo?.isCloudflareTunnel ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-bold font-mono text-zinc-100">
                {tunnelInfo?.isCloudflareTunnel ? 'CLOUDFLARE ACTIVE' : 'LOCAL LOOPBACK'}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono block mt-0.5 truncate">
              {tunnelInfo?.cfRay ? `Ray: ${tunnelInfo.cfRay}` : 'Host: ' + (tunnelInfo?.host || 'localhost:3000')}
            </span>
          </div>
        </div>

        {/* Status Item 2: Latency */}
        <div className="bg-black/60 border border-zinc-800 p-3 rounded flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono uppercase">
            <span>Tunnel Latency</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold font-mono text-emerald-400">
              {pingMs !== null ? `${pingMs} ms` : 'Testing...'}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
              Protocol: {tunnelInfo?.protocol || 'HTTP/1.1'}
            </span>
          </div>
        </div>

        {/* Status Item 3: Client Ingress IP */}
        <div className="bg-black/60 border border-zinc-800 p-3 rounded flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono uppercase">
            <span>Client Gateway</span>
            <Server className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="mt-2">
            <span className="text-xs font-bold font-mono text-red-400 truncate block">
              {tunnelInfo?.clientIp || '127.0.0.1'}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
              Origin Port: {tunnelInfo?.localPort || 3000}
            </span>
          </div>
        </div>

        {/* Status Item 4: Agency Operational ID */}
        <div className="bg-black/60 border border-zinc-800 p-3 rounded flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono uppercase">
            <span>Agency Ops ID</span>
            <Shield className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="mt-2">
            <input
              type="text"
              value={agencyCode}
              onChange={(e) => setAgencyCode(e.target.value)}
              className="bg-zinc-900 border border-zinc-700/80 rounded px-1.5 py-0.5 text-xs font-bold font-mono text-red-400 w-full outline-none focus:border-red-500"
            />
            <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
              Clearance: TOP SECRET // SI-TK
            </span>
          </div>
        </div>
      </div>

      {/* Cloudflare Tunnel Quick Run Commands */}
      <div className="bg-black/80 border border-zinc-800 rounded p-3 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Quick Cloudflare Tunnel & Local Ops Shell Commands
          </span>
          <span className="text-[9px] text-zinc-500">Click icon to copy to terminal</span>
        </div>

        <div className="space-y-2 text-xs">
          {/* Quick Command 1 */}
          <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 px-2.5 py-1.5 rounded group hover:border-red-900/60 transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-red-500 font-bold">$</span>
              <span className="text-zinc-300 truncate font-mono text-[11px]">{localCmd}</span>
            </div>
            <button
              onClick={() => copyToClipboard(localCmd, 'local')}
              className="p-1 text-zinc-400 hover:text-red-400 transition-colors shrink-0"
              title="Copy Command"
            >
              {copiedKey === 'local' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Quick Command 2 */}
          <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 px-2.5 py-1.5 rounded group hover:border-red-900/60 transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-red-500 font-bold">$</span>
              <span className="text-zinc-300 truncate font-mono text-[11px]">{tokenTunnelCmd}</span>
            </div>
            <button
              onClick={() => copyToClipboard(tokenTunnelCmd, 'token')}
              className="p-1 text-zinc-400 hover:text-red-400 transition-colors shrink-0"
              title="Copy Command"
            >
              {copiedKey === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Quick Command 3 */}
          <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 px-2.5 py-1.5 rounded group hover:border-red-900/60 transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-red-500 font-bold">$</span>
              <span className="text-zinc-300 truncate font-mono text-[11px]">{dockerCmd}</span>
            </div>
            <button
              onClick={() => copyToClipboard(dockerCmd, 'docker')}
              className="p-1 text-zinc-400 hover:text-red-400 transition-colors shrink-0"
              title="Copy Command"
            >
              {copiedKey === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Deployment Mode Switcher & Operational Checklist */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-400 pt-1">
        <div className="flex items-center gap-2">
          <span className="uppercase text-zinc-500 font-bold">Deployment Mode:</span>
          <div className="flex bg-black border border-zinc-800 rounded p-0.5">
            <button
              onClick={() => setOpMode('local')}
              className={`px-2 py-0.5 rounded ${opMode === 'local' ? 'bg-red-950 text-red-400 font-bold border border-red-800/60' : 'hover:text-zinc-200'}`}
            >
              Localhost:3000
            </button>
            <button
              onClick={() => setOpMode('tunnel')}
              className={`px-2 py-0.5 rounded ${opMode === 'tunnel' ? 'bg-red-950 text-red-400 font-bold border border-red-800/60' : 'hover:text-zinc-200'}`}
            >
              Cloudflare Tunnel
            </button>
            <button
              onClick={() => setOpMode('airgap')}
              className={`px-2 py-0.5 rounded ${opMode === 'airgap' ? 'bg-red-950 text-red-400 font-bold border border-red-800/60' : 'hover:text-zinc-200'}`}
            >
              Isolated Airgap
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-500">
          <Lock className="w-3 h-3 text-red-500" />
          <span>All OSINT traffic routed via agency local/tunnel proxy</span>
        </div>
      </div>
    </div>
  );
}
