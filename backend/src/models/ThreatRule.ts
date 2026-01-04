// backend/src/models/ThreatRule.ts

export interface ThreatRule {
  ruleId: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  
  // Detection logic
  conditions: RuleCondition[];
  aggregation?: {
    field: string;
    operator: 'count' | 'sum' | 'avg' | 'min' | 'max';
    threshold: number;
    timeWindow: number; // seconds
  };
  
  // Actions
  actions: RuleAction[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastTriggered?: Date;
  triggerCount: number;
  
  // Tuning
  falsePositiveRate?: number;
  confidence?: number;
  tags: string[];
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 
            'greater_than' | 'less_than' | 'in' | 'not_in' | 'matches' | 'exists';
  value: any;
  caseInsensitive?: boolean;
}

export interface RuleAction {
  type: 'alert' | 'block_ip' | 'throttle' | 'log' | 'create_incident' | 
        'notify' | 'quarantine' | 'automated_response';
  parameters?: Record<string, any>;
  priority?: number;
}

export interface RuleMatch {
  rule: ThreatRule;
  matchedData: any;
  timestamp: Date;
  confidence: number;
}
