// backend/src/services/security.service.ts

import { SecurityEvent, ThreatIndicator, SecurityMetrics } from '../models/SecurityEvent';
import { logger } from '../config/logger';
import { EventEmitter } from 'events';
import { aiAnalysisService } from './ai-analysis.service';

class SecurityService extends EventEmitter {
  private events: SecurityEvent[] = [];
  private indicators: Map<string, ThreatIndicator> = new Map();
  private blockedIPs: Set<string> = new Set();
  private maxEvents: number = 10000; // Keep last 10k events in memory

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Security Service...');
    this.setupEventCleanup();
    logger.info('Security Service initialized');
  }

  // Record security event
  async recordEvent(event: Partial<SecurityEvent>): Promise<SecurityEvent> {
    const securityEvent: SecurityEvent = {
      eventId: `SEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: event.type || 'info',
      severity: event.severity || 'low',
      category: event.category || 'general',
      source: event.source || { component: 'system' },
      title: event.title || 'Security Event',
      description: event.description || '',
      details: event.details || {},
      status: 'new',
      tags: event.tags || [],
      ...event,
    };

    this.events.push(securityEvent);
    this.emit('securityEvent', securityEvent);

    // Update threat indicators
    if (securityEvent.source.ip) {
      this.updateThreatIndicator('ip', securityEvent.source.ip, securityEvent.severity);
    }

    logger.info(`Security event recorded: ${securityEvent.title} [${securityEvent.severity}]`);

    // Cleanup old events if needed
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // In recordEvent method, after recording:
    aiAnalysisService.analyzeEvent(event).catch(err => {
      logger.error('Error sending to AI:', err);
    });

    return securityEvent;
  }

  // Get recent events
  getRecentEvents(limit: number = 100, filter?: Partial<SecurityEvent>): SecurityEvent[] {
    let filtered = [...this.events];

    if (filter) {
      if (filter.severity) {
        filtered = filtered.filter(e => e.severity === filter.severity);
      }
      if (filter.type) {
        filtered = filtered.filter(e => e.type === filter.type);
      }
      if (filter.category) {
        filtered = filtered.filter(e => e.category === filter.category);
      }
      if (filter.status) {
        filtered = filtered.filter(e => e.status === filter.status);
      }
    }

    return filtered.slice(-limit).reverse();
  }

  // Get event by ID
  getEvent(eventId: string): SecurityEvent | undefined {
    return this.events.find(e => e.eventId === eventId);
  }

  // Update event status
  async updateEventStatus(
    eventId: string,
    status: SecurityEvent['status'],
    assignedTo?: string
  ): Promise<SecurityEvent | null> {
    const event = this.events.find(e => e.eventId === eventId);
    if (!event) return null;

    event.status = status;
    if (assignedTo) {
      event.assignedTo = assignedTo;
    }

    this.emit('eventUpdated', event);
    return event;
  }

  // Threat indicators
  private updateThreatIndicator(
    type: ThreatIndicator['type'],
    value: string,
    severity: SecurityEvent['severity']
  ): void {
    const key = `${type}:${value}`;
    const existing = this.indicators.get(key);

    const severityScore = { low: 1, medium: 2, high: 3, critical: 4 };

    if (existing) {
      existing.lastSeen = new Date();
      existing.occurrences++;
      existing.severity = severityScore[severity] > severityScore[existing.severity]
        ? severity
        : existing.severity;
      existing.confidence = Math.min(100, existing.confidence + 5);
    } else {
      this.indicators.set(key, {
        type,
        value,
        severity,
        confidence: 50,
        firstSeen: new Date(),
        lastSeen: new Date(),
        occurrences: 1,
      });
    }
  }

  getThreatIndicators(): ThreatIndicator[] {
    return Array.from(this.indicators.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  // IP blocking
  blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);
    this.recordEvent({
      type: 'warning',
      severity: 'high',
      category: 'access_control',
      title: 'IP Blocked',
      description: `IP ${ip} has been blocked`,
      details: { ip, reason },
      source: { ip, component: 'security_service' },
    });
    logger.warn(`IP blocked: ${ip} - Reason: ${reason}`);
  }

  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    logger.info(`IP unblocked: ${ip}`);
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  // Security metrics
  getSecurityMetrics(): SecurityMetrics {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp >= last24h);

    const eventsByCategory: Record<string, number> = {};
    recentEvents.forEach(e => {
      eventsByCategory[e.category] = (eventsByCategory[e.category] || 0) + 1;
    });

    // Events by hour for last 24 hours
    const eventsByHour: number[] = new Array(24).fill(0);
    recentEvents.forEach(e => {
      const hourDiff = Math.floor((now.getTime() - e.timestamp.getTime()) / (60 * 60 * 1000));
      if (hourDiff < 24) {
        eventsByHour[23 - hourDiff]++;
      }
    });

    return {
      timestamp: now,
      totalEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
      highEvents: recentEvents.filter(e => e.severity === 'high').length,
      mediumEvents: recentEvents.filter(e => e.severity === 'medium').length,
      lowEvents: recentEvents.filter(e => e.severity === 'low').length,
      openIncidents: 0, // Will be populated by incident service
      resolvedIncidents: 0,
      blockedIPs: this.blockedIPs.size,
      averageResponseTime: 0,
      threatsByCategory: eventsByCategory,
      eventsByHour,
    };
  }

  // Cleanup old events periodically
  private setupEventCleanup(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
      const beforeCount = this.events.length;
      this.events = this.events.filter(e => e.timestamp >= cutoff);
      const removed = beforeCount - this.events.length;
      if (removed > 0) {
        logger.info(`Cleaned up ${removed} old security events`);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  // Clear all data (for testing)
  clearAllData(): void {
    this.events = [];
    this.indicators.clear();
    this.blockedIPs.clear();
    logger.info('Security service data cleared');
  }
}

export const securityService = new SecurityService();
