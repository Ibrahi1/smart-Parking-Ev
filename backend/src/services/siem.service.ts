// backend/src/services/siem.service.ts

import { SecurityEvent } from '../models/SecurityEvent';
import { ThreatRule, RuleMatch } from '../models/ThreatRule';
import { securityService } from './security.service';
import { alertService } from './alert.service';
import { incidentService } from './incident.service';
import { detectionRules } from '../rules/detection-rules';
import { RuleEngine } from '../rules/rule-engine';
import { logger } from '../config/logger';
import { EventEmitter } from 'events';

class SIEMService extends EventEmitter {
  private ruleEngine: RuleEngine;
  private rules: ThreatRule[] = [];
  private eventBuffer: Map<string, SecurityEvent[]> = new Map(); // For aggregation

  constructor() {
    super();
    this.ruleEngine = new RuleEngine();
  }

  async start(): Promise<void> {
    logger.info('Starting SIEM Service...');

    // Load detection rules
    this.rules = detectionRules;
    logger.info(`Loaded ${this.rules.length} detection rules`);

    // Subscribe to security events
    securityService.on('securityEvent', (event: SecurityEvent) => {
      this.processEvent(event);
    });

    // Setup aggregation window cleanup
    this.setupAggregationCleanup();

    logger.info('SIEM Service started');
  }

  // Process incoming security event
  private async processEvent(event: SecurityEvent): Promise<void> {
    try {
      // Add to buffer for aggregation rules
      this.addToBuffer(event);

      // Check against all enabled rules
      for (const rule of this.rules.filter(r => r.enabled)) {
        const match = await this.evaluateRule(rule, event);
        if (match) {
          await this.handleRuleMatch(match);
        }
      }
    } catch (error) {
      logger.error('Error processing event in SIEM:', error);
    }
  }

  // Evaluate a single rule against an event
  private async evaluateRule(rule: ThreatRule, event: SecurityEvent): Promise<RuleMatch | null> {
    // Simple condition evaluation
    if (rule.aggregation) {
      return this.evaluateAggregationRule(rule);
    } else {
      const matches = this.ruleEngine.evaluate(rule, event);
      if (matches) {
        return {
          rule,
          matchedData: event,
          timestamp: new Date(),
          confidence: rule.confidence || 80,
        };
      }
    }
    return null;
  }

  // Evaluate aggregation-based rules
  private evaluateAggregationRule(rule: ThreatRule): RuleMatch | null {
    if (!rule.aggregation) return null;

    const { field, operator, threshold, timeWindow } = rule.aggregation;
    const cutoff = new Date(Date.now() - timeWindow * 1000);

    // Get relevant events from buffer
    const key = `${rule.ruleId}:${field}`;
    const events = this.eventBuffer.get(key) || [];
    const recentEvents = events.filter(e => e.timestamp >= cutoff);

    let aggregatedValue: number = 0;

    switch (operator) {
      case 'count':
        aggregatedValue = recentEvents.length;
        break;
      case 'sum':
        aggregatedValue = recentEvents.reduce((sum, e) => {
          const value = this.extractFieldValue(e, field);
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
        break;
      // Add other operators as needed
      default:
        aggregatedValue = recentEvents.length;
    }

    if (aggregatedValue >= threshold) {
      return {
        rule,
        matchedData: {
          aggregatedValue,
          threshold,
          eventCount: recentEvents.length,
          timeWindow,
          events: recentEvents.slice(-10), // Last 10 events
        },
        timestamp: new Date(),
        confidence: Math.min(100, 50 + (aggregatedValue - threshold) * 10),
      };
    }

    return null;
  }

  // private evaluateEvents() {
  //   for (const rule of this.rules.values()) {
  //     if (!rule.enabled) continue;

  //     const relevantEvents = this.getRelevantEvents(rule);
      
  //     // Add this debug log:
  //     if (relevantEvents.length > 0) {
  //       console.log(`[SIEM] Rule ${rule.ruleId}: ${relevantEvents.length} relevant events`);
  //     }

  //     if (this.shouldTriggerRule(rule, relevantEvents)) {
  //       console.log(`[SIEM] 🚨 Rule triggered: ${rule.name}`); // Add this
  //       this.triggerRule(rule, relevantEvents);
  //     }
  //   }
  // }

  // Handle rule match
  private async handleRuleMatch(match: RuleMatch): Promise<void> {
    const { rule, matchedData } = match;

    logger.warn(`Rule triggered: ${rule.name} [${rule.severity}]`);

    // Update rule trigger count
    rule.lastTriggered = new Date();
    rule.triggerCount++;

    // Create threat event
    const threatEvent = await securityService.recordEvent({
      type: 'threat',
      severity: rule.severity,
      category: rule.category,
      title: rule.name,
      description: rule.description,
      details: { matchedData, ruleId: rule.ruleId },
      ruleName: rule.name,
      tags: ['automated_detection', ...rule.tags],
    });

    // Execute rule actions
    for (const action of rule.actions) {
      await this.executeAction(action, threatEvent, matchedData);
    }

    // Emit event for listeners
    this.emit('threatDetected', { rule, event: threatEvent, match });
  }

  // Execute rule action
  private async executeAction(
    action: any,
    event: SecurityEvent,
    matchedData: any
  ): Promise<void> {
    try {
      switch (action.type) {
        case 'alert':
          await alertService.sendAlert({
            title: event.title,
            severity: event.severity,
            message: event.description,
            eventId: event.eventId,
            details: matchedData,
          });
          break;

        case 'block_ip':
          if (event.source.ip) {
            securityService.blockIP(event.source.ip, event.title);
          }
          break;

        case 'create_incident':
          await incidentService.createIncident({
            title: event.title,
            description: event.description,
            severity: event.severity,
            category: event.category,
            events: [event],
            automated: true,
          });
          break;

        case 'log':
          logger.warn(`Security Action: ${event.title}`, { event, matchedData });
          break;

        case 'notify':
          // Placeholder for notifications (email, Slack, etc.)
          logger.info(`Notification triggered for: ${event.title}`);
          break;

        default:
          logger.warn(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      logger.error(`Error executing action ${action.type}:`, error);
    }
  }

  // Buffer management for aggregation
  private addToBuffer(event: SecurityEvent): void {
    const keys = this.getBufferKeys(event);
    keys.forEach(key => {
      const buffer = this.eventBuffer.get(key) || [];
      buffer.push(event);
      this.eventBuffer.set(key, buffer);
    });
  }

  private getBufferKeys(event: SecurityEvent): string[] {
    const keys: string[] = [];
    
    // Add keys for common aggregation fields
    if (event.source.ip) {
      keys.push(`ip:${event.source.ip}`);
    }
    if (event.source.userId) {
      keys.push(`user:${event.source.userId}`);
    }
    if (event.source.carId) {
      keys.push(`car:${event.source.carId}`);
    }
    keys.push(`category:${event.category}`);
    keys.push(`severity:${event.severity}`);

    return keys;
  }

  private setupAggregationCleanup(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
      
      this.eventBuffer.forEach((events, key) => {
        const filtered = events.filter(e => e.timestamp >= cutoff);
        if (filtered.length === 0) {
          this.eventBuffer.delete(key);
        } else {
          this.eventBuffer.set(key, filtered);
        }
      });
    }, 60 * 1000); // Every minute
  }

  private extractFieldValue(event: SecurityEvent, field: string): any {
    const parts = field.split('.');
    let value: any = event;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  // Management methods
  getRules(): ThreatRule[] {
    return this.rules;
  }

  getRule(ruleId: string): ThreatRule | undefined {
    return this.rules.find(r => r.ruleId === ruleId);
  }

  enableRule(ruleId: string): boolean {
    const rule = this.rules.find(r => r.ruleId === ruleId);
    if (rule) {
      rule.enabled = true;
      logger.info(`Rule enabled: ${rule.name}`);
      return true;
    }
    return false;
  }

  disableRule(ruleId: string): boolean {
    const rule = this.rules.find(r => r.ruleId === ruleId);
    if (rule) {
      rule.enabled = false;
      logger.info(`Rule disabled: ${rule.name}`);
      return true;
    }
    return false;
  }

  getBufferStats(): any {
    return {
      totalKeys: this.eventBuffer.size,
      totalEvents: Array.from(this.eventBuffer.values())
        .reduce((sum, events) => sum + events.length, 0),
    };
  }
}

export const siemService = new SIEMService();
