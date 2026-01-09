// backend/src/models/AIAnalysis.ts

export interface AIAnalysis {
  analysisId: string;
  eventId: string;
  originalEvent: any;
  aiAnalysis: {
    threat_level: 'Low' | 'Medium' | 'High' | 'Critical';
    recommended_action: string;
    explanation: string;
    requires_immediate_attention: boolean;
  };
  rawAiResponse: string;
  model: string;
  analyzedAt: string;
  status: 'pending' | 'completed' | 'failed';
  n8nWorkflowId?: string;
}

export interface AIAnalysisStore {
  analyses: Map<string, AIAnalysis>;
  getAnalysis(analysisId: string): AIAnalysis | undefined;
  getAnalysisForEvent(eventId: string): AIAnalysis | undefined;
  getAllAnalyses(): AIAnalysis[];
  getRecentAnalyses(limit: number): AIAnalysis[];
  addAnalysis(analysis: AIAnalysis): void;
  getStatistics(): AIAnalysisStatistics;
}

export interface AIAnalysisStatistics {
  totalAnalyses: number;
  criticalThreats: number;
  highThreats: number;
  mediumThreats: number;
  lowThreats: number;
  requiresAttention: number;
  averageResponseTime?: number;
}