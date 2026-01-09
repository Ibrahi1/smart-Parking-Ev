// backend/src/services/ai-analysis.service.ts

import { EventEmitter } from 'events';
import { AIAnalysis, AIAnalysisStatistics } from '../models/AIAnalysis';
import { logger } from '../config/logger';
import axios from 'axios';

class AIAnalysisService extends EventEmitter {
  private analyses: Map<string, AIAnalysis> = new Map();
  private n8nWebhookUrl: string = 'http://localhost:5678/webhook/soc-events';

  constructor() {
    super();
  }

  // Send event to n8n for AI analysis
  async analyzeEvent(event: any): Promise<void> {
    try {
      logger.info(`Sending event ${event.eventId} to AI analysis`);

      // Send to n8n webhook (fire and forget)
      axios.post(this.n8nWebhookUrl, event, {
        timeout: 5000,
      }).catch(error => {
        logger.error('Error sending to n8n:', error.message);
      });

    } catch (error: any) {
      logger.error('Error in analyzeEvent:', error.message);
    }
  }

  // Store analysis result from n8n
  async storeAnalysis(data: any): Promise<AIAnalysis> {
    const analysis: AIAnalysis = {
      analysisId: `AI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventId: data.eventId,
      originalEvent: data.originalEvent,
      aiAnalysis: data.aiAnalysis,
      rawAiResponse: data.rawAiResponse,
      model: data.model || 'mistralai/mistral-7b-instruct-v0.3',
      analyzedAt: data.analyzedAt || new Date().toISOString(),
      status: 'completed',
      n8nWorkflowId: data.n8nWorkflowId,
    };

    this.analyses.set(analysis.analysisId, analysis);

    // Emit event for real-time updates
    this.emit('analysisCompleted', analysis);

    logger.info(`AI analysis completed for event ${analysis.eventId}: ${analysis.aiAnalysis.threat_level}`);

    return analysis;
  }

  // Get analysis by ID
  getAnalysis(analysisId: string): AIAnalysis | undefined {
    return this.analyses.get(analysisId);
  }

  // Get analysis for specific event
  getAnalysisForEvent(eventId: string): AIAnalysis | undefined {
    return Array.from(this.analyses.values()).find(a => a.eventId === eventId);
  }

  // Get all analyses
  getAllAnalyses(): AIAnalysis[] {
    return Array.from(this.analyses.values()).sort(
      (a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
    );
  }

  // Get recent analyses
  getRecentAnalyses(limit: number = 50): AIAnalysis[] {
    return this.getAllAnalyses().slice(0, limit);
  }

  // Get analyses that require attention
  getAttentionRequired(): AIAnalysis[] {
    return this.getAllAnalyses().filter(a => a.aiAnalysis.requires_immediate_attention);
  }

  // Get statistics
  getStatistics(): AIAnalysisStatistics {
    const all = this.getAllAnalyses();

    return {
      totalAnalyses: all.length,
      criticalThreats: all.filter(a => a.aiAnalysis.threat_level === 'Critical').length,
      highThreats: all.filter(a => a.aiAnalysis.threat_level === 'High').length,
      mediumThreats: all.filter(a => a.aiAnalysis.threat_level === 'Medium').length,
      lowThreats: all.filter(a => a.aiAnalysis.threat_level === 'Low').length,
      requiresAttention: all.filter(a => a.aiAnalysis.requires_immediate_attention).length,
    };
  }

  // Configure n8n webhook URL
  setWebhookUrl(url: string): void {
    this.n8nWebhookUrl = url;
    logger.info(`n8n webhook URL updated: ${url}`);
  }

  // Test connection to LM Studio via n8n
  async testConnection(): Promise<boolean> {
    try {
      const testEvent = {
        eventId: 'TEST-001',
        type: 'test',
        severity: 'low',
        category: 'test',
        title: 'Connection Test',
        description: 'Testing AI analysis connection',
        source: { component: 'test' },
        details: {},
      };

      const response = await axios.post(this.n8nWebhookUrl, testEvent, {
        timeout: 10000,
      });

      logger.info('AI analysis connection test successful');
      return response.status === 200;
    } catch (error: any) {
      logger.error('AI analysis connection test failed:', error.message);
      return false;
    }
  }
}

export const aiAnalysisService = new AIAnalysisService();