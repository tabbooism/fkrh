export type OperationPhase =
  | "Scoping"
  | "Validation"
  | "Detection"
  | "Remediation"
  | "Reporting";

export type OperationStatus = "Planning" | "Active" | "Paused" | "Complete";
export type RiskLevel = "Low" | "Moderate" | "High";
export type TaskPhase = "To Do" | "In Progress" | "Blocked" | "Completed";
export type Priority = "Low" | "Moderate" | "High";

export interface Operation {
  id: string;
  name: string;
  sector: string;
  phase: OperationPhase;
  status: OperationStatus;
  started: string;
  lead: string;
  risk: RiskLevel;
  scope: string;
  objective: string;
  rulesOfEngagement: string;
  timeline: string[];
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  phase: TaskPhase;
  owner: string;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface IntelItem {
  id: string;
  dateAdded: string;
  vendor: string;
  product: string;
  vulnerabilityName: string;
  description: string;
  knownRansomwareUse: boolean;
  requiredAction: string;
  dueDate: string;
  sourceUrl: string;
}

export interface Metrics {
  activeOperations: number;
  totalOperations: number;
  openTasks: number;
  blockedTasks: number;
  completedTasks: number;
  intelligenceItems: number;
  lastIntelRefresh: string | null;
}

export interface DnsLookupResult {
  domain: string;
  records: {
    A: string[];
    MX: Array<{ exchange: string; priority: number }>;
    TXT: string[];
    NS: string[];
  };
  timestamp: string;
}

export interface HeaderAuditResult {
  url: string;
  statusCode: number;
  statusText: string;
  securityHeaders: Record<string, string>;
  timestamp: string;
}

export interface ValidationTemplate {
  id: string;
  name: string;
  objective: string;
  evidence: string[];
  stopCriteria: string[];
}

export interface DashboardState {
  operations: Operation[];
  tasks: Task[];
}
