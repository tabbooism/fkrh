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
  Send,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { TargetData, ContextualInfo, InvestigationState, OSINTCategory } from './types';
import { NetworkGraph } from './components/NetworkGraph';
import { BreachTimeline } from './components/BreachTimeline';
import { TargetDistribution } from './components/TargetDistribution';
import { EntityExtractor } from './components/EntityExtractor';

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
  intelTargets: [],
  affiliates: [],
  profiles: [],
  financialRecords: [],
  breachHistory: [],
  context: {
    industry: '',
    relationships: ''
  },
  notes: ''
};

const RUNEHALL_CASE: InvestigationState = {
  targets: {
    domains: ['runehall.com', 'runehall.net', 'runehall.org'],
    usernames: ['CheapGP', '_cheapgp_', 'pro', 'Mok1034', 'Mini_Soda'],
    emails: [],
    names: ['Gary Ronnie Disley'],
    phones: [],
    crypto: ['18.4968 LTC'],
    other: []
  },
  intelTargets: [
    { id: 'ZHMD4S', username: 'MrGetDough', status: 'DEEP DIVE', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'AFKR8TSBM' },
    { id: 'QSD8RG', username: 'Identitty', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'QSD8RG6PG' },
    { id: '2F6E82', username: 'GSpotFinder', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: '2F6E82X77' },
    { id: 'XJLL9E', username: 'Bassmaster', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'XJLL9EDS4' },
    { id: 'HWHQED', username: 'Mahoots1', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'HWHQEDZDQ' },
    { id: '76LF9Z', username: 'pigeon12', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: '76LF9Z9X9' },
    { id: 'DUY18E', username: 'labdiendeels', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'DUY18EWZ7' },
    { id: 'PS02FI', username: 'BigBubly', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'PS02FI5XW' },
    { id: 'BYXZX9', username: 'lizzzle', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'BYXZX9FL8' },
    { id: 'UEN8IT', username: 'Tylerg20', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'UEN8IT4K8' },
    { id: 'HJ7EFZ', username: 'Alreadytb', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'HJ7EFZ0I8' },
    { id: 'RCW5M7', username: 'HighGradez', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'RCW5M75X3' },
    { id: '4J168I', username: 'stonerguy28', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: '4J168I46S' },
    { id: 'U7IICT', username: 'Kelv277', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'U7IICTC4T' },
    { id: 'V481W5', username: 'benbookpro', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'V481W5TX6' },
    { id: '68HAQV', username: 'rurematu', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: '68HAQVMCW' },
    { id: 'ZXB5AZ', username: '7200', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'ZXB5AZQG7' },
    { id: 'QJ25UT', username: 'Dalvadorban', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'QJ25UTAL8' },
    { id: 'V6KMH4', username: 'Princess', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'V6KMH4XM7' },
    { id: 'Y87TCS', username: 'slainezy', status: 'UNINVESTIGATED', source: 'LIVE NETWORK SCAN (RUNEHALL.COM)', timestamp: '3/28/2026 @ 12:54:41 AM', eventId: 'Y87TCS9L6' },
  ],
  affiliates: [
    { code: 'Alpha', url: 'runehall.com/a/Alpha' },
    { code: 'BestGuides', url: 'runehall.com/a/BestGuides' },
    { code: 'Black', url: 'runehall.com/a/Black' },
    { code: 'BlightedBets', url: 'runehall.com/a/BlightedBets' },
    { code: 'BoooYa', url: 'runehall.com/a/BoooYa' },
    { code: 'Dbuffed', url: 'runehall.com/a/Dbuffed' },
    { code: 'DNG', url: 'runehall.com/a/DNG' },
    { code: 'dorkbet', url: 'runehall.com/a/dorkbet' },
    { code: 'Dovis', url: 'runehall.com/a/Dovis' },
    { code: 'fiddlydingus', url: 'runehall.com/a/fiddlydingus' },
    { code: 'flashyflashy', url: 'runehall.com/a/flashyflashy' },
    { code: 'ing', url: 'runehall.com/a/ing' },
    { code: 'Johnjok', url: 'runehall.com/a/Johnjok' },
    { code: 'loltage', url: 'runehall.com/a/loltage' },
    { code: 'osbestrs', url: 'runehall.com/a/osbestrs' },
    { code: 'OSBOT1', url: 'runehall.com/a/OSBOT1' },
    { code: 'Osbot6m', url: 'runehall.com/a/Osbot6m' },
    { code: 'osbotbottom', url: 'runehall.com/a/osbotbottom' },
    { code: 'osbotheader', url: 'runehall.com/a/osbotheader' },
    { code: 'PhaserBomb', url: 'runehall.com/a/PhaserBomb' },
    { code: 'rkqz999', url: 'runehall.com/a/rkqz999' },
    { code: 'RSGUIDES', url: 'runehall.com/a/RSGUIDES' },
    { code: 'RuneLister', url: 'runehall.com/a/RuneLister' },
    { code: 'Sythesports', url: 'runehall.com/a/Sythesports' },
    { code: 'Takashi', url: 'runehall.com/a/Takashi' },
    { code: 'vidas69', url: 'runehall.com/a/vidas69' },
    { code: 'viperslots', url: 'runehall.com/a/viperslots' },
    { code: 'xTwitter', url: 'runehall.com/a/xTwitter' },
    { code: 'CheapGP', url: 'runehall.com/a/CheapGP' },
  ],
  profiles: [
    { id: '229', encoded: 'dHVyYm9jYXQ=', decoded: 'turbocat' },
    { id: '420', encoded: 'QhlYXBHUA==', decoded: 'CheapGP' },
    { id: '2596', encoded: 'cHJv', decoded: 'pro' },
    { id: '2816', encoded: 'YmxhaVibGvZDk=', decoded: 'blakeblood9' },
    { id: '6451', encoded: 'TWluaVTbRh', decoded: 'Mini_Soda' },
    { id: '10731', encoded: 'cGVrYWJvb=', decoded: 'pekabooo' },
    { id: '16406', encoded: 'QFsbElTWFYmU=', decoded: 'CallMeMaybe' },
    { id: '20201', encoded: 'ZltZXNvbWVsdWNr', decoded: 'gimesomesluck' },
    { id: '20519', encoded: 'TWrMTAzNA==', decoded: 'Mok1034' },
    { id: '25134', encoded: 'QmxpZhZWRCZXRz', decoded: 'BlightedBets' },
    { id: '25432', encoded: 'RkSluZw==', decoded: 'GodKing' },
    { id: '25670', encoded: 'QXRbEtbWFy', decoded: 'AtulKumar' },
    { id: '25779', encoded: 'QmVuYmFsbGVy', decoded: 'Benballer' },
    { id: '26186', encoded: 'VHdEZXBheTc=', decoded: 'TwDepay7' },
  ],
  financialRecords: [
    { id: '1', name: 'Marge', amount: '$6,400.00' },
    { id: '2', name: 'Naked', amount: '$3,500.00' },
    { id: '3', name: 'Restrict', amount: '$2,925.00' },
    { id: '4', name: 'Zpliffs', amount: '$2,915.00' },
    { id: '5', name: 'big rob', amount: '$2,549.00' }
  ],
  breachHistory: [
    { 
      target: 'admin@runehall.com', 
      source: 'DeHashed', 
      found: true, 
      details: ['LinkedIn 2016', 'Adobe 2013'], 
      timestamp: '2026-03-29 14:20' 
    }
  ],
  context: {
    industry: 'OSRS Gambling / RSPS',
    relationships: 'RuneHall, RuneBet, CheapGP, RuneHall Properties Limited (UK)'
  },
  notes: 'RuneHall rebranded from RuneBet. UK company RUNEHALL PROPERTIES LIMITED (04407884) might be unrelated but shares name. Site uses Cloudflare. Multiple scam reports on Trustpilot and Sythe regarding withdrawal issues.'
};

const CATEGORIES: { id: OSINTCategory; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'infrastructure', label: 'Infrastructure', icon: <Globe className="w-4 h-4" />, description: 'DNS, WHOIS, Reverse IP, Hosting' },
  { id: 'social', label: 'Social Media', icon: <Users className="w-4 h-4" />, description: 'Username search, Account correlation' },
  { id: 'runehall', label: 'RuneHall Intel', icon: <Search className="w-4 h-4" />, description: 'Affiliate codes, User ID mappings, Site endpoints' },
  { id: 'darkweb', label: 'Dark Web', icon: <Ghost className="w-4 h-4" />, description: 'Hidden services, Leak databases' },
  { id: 'financial', label: 'Financial', icon: <CreditCard className="w-4 h-4" />, description: 'Crypto tracing, Top donators, Payment processors' },
  { id: 'graph', label: 'Graph Analysis', icon: <Share2 className="w-4 h-4" />, description: 'Relationship mapping, Maltego' },
  { id: 'geospatial', label: 'Geospatial', icon: <Map className="w-4 h-4" />, description: 'Satellite, Geotags, Registrations' },
  { id: 'archival', label: 'Archival', icon: <Archive className="w-4 h-4" />, description: 'Wayback Machine, Historical data' },
  { id: 'ai', label: 'AI Analysis', icon: <Cpu className="w-4 h-4" />, description: 'Correlate data points with Gemini' },
  { id: 'monitoring', label: 'Monitoring', icon: <AlertTriangle className="w-4 h-4" />, description: 'Automated alerts & Dark Web strategy' },
];

export default function App() {
  const [state, setState] = useState<InvestigationState>(() => {
    const saved = localStorage.getItem('osint_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load saved session:", e);
      }
    }
    return INITIAL_STATE;
  });
  const [activeCategory, setActiveCategory] = useState<OSINTCategory>('infrastructure');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showLiveScan, setShowLiveScan] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    localStorage.setItem('osint_session', JSON.stringify(state));
  }, [state]);

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

  const exportSession = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'osint_session_export.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans scanline relative overflow-hidden">
      {/* Header */}
      <header className="border-b border-ink p-4 flex flex-col md:flex-row items-start md:items-center justify-between bg-ink text-bg z-20 gap-4 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3 glitch cursor-pointer" onClick={() => setShowLiveScan(false)}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsSidebarOpen(!isSidebarOpen);
              }}
              className="md:hidden p-1 hover:bg-bg/10 rounded transition-colors"
            >
              <Users className="w-5 h-5" />
            </button>
            <Shield className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">RUNEOSINT</h1>
          </div>
          <div className="md:hidden text-[8px] font-mono opacity-60 uppercase tracking-widest">
            v1.0 // READY
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:gap-6 w-full md:w-auto">
          <button 
            onClick={() => setState(RUNEHALL_CASE)}
            className="flex-1 md:flex-none text-[10px] font-bold uppercase tracking-widest border border-bg px-3 py-1.5 hover:bg-bg hover:text-ink transition-all flex items-center justify-center gap-2"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">Load Case Study</span>
            <span className="sm:hidden">Load Case</span>
          </button>
          <button 
            onClick={() => setShowLiveScan(!showLiveScan)}
            className={cn(
              "flex-1 md:flex-none text-[10px] font-bold uppercase tracking-widest border border-bg px-3 py-1.5 transition-all flex items-center justify-center gap-2",
              showLiveScan ? "bg-bg text-ink" : "hover:bg-bg/10"
            )}
          >
            <Search className="w-3 h-3" />
            {showLiveScan ? "Exit Scan" : "Live Scan"}
          </button>
          <button 
            onClick={exportSession}
            className="flex-1 md:flex-none text-[10px] font-bold uppercase tracking-widest border border-bg px-3 py-1.5 hover:bg-bg hover:text-ink transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export JSON</span>
            <span className="sm:hidden">Export</span>
          </button>
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
            <span className="hidden sm:inline">Clear Session</span>
            <span className="sm:hidden">Clear</span>
          </button>
          <div className="hidden lg:block text-[10px] font-mono opacity-60 uppercase tracking-widest">
            Advanced Framework v1.0 // System Ready
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {showLiveScan ? (
          <LiveScanView 
            state={state} 
            onAddIntel={(username) => {
              const newTarget = {
                id: Math.random().toString(36).substr(2, 6).toUpperCase(),
                username,
                status: 'UNINVESTIGATED' as const,
                source: 'MANUAL ENTRY',
                timestamp: new Date().toLocaleString(),
                eventId: Math.random().toString(36).substr(2, 9).toUpperCase()
              };
              setState(prev => ({
                ...prev,
                intelTargets: [newTarget, ...prev.intelTargets]
              }));
            }}
          />
        ) : (
          <>
            {/* Sidebar - Targets */}
            <AnimatePresence>
              {(!isMobile || isSidebarOpen) && (
                <motion.aside 
                  initial={isMobile ? { x: -320 } : false}
                  animate={{ x: 0 }}
                  exit={{ x: -320 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className={cn(
                    "fixed md:relative z-40 w-80 h-[calc(100vh-120px)] md:h-auto border-r border-ink overflow-y-auto p-4 flex flex-col gap-6 bg-bg shadow-2xl md:shadow-none",
                    isMobile && "top-[120px] left-0"
                  )}
                >
                  <div className="flex justify-between items-center md:hidden mb-2">
                    <h2 className="text-xs font-bold uppercase tracking-widest">Investigation Sidebar</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-ink/5 rounded">
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
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
                    label="Phones" 
                    type="phones" 
                    values={state.targets.phones} 
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
                  <TargetInput 
                    label="Other" 
                    type="other" 
                    values={state.targets.other} 
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
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-30 md:hidden"
                />
              )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden w-full">
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
              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-4xl mx-auto"
                  >
                    <div className="mb-6 md:mb-8">
                      <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter mb-2">{activeCategory.replace(/([A-Z])/g, ' $1')}</h2>
                      <p className="text-[10px] md:text-sm opacity-60 font-mono">{CATEGORIES.find(c => c.id === activeCategory)?.description}</p>
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
                      <CategoryTools 
            category={activeCategory} 
            targets={state.targets} 
            state={state}
            onUpdateState={(newState) => setState(prev => ({ ...prev, ...newState }))}
          />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-ink p-2 bg-ink text-bg text-[9px] md:text-[10px] font-mono flex flex-col md:flex-row justify-between items-center px-4 gap-2 md:gap-0">
        <div className="flex flex-wrap justify-center gap-2 md:gap-4">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> NETWORK ACTIVE</span>
          <span className="opacity-50 hidden sm:inline">|</span>
          <span>TARGETS: {Object.values(state.targets).flat().length}</span>
          <span className="opacity-50 hidden sm:inline">|</span>
          <span>INTEL: {state.intelTargets.length}</span>
        </div>
        <div className="opacity-50 uppercase text-center">
          RUNEOSINT // V1.0
        </div>
      </footer>
    </div>
  );
}

function LiveScanView({ state, onAddIntel }: { state: InvestigationState; onAddIntel: (username: string) => void }) {
  const [newIntel, setNewIntel] = useState('');

  const handleAdd = () => {
    if (newIntel) {
      onAddIntel(newIntel);
      setNewIntel('');
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-bg">
      {/* Target List */}
      <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-ink flex flex-col overflow-hidden h-1/2 md:h-auto">
        <div className="p-4 border-b border-ink bg-ink/5 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="text-xs font-bold uppercase tracking-widest">Live Network Scan</div>
            <div className="text-[10px] font-mono opacity-50">{state.intelTargets.length} TARGETS IDENTIFIED</div>
          </div>
          <div className="flex gap-1">
            <input 
              className="flex-1 bg-transparent border border-ink/20 p-1 text-[10px] outline-none font-mono"
              placeholder="Add target username..."
              value={newIntel}
              onChange={e => setNewIntel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button 
              onClick={handleAdd}
              className="bg-ink text-bg px-2 py-1 text-[10px]"
            >
              Add
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {state.intelTargets.map((target, idx) => (
            <div key={idx} className="data-row hover:bg-ink hover:text-bg transition-all group">
              <div className="text-[10px] font-mono opacity-50 group-hover:opacity-100">{idx + 1}</div>
              <div className="font-bold text-xs uppercase truncate">{target.username}</div>
              <div className={cn(
                "text-[8px] font-bold uppercase px-1.5 py-0.5 border self-center justify-self-start",
                target.status === 'DEEP DIVE' ? "border-red-500 text-red-500" : 
                target.status === 'REPORT READY' ? "border-green-500 text-green-500" : "border-ink/30 opacity-50"
              )}>
                {target.status}
              </div>
              <ChevronRight className="w-3 h-3 self-center justify-self-end opacity-0 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>

      {/* Deep Dive / Event Log */}
      <div className="flex-1 flex flex-col overflow-hidden h-1/2 md:h-auto">
        <div className="p-4 border-b border-ink bg-ink/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Extraction History</div>
          <div className="text-[8px] md:text-[10px] font-mono opacity-50">{state.intelTargets.length} EVENTS</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {state.intelTargets.map((target, idx) => (
            <div key={idx} className="border border-ink/10 p-3 bg-white shadow-[2px_2px_0px_0px_rgba(20,20,20,0.1)]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-xs font-bold uppercase italic">{target.username}</div>
                  <div className="text-[8px] font-mono opacity-50 uppercase">Source: {target.source}</div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-mono opacity-50">{target.timestamp}</div>
                  <div className="text-[8px] font-mono font-bold uppercase">Event ID: {target.eventId}</div>
                </div>
              </div>
              <div className="h-1 bg-ink/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1, delay: idx * 0.1 }}
                  className="h-full bg-ink/20"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
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

function CategoryTools({ category, targets, state, onUpdateState }: { 
  category: OSINTCategory; 
  targets: TargetData; 
  state: InvestigationState;
  onUpdateState: (newState: Partial<InvestigationState>) => void;
}) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const runTool = async (toolName: string, targetOverride?: string) => {
    setActiveTool(toolName);
    setIsProcessing(true);
    setTerminalOutput([`[SYSTEM] Initializing ${toolName.toUpperCase()}...`]);
    
    const target = targetOverride || targets.domains[0] || targets.usernames[0] || 'GLOBAL_SCAN';
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Simulate the output of an OSINT tool named "${toolName}" scanning the target "${target}". 
        Provide a realistic sequence of 5-8 log messages. 
        Include technical details relevant to ${category}. 
        If it's a breach scan, include mentions of specific database leaks (e.g., "LinkedIn 2016", "Canva 2019", "ComboList").
        Format as a JSON array of strings.`,
        config: {
          responseMimeType: "application/json",
        }
      });

      const parsed = JSON.parse(response.text || "[]");
      const steps = Array.isArray(parsed) ? parsed : [];
      
      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < steps.length) {
          setTerminalOutput(prev => [...prev, steps[currentStep]]);
          currentStep++;
        } else {
          clearInterval(interval);
          setIsProcessing(false);

          // If it's a breach scan, save to history
          if (toolName.toLowerCase().includes('breach') || toolName.toLowerCase().includes('leak') || toolName.toLowerCase().includes('dehashed')) {
            const newResult = {
              target: target,
              source: toolName,
              found: steps.some((l: string) => l.toLowerCase().includes('found') || l.toLowerCase().includes('match') || l.toLowerCase().includes('hit')),
              details: steps.filter((l: string) => l.includes('20') || l.includes('Leak') || l.includes('Database') || l.includes(':')),
              timestamp: new Date().toLocaleString()
            };
            onUpdateState({
              breachHistory: [newResult, ...state.breachHistory].slice(0, 50)
            });
          }
        }
      }, 400);
    } catch (error) {
      console.error('Tool simulation failed:', error);
      setTerminalOutput(prev => [...prev, `[ERROR] Failed to initialize ${toolName}.`, `[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setIsProcessing(false);
    }
  };

  const tools = useMemo(() => {
    switch (category) {
      case 'monitoring':
        return [
          { 
            name: 'Dark Web Forum Monitoring', 
            tools: ['Forum Scraper', 'Keyword Alert', 'Marketplace Watch'],
            description: 'Automated monitoring of dark web forums and marketplaces for target mentions.',
            customContent: (
              <div className="mt-4 space-y-4">
                <div className="bg-red-500/10 p-3 border border-red-500/20">
                  <div className="text-[10px] font-bold uppercase mb-2 text-red-600">Active Alert Log</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-[9px]">
                    {state.intelTargets.filter(t => t.source.includes('MONITORING')).map((t, i) => (
                      <div key={i} className="flex gap-2 border-b border-red-500/10 pb-1">
                        <span className="text-red-600 font-bold">[{t.timestamp}]</span>
                        <span className="text-ink">Mention of "{t.username}" detected on {t.source}</span>
                      </div>
                    ))}
                    {state.intelTargets.filter(t => t.source.includes('MONITORING')).length === 0 && (
                      <div className="opacity-50 italic">No active alerts detected. Configure keywords to begin.</div>
                    )}
                  </div>
                </div>
                <div className="bg-ink/5 p-3 border border-ink/10">
                  <div className="text-[10px] font-bold uppercase mb-2">Safe & Legal Access (OPSEC)</div>
                  <ul className="text-[10px] font-mono space-y-2 list-disc pl-4 opacity-70">
                    <li><strong>Tor Browser:</strong> Use the official Tor Browser for all onion service access.</li>
                    <li><strong>VPN First:</strong> Always connect to a trusted VPN *before* starting Tor.</li>
                    <li><strong>Isolated Environment:</strong> Use a dedicated VM (e.g., Whonix) for investigations.</li>
                  </ul>
                </div>
              </div>
            )
          },
          { 
            name: 'Open Source Monitoring', 
            tools: ['Ahmia API', 'OnionScan', 'Hunchly'],
            description: 'Manual and automated tools for monitoring dark web content.'
          },
          {
            name: 'Alerting Platforms',
            tools: ['Pushover', 'Slack Webhooks', 'Telegram Bot'],
            description: 'Integrate scrapers with notification services for real-time alerts.'
          }
        ];
      case 'runehall':
        return [
          { 
            name: 'Affiliate Network', 
            description: 'Archived referral codes and associated URLs found in site history.',
            tools: state.affiliates.map(a => a.code),
            customContent: (
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-ink/10 p-2">
                  {state.affiliates.map((a, i) => (
                    <div key={i} className="text-[10px] font-mono flex justify-between border-b border-ink/5 pb-1 group">
                      <span className="font-bold">{a.code}</span>
                      <span className="opacity-50 truncate ml-2">{a.url}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-transparent border border-ink/20 p-1 text-[10px] outline-none"
                    placeholder="Code"
                    id="new-aff-code"
                  />
                  <input 
                    className="flex-1 bg-transparent border border-ink/20 p-1 text-[10px] outline-none"
                    placeholder="URL"
                    id="new-aff-url"
                  />
                  <button 
                    onClick={() => {
                      const codeInput = document.getElementById('new-aff-code') as HTMLInputElement;
                      const urlInput = document.getElementById('new-aff-url') as HTMLInputElement;
                      const code = codeInput.value;
                      const url = urlInput.value;
                      if (code && url) {
                        onUpdateState({
                          affiliates: [...state.affiliates, { code, url }]
                        });
                        codeInput.value = '';
                        urlInput.value = '';
                      }
                    }}
                    className="bg-ink text-bg px-2 py-1 text-[10px]"
                  >
                    Add
                  </button>
                </div>
              </div>
            )
          },
          { 
            name: 'User ID Correlation', 
            description: 'Base64 encoded usernames mapped to internal User IDs from archived stats pages.',
            tools: ['Base64 Decoder', 'ID Mapper'],
            customContent: (
              <div className="mt-4 space-y-2">
                <div className="max-h-40 overflow-y-auto border border-ink/10 p-2">
                  {state.profiles.map((p, i) => (
                    <div key={i} className="text-[10px] font-mono grid grid-cols-3 gap-2 border-b border-ink/5 pb-1">
                      <span className="font-bold">ID: {p.id}</span>
                      <span className="opacity-50">{p.encoded}</span>
                      <span className="text-right">{p.decoded}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-transparent border border-ink/20 p-1 text-[10px] outline-none"
                    placeholder="ID"
                    id="new-profile-id"
                  />
                  <input 
                    className="flex-1 bg-transparent border border-ink/20 p-1 text-[10px] outline-none"
                    placeholder="Encoded"
                    id="new-profile-encoded"
                  />
                  <input 
                    className="flex-1 bg-transparent border border-ink/20 p-1 text-[10px] outline-none"
                    placeholder="Decoded"
                    id="new-profile-decoded"
                  />
                  <button 
                    onClick={() => {
                      const idInput = document.getElementById('new-profile-id') as HTMLInputElement;
                      const encInput = document.getElementById('new-profile-encoded') as HTMLInputElement;
                      const decInput = document.getElementById('new-profile-decoded') as HTMLInputElement;
                      const id = idInput.value;
                      const encoded = encInput.value;
                      const decoded = decInput.value;
                      if (id && encoded && decoded) {
                        onUpdateState({
                          profiles: [...state.profiles, { id, encoded, decoded }]
                        });
                        idInput.value = '';
                        encInput.value = '';
                        decInput.value = '';
                      }
                    }}
                    className="bg-ink text-bg px-2 py-1 text-[10px]"
                  >
                    Add
                  </button>
                </div>
              </div>
            )
          },
          {
            name: 'Key Endpoints',
            description: 'Sensitive site paths extracted from Wayback Machine and live scans.',
            tools: ['/.well-known/auth', '/account/transactions', '/casino/plinko', '/vault'],
          }
        ];
      case 'financial':
        return [
          { 
            name: 'Financial Records', 
            description: 'High-value contributors and transaction records.',
            tools: state.financialRecords.map(r => r.name),
            customContent: (
              <div className="mt-4 space-y-2">
                <div className="bg-ink/5 p-3 border border-ink/10">
                  <div className="text-[10px] font-bold uppercase mb-2">Transaction Ledger</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {state.financialRecords.map((r, i) => (
                      <div key={i} className="flex justify-between font-mono text-[10px]">
                        <span>{i+1}. {r.name}</span>
                        <span className="font-bold">{r.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-transparent border border-ink/20 p-1 text-[10px] outline-none"
                    placeholder="Entity Name"
                    id="new-fin-name"
                  />
                  <input 
                    className="flex-1 bg-transparent border border-ink/20 p-1 text-[10px] outline-none"
                    placeholder="Amount"
                    id="new-fin-amount"
                  />
                  <button 
                    onClick={() => {
                      const nameInput = document.getElementById('new-fin-name') as HTMLInputElement;
                      const amountInput = document.getElementById('new-fin-amount') as HTMLInputElement;
                      const name = nameInput.value;
                      const amount = amountInput.value;
                      if (name && amount) {
                        onUpdateState({
                          financialRecords: [...state.financialRecords, { id: Date.now().toString(), name, amount }]
                        });
                        nameInput.value = '';
                        amountInput.value = '';
                      }
                    }}
                    className="bg-ink text-bg px-2 py-1 text-[10px]"
                  >
                    Add
                  </button>
                </div>
              </div>
            )
          },
          { name: 'Crypto Explorers', tools: ['Blockchain.com', 'Etherscan', 'BTC.com'] },
          { name: 'Chain Analysis', tools: ['OXT.me', 'WalletExplorer', 'Cryptocurrency Alerting'] },
          { name: 'Fiat & Business', tools: ['OpenCorporates', 'Companies House', 'Database.earth'] },
        ];
      case 'infrastructure':
        return [
          { name: 'DNS Enumeration', commands: ['dnsrecon -d [DOMAIN]', 'dnsenum [DOMAIN]', 'dig [DOMAIN] ANY'], tools: ['sublist3r', 'amass', 'subfinder'] },
          { name: 'Certificate Transparency', tools: ['crt.sh', 'certspotter'], description: 'Search for subdomains with SSL certs' },
          { name: 'WHOIS & History', tools: ['whois', 'securitytrails.com', 'domaintools.com'] },
          { name: 'Reverse IP', tools: ['viewdns.info/reverseip', 'spyse.com', 'zoomeye.org'] },
          { name: 'Port Scanning', tools: ['shodan.io', 'censys.io', 'nmap'] },
          {
            name: 'Target Analysis',
            tools: [],
            description: 'Statistical breakdown of current investigation targets.',
            customContent: (
              <div className="mt-4">
                <TargetDistribution state={state} />
              </div>
            )
          },
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
          { 
            name: 'Leak Databases', 
            tools: ['DeHashed', 'Leak-Lookup', 'BreachDirectory'],
            description: 'Search for credentials and PII in historical data breaches.',
            customContent: (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[10px] font-bold uppercase opacity-50">Target Breach Status</div>
                  <button 
                    onClick={() => {
                      const allTargets = [...state.targets.usernames, ...state.targets.emails];
                      allTargets.forEach((t, i) => {
                        setTimeout(() => runTool(`Breach Scan: ${t}`), i * 1000);
                      });
                    }}
                    className="text-[8px] border border-ink/20 px-2 py-0.5 hover:bg-ink/5"
                    disabled={isProcessing}
                  >
                    Scan All Targets
                  </button>
                </div>
                <div className="space-y-1">
                      {[...state.targets.usernames, ...state.targets.emails].map((t, i) => (
                    <div key={i} className="flex flex-col bg-ink/5 p-2 border border-ink/10 group gap-2">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] truncate max-w-[150px] font-bold">{t}</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => runTool(`Breach Scan`, t)}
                            className="text-[8px] bg-ink text-bg px-2 py-0.5 hover:bg-ink/80 transition-colors flex items-center gap-1"
                          >
                            Quick Check
                          </button>
                          <button 
                            onClick={() => {
                              ['DeHashed', 'Leak-Lookup', 'BreachDirectory'].forEach((service, idx) => {
                                setTimeout(() => runTool(`${service} Deep Scan`, t), idx * 1500);
                              });
                            }}
                            className="text-[8px] border border-ink px-2 py-0.5 hover:bg-ink hover:text-bg transition-colors flex items-center gap-1"
                          >
                            Deep Scan
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {[...state.targets.usernames, ...state.targets.emails].length === 0 && (
                    <div className="text-[10px] italic opacity-50 p-2 border border-dashed border-ink/20">
                      No usernames or emails loaded for scanning. Add them in the sidebar to begin.
                    </div>
                  )}
                </div>
              </div>
            )
          },
          {
            name: 'Breach History',
            tools: [],
            description: 'Historical results of breach database scans.',
            customContent: (
              <div className="mt-4 space-y-2">
                <div className="text-[10px] font-bold uppercase opacity-50">Recent Findings</div>
                <div className="space-y-2">
                  {state.breachHistory.map((res, i) => (
                    <div key={i} className="bg-ink/5 p-2 border border-ink/10 text-[10px]">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold">{res.target}</span>
                        <span className={`px-1 rounded ${res.found ? 'bg-red-500/20 text-red-600' : 'bg-green-500/20 text-green-600'}`}>
                          {res.found ? 'MATCH FOUND' : 'NO MATCH'}
                        </span>
                      </div>
                      <div className="opacity-70 font-mono text-[9px] mb-1">Source: {res.source} | {res.timestamp}</div>
                      {res.details.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-ink/5">
                          <div className="opacity-50 text-[8px] uppercase mb-1">Leaks Identified:</div>
                          <ul className="list-disc list-inside opacity-80">
                            {res.details.map((d, j) => <li key={j}>{d}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                  {state.breachHistory.length === 0 && (
                    <div className="text-[10px] italic opacity-50 p-2 border border-dashed border-ink/20">
                      No breach history recorded. Run a scan to populate this list.
                    </div>
                  )}
                </div>
              </div>
            )
          },
          { name: 'Search Engines', tools: ['Ahmia', 'Tor66', 'Not Evil', 'Haystak'] },
          { name: 'Marketplaces & Forums', tools: ['BreachForums', 'Dread', 'Dark.fail'] },
          {
            name: 'Breach Visualization',
            tools: [],
            fullWidth: true,
            description: 'Visual representation of breach data over time and by source.',
            customContent: (
              <div className="mt-4">
                <BreachTimeline state={state} />
              </div>
            )
          },
        ];
      case 'graph':
        return [
          { 
            name: 'Relationship Visualization', 
            tools: [], 
            fullWidth: true,
            description: 'Interactive network graph showing connections between targets and intel.',
            customContent: (
              <div className="mt-4">
                <NetworkGraph state={state} />
              </div>
            )
          },
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
      case 'ai':
        return [
          { 
            name: 'Entity Extraction', 
            description: 'Automatically extract entities from unstructured text.',
            customContent: (
              <div className="mt-4">
                <EntityExtractor state={state} onUpdateState={onUpdateState} />
              </div>
            )
          },
          { name: 'Correlate Data', commands: ['Analyze all targets for hidden links'], tools: ['Gemini Pro'] },
          { name: 'Pattern Recognition', tools: ['Gemini Flash'], description: 'Identify behavioral patterns in target activity' },
        ];
      default:
        return [];
    }
  }, [category, state]);

  return (
    <div className="space-y-6">
      {activeTool && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-12 md:bottom-16 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-ink text-bg p-4 border border-bg/20 shadow-2xl z-50 font-mono text-[10px]"
        >
          <div className="flex justify-between items-center mb-2 border-b border-bg/10 pb-2">
            <span className="flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              TERMINAL: {activeTool.toUpperCase()}
            </span>
            <button onClick={() => setActiveTool(null)} className="hover:text-red-500 p-1">CLOSE [X]</button>
          </div>
          <div className="space-y-1 max-h-32 md:max-h-48 overflow-y-auto custom-scrollbar">
            {terminalOutput.map((line, i) => (
              <div key={i} className={cn(
                line && line.startsWith('[SUCCESS]') ? "text-green-400" : 
                line && line.startsWith('[ERROR]') ? "text-red-400" : 
                line && line.startsWith('[RESULT]') ? "text-blue-400 font-bold" : ""
              )}>
                {line}
              </div>
            ))}
            {isProcessing && <div className="animate-pulse">_</div>}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool: any, idx) => (
          <div key={idx} className={cn(
            "border border-ink p-6 bg-white shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]",
            tool.fullWidth && "md:col-span-2"
          )}>
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
              <span className="text-[10px] uppercase font-bold opacity-40">Active Tools</span>
              <div className="flex flex-wrap gap-2">
                {tool.tools.map((t, i) => (
                  <button 
                    key={i} 
                    onClick={() => runTool(t)}
                    className="text-[10px] font-bold uppercase tracking-widest border border-ink px-2 py-1 hover:bg-ink hover:text-bg transition-all flex items-center gap-1"
                  >
                    {t}
                    <Cpu className="w-2 h-2" />
                  </button>
                ))}
              </div>
            </div>

            {tool.customContent}
          </div>
        ))}

        {tools.length === 0 && (
          <div className="col-span-full border border-dashed border-ink/30 p-12 flex flex-col items-center justify-center text-center opacity-40">
            <AlertTriangle className="w-12 h-12 mb-4" />
            <p className="font-mono text-sm uppercase">No specialized tools mapped for this category yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

