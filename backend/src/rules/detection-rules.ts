// backend/src/rules/detection-rules.ts

import { ThreatRule } from '../models/ThreatRule';

export const detectionRules: ThreatRule[] = [
  // 1. Brute Force Reservation Attack
  {
    ruleId: 'RULE-001',
    name: 'Brute Force Reservation Attack',
    description: 'Multiple failed reservation attempts from the same source in a short time',
    enabled: true,
    severity: 'high',
    category: 'brute_force',
    conditions: [
      {
        field: 'category',
        operator: 'equals',
        value: 'reservation',
      },
      {
        field: 'details.success',
        operator: 'equals',
        value: false,
      },
    ],
    aggregation: {
      field: 'source.ip',
      operator: 'count',
      threshold: 5,
      timeWindow: 60, // 1 minute
    },
    actions: [
      { type: 'alert', priority: 1 },
      { type: 'block_ip' },
      { type: 'create_incident' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    triggerCount: 0,
    confidence: 85,
    tags: ['brute_force', 'reservation'],
  },

  // 2. MVCC Conflict Storm
  {
    ruleId: 'RULE-002',
    name: 'MVCC Conflict Storm',
    description: 'High number of MVCC conflicts indicating concurrent booking attacks',
    enabled: true,
    severity: 'critical',
    category: 'blockchain_attack',
    conditions: [
      {
        field: 'type',
        operator: 'equals',
        value: 'threat',
      },
      {
        field: 'details.error',
        operator: 'contains',
        value: 'MVCC',
        caseInsensitive: true,
      },
    ],
    aggregation: {
      field: 'source.ip',
      operator: 'count',
      threshold: 10,
      timeWindow: 300, // 5 minutes
    },
    actions: [
      { type: 'alert', priority: 1 },
      { type: 'throttle' },
      { type: 'create_incident' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    triggerCount: 0,
    confidence: 90,
    tags: ['mvcc', 'blockchain', 'concurrent'],
  },

  // 3. Payment Fraud Attempt
  {
    ruleId: 'RULE-003',
    name: 'Payment Fraud Attempt',
    description: 'Attempt to start parking without completing payment',
    enabled: true,
    severity: 'critical',
    category: 'payment_fraud',
    conditions: [
      {
        field: 'category',
        operator: 'equals',
        value: 'payment_fraud',
      },
      {
        field: 'details.fraud_attempt',
        operator: 'equals',
        value: true,
      },
    ],
    actions: [
      { type: 'alert', priority: 1 },
      { type: 'block_ip' },
      { type: 'create_incident' },
      { type: 'log' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    triggerCount: 0,
    confidence: 95,
    tags: ['payment', 'fraud'],
  },

  // 4. API Rate Limit Violation (DDoS)
  {
    ruleId: 'RULE-004',
    name: 'API Rate Limit Violation (DDoS)',
    description: 'Excessive API requests from a single source - possible DDoS attack',
    enabled: true,
    severity: 'high',
    category: 'api_abuse',
    conditions: [
      {
        field: 'category',
        operator: 'equals',
        value: 'api_access',
      },
    ],
    aggregation: {
      field: 'source.ip',
      operator: 'count',
      threshold: 100,
      timeWindow: 60, // 1 minute
    },
    actions: [
      { type: 'alert', priority: 1 },
      { type: 'block_ip' },
      { type: 'create_incident' },
      { type: 'log' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    triggerCount: 0,
    confidence: 80,
    tags: ['api', 'rate_limit', 'dos'],
  },

  // 5. Suspicious Transaction Pattern
  {
    ruleId: 'RULE-005',
    name: 'Suspicious Transaction Pattern',
    description: 'Unusual number of transactions in short time',
    enabled: true,
    severity: 'medium',
    category: 'anomaly',
    conditions: [
      {
        field: 'category',
        operator: 'equals',
        value: 'blockchain_transaction',
      },
    ],
    aggregation: {
      field: 'source.carId',
      operator: 'count',
      threshold: 20,
      timeWindow: 10, // 10 seconds
    },
    actions: [
      { type: 'alert' },
      { type: 'log' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    triggerCount: 0,
    confidence: 70,
    tags: ['transaction', 'anomaly'],
  },

  // 6. Unauthorized Access Attempt
  {
    ruleId: 'RULE-006',
    name: 'Unauthorized Access Attempt',
    description: 'Failed authentication or authorization attempts',
    enabled: true,
    severity: 'high',
    category: 'authentication',
    conditions: [
      {
        field: 'category',
        operator: 'equals',
        value: 'authentication',
      },
      {
        field: 'details.success',
        operator: 'equals',
        value: false,
      },
    ],
    aggregation: {
      field: 'source.ip',
      operator: 'count',
      threshold: 5,
      timeWindow: 120, // 2 minutes
    },
    actions: [
      { type: 'alert' },
      { type: 'block_ip' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    triggerCount: 0,
    confidence: 85,
    tags: ['authentication', 'unauthorized'],
  },

  // 7. Data Exfiltration Attempt
  {
    ruleId: 'RULE-007',
    name: 'Data Exfiltration Attempt',
    description: 'Large data query or export detected',
    enabled: true,
    severity: 'high',
    category: 'data_exfiltration',
    conditions: [
      {
        field: 'category',
        operator: 'equals',
        value: 'data_access',
      },
      {
        field: 'details.recordCount',
        operator: 'greater_than',
        value: 1000,
      },
    ],
    actions: [
      { type: 'alert', priority: 1 },
      { type: 'log' },
      { type: 'create_incident' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    triggerCount: 0,
    confidence: 75,
    tags: ['data', 'exfiltration'],
  },

  // 8. Smart Contract Abuse
  {
    ruleId: 'RULE-008',
    name: 'Smart Contract Abuse',
    description: 'Rapid successive calls to smart contract functions',
    enabled: true,
    severity: 'high',
    category: 'contract_abuse',
    conditions: [
      {
        field: 'category',
        operator: 'equals',
        value: 'chaincode_invocation',
      },
    ],
    aggregation: {
      field: 'source.userId',
      operator: 'count',
      threshold: 15,
      timeWindow: 10, // 10 seconds
    },
    actions: [
      { type: 'alert' },
      { type: 'throttle' },
      { type: 'log' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    triggerCount: 0,
    confidence: 80,
    tags: ['chaincode', 'abuse'],
  },

  // 9. Unusual Hour Activity
  {
    ruleId: 'RULE-009',
    name: 'Unusual Hour Activity',
    description: 'High activity during off-peak hours (2AM-5AM)',
    enabled: true,
    severity: 'low',
    category: 'anomaly',
    conditions: [
      {
        field: 'category',
        operator: 'equals',
        value: 'reservation',
      },
    ],
    aggregation: {
      field: 'timestamp',
      operator: 'count',
      threshold: 20,
      timeWindow: 3600, // 1 hour
    },
    actions: [
      { type: 'log' },
      { type: 'notify' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    triggerCount: 0,
    confidence: 60,
    tags: ['anomaly', 'timing'],
  },

  // 10. Repeated Failed Transactions
  {
    ruleId: 'RULE-010',
    name: 'Repeated Failed Transactions',
    description: 'Multiple transaction failures from same source',
    enabled: true,
    severity: 'medium',
    category: 'transaction_failure',
    conditions: [
      {
        field: 'type',
        operator: 'equals',
        value: 'warning',
      },
      {
        field: 'details.transaction_status',
        operator: 'equals',
        value: 'failed',
      },
    ],
    aggregation: {
      field: 'source.carId',
      operator: 'count',
      threshold: 10,
      timeWindow: 300, // 5 minutes
    },
    actions: [
      { type: 'alert' },
      { type: 'log' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    triggerCount: 0,
    confidence: 70,
    tags: ['transaction', 'failure'],
  },
];
