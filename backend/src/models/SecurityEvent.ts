// backend/src/models/SecurityEvent.ts

export interface SecurityEvent {
  eventId: string;
  timestamp: Date;
  type: 'threat' | 'anomaly' | 'compliance' | 'info' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  source: {
    ip?: string;
    userId?: string;
    carId?: string;
    component: string;
  };
  title: string;
  description: string;
  details: any;
  ruleName?: string;
  relatedEvents?: string[];
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  tags: string[];
  incidentId?: string;
}

export interface ThreatIndicator {
  type: 'ip' | 'user' | 'pattern' | 'signature';
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  firstSeen: Date;
  lastSeen: Date;
  occurrences: number;
}

export interface SecurityMetrics {
  timestamp: Date;
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  openIncidents: number;
  resolvedIncidents: number;
  blockedIPs: number;
  averageResponseTime: number;
  threatsByCategory: Record<string, number>;
  eventsByHour: number[];
}
