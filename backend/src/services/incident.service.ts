// backend/src/services/incident.service.ts

import { Incident, IncidentAction, Evidence, IncidentStatistics } from '../models/Incident';
import { SecurityEvent } from '../models/SecurityEvent';
import { logger } from '../config/logger';
import { EventEmitter } from 'events';

class IncidentService extends EventEmitter {
  private incidents: Incident[] = [];
  private incidentCounter: number = 1;

  async createIncident(data: {
    title: string;
    description: string;
    severity: Incident['severity'];
    category: string;
    events: SecurityEvent[];
    automated?: boolean;
  }): Promise<Incident> {
    const incident: Incident = {
      incidentId: `INC-${String(this.incidentCounter++).padStart(6, '0')}`,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: 'open',
      category: data.category,
      priority: this.calculatePriority(data.severity),
      createdAt: new Date(),
      updatedAt: new Date(),
      reporter: data.automated ? 'SIEM Auto-Detection' : 'Manual',
      events: data.events,
      affectedAssets: this.extractAffectedAssets(data.events),
      indicators: [],
      timeline: [{
        timestamp: new Date(),
        actor: data.automated ? 'system' : 'admin',
        action: 'created',
        description: 'Incident created',
        automated: data.automated || false,
      }],
      containmentActions: [],
      evidence: [],
      tags: [data.category],
    };

    this.incidents.push(incident);
    this.emit('incidentCreated', incident);
    
    logger.warn(`Incident created: ${incident.incidentId} - ${incident.title} [${incident.severity}]`);

    return incident;
  }

  async updateIncidentStatus(
    incidentId: string,
    status: Incident['status'],
    actor: string,
    notes?: string
  ): Promise<Incident | null> {
    const incident = this.incidents.find(i => i.incidentId === incidentId);
    if (!incident) return null;

    const oldStatus = incident.status;
    incident.status = status;
    incident.updatedAt = new Date();

    if (status === 'resolved' || status === 'closed') {
      incident.resolvedAt = new Date();
    }

    incident.timeline.push({
      timestamp: new Date(),
      actor,
      action: 'status_changed',
      description: `Status changed from ${oldStatus} to ${status}${notes ? `: ${notes}` : ''}`,
      automated: false,
    });

    this.emit('incidentUpdated', incident);
    logger.info(`Incident ${incidentId} status changed to ${status}`);

    return incident;
  }

  async assignIncident(incidentId: string, assignedTo: string, actor: string): Promise<Incident | null> {
    const incident = this.incidents.find(i => i.incidentId === incidentId);
    if (!incident) return null;

    incident.assignedTo = assignedTo;
    incident.updatedAt = new Date();

    incident.timeline.push({
      timestamp: new Date(),
      actor,
      action: 'assigned',
      description: `Incident assigned to ${assignedTo}`,
      automated: false,
    });

    this.emit('incidentUpdated', incident);
    return incident;
  }

  async addAction(
    incidentId: string,
    action: string,
    description: string,
    actor: string,
    automated: boolean = false
  ): Promise<Incident | null> {
    const incident = this.incidents.find(i => i.incidentId === incidentId);
    if (!incident) return null;

    incident.timeline.push({
      timestamp: new Date(),
      actor,
      action,
      description,
      automated,
    });

    incident.updatedAt = new Date();
    this.emit('incidentUpdated', incident);

    return incident;
  }

  async addEvidence(
    incidentId: string,
    evidence: Omit<Evidence, 'id' | 'timestamp'>
  ): Promise<Incident | null> {
    const incident = this.incidents.find(i => i.incidentId === incidentId);
    if (!incident) return null;

    const newEvidence: Evidence = {
      id: `EVD-${Date.now()}`,
      timestamp: new Date(),
      ...evidence,
    };

    incident.evidence.push(newEvidence);
    incident.updatedAt = new Date();

    incident.timeline.push({
      timestamp: new Date(),
      actor: 'system',
      action: 'evidence_added',
      description: `Evidence added: ${evidence.type}`,
      automated: true,
    });

    this.emit('incidentUpdated', incident);
    return incident;
  }

  getIncident(incidentId: string): Incident | undefined {
    return this.incidents.find(i => i.incidentId === incidentId);
  }

  getIncidents(filter?: {
    status?: Incident['status'];
    severity?: Incident['severity'];
    category?: string;
    assignedTo?: string;
  }): Incident[] {
    let filtered = [...this.incidents];

    if (filter) {
      if (filter.status) {
        filtered = filtered.filter(i => i.status === filter.status);
      }
      if (filter.severity) {
        filtered = filtered.filter(i => i.severity === filter.severity);
      }
      if (filter.category) {
        filtered = filtered.filter(i => i.category === filter.category);
      }
      if (filter.assignedTo) {
        filtered = filtered.filter(i => i.assignedTo === filter.assignedTo);
      }
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getStatistics(): IncidentStatistics {
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    this.incidents.forEach(incident => {
      bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
      byCategory[incident.category] = (byCategory[incident.category] || 0) + 1;
    });

    const resolvedIncidents = this.incidents.filter(i => 
      i.resolvedAt && (i.status === 'resolved' || i.status === 'closed')
    );

    const averageTimeToResolve = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => {
          const time = i.resolvedAt!.getTime() - i.createdAt.getTime();
          return sum + time;
        }, 0) / resolvedIncidents.length / 60000 // Convert to minutes
      : 0;

    return {
      total: this.incidents.length,
      open: this.incidents.filter(i => i.status === 'open').length,
      investigating: this.incidents.filter(i => i.status === 'investigating').length,
      contained: this.incidents.filter(i => i.status === 'contained').length,
      resolved: this.incidents.filter(i => i.status === 'resolved').length,
      closed: this.incidents.filter(i => i.status === 'closed').length,
      bySeverity,
      byCategory,
      averageTimeToResolve,
      averageTimeToDetect: 0, // Placeholder
    };
  }

  private calculatePriority(severity: Incident['severity']): number {
    const priorityMap = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    return priorityMap[severity] || 1;
  }

  private extractAffectedAssets(events: SecurityEvent[]): string[] {
    const assets = new Set<string>();
    
    events.forEach(event => {
      if (event.source.carId) assets.add(`car:${event.source.carId}`);
      if (event.source.userId) assets.add(`user:${event.source.userId}`);
      if (event.source.ip) assets.add(`ip:${event.source.ip}`);
    });

    return Array.from(assets);
  }

  clearAll(): void {
    this.incidents = [];
    this.incidentCounter = 1;
    logger.info('All incidents cleared');
  }
}

export const incidentService = new IncidentService();
