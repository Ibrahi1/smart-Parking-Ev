// backend/src/models/Incident.ts

import { SecurityEvent } from './SecurityEvent';

export interface Incident {
  incidentId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  category: string;
  priority: number; // 1-5
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  assignedTo?: string;
  reporter: string;
  
  // Related data
  events: SecurityEvent[];
  affectedAssets: string[];
  indicators: string[];
  
  // Timeline
  timeline: IncidentAction[];
  
  // Response
  containmentActions: string[];
  rootCause?: string;
  lessonsLearned?: string;
  
  // Evidence
  evidence: Evidence[];
  
  tags: string[];
}

export interface IncidentAction {
  timestamp: Date;
  actor: string;
  action: string;
  description: string;
  automated: boolean;
}

export interface Evidence {
  id: string;
  type: 'log' | 'screenshot' | 'network_capture' | 'file' | 'transaction';
  description: string;
  timestamp: Date;
  data: any;
  hash?: string; // For integrity verification
}

export interface IncidentStatistics {
  total: number;
  open: number;
  investigating: number;
  contained: number;
  resolved: number;
  closed: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  averageTimeToResolve: number; // in minutes
  averageTimeToDetect: number; // in minutes
}
