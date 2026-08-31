import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  Menu,
  Moon,
  Network,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Target,
  X,
} from "lucide-react";
import type {
  DnsLookupResult,
  HeaderAuditResult,
  IntelItem,
  Metrics,
  Operation,
  OperationPhase,
  OperationStatus,
  Priority,
  RiskLevel,
  Task,
  TaskPhase,
  ValidationTemplate,
} from "./types";

type View = "Overview" | "Operations" | "Intelligence" | "Control Checks" | "Validation Library" | "Reporting" | "Settings";
type CheckKind = "dns" | "headers";

type DashboardData = {
  metrics: Metrics;
  operations: Operation[];
  tasks: Task[];
  intelligence: IntelItem[];
  lastIntelRefresh: string | null;
};

type Toast = { title: string; detail: string; tone: "good" | "warn" | "bad" } | null;

const navItems: Array<{ label: View; icon: typeof LayoutDashboard; code: string }> = [
  { label: "Overview", icon: LayoutDashboard, code: "00" },
  { label: "Operations", icon: Target, code: "01" },
  { label: "Intelligence", icon: Radar, code: "02" },
  { label: "Control Checks", icon: ShieldCheck, code: "03" },
  { label: "Validation Library", icon: ClipboardCheck, code: "04" },
  { label: "Reporting", icon: FileText, code: "05" },
  { label: "Settings", icon: Settings2, code: "06" },
];

const operationPhases: OperationPhase[] = ["Scoping", "Validation", "Detection", "Remediation", "Reporting"];
const operationStatuses: OperationStatus[] = ["Planning", "Active", "Paused", "Complete"];
const riskLevels: RiskLevel[] = ["Low", "Moderate", "High"];
const taskPhases: TaskPhase[] = ["To Do", "In Progress", "Blocked", "Completed"];
const priorities: Priority[] = ["Low", "Moderate", "High"];

const validationTemplates: ValidationTemplate[] = [
  {
    id: "identity-control-review",
    name: "Identity control review",
    objective: "Verify that a pre-agreed test identity produces the expected approval, alerting, and evidence trail.",
    evidence: ["Written scope and named test identity", "Approval event with timestamp and owner", "Alert-routing record", "Remediation or exception decision"],
    stopCriteria: ["Any asset or participant falls outside written scope", "A credential or secret is requested", "A control change would affect production availability"],
  },
  {
    id: "web-security-headers",
    name: "Web security-header review",
    objective: "Record the security headers returned by a public, authorized web property and assign remediation ownership.",
    evidence: ["Authorization record", "Target URL and collection timestamp", "Returned header values", "Owner and due date for each gap"],
    stopCriteria: ["The target is not explicitly authorized", "The destination resolves to a private or reserved address", "The check would require authentication or bypassing an access control"],
  },
  {
    id: "dependency-change-review",
    name: "Dependency change review",
    objective: "Walk through package approval, review, rollback, and notification controls using a proposed change record.",
    evidence: ["Change ticket and reviewer", "Lockfile or artifact provenance", "CI policy result", "Rollback owner and communication record"],
    stopCriteria: ["The exercise would publish or alter a live package", "A maintainer credential is requested", "The proposed change cannot be isolated and reversed"],
  },
];

async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : `Request failed with HTTP ${response.status}.`);
  return body as T;
}

function localGet<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function StatusPill({ value }: { value: string }) {
  const tone = /Active|Complete|Completed|Healthy|Operational|Ready/.test(value)
    ? "pill--good"
    : /Blocked|High|Missing|Error/.test(value)
      ? "pill--risk"
      : /Planning|Paused|Moderate|In Progress|Review|Due/.test(value)
        ? "pill--watch"
        : "pill--quiet";
  return <span className={`pill ${tone}`}>{value}</span>;
}

function SectionTitle({ code, title, detail, action }: { code: string; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="section-title">
      <div className="dossier-tab"><span>{code}</span><i /></div>
      <div><h1>{title}</h1><p>{detail}</p></div>
      {action ? <div className="section-title__action">{action}</div> : <div />}
    </div>
  );
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state"><Activity size={19} /><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

function MetricCard({ value, label, detail, icon: Icon }: { value: number | string; label: string; detail: string; icon: typeof Target }) {
  return <div className="metric-card"><Icon size={16} /><span className="metric-card__value">{value}</span><span className="metric-card__label">{label}</span><small>{detail}</small></div>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not yet refreshed";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [view, setView] = useState<View>("Overview");
  const [railOpen, setRailOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localGet("fkrh_theme", true));
  const [utc, setUtc] = useState(new Date().toISOString().slice(11, 19));
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [newOperationOpen, setNewOperationOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
  const [newTask, setNewTask] = useState("");
  const [intelligenceSearch, setIntelligenceSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(validationTemplates[0]);
  const [reportOperationId, setReportOperationId] = useState("");
  const [checkKind, setCheckKind] = useState<CheckKind>("dns");
  const [checkValue, setCheckValue] = useState("");
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<DnsLookupResult | null>(null);
  const [headersResult, setHeadersResult] = useState<HeaderAuditResult | null>(null);
  const [checkError, setCheckError] = useState("");

  const notify = (title: string, detail: string, tone: Toast["tone"] = "good") => {
    setToast({ title, detail, tone });
    window.setTimeout(() => setToast(null), 4200);
  };

  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api<DashboardData>("/api/dashboard");
      setDashboard(data);
      setError("");
      if (!reportOperationId && data.operations[0]) setReportOperationId(data.operations[0].id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDashboard(); }, []);
  useEffect(() => {
    const interval = window.setInterval(() => void loadDashboard(true), 20_000);
    return () => window.clearInterval(interval);
  }, [reportOperationId]);
  useEffect(() => {
    const tick = () => setUtc(new Date().toISOString().slice(11, 19));
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("fkrh_theme", JSON.stringify(dark));
  }, [dark]);

  const metrics = dashboard?.metrics ?? { activeOperations: 0, totalOperations: 0, openTasks: 0, blockedTasks: 0, completedTasks: 0, intelligenceItems: 0, lastIntelRefresh: null };
  const operations = dashboard?.operations ?? [];
  const tasks = dashboard?.tasks ?? [];
  const intelligence = dashboard?.intelligence ?? [];

  const filteredIntelligence = useMemo(() => {
    const query = intelligenceSearch.trim().toLowerCase();
    return intelligence.filter((item) => !query || `${item.id} ${item.vendor} ${item.product} ${item.vulnerabilityName} ${item.description}`.toLowerCase().includes(query));
  }, [intelligence, intelligenceSearch]);

  const refreshIntelligence = async () => {
    setRefreshing(true);
    try {
      await api("/api/intelligence/refresh", { method: "POST", body: "{}" });
      await loadDashboard(true);
      notify("Intelligence refreshed", "The current CISA Known Exploited Vulnerabilities feed is stored server-side.");
    } catch (refreshError) {
      notify("Refresh failed", refreshError instanceof Error ? refreshError.message : "The public feed could not be refreshed.", "bad");
    } finally {
      setRefreshing(false);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    try {
      await api<Task>("/api/tasks", { method: "POST", body: JSON.stringify({ title: newTask, owner: "Unassigned", phase: "To Do", priority: "Moderate" }) });
      setNewTask("");
      await loadDashboard(true);
      notify("Task created", "The task is now stored in the server-backed workboard.");
    } catch (taskError) {
      notify("Task not created", taskError instanceof Error ? taskError.message : "The task could not be created.", "bad");
    }
  };

  const moveTask = async (task: Task, phase: TaskPhase) => {
    try {
      await api<Task>(`/api/tasks/${encodeURIComponent(task.id)}`, { method: "PATCH", body: JSON.stringify({ phase }) });
      await loadDashboard(true);
    } catch (taskError) {
      notify("Task update failed", taskError instanceof Error ? taskError.message : "The task could not be updated.", "bad");
    }
  };

  const runCheck = async (event: FormEvent) => {
    event.preventDefault();
    setCheckError("");
    setDnsResult(null);
    setHeadersResult(null);
    if (!authorizationConfirmed) {
      setCheckError("Confirm that you have written authorization before running a control check.");
      return;
    }
    setCheckLoading(true);
    try {
      if (checkKind === "dns") {
        setDnsResult(await api<DnsLookupResult>("/api/checks/dns", { method: "POST", body: JSON.stringify({ domain: checkValue, authorized: true }) }));
      } else {
        setHeadersResult(await api<HeaderAuditResult>("/api/checks/headers", { method: "POST", body: JSON.stringify({ url: checkValue, authorized: true }) }));
      }
      notify("Control check complete", "The result is available for review and reporting.");
    } catch (checkRequestError) {
      setCheckError(checkRequestError instanceof Error ? checkRequestError.message : "The control check failed.");
    } finally {
      setCheckLoading(false);
    }
  };

  const downloadReport = () => {
    const operation = operations.find((item) => item.id === reportOperationId) ?? operations[0];
    if (!operation) {
      notify("Nothing to report", "Create an operation before exporting a report.", "warn");
      return;
    }
    const relatedTasks = tasks.map((task) => `- [${task.phase === "Completed" ? "x" : " "}] ${task.title} — ${task.owner} (${task.priority})`).join("\n") || "- No tasks recorded";
    const report = `# ${operation.name}\n\nGenerated: ${new Date().toISOString()}\n\n## Operation record\n\n- **ID:** ${operation.id}\n- **Sector:** ${operation.sector}\n- **Status:** ${operation.status}\n- **Phase:** ${operation.phase}\n- **Risk:** ${operation.risk}\n- **Lead:** ${operation.lead}\n- **Started:** ${operation.started}\n\n## Scope\n\n${operation.scope}\n\n## Objective\n\n${operation.objective}\n\n## Rules of engagement\n\n${operation.rulesOfEngagement}\n\n## Timeline\n\n${operation.timeline.map((entry) => `- ${entry}`).join("\n")}\n\n## Task register\n\n${relatedTasks}\n\n## Evidence note\n\nAttach approved evidence and remediation ownership before distribution. This export contains planning metadata from the FKRH server.\n`;
    downloadFile(`${operation.id.toLowerCase()}-report.md`, report, "text/markdown;charset=utf-8");
    notify("Report downloaded", "The Markdown report contains current server-backed operation and task data.");
  };

  const renderOverview = () => (
    <div className="view-stack">
      <SectionTitle code="00" title="Defensive operations overview" detail={`Server-backed workspace · updated ${formatDate(new Date().toISOString())}`} action={<button className="button button--quiet" onClick={() => void loadDashboard()}><RefreshCw size={14} /> Refresh</button>} />
      <div className="metric-strip">
        <MetricCard value={metrics.activeOperations} label="Active operations" detail={`${metrics.totalOperations} total records`} icon={Target} />
        <MetricCard value={metrics.openTasks} label="Open tasks" detail={`${metrics.blockedTasks} blocked`} icon={ClipboardCheck} />
        <MetricCard value={metrics.completedTasks} label="Completed tasks" detail="Server-backed workboard" icon={Check} />
        <MetricCard value={metrics.intelligenceItems} label="KEV records" detail={metrics.lastIntelRefresh ? `Refreshed ${formatDate(metrics.lastIntelRefresh)}` : "Refresh required"} icon={Radar} />
        <MetricCard value="DNS" label="Control checks" detail="Authorized public lookups" icon={Globe2} />
        <MetricCard value="HTTP" label="Header audits" detail="Security-header evidence" icon={ShieldCheck} />
      </div>
      <div className="overview-grid">
        <section className="panel panel--surface"><div className="panel__header"><div><span className="eyebrow">WORKLOAD REGISTER</span><h2>Current operations</h2></div><StatusPill value={operations.length ? `${operations.length} records` : "Empty"} /></div>{operations.length ? <div className="activity-list">{operations.slice(0, 5).map((operation) => <button className="activity-row activity-row--button" key={operation.id} onClick={() => { setSelectedOperation(operation); setView("Operations"); }}><span className="activity-dot activity-dot--cyan" /><div><div className="activity-row__top"><b>{operation.name}</b><StatusPill value={operation.status} /></div><p>{operation.phase} · {operation.sector} · lead {operation.lead}</p></div></button>)}</div> : <EmptyState title="No operation records" detail="Create the first authorized operation record to begin tracking scope, evidence, and remediation." action={<button className="button button--cyan" onClick={() => { setView("Operations"); setNewOperationOpen(true); }}><Plus size={14} /> Create operation</button>} />}</section>
        <section className="panel"><div className="panel__header"><div><span className="eyebrow">TASK FLOW</span><h2>Workboard status</h2></div><ClipboardCheck size={17} className="text-cyan" /></div><div className="distribution-list">{taskPhases.map((phase) => <div className="distribution-row" key={phase}><span>{phase}</span><b>{tasks.filter((task) => task.phase === phase).length}</b><i><em style={{ width: `${tasks.length ? Math.max(2, tasks.filter((task) => task.phase === phase).length / tasks.length * 100) : 2}%` }} /></i></div>)}</div><div className="panel__footer"><span>{metrics.completedTasks} completed</span><span className="text-cyan">{metrics.blockedTasks} blocked</span></div></section>
        <section className="panel activity-panel"><div className="panel__header"><div><span className="eyebrow">NEXT ACTION</span><h2>Evidence-first workflow</h2></div><BookOpen size={17} className="text-cyan" /></div><div className="action-list"><button onClick={() => setView("Control Checks")}><span className="action-index">01</span><span><b>Run a control check</b><small>Collect bounded DNS or header evidence.</small></span><ArrowRight size={14} /></button><button onClick={() => setView("Intelligence")}><span className="action-index">02</span><span><b>Refresh KEV intelligence</b><small>Review public CISA vulnerability records.</small></span><ArrowRight size={14} /></button><button onClick={() => setView("Reporting")}><span className="action-index">03</span><span><b>Assemble a report</b><small>Export current operation metadata.</small></span><ArrowRight size={14} /></button></div></section>
      </div>
      <section className="ops-banner"><div><span className="eyebrow">AUTHORIZED USE GATE</span><h2>Scope the decision before collecting evidence.</h2><p>All checks require an explicit written-authorization confirmation, reject private destinations, and return reviewable results without changing the target.</p></div><button className="button button--cyan" onClick={() => setView("Validation Library")}>Open validation library <ArrowRight size={15} /></button></section>
    </div>
  );

  const renderOperations = () => (
    <div className="view-stack">
      <SectionTitle code="01" title="Operation register" detail="Persisted records for written scope, rules of engagement, evidence, and remediation ownership." action={<button className="button button--cyan" onClick={() => setNewOperationOpen(true)}><Plus size={15} /> Add operation</button>} />
      <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Operation</th><th>Sector</th><th>Phase</th><th>Status</th><th>Start</th><th>Lead</th><th>Risk</th><th /></tr></thead><tbody>{operations.map((operation) => <tr key={operation.id}><td><b>{operation.name}</b><code>{operation.id}</code></td><td>{operation.sector}</td><td><span className="phase-mark">{operation.phase}</span></td><td><StatusPill value={operation.status} /></td><td><code>{operation.started}</code></td><td>{operation.lead}</td><td><StatusPill value={operation.risk} /></td><td><button className="text-button" onClick={() => setSelectedOperation(operation)}>View details <ChevronRight size={14} /></button></td></tr>)}</tbody></table></div>{!operations.length && <EmptyState title="No operation records" detail="Use Add operation to create a validated server-side record." action={<button className="button button--cyan" onClick={() => setNewOperationOpen(true)}><Plus size={14} /> Add operation</button>} />}</section>
      <div className="kanban-heading"><div><span className="eyebrow">SERVER-BACKED WORKBOARD</span><h2>Task flow</h2></div><div className="add-task"><input value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addTask(); }} placeholder="Describe a scoped task" /><button className="button button--quiet" onClick={() => void addTask()}><Plus size={14} /> Add</button></div></div>
      <div className="kanban">{taskPhases.map((phase) => <section className="kanban-column" key={phase}><div className="kanban-column__head"><span>{phase}</span><b>{tasks.filter((task) => task.phase === phase).length}</b></div><div className="kanban-stack">{tasks.filter((task) => task.phase === phase).map((task) => <article className="task-card" key={task.id}><div className="task-card__line"><StatusPill value={task.priority} /><code>{task.id}</code></div><b>{task.title}</b><div className="task-card__footer"><span>{task.owner}</span><select aria-label={`Move ${task.title}`} value={task.phase} onChange={(event) => void moveTask(task, event.target.value as TaskPhase)}>{taskPhases.map((option) => <option key={option}>{option}</option>)}</select></div></article>)}</div></section>)}</div>
    </div>
  );

  const renderIntelligence = () => (
    <div className="view-stack">
      <SectionTitle code="02" title="Vulnerability intelligence" detail={`Current records from CISA's Known Exploited Vulnerabilities catalog · last refresh ${formatDate(dashboard?.lastIntelRefresh ?? null)}`} action={<button className="button button--cyan" onClick={() => void refreshIntelligence()} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "spin" : ""} /> {refreshing ? "Refreshing" : "Refresh CISA KEV"}</button>} />
      <div className="filter-bar"><div className="search-field"><Search size={15} /><input value={intelligenceSearch} onChange={(event) => setIntelligenceSearch(event.target.value)} placeholder="Search CVE, vendor, product, or description" /></div><span className="source-note"><ShieldCheck size={14} /> Public source · read-only ingest</span></div>
      <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>CVE</th><th>Vendor / product</th><th>Vulnerability</th><th>Ransomware use</th><th>Due</th><th /></tr></thead><tbody>{filteredIntelligence.map((item) => <tr key={item.id}><td><b>{item.id}</b><code>{item.dateAdded}</code></td><td>{item.vendor}<small className="table-subline">{item.product}</small></td><td className="table-summary">{item.vulnerabilityName}<small className="table-subline">{item.description}</small></td><td><StatusPill value={item.knownRansomwareUse ? "Known use" : "No known use"} /></td><td><code>{item.dueDate}</code></td><td><a className="text-button" href={item.sourceUrl} target="_blank" rel="noreferrer">NVD <ExternalLink size={13} /></a></td></tr>)}</tbody></table></div>{!filteredIntelligence.length && <EmptyState title={intelligence.length ? "No matching records" : "No intelligence loaded"} detail={intelligence.length ? "Try a different search term." : "Refresh the CISA KEV feed to load current public records."} action={!intelligence.length ? <button className="button button--cyan" onClick={() => void refreshIntelligence()}><RefreshCw size={14} /> Refresh feed</button> : undefined} />}</section>
    </div>
  );

  const renderChecks = () => (
    <div className="view-stack">
      <SectionTitle code="03" title="Authorized control checks" detail="Read-only DNS and HTTP security-header checks for public destinations. No login, bypass, exploitation, or mutation is performed." />
      <div className="check-layout"><section className="panel check-form"><div className="panel__header"><div><span className="eyebrow">EVIDENCE COLLECTION</span><h2>Choose a bounded check</h2></div><ShieldCheck size={17} className="text-cyan" /></div><div className="check-tabs"><button className={checkKind === "dns" ? "chip chip--active" : "chip"} onClick={() => { setCheckKind("dns"); setCheckValue(""); setCheckError(""); }}>DNS records</button><button className={checkKind === "headers" ? "chip chip--active" : "chip"} onClick={() => { setCheckKind("headers"); setCheckValue(""); setCheckError(""); }}>HTTP headers</button></div><form onSubmit={runCheck}><label>{checkKind === "dns" ? "Public domain" : "Public HTTP(S) URL"}<input value={checkValue} onChange={(event) => setCheckValue(event.target.value)} placeholder={checkKind === "dns" ? "example.com" : "https://example.com"} required /></label><label className="authorization-check"><input type="checkbox" checked={authorizationConfirmed} onChange={(event) => setAuthorizationConfirmed(event.target.checked)} /><span>I confirm written authorization for this read-only check and will attach the result to the approved review.</span></label>{checkError && <p className="form-error"><AlertTriangle size={14} /> {checkError}</p>}<button className="button button--cyan" type="submit" disabled={checkLoading}>{checkLoading ? <><RefreshCw size={14} className="spin" /> Checking</> : <><Check size={14} /> Run read-only check</>}</button></form><div className="guardrail-note"><ShieldCheck size={15} /><span>Guardrails: public destinations only, private/reserved addresses rejected, explicit authorization required, and no credentials or custom ports.</span></div></section><section className="panel result-panel"><div className="panel__header"><div><span className="eyebrow">RESULT</span><h2>{dnsResult ? dnsResult.domain : headersResult ? headersResult.url : "Awaiting check"}</h2></div>{dnsResult || headersResult ? <StatusPill value="Collected" /> : <Globe2 size={17} className="text-cyan" />}</div>{dnsResult && <div className="result-content"><p className="muted-note">Collected {formatDate(dnsResult.timestamp)}. Empty record groups mean the resolver returned no records for that type.</p>{Object.entries(dnsResult.records).map(([key, values]) => <div className="result-group" key={key}><b>{key}</b><div>{Array.isArray(values) && values.length ? values.map((value) => <code key={JSON.stringify(value)}>{typeof value === "string" ? value : `${value.exchange} · priority ${value.priority}`}</code>) : <span className="muted-note">No records returned</span>}</div></div>)}</div>}{headersResult && <div className="result-content"><p className="muted-note">HTTP {headersResult.statusCode} {headersResult.statusText} · collected {formatDate(headersResult.timestamp)}</p>{Object.entries(headersResult.securityHeaders).map(([key, value]) => <div className="result-group result-group--row" key={key}><b>{key.replaceAll(/([A-Z])/g, " $1")}</b><code className={value === "Missing" ? "missing" : ""}>{value}</code></div>)}</div>}{!dnsResult && !headersResult && <EmptyState title="No result yet" detail="Complete the authorization gate and run a bounded check to collect evidence." />}</section></div>
    </div>
  );

  const renderValidation = () => (
    <div className="view-stack">
      <SectionTitle code="04" title="Validation library" detail="Executable review plans with evidence requirements and explicit stop criteria." />
      <div className="library-layout"><section className="panel template-list"><div className="panel__header"><div><span className="eyebrow">REVIEW PLANS</span><h2>Choose a template</h2></div><BookOpen size={17} className="text-cyan" /></div>{validationTemplates.map((template) => <button key={template.id} className={selectedTemplate.id === template.id ? "template-row template-row--active" : "template-row"} onClick={() => setSelectedTemplate(template)}><div><b>{template.name}</b><span>{template.objective}</span></div><ChevronRight size={15} /></button>)}</section><section className="panel template-detail"><div className="panel__header"><div><span className="eyebrow">SELECTED REVIEW PLAN</span><h2>{selectedTemplate.name}</h2></div><StatusPill value="Ready" /></div><div className="template-body"><p>{selectedTemplate.objective}</p><div className="template-section"><span className="eyebrow">EVIDENCE TO COLLECT</span>{selectedTemplate.evidence.map((item) => <div className="check-row" key={item}><Check size={14} />{item}</div>)}</div><div className="template-section template-section--stop"><span className="eyebrow">STOP CRITERIA</span>{selectedTemplate.stopCriteria.map((item) => <div className="check-row" key={item}><X size={14} />{item}</div>)}</div><button className="button button--cyan" onClick={() => notify("Plan selected", `${selectedTemplate.name} is ready to attach to an operation record.`)}><ClipboardCheck size={14} /> Attach to review record</button></div></section></div>
    </div>
  );

  const renderReporting = () => (
    <div className="view-stack">
      <SectionTitle code="05" title="Report assembly" detail="Generate a Markdown working copy directly from current server-backed operation and task records." action={<button className="button button--cyan" onClick={downloadReport}><Download size={15} /> Download Markdown</button>} />
      <div className="report-layout"><section className="report-hero"><div className="report-art" /><div><span className="eyebrow">CURRENT RECORDS</span><h2>Turn scope into a readable record.</h2><p>The export includes operation metadata, rules of engagement, timeline, and current task state. Add approved evidence before distribution.</p></div></section><section className="panel report-form"><label>Operation<select value={reportOperationId} onChange={(event) => setReportOperationId(event.target.value)}>{operations.map((operation) => <option key={operation.id} value={operation.id}>{operation.name}</option>)}</select></label>{operations.length ? <div className="report-preview"><span className="eyebrow">EXPORT CONTENT</span><div><b>Scope and objective</b><span>Included from the selected operation</span></div><div><b>Rules of engagement</b><span>Included from the selected operation</span></div><div><b>Task register</b><span>{tasks.length} current task record{tasks.length === 1 ? "" : "s"}</span></div><div><b>Evidence note</b><span>Review attachment required before distribution</span></div></div> : <EmptyState title="No reportable operations" detail="Create an operation record before generating a report." action={<button className="button button--cyan" onClick={() => { setView("Operations"); setNewOperationOpen(true); }}><Plus size={14} /> Create operation</button>} />}{operations.length > 0 && <button className="button button--wide button--quiet" onClick={downloadReport}><Download size={14} /> Generate current report</button>}</section></div>
    </div>
  );

  const renderSettings = () => (
    <div className="view-stack">
      <SectionTitle code="06" title="Workspace settings" detail="Runtime and presentation settings for the FKRH defensive dashboard." />
      <div className="settings-layout"><section className="panel settings-panel"><div className="setting-row"><div><b>Appearance</b><p>Change the local presentation layer without changing stored records.</p></div><button className="button button--quiet" onClick={() => setDark((current) => !current)}>{dark ? <Sun size={15} /> : <Moon size={15} />}{dark ? "Light view" : "Dark view"}</button></div><div className="setting-row"><div><b>Refresh cadence</b><p>The dashboard checks for server updates every 20 seconds.</p></div><StatusPill value="Operational" /></div><div className="setting-row"><div><b>Storage</b><p>Operations, tasks, and intelligence records are persisted by the server.</p></div><StatusPill value="Server-backed" /></div></section><section className="panel config-panel"><span className="eyebrow">ACTIVE SOURCES</span><h2>Bounded integrations</h2><div className="source-status"><div><Globe2 size={15} /><span>CISA KEV feed</span><StatusPill value="Read-only" /></div><div><Network size={15} /><span>DNS resolver</span><StatusPill value="Authorized" /></div><div><ShieldCheck size={15} /><span>HTTP header audit</span><StatusPill value="Authorized" /></div></div><p className="muted-note">The application only exposes bounded read-only checks and does not handle secrets or execute host commands.</p></section></div>
    </div>
  );

  const views: Record<View, () => ReactNode> = { Overview: renderOverview, Operations: renderOperations, Intelligence: renderIntelligence, "Control Checks": renderChecks, "Validation Library": renderValidation, Reporting: renderReporting, Settings: renderSettings };
  const ActiveView = views[view];

  return (
    <div className="signal-archive">
      <div className="authorised-banner"><ShieldCheck size={14} /> Defensive use only · every check requires explicit authorization and is read-only.</div>
      <aside className={railOpen ? "rail" : "rail rail--compact"} aria-label="Primary navigation"><div className="rail-brand"><span className="signal-locator" aria-label="FKRH mark" /><div className="rail-brand__text"><span>FKRH / DEFENSIVE</span><b>Control Desk</b></div><button className="rail-collapse" onClick={() => setRailOpen((open) => !open)} aria-label="Collapse navigation">{railOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}</button></div><nav>{navItems.map(({ label, icon: Icon, code }) => <button key={label} onClick={() => { setView(label); setMobileOpen(false); }} className={view === label ? "rail-link rail-link--active" : "rail-link"}><span className="rail-link__code">{code}</span><Icon size={17} /><span className="rail-link__label">{label}</span></button>)}</nav><div className="rail-foot"><div className="operator-dot" /><div><span>SERVER MODE</span><b>Evidence-first</b></div></div></aside>
      {mobileOpen && <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <main className={railOpen ? "workspace" : "workspace workspace--wide"}><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen((open) => !open)}><Menu size={19} /></button><div className="archive-lockup" aria-label="FKRH Control Desk identity"><span className="signal-locator signal-locator--small" aria-hidden="true" /><span className="archive-index">FKRH</span><span className="archive-wordmark">CONTROL DESK</span></div><div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} /><b>{view}</b></div><div className="topbar-actions"><span className="top-status"><i /><span>Operational</span></span><div className="utc-clock"><Clock3 size={14} /><span>UTC {utc}</span></div></div></header><div className="workspace-scroll">{loading && !dashboard ? <div className="loading-state"><RefreshCw size={18} className="spin" /> Loading server data…</div> : error && !dashboard ? <div className="error-state"><AlertTriangle size={18} /><div><b>Dashboard unavailable</b><p>{error}</p><button className="button button--quiet" onClick={() => void loadDashboard()}>Retry</button></div></div> : <ActiveView />}</div></main>
      {selectedOperation && <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Operation detail"><div className="modal"><button className="modal-close" onClick={() => setSelectedOperation(null)} aria-label="Close operation detail"><X size={18} /></button><span className="eyebrow">OPERATION DOSSIER · {selectedOperation.id}</span><h2>{selectedOperation.name}</h2><div className="modal-meta"><StatusPill value={selectedOperation.status} /><StatusPill value={selectedOperation.risk} /><span>{selectedOperation.sector}</span></div><dl className="dossier-list"><div><dt>Scope</dt><dd>{selectedOperation.scope}</dd></div><div><dt>Objective</dt><dd>{selectedOperation.objective}</dd></div><div><dt>Rules of engagement</dt><dd>{selectedOperation.rulesOfEngagement}</dd></div><div><dt>Timeline</dt><dd>{selectedOperation.timeline.map((entry) => <span key={entry}>{entry}</span>)}</dd></div></dl><button className="button button--cyan" onClick={() => { setReportOperationId(selectedOperation.id); setSelectedOperation(null); setView("Reporting"); }}>Build report <ArrowRight size={14} /></button></div></div>}
      {newOperationOpen && <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Create operation"><div className="modal"><button className="modal-close" onClick={() => setNewOperationOpen(false)} aria-label="Close create operation"><X size={18} /></button><span className="eyebrow">NEW OPERATION RECORD</span><h2>Define an authorized review</h2><form onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { const operation = await api<Operation>("/api/operations", { method: "POST", body: JSON.stringify({ name: form.get("name"), sector: form.get("sector"), lead: form.get("lead"), phase: form.get("phase"), status: form.get("status"), risk: form.get("risk"), scope: form.get("scope"), objective: form.get("objective"), rulesOfEngagement: form.get("rulesOfEngagement") }) }); setNewOperationOpen(false); setSelectedOperation(operation); await loadDashboard(true); notify("Operation created", "The authorized planning record is now persisted on the server."); } catch (operationError) { notify("Operation not created", operationError instanceof Error ? operationError.message : "The operation could not be saved.", "bad"); } }}><label>Name<input name="name" required maxLength={160} autoFocus /></label><div className="form-grid"><label>Sector<input name="sector" required maxLength={100} /></label><label>Lead<input name="lead" required maxLength={120} /></label><label>Phase<select name="phase" defaultValue="Scoping">{operationPhases.map((phase) => <option key={phase}>{phase}</option>)}</select></label><label>Status<select name="status" defaultValue="Planning">{operationStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>Risk<select name="risk" defaultValue="Low">{riskLevels.map((risk) => <option key={risk}>{risk}</option>)}</select></label></div><label>Written scope<textarea name="scope" required maxLength={2000} /></label><label>Objective<textarea name="objective" required maxLength={2000} /></label><label>Rules of engagement<textarea name="rulesOfEngagement" required maxLength={2000} /></label><button className="button button--cyan" type="submit"><Check size={14} /> Save operation</button></form></div></div>}
      {toast && <div className={`toast toast--${toast.tone}`}><span className="toast-mark">{toast.tone === "good" ? <Check size={14} /> : <AlertTriangle size={14} />}</span><div><b>{toast.title}</b><p>{toast.detail}</p></div><button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={14} /></button></div>}
    </div>
  );
}
