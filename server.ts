import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer as createViteServer } from "vite";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";

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
} from "./src/types";

const ROOT_DIR = process.cwd();
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";
const DATA_DIR = path.join(ROOT_DIR, ".data");
const DATA_FILE = path.join(DATA_DIR, "dashboard.json");
const CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const MAX_BODY_BYTES = 100_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

interface PersistedState {
  operations: Operation[];
  tasks: Task[];
  intelligence: IntelItem[];
  lastIntelRefresh: string | null;
}

const emptyState = (): PersistedState => ({
  operations: [],
  tasks: [],
  intelligence: [],
  lastIntelRefresh: null,
});

let state: PersistedState = emptyState();
let writeChain = Promise.resolve();
const rateLimits = new Map<string, { startedAt: number; count: number }>();

async function loadState() {
  await fs.mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  try {
    const content = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(content) as Partial<PersistedState>;
    state = {
      operations: Array.isArray(parsed.operations) ? parsed.operations : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      intelligence: Array.isArray(parsed.intelligence) ? parsed.intelligence : [],
      lastIntelRefresh: typeof parsed.lastIntelRefresh === "string" ? parsed.lastIntelRefresh : null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await persist();
  }
}

function persist() {
  writeChain = writeChain.then(async () => {
    const tempFile = `${DATA_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
    await fs.rename(tempFile, DATA_FILE);
  });
  return writeChain;
}

function now() {
  return new Date().toISOString();
}

function getMetrics(): Metrics {
  const openTasks = state.tasks.filter((task) => task.phase !== "Completed").length;
  return {
    activeOperations: state.operations.filter((operation) => operation.status === "Active").length,
    totalOperations: state.operations.length,
    openTasks,
    blockedTasks: state.tasks.filter((task) => task.phase === "Blocked").length,
    completedTasks: state.tasks.filter((task) => task.phase === "Completed").length,
    intelligenceItems: state.intelligence.length,
    lastIntelRefresh: state.lastIntelRefresh,
  };
}

function isNonEmptyString(value: unknown, maxLength = 2_000): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function oneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function requireAuthorized(req: Request, res: Response): boolean {
  if (req.body?.authorized !== true) {
    res.status(400).json({ error: "An explicit authorized=true confirmation is required for this check." });
    return false;
  }
  return true;
}

function normalizeDomain(input: unknown): string | null {
  if (!isNonEmptyString(input, 253)) return null;
  const candidate = input.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();
  if (candidate.length > 253 || candidate.includes("/") || candidate.includes("@") || net.isIP(candidate)) return null;
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(candidate)) return null;
  if (candidate === "localhost" || candidate.endsWith(".local") || candidate.endsWith(".internal") || candidate.endsWith(".localhost")) return null;
  return candidate;
}

function isPrivateIp(address: string): boolean {
  const version = net.isIP(address);
  if (version === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0 || a >= 224;
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb");
  }
  return true;
}

async function assertPublicHostname(hostname: string) {
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("Private hostnames are not allowed.");
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error("Private or reserved addresses are not allowed.");
    return;
  }
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error("The destination resolves to a private or reserved address.");
}

function safeHeaderValue(value: unknown): string {
  if (typeof value !== "string") return "Missing";
  return value.slice(0, 500);
}

function mapKevItem(item: Record<string, unknown>): IntelItem | null {
  const cve = typeof item.cveID === "string" ? item.cveID : null;
  const vendor = typeof item.vendorProject === "string" ? item.vendorProject : null;
  const product = typeof item.product === "string" ? item.product : null;
  const name = typeof item.vulnerabilityName === "string" ? item.vulnerabilityName : null;
  const description = typeof item.shortDescription === "string" ? item.shortDescription : null;
  const dateAdded = typeof item.dateAdded === "string" ? item.dateAdded : null;
  const requiredAction = typeof item.requiredAction === "string" ? item.requiredAction : null;
  const dueDate = typeof item.dueDate === "string" ? item.dueDate : null;
  if (!cve || !vendor || !product || !name || !description || !dateAdded || !requiredAction || !dueDate) return null;
  return {
    id: cve,
    dateAdded,
    vendor,
    product,
    vulnerabilityName: name,
    description,
    knownRansomwareUse: item.knownRansomwareCampaignUse === "Known",
    requiredAction,
    dueDate,
    sourceUrl: `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve)}`,
  };
}

async function refreshIntelligence(): Promise<IntelItem[]> {
  const response = await fetch(CISA_KEV_URL, { signal: AbortSignal.timeout(10_000), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`CISA KEV feed returned HTTP ${response.status}.`);
  const feedBody = await response.json() as { vulnerabilities?: unknown };
  if (!Array.isArray(feedBody.vulnerabilities)) throw new Error("CISA KEV feed format was not recognized.");
  const items = feedBody.vulnerabilities.map((item) => mapKevItem(item as Record<string, unknown>)).filter((item): item is IntelItem => item !== null);
  if (!items.length) throw new Error("CISA KEV feed returned no usable records.");
  state.intelligence = items;
  state.lastIntelRefresh = now();
  await persist();
  return items;
}

function validateOperation(body: unknown): Omit<Operation, "id" | "started" | "updatedAt" | "timeline"> {
  const value = body as Record<string, unknown>;
  const phaseValues = ["Scoping", "Validation", "Detection", "Remediation", "Reporting"] as const;
  const statusValues = ["Planning", "Active", "Paused", "Complete"] as const;
  const riskValues = ["Low", "Moderate", "High"] as const;
  if (!isNonEmptyString(value.name, 160) || !isNonEmptyString(value.sector, 100) || !isNonEmptyString(value.lead, 120) || !isNonEmptyString(value.scope) || !isNonEmptyString(value.objective) || !isNonEmptyString(value.rulesOfEngagement) || !oneOf(value.phase, phaseValues) || !oneOf(value.status, statusValues) || !oneOf(value.risk, riskValues)) {
    throw new Error("Operation requires name, sector, lead, scope, objective, rulesOfEngagement, phase, status, and risk.");
  }
  return {
    name: value.name.trim(),
    sector: value.sector.trim(),
    phase: value.phase as OperationPhase,
    status: value.status as OperationStatus,
    lead: value.lead.trim(),
    risk: value.risk as RiskLevel,
    scope: value.scope.trim(),
    objective: value.objective.trim(),
    rulesOfEngagement: value.rulesOfEngagement.trim(),
  };
}

function validateTask(body: unknown): Omit<Task, "id" | "createdAt" | "updatedAt"> {
  const value = body as Record<string, unknown>;
  const phaseValues = ["To Do", "In Progress", "Blocked", "Completed"] as const;
  const priorityValues = ["Low", "Moderate", "High"] as const;
  if (!isNonEmptyString(value.title, 240) || !isNonEmptyString(value.owner, 120) || !oneOf(value.phase, phaseValues) || !oneOf(value.priority, priorityValues)) {
    throw new Error("Task requires title, owner, phase, and priority.");
  }
  return { title: value.title.trim(), owner: value.owner.trim(), phase: value.phase as TaskPhase, priority: value.priority as Priority };
}

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || "unknown";
  const current = rateLimits.get(key);
  const timestamp = Date.now();
  if (!current || timestamp - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(key, { startedAt: timestamp, count: 1 });
    return next();
  }
  current.count += 1;
  if (current.count > RATE_LIMIT_MAX) return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  return next();
}

function errorResponse(error: unknown, res: Response) {
  const message = error instanceof Error ? error.message : "Request failed.";
  res.status(400).json({ error: message });
}

async function startServer() {
  await loadState();
  const app = express();
  const httpServer = createServer(app);

  app.disable("x-powered-by");
  app.use(express.json({ limit: MAX_BODY_BYTES }));
  app.use(rateLimit);
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "fkrh-defensive-dashboard", timestamp: now() }));

  app.get("/api/dashboard", (_req, res) => res.json({ metrics: getMetrics(), operations: state.operations, tasks: state.tasks, intelligence: state.intelligence, lastIntelRefresh: state.lastIntelRefresh }));
  app.get("/api/metrics", (_req, res) => res.json(getMetrics()));
  app.get("/api/operations", (_req, res) => res.json(state.operations));
  app.get("/api/tasks", (_req, res) => res.json(state.tasks));
  app.get("/api/intelligence", (_req, res) => res.json({ items: state.intelligence, lastRefresh: state.lastIntelRefresh, source: CISA_KEV_URL }));

  app.post("/api/intelligence/refresh", async (_req, res) => {
    try {
      const items = await refreshIntelligence();
      res.json({ items, lastRefresh: state.lastIntelRefresh, source: CISA_KEV_URL });
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : "Intelligence refresh failed.", cachedItems: state.intelligence, lastRefresh: state.lastIntelRefresh });
    }
  });

  app.post("/api/operations", async (req, res) => {
    try {
      const input = validateOperation(req.body);
      const timestamp = now();
      const operation: Operation = { ...input, id: `OP-${timestamp.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`, started: timestamp.slice(0, 10), timeline: ["Planning record created"], updatedAt: timestamp };
      state.operations.unshift(operation);
      await persist();
      res.status(201).json(operation);
    } catch (error) {
      errorResponse(error, res);
    }
  });

  app.patch("/api/operations/:id", async (req, res) => {
    const operation = state.operations.find((item) => item.id === req.params.id);
    if (!operation) return res.status(404).json({ error: "Operation not found." });
    try {
      const input = validateOperation({ ...operation, ...req.body });
      Object.assign(operation, input, { updatedAt: now() });
      await persist();
      return res.json(operation);
    } catch (error) {
      return errorResponse(error, res);
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const input = validateTask(req.body);
      const timestamp = now();
      const task: Task = { ...input, id: `TK-${randomUUID().slice(0, 8).toUpperCase()}`, createdAt: timestamp, updatedAt: timestamp };
      state.tasks.push(task);
      await persist();
      res.status(201).json(task);
    } catch (error) {
      errorResponse(error, res);
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const task = state.tasks.find((item) => item.id === req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found." });
    const nextPhase = req.body?.phase;
    if (!oneOf(nextPhase, ["To Do", "In Progress", "Blocked", "Completed"] as const)) return res.status(400).json({ error: "A valid task phase is required." });
    task.phase = nextPhase;
    task.updatedAt = now();
    await persist();
    return res.json(task);
  });

  app.post("/api/checks/dns", async (req, res) => {
    if (!requireAuthorized(req, res)) return;
    const domain = normalizeDomain(req.body?.domain);
    if (!domain) return res.status(400).json({ error: "Provide a public fully-qualified domain name." });
    try {
      const [a, mx, txt, ns] = await Promise.allSettled([dns.resolve4(domain), dns.resolveMx(domain), dns.resolveTxt(domain), dns.resolveNs(domain)]);
      const result: DnsLookupResult = {
        domain,
        records: {
          A: a.status === "fulfilled" ? a.value : [],
          MX: mx.status === "fulfilled" ? mx.value.map(({ exchange, priority }) => ({ exchange, priority })) : [],
          TXT: txt.status === "fulfilled" ? txt.value.map((parts) => parts.join("")) : [],
          NS: ns.status === "fulfilled" ? ns.value : [],
        },
        timestamp: now(),
      };
      return res.json(result);
    } catch (error) {
      return errorResponse(error, res);
    }
  });

  app.post("/api/checks/headers", async (req, res) => {
    if (!requireAuthorized(req, res)) return;
    if (!isNonEmptyString(req.body?.url, 2_000)) return res.status(400).json({ error: "A URL is required." });
    let target: URL;
    try {
      target = new URL(req.body.url.trim());
    } catch {
      return res.status(400).json({ error: "Provide a valid HTTP or HTTPS URL." });
    }
    if (!/^https?:$/.test(target.protocol) || target.username || target.password || (target.port && target.port !== "80" && target.port !== "443")) return res.status(400).json({ error: "Only public HTTP(S) URLs without credentials or custom ports are allowed." });
    try {
      await assertPublicHostname(target.hostname);
      const response = await fetch(target, { redirect: "manual", signal: AbortSignal.timeout(8_000), headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "FKRH-Defensive-Header-Audit/1.0" } });
      const result: HeaderAuditResult = {
        url: target.toString(),
        statusCode: response.status,
        statusText: response.statusText,
        securityHeaders: {
          strictTransportSecurity: safeHeaderValue(response.headers.get("strict-transport-security")),
          contentSecurityPolicy: safeHeaderValue(response.headers.get("content-security-policy")),
          xFrameOptions: safeHeaderValue(response.headers.get("x-frame-options")),
          xContentTypeOptions: safeHeaderValue(response.headers.get("x-content-type-options")),
          referrerPolicy: safeHeaderValue(response.headers.get("referrer-policy")),
          permissionsPolicy: safeHeaderValue(response.headers.get("permissions-policy")),
        },
        timestamp: now(),
      };
      return res.json(result);
    } catch (error) {
      return errorResponse(error, res);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, "dist");
    if (!existsSync(path.join(distPath, "index.html"))) throw new Error("Production build not found. Run npm run build first.");
    app.use(express.static(distPath, { index: "index.html" }));
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      return res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, HOST, () => console.log(`FKRH defensive dashboard listening on http://${HOST}:${PORT}`));
}

startServer().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
