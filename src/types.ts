export interface TargetData {
  domains: string[];
  usernames: string[];
  emails: string[];
  names: string[];
  phones: string[];
  crypto: string[];
  other: string[];
}

export interface IntelTarget {
  id: string;
  username: string;
  status: 'UNINVESTIGATED' | 'REPORT READY' | 'DEEP DIVE';
  source: string;
  timestamp: string;
  eventId?: string;
}

export interface AffiliateCode {
  code: string;
  url: string;
}

export interface UserProfile {
  id: string;
  encoded: string;
  decoded: string;
}

export interface ContextualInfo {
  industry: string;
  relationships: string;
}

export interface FinancialRecord {
  id: string;
  name: string;
  amount: string;
  timestamp?: string;
}

export interface BreachResult {
  target: string;
  source: string;
  found: boolean;
  details: string[];
  timestamp: string;
}

export interface Task {
  id: string;
  name: string;
  target: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  timestamp: string;
}

export interface InvestigationState {
  targets: TargetData;
  intelTargets: IntelTarget[];
  affiliates: AffiliateCode[];
  profiles: UserProfile[];
  financialRecords: FinancialRecord[];
  breachHistory: BreachResult[];
  context: ContextualInfo;
  notes: string;
  tasks: Task[];
  isPremium: boolean;
  credits: number;
}

export type OSINTCategory = 
  | 'infrastructure' 
  | 'social' 
  | 'darkweb' 
  | 'financial' 
  | 'graph' 
  | 'geospatial' 
  | 'archival' 
  | 'ai'
  | 'runehall'
  | 'monitoring';
