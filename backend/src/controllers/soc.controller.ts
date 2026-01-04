// backend/src/controllers/soc.controller.ts

import { Request, Response } from 'express';
import { securityService } from '../services/security.service';
import { siemService } from '../services/siem.service';
import { incidentService } from '../services/incident.service';
import { alertService } from '../services/alert.service';
import { logger } from '../config/logger';

export class SOCController {
  async getSecurityEvents(req: Request, res: Response): Promise<void> {
    try {
      const { limit, severity, type, category } = req.query;
      const events = securityService.getRecentEvents(
        limit ? parseInt(limit as string) : 100,
        { severity, type, category } as any
      );
      res.json({ success: true, events });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSecurityMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = securityService.getSecurityMetrics();
      res.json({ success: true, metrics });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getThreatIndicators(req: Request, res: Response): Promise<void> {
    try {
      const indicators = securityService.getThreatIndicators();
      console.log("indicateur",indicators);
      
      res.json({ success: true, indicators });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getBlockedIPs(req: Request, res: Response): Promise<void> {
    try {
      const ips = securityService.getBlockedIPs();
      res.json({ success: true, blockedIPs: ips });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async blockIP(req: Request, res: Response): Promise<void> {
    try {
      const { ip, reason } = req.body;
      if (!ip) {
        res.status(400).json({ error: 'IP address is required' });
        return;
      }
      securityService.blockIP(ip, reason || 'Manual block');
      res.json({ success: true, message: `IP ${ip} blocked` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async unblockIP(req: Request, res: Response): Promise<void> {
    try {
      const { ip } = req.params;
      securityService.unblockIP(ip);
      res.json({ success: true, message: `IP ${ip} unblocked` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRules(req: Request, res: Response): Promise<void> {
    try {
      const rules = siemService.getRules();
      res.json({ success: true, rules });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async enableRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const success = siemService.enableRule(ruleId);
      if (success) {
        res.json({ success: true, message: `Rule ${ruleId} enabled` });
      } else {
        res.status(404).json({ error: 'Rule not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async disableRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const success = siemService.disableRule(ruleId);
      if (success) {
        res.json({ success: true, message: `Rule ${ruleId} disabled` });
      } else {
        res.status(404).json({ error: 'Rule not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getIncidents(req: Request, res: Response): Promise<void> {
    try {
      const { status, severity, category } = req.query;
      const incidents = incidentService.getIncidents({
        status, severity, category
      } as any);
      res.json({ success: true, incidents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getIncident(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const incident = incidentService.getIncident(id);
      if (incident) {
        res.json({ success: true, incident });
      } else {
        res.status(404).json({ error: 'Incident not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getIncidentStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = incidentService.getStatistics();
      res.json({ success: true, statistics: stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateIncidentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, actor, notes } = req.body;
      const incident = await incidentService.updateIncidentStatus(
        id, status, actor || 'admin', notes
      );
      if (incident) {
        res.json({ success: true, incident });
      } else {
        res.status(404).json({ error: 'Incident not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { acknowledged, severity } = req.query;
      const alerts = alertService.getAlerts({
        acknowledged: acknowledged === 'true',
        severity: severity as any,
      });
      res.json({ success: true, alerts });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { acknowledgedBy } = req.body;
      const alert = await alertService.acknowledgeAlert(
        id, acknowledgedBy || 'admin'
      );
      if (alert) {
        res.json({ success: true, alert });
      } else {
        res.status(404).json({ error: 'Alert not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAlertCounts(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        unacknowledged: alertService.getUnacknowledgedCount(),
        critical: alertService.getCriticalCount(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export const socController = new SOCController();
