// backend/src/routes/ai-analysis.routes.ts

import { Router } from 'express';
import { aiAnalysisController } from '../controllers/ai-analysis.controller';

const router = Router();

// Receive analysis from n8n
router.post('/ai-analysis', (req, res) => aiAnalysisController.receiveAnalysis(req, res));

// Get all analyses
router.get('/ai-analyses', (req, res) => aiAnalysisController.getAnalyses(req, res));

// Get analysis by ID
router.get('/ai-analyses/:id', (req, res) => aiAnalysisController.getAnalysis(req, res));

// Get analysis for specific event
router.get('/ai-analyses/event/:eventId', (req, res) => aiAnalysisController.getAnalysisForEvent(req, res));

// Get analyses requiring attention
router.get('/ai-analyses-attention', (req, res) => aiAnalysisController.getAttentionRequired(req, res));

// Get statistics
router.get('/ai-statistics', (req, res) => aiAnalysisController.getStatistics(req, res));

// Test connection
router.get('/ai-test', (req, res) => aiAnalysisController.testConnection(req, res));

export default router;