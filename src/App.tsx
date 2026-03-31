/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Shield, 
  Search, 
  Globe, 
  Users, 
  Ghost, 
  CreditCard, 
  Share2, 
  Map, 
  Archive, 
  Cpu, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Terminal, 
  FileText, 
  AlertTriangle,
  ChevronRight,
  Loader2,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { TargetData, ContextualInfo, InvestigationState, OSINTCategory } from './types';

const INITIAL_STATE: InvestigationState = {
  targets: {
    domains: [],
    usernames: [],
    emails: [],
    names: [],
    phones: [],
    crypto: [],
    other: []
  },
  context: {
    industry: '',
    relationships: ''
  },
  notes: ''
};

const CATEGORIES: { id: OSINTCategory; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'infrastructure', label: 'Infrastructure', icon: <Globe className="w-4 h-4" />, description: 'DNS, WHOIS, Reverse IP, Hosting' },
  { id: 'social', label: 'Social Media', icon: <Users className="w-4 h-4" />, description: 'Username search, Account correlation' },
  { id: 'darkweb', label: 'Dark Web', icon: <Ghost className="w-4 h-4" />, description: 'Hidden services, Leak databases' },
  { id: 'financial', label: 'Financial', icon: <CreditCard className="w-4 h-4" />, description: 'Crypto tracing, Payment processors' },
  { id: 'graph', label: 'Graph Analysis', icon: <Share2 className="w-4 h-4" />, description: 'Relationship mapping, Maltego' },
  { id: 'geospatial', label: 'Geospatial', icon: <Map className="w-4 h-4" />, description: 'Satellite, Geotags, Registrations' },
  { id: 'archival', label: 'Archival', icon: <Archive className="w-4 h-4" />, description: 'Wayback Machine, Historical data' },
  { id: 'ai', label: 'AI Analysis', icon: <Cpu className="w-4 h-4" />, description: 'Correlate data points with Gemini' },
];

export default function App() {
  const [state, setState] = useState<InvestigationState>(INITIAL_STATE);
  const [activeCategory, setActiveCategory] = useState<OSINTCategory>('infrastructure');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const addTarget = (type: keyof TargetData, value: string) => {
    if (!value.trim()) return;
    setState(prev => ({
      ...prev,
      targets: {
        ...prev.targets,
        [type]: [...prev.targets[type], value.trim()]
      }
    }));
  };

  const removeTarget = (type: keyof TargetData, index: number) => {
    setState(prev => ({
      ...prev,
      targets: {
        ...prev.targets,
        [type]: prev.targets[type].filter((_, i) => i !== index)
      }
    }));
  };

  const runAiAnalysis = async () => {
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `
        As an OSINT expert, analyze the following target data and provide a strategic investigation plan.
        
        TARGETS:
        - Domains: ${state.targets.domains.join(', ') || 'None'}
        - Usernames: ${state.targets.usernames.join(', ') || 'None'}
        - Emails: ${state.targets.emails.join(', ') || 'None'}
        - Names: ${state.targets.names.join(', ') || 'None'}
        - Phones: ${state.targets.phones.join(', ') || 'None'}
        - Crypto: ${state.targets.crypto.join(', ') || 'None'}
        
        CONTEXT:
        - Industry: ${state.context.industry || 'Not specified'}
        - Relationships: ${state.context.relationships || 'Not specified'}
        
        NOTES:
        ${state.notes || 'None'}
        
        Please provide:
        1. High-level summary of the target profile.
        2. Priority pivots (which data points to investigate first).
        3. Specific tools and techniques from the ADVANCED OSINT INVESTIGATION FRAMEWORK that are most relevant here.
        4. Potential risks or operational security (OPSEC) considerations.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAiResponse(response.text || 'No response generated.');
    } catch (error) {
      console.error('AI Analysis failed:', error);
      setAiResponse('Error generating analysis. Please check your API key and try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans scanline relative overflow-hidden">
      {/* Header */}
      <header className="border-b border-ink p-4 flex items-center justify-between bg-ink text-bg z-20">
        <div className="flex items-center gap-3 glitch cursor-pointer">
          <Shield className="w-6 h-6" />
          <h1 className="text-xl font-bold tracking-tighter uppercase italic">OSINT Investigator</h1>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => {
              if (confirm('Clear all investigation data?')) {
                setState(INITIAL_STATE);
                setAiResponse('');
              }
            }}
            className="text-[10px] font-mono opacity-60 hover:opacity-100 uppercase tracking-widest flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear Session
          </button>
          <div className="text-[10px] font-mono opacity-60 uppercase tracking-widest">
            Advanced Framework v1.0 // System Ready
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar - Targets */}
        <aside className="w-80 border-r border-ink overflow-y-auto p-4 flex flex-col gap-6 bg-bg/50">
          <section>
            <h2 className="col-header mb-4">Primary Targets</h2>
            <div className="space-y-4">
              <TargetInput 
                label="Domains" 
                type="domains" 
                values={state.targets.domains} 
                onAdd={addTarget} 
                onRemove={removeTarget} 
              />
              <TargetInput 
                label="Usernames" 
                type="usernames" 
                values={state.targets.usernames} 
                onAdd={addTarget} 
                onRemove={removeTarget} 
              />
              <TargetInput 
                label="Emails" 
                type="emails" 
                values={state.targets.emails} 
                onAdd={addTarget} 
                onRemove={removeTarget} 
              />
              <TargetInput 
                label="Names" 
                type="names" 
                values={state.targets.names} 
                onAdd={addTarget} 
                onRemove={removeTarget} 
              />
              <TargetInput 
                label="Crypto" 
                type="crypto" 
                values={state.targets.crypto} 
                onAdd={addTarget} 
                onRemove={removeTarget} 
              />
            </div>
          </section>

          <section>
            <h2 className="col-header mb-4">Contextual Info</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold opacity-50 block mb-1">Industry / Community</label>
                <input 
                  className="w-full bg-transparent border border-ink/20 p-2 text-sm focus:border-ink outline-none"
                  placeholder="e.g. OSRS, Crypto, Gaming"
                  value={state.context.industry}
                  onChange={e => setState(prev => ({ ...prev, context: { ...prev.context, industry: e.target.value } }))}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold opacity-50 block mb-1">Known Relationships</label>
                <textarea 
                  className="w-full bg-transparent border border-ink/20 p-2 text-sm focus:border-ink outline-none min-h-[80px]"
                  placeholder="Affiliated domains, partners..."
                  value={state.context.relationships}
                  onChange={e => setState(prev => ({ ...prev, context: { ...prev.context, relationships: e.target.value } }))}
                />
              </div>
            </div>
          </section>

          <section className="flex-1 flex flex-col min-h-0">
            <h2 className="col-header mb-4">Investigation Notes</h2>
            <textarea 
              className="flex-1 w-full bg-transparent border border-ink/20 p-2 text-sm focus:border-ink outline-none font-mono resize-none"
              placeholder="Case notes, findings, pivot points..."
              value={state.notes}
              onChange={e => setState(prev => ({ ...prev, notes: e.target.value }))}
            />
          </section>

          <button 
            onClick={() => {
              const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `osint-case-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
            }}
            className="w-full border border-ink p-3 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-bg transition-all flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Export Case Data
          </button>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navigation Tabs */}
          <nav className="border-b border-ink flex overflow-x-auto no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest border-r border-ink transition-all whitespace-nowrap",
                  activeCategory === cat.id ? "bg-ink text-bg" : "hover:bg-ink/5"
                )}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </nav>

          {/* Category Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto"
              >
                <div className="mb-8">
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-2">{activeCategory.replace(/([A-Z])/g, ' $1')}</h2>
                  <p className="text-sm opacity-60 font-mono">{CATEGORIES.find(c => c.id === activeCategory)?.description}</p>
                </div>

                {activeCategory === 'ai' ? (
                  <div className="space-y-6">
                    <div className="bg-ink text-bg p-6 border border-ink">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-5 h-5" />
                          <span className="font-bold uppercase tracking-widest">Gemini Analysis Engine</span>
                        </div>
                        <button 
                          onClick={runAiAnalysis}
                          disabled={isAiLoading}
                          className="bg-bg text-ink px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-bg/90 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Run Analysis
                        </button>
                      </div>
                      <p className="text-xs opacity-70 mb-4 font-mono">
                        Correlate disparate data points, extract entities, and suggest new pivots based on the current target set.
                      </p>
                    </div>

                    {aiResponse && (
                      <div className="bg-white border border-ink p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
                        <div className="prose prose-sm max-w-none prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-strong:text-ink">
                          <ReactMarkdown>{aiResponse}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <CategoryTools category={activeCategory} targets={state.targets} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-ink p-2 bg-ink text-bg text-[10px] font-mono flex justify-between items-center px-4">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> NETWORK ACTIVE</span>
          <span className="opacity-50">|</span>
          <span>TARGETS LOADED: {Object.values(state.targets).flat().length}</span>
        </div>
        <div className="opacity-50">
          OSINT INVESTIGATION FRAMEWORK // UNIVERSAL & LESS RESTRICTED
        </div>
      </footer>
    </div>
  );
}

function TargetInput({ label, type, values, onAdd, onRemove }: { 
  label: string; 
  type: keyof TargetData; 
  values: string[]; 
  onAdd: (type: keyof TargetData, val: string) => void;
  onRemove: (type: keyof TargetData, idx: number) => void;
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    onAdd(type, input);
    setInput('');
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase font-bold opacity-50 block">{label}</label>
      <div className="flex gap-1">
        <input 
          className="flex-1 bg-transparent border border-ink/20 p-1.5 text-xs focus:border-ink outline-none font-mono"
          placeholder={`Add ${label.toLowerCase()}...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button 
          onClick={handleAdd}
          className="bg-ink text-bg p-1.5 hover:bg-ink/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {values.map((val, idx) => (
          <div key={idx} className="bg-ink/5 border border-ink/10 px-2 py-1 text-[10px] font-mono flex items-center gap-2 group">
            {val}
            <button 
              onClick={() => onRemove(type, idx)}
              className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryTools({ category, targets }: { category: OSINTCategory; targets: TargetData }) {
  const tools = useMemo(() => {
    switch (category) {
      case 'infrastructure':
        return [
          { name: 'DNS Enumeration', commands: ['dnsrecon -d [DOMAIN]', 'dnsenum [DOMAIN]', 'dig [DOMAIN] ANY'], tools: ['sublist3r', 'amass', 'subfinder'] },
          { name: 'Certificate Transparency', tools: ['crt.sh', 'certspotter'], description: 'Search for subdomains with SSL certs' },
          { name: 'WHOIS & History', tools: ['whois', 'securitytrails.com', 'domaintools.com'] },
          { name: 'Reverse IP', tools: ['viewdns.info/reverseip', 'spyse.com', 'zoomeye.org'] },
          { name: 'Port Scanning', tools: ['shodan.io', 'censys.io', 'nmap'] },
        ];
      case 'social':
        return [
          { name: 'Username Search', tools: ['sherlock', 'maigret', 'whatsmyname.app'] },
          { name: 'Email & Phone', tools: ['holehe', 'ghunt', 'ephorus', 'haveibeenpwned'] },
          { name: 'Platform Specific', tools: ['Twitter Advanced Search', 'Pushshift (Reddit)', 'Discord ID Resolver', 'TGStat (Telegram)'] },
          { name: 'Image & Video', tools: ['Google Lens', 'Yandex Reverse Search', 'Exiftool'] },
        ];
      case 'darkweb':
        return [
          { name: 'Search Engines', tools: ['Ahmia', 'Tor66', 'Not Evil', 'Haystak'] },
          { name: 'Marketplaces & Forums', tools: ['BreachForums', 'Dread', 'Dark.fail'] },
          { name: 'Leak Databases', tools: ['DeHashed', 'Leak-Lookup', 'BreachDirectory'] },
        ];
      case 'financial':
        return [
          { name: 'Crypto Explorers', tools: ['Blockchain.com', 'Etherscan', 'BTC.com'] },
          { name: 'Chain Analysis', tools: ['OXT.me', 'WalletExplorer', 'Cryptocurrency Alerting'] },
          { name: 'Fiat & Business', tools: ['OpenCorporates', 'Companies House', 'Database.earth'] },
        ];
      case 'graph':
        return [
          { name: 'Automated OSINT', tools: ['SpiderFoot', 'Maltego', 'IntelTechniques'] },
          { name: 'Custom Scripts', tools: ['NetworkX', 'Python Scrapers'] },
        ];
      case 'geospatial':
        return [
          { name: 'Satellite Imagery', tools: ['Google Earth', 'Sentinel Hub', 'Wikimapia'] },
          { name: 'Geotag Extraction', tools: ['Exiftool', 'Twitter API'] },
          { name: 'Tracking', tools: ['FlightRadar24', 'MarineTraffic'] },
        ];
      case 'archival':
        return [
          { name: 'Web Archives', tools: ['Wayback Machine', 'Arquivo.pt', 'Archive.today'] },
          { name: 'Cache Search', tools: ['Google Cache', 'Bing Cache'] },
        ];
      default:
        return [];
    }
  }, [category]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {tools.map((tool, idx) => (
        <div key={idx} className="border border-ink p-6 bg-white shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold uppercase italic tracking-tighter text-lg">{tool.name}</h3>
            <Terminal className="w-4 h-4 opacity-30" />
          </div>
          
          {tool.description && (
            <p className="text-xs opacity-60 mb-4 font-mono">{tool.description}</p>
          )}

          {tool.commands && (
            <div className="mb-4 space-y-1">
              <span className="text-[10px] uppercase font-bold opacity-40">Suggested Commands</span>
              {tool.commands.map((cmd, i) => (
                <div key={i} className="bg-ink text-bg p-2 text-[10px] font-mono flex items-center justify-between group">
                  <code>{cmd.replace('[DOMAIN]', targets.domains[0] || '[DOMAIN]')}</code>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity"><Plus className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold opacity-40">Resources & Tools</span>
            <div className="flex flex-wrap gap-2">
              {tool.tools.map((t, i) => (
                <a 
                  key={i} 
                  href={`https://www.google.com/search?q=${encodeURIComponent(t + ' osint tool')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold uppercase tracking-widest border border-ink px-2 py-1 hover:bg-ink hover:text-bg transition-all flex items-center gap-1"
                >
                  {t}
                  <ExternalLink className="w-2 h-2" />
                </a>
              ))}
            </div>
          </div>
        </div>
      ))}

      {tools.length === 0 && (
        <div className="col-span-full border border-dashed border-ink/30 p-12 flex flex-col items-center justify-center text-center opacity-40">
          <AlertTriangle className="w-12 h-12 mb-4" />
          <p className="font-mono text-sm uppercase">No specialized tools mapped for this category yet.</p>
        </div>
      )}
    </div>
  );
}

