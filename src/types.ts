export interface TargetData {
  domains: string[];
  usernames: string[];
  emails: string[];
  names: string[];
  phones: string[];
  crypto: string[];
  other: string[];
}

export interface ContextualInfo {
  industry: string;
  relationships: string;
}

export interface InvestigationState {
  targets: TargetData;
  context: ContextualInfo;
  notes: string;
}

export type OSINTCategory = 
  | 'infrastructure' 
  | 'social' 
  | 'darkweb' 
  | 'financial' 
  | 'graph' 
  | 'geospatial' 
  | 'archival' 
  | 'ai';
