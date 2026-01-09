// backend/src/controllers/ai-analysis.controller.ts

import { Request, Response } from 'express';
import { aiAnalysisService } from '../services/ai-analysis.service';
import { logger } from '../config/logger';

export class AIAnalysisController {
  // Receive analysis result from n8n
  async receiveAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const analysis = await aiAnalysisService.storeAnalysis(req.body);
      res.json({ success: true, analysis });
    } catch (error: any) {
      logger.error('Error receiving AI analysis:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get all analyses
  async getAnalyses(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      const analyses = aiAnalysisService.getRecentAnalyses(
        limit ? parseInt(limit as string) : 50
      );
      res.json({ success: true, analyses });
    } catch (error: any) {
      logger.error('Error getting analyses:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get analysis by ID
  async getAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const analysis = aiAnalysisService.getAnalysis(id);
      if (analysis) {
        res.json({ success: true, analysis });
      } else {
        res.status(404).json({ error: 'Analysis not found' });
      }
    } catch (error: any) {
      logger.error('Error getting analysis:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get analysis for event
  async getAnalysisForEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const analysis = aiAnalysisService.getAnalysisForEvent(eventId);
      if (analysis) {
        res.json({ success: true, analysis });
      } else {
        res.status(404).json({ error: 'No analysis found for this event' });
      }
    } catch (error: any) {
      logger.error('Error getting analysis for event:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get analyses requiring attention
  async getAttentionRequired(req: Request, res: Response): Promise<void> {
    try {
      const analyses = aiAnalysisService.getAttentionRequired();
      res.json({ success: true, analyses, count: analyses.length });
    } catch (error: any) {
      logger.error('Error getting attention required:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get statistics
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = aiAnalysisService.getStatistics();
      res.json({ success: true, statistics: stats });
    } catch (error: any) {
      logger.error('Error getting statistics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Test connection
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const success = await aiAnalysisService.testConnection();
      res.json({ 
        success, 
        message: success ? 'Connection successful' : 'Connection failed',
        lmStudioUrl: 'http://172.22.48.1:1234',
        n8nWebhook: 'http://localhost:5678/webhook/soc-events'
      });
    } catch (error: any) {
      logger.error('Error testing connection:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const aiAnalysisController = new AIAnalysisController();