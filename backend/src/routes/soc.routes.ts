// backend/src/routes/soc.routes.ts

import { Router } from 'express';
import { socController } from '../controllers/soc.controller';
import { aiAnalysisController } from '../controllers/ai-analysis.controller';

const router = Router();

// Security Events
router.get('/events', (req, res) => socController.getSecurityEvents(req, res));
router.get('/metrics', (req, res) => socController.getSecurityMetrics(req, res));
router.get('/threats', (req, res) => socController.getThreatIndicators(req, res));

// IP Blocking
router.get('/blocked-ips', (req, res) => socController.getBlockedIPs(req, res));
router.post('/block-ip', (req, res) => socController.blockIP(req, res));
router.delete('/block-ip/:ip', (req, res) => socController.unblockIP(req, res));

// Detection Rules
router.get('/rules', (req, res) => socController.getRules(req, res));
router.post('/rules/:ruleId/enable', (req, res) => socController.enableRule(req, res));
router.post('/rules/:ruleId/disable', (req, res) => socController.disableRule(req, res));

// Incidents
router.get('/incidents', (req, res) => socController.getIncidents(req, res));
router.get('/incidents/statistics', (req, res) => socController.getIncidentStatistics(req, res));
router.get('/incidents/:id', (req, res) => socController.getIncident(req, res));
router.put('/incidents/:id/status', (req, res) => socController.updateIncidentStatus(req, res));

// Alerts
router.get('/alerts', (req, res) => socController.getAlerts(req, res));
router.get('/alerts/counts', (req, res) => socController.getAlertCounts(req, res));
router.post('/alerts/:id/acknowledge', (req, res) => socController.acknowledgeAlert(req, res));


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
