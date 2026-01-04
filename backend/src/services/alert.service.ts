// backend/src/services/alert.service.ts

import { logger } from '../config/logger';
import { EventEmitter } from 'events';

export interface Alert {
  alertId: string;
  timestamp: Date;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  eventId?: string;
  details?: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  channels: string[];
}

class AlertService extends EventEmitter {
  private alerts: Alert[] = [];
  private alertCounter: number = 1;
  private maxAlerts: number = 1000;

  async sendAlert(data: {
    title: string;
    severity: Alert['severity'];
    message: string;
    eventId?: string;
    details?: any;
    channels?: string[];
  }): Promise<Alert> {
    const alert: Alert = {
      alertId: `ALT-${String(this.alertCounter++).padStart(6, '0')}`,
      timestamp: new Date(),
      title: data.title,
      severity: data.severity,
      message: data.message,
      eventId: data.eventId,
      details: data.details,
      acknowledged: false,
      channels: data.channels || ['console', 'websocket'],
    };

    this.alerts.push(alert);

    // Cleanup old alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Log alert
    const logLevel = this.getLogLevel(alert.severity);
    logger.log(logLevel, `🚨 ALERT: ${alert.title} - ${alert.message}`);

    // Send to different channels
    await this.deliverAlert(alert);

    // Emit event for WebSocket
    this.emit('alert', alert);

    return alert;
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<Alert | null> {
    const alert = this.alerts.find(a => a.alertId === alertId);
    if (!alert) return null;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.emit('alertAcknowledged', alert);
    logger.info(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);

    return alert;
  }

  getAlerts(filter?: {
    acknowledged?: boolean;
    severity?: Alert['severity'];
    since?: Date;
  }): Alert[] {
    let filtered = [...this.alerts];

    if (filter) {
      if (filter.acknowledged !== undefined) {
        filtered = filtered.filter(a => a.acknowledged === filter.acknowledged);
      }
      if (filter.severity) {
        filtered = filtered.filter(a => a.severity === filter.severity);
      }
      if (filter.since) {
        const since = filter.since;
        filtered = filtered.filter(a => a.timestamp >= since);
      }
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getUnacknowledgedCount(): number {
    return this.alerts.filter(a => !a.acknowledged).length;
  }

  getCriticalCount(): number {
    return this.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  }

  private async deliverAlert(alert: Alert): Promise<void> {
    for (const channel of alert.channels) {
      try {
        switch (channel) {
          case 'console':
            this.sendToConsole(alert);
            break;
          case 'email':
            await this.sendToEmail(alert);
            break;
          case 'slack':
            await this.sendToSlack(alert);
            break;
          case 'websocket':
            // Handled by event emission
            break;
          default:
            logger.warn(`Unknown alert channel: ${channel}`);
        }
      } catch (error) {
        logger.error(`Error sending alert to ${channel}:`, error);
      }
    }
  }

  private sendToConsole(alert: Alert): void {
    const emoji = this.getSeverityEmoji(alert.severity);
    const color = this.getSeverityColor(alert.severity);
    
    console.log(`\n${color}╔${'═'.repeat(60)}╗${'\x1b[0m'}`);
    console.log(`${color}║ ${emoji} SECURITY ALERT ${' '.repeat(43)}║${'\x1b[0m'}`);
    console.log(`${color}╠${'═'.repeat(60)}╣${'\x1b[0m'}`);
    console.log(`${color}║ ${alert.title.padEnd(59)}║${'\x1b[0m'}`);
    console.log(`${color}║ Severity: ${alert.severity.toUpperCase().padEnd(50)}║${'\x1b[0m'}`);
    console.log(`${color}║ Time: ${alert.timestamp.toISOString().padEnd(54)}║${'\x1b[0m'}`);
    console.log(`${color}╠${'═'.repeat(60)}╣${'\x1b[0m'}`);
    console.log(`${color}║ ${alert.message.substring(0, 59).padEnd(59)}║${'\x1b[0m'}`);
    console.log(`${color}╚${'═'.repeat(60)}╝${'\x1b[0m'}\n`);
  }

  private async sendToEmail(alert: Alert): Promise<void> {
    // Placeholder for email sending
    // In production, integrate with SendGrid, AWS SES, etc.
    logger.info(`[EMAIL] Would send alert: ${alert.title}`);
  }

  private async sendToSlack(alert: Alert): Promise<void> {
    // Placeholder for Slack webhook
    // In production, use Slack webhook URL
    logger.info(`[SLACK] Would send alert: ${alert.title}`);
  }

  private getLogLevel(severity: Alert['severity']): string {
    const levelMap = {
      low: 'info',
      medium: 'warn',
      high: 'warn',
      critical: 'error',
    };
    return levelMap[severity];
  }

  private getSeverityEmoji(severity: Alert['severity']): string {
    const emojiMap = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔴',
      critical: '🚨',
    };
    return emojiMap[severity];
  }

  private getSeverityColor(severity: Alert['severity']): string {
    const colorMap = {
      low: '\x1b[36m',    // Cyan
      medium: '\x1b[33m',  // Yellow
      high: '\x1b[35m',    // Magenta
      critical: '\x1b[31m', // Red
    };
    return colorMap[severity];
  }

  clearAcknowledged(): void {
    const before = this.alerts.length;
    this.alerts = this.alerts.filter(a => !a.acknowledged);
    logger.info(`Cleared ${before - this.alerts.length} acknowledged alerts`);
  }

  clearAll(): void {
    this.alerts = [];
    this.alertCounter = 1;
    logger.info('All alerts cleared');
  }
}

export const alertService = new AlertService();
