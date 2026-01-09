// frontend/src/components/AIAnalysisDashboard.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api/soc';

interface AIAnalysis {
  analysisId: string;
  eventId: string;
  originalEvent: any;
  aiAnalysis: {
    threat_level: string;
    recommended_action: string;
    explanation: string;
    requires_immediate_attention: boolean;
  };
  rawAiResponse: string;
  model: string;
  analyzedAt: string;
  status: string;
}

const AIAnalysisDashboard: React.FC = () => {
  const [analyses, setAnalyses] = useState<AIAnalysis[]>([]);
  const [statistics, setStatistics] = useState<any>({});
  const [attentionRequired, setAttentionRequired] = useState<AIAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('testing');

  useEffect(() => {
    fetchData();
    testConnection();
    const interval = setInterval(fetchData, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [analysesRes, statsRes, attentionRes] = await Promise.all([
        axios.get(`${API_URL}/ai-analyses?limit=20`),
        axios.get(`${API_URL}/ai-statistics`),
        axios.get(`${API_URL}/ai-analyses-attention`),
      ]);

      setAnalyses(analysesRes.data.analyses || []);
      setStatistics(statsRes.data.statistics || {});
      setAttentionRequired(attentionRes.data.analyses || []);
      setLoading(false);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error fetching AI analyses:', error);
      setLoading(false);
      setConnectionStatus('disconnected');
    }
  };

  const testConnection = async () => {
    try {
      const response = await axios.get(`${API_URL}/ai-test`);
      setConnectionStatus(response.data.success ? 'connected' : 'disconnected');
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <div>Loading AI Analysis Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.aiIcon}>🤖</div>
          <div>
            <h1 style={styles.title}>AI-Powered SOC Analysis</h1>
            <p style={styles.subtitle}>Real-time threat intelligence with Mistral AI</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={{...styles.statusBadge, ...(connectionStatus === 'connected' ? styles.statusConnected : styles.statusDisconnected)}}>
            <div style={styles.statusDot}></div>
            {connectionStatus === 'connected' ? 'LM Studio Connected' : 'LM Studio Offline'}
          </div>
          <div style={styles.modelBadge}>
            🧠 Mistral 7B
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          icon="📊"
          value={statistics.totalAnalyses || 0}
          label="Total Analyses"
          color="#667eea"
        />
        <StatCard
          icon="🚨"
          value={statistics.criticalThreats || 0}
          label="Critical Threats"
          color="#ff4444"
        />
        <StatCard
          icon="⚠️"
          value={statistics.requiresAttention || 0}
          label="Needs Attention"
          color="#ffaa00"
        />
        <StatCard
          icon="✅"
          value={statistics.lowThreats || 0}
          label="Low Threats"
          color="#44ff88"
        />
      </div>

      {/* Attention Required Section */}
      {attentionRequired.length > 0 && (
        <div style={styles.attentionSection}>
          <div style={styles.attentionHeader}>
            <h2 style={styles.sectionTitle}>
              ⚡ Requires Immediate Attention
            </h2>
            <span style={styles.attentionCount}>{attentionRequired.length}</span>
          </div>
          <div style={styles.attentionList}>
            {attentionRequired.map(analysis => (
              <AnalysisCard key={analysis.analysisId} analysis={analysis} highlighted />
            ))}
          </div>
        </div>
      )}

      {/* Recent Analyses */}
      <div style={styles.analysesSection}>
        <h2 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>🔍</span>
          Recent AI Analyses
        </h2>
        {analyses.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🤖</div>
            <div style={styles.emptyTitle}>No Analyses Yet</div>
            <div style={styles.emptyText}>
              AI analyses will appear here when security events are processed
            </div>
          </div>
        ) : (
          <div style={styles.analysesList}>
            {analyses.map(analysis => (
              <AnalysisCard key={analysis.analysisId} analysis={analysis} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<any> = ({ icon, value, label, color }) => (
  <div 
    style={{...styles.statCard, borderLeft: `4px solid ${color}`}}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={styles.statIcon}>{icon}</div>
    <div style={styles.statContent}>
      <div style={{...styles.statValue, color}}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  </div>
);

// Analysis Card Component
const AnalysisCard: React.FC<any> = ({ analysis, highlighted }) => {
  const [expanded, setExpanded] = useState(false);

  const getThreatColor = (level: string) => {
    const colors: any = {
      Critical: '#ff4444',
      High: '#ff8844',
      Medium: '#ffaa00',
      Low: '#4488ff',
    };
    return colors[level] || '#8892b0';
  };

  return (
    <div 
      style={{
        ...styles.analysisCard,
        ...(highlighted ? styles.analysisCardHighlighted : {}),
        borderLeft: `4px solid ${getThreatColor(analysis.aiAnalysis.threat_level)}`
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e2439'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1f3a'}
    >
      {/* Header */}
      <div style={styles.analysisHeader}>
        <div style={styles.analysisHeaderLeft}>
          <span style={styles.analysisId}>#{analysis.analysisId.slice(-8)}</span>
          <span 
            style={{
              ...styles.threatBadge,
              backgroundColor: getThreatColor(analysis.aiAnalysis.threat_level),
            }}
          >
            {analysis.aiAnalysis.threat_level.toUpperCase()}
          </span>
          {analysis.aiAnalysis.requires_immediate_attention && (
            <span style={styles.attentionBadge}>
              ⚡ URGENT
            </span>
          )}
        </div>
        <span style={styles.analysisTime}>
          {new Date(analysis.analyzedAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Event Info */}
      <div style={styles.eventInfo}>
        <div style={styles.eventTitle}>{analysis.originalEvent.title}</div>
        <div style={styles.eventDescription}>{analysis.originalEvent.description}</div>
      </div>

      {/* AI Analysis */}
      <div style={styles.aiAnalysis}>
        <div style={styles.aiSectionTitle}>🤖 AI Assessment</div>
        <div style={styles.aiExplanation}>{analysis.aiAnalysis.explanation}</div>
        <div style={styles.aiAction}>
          <span style={styles.actionLabel}>Recommended Action:</span>
          <span style={styles.actionText}>{analysis.aiAnalysis.recommended_action}</span>
        </div>
      </div>

      {/* Expand Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={styles.expandButton}
      >
        {expanded ? '▲ Show Less' : '▼ Show Details'}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div style={styles.expandedSection}>
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Event ID</div>
              <div style={styles.detailValue}>{analysis.eventId}</div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Category</div>
              <div style={styles.detailValue}>{analysis.originalEvent.category}</div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Severity</div>
              <div style={styles.detailValue}>{analysis.originalEvent.severity}</div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>AI Model</div>
              <div style={styles.detailValue}>Mistral 7B</div>
            </div>
          </div>
          {analysis.originalEvent.source?.ip && (
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Source IP</div>
              <div style={styles.detailValue}>{analysis.originalEvent.source.ip}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0a0e27',
    minHeight: '100vh',
    padding: '24px',
    color: '#fff',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#0a0e27',
    color: '#fff',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.1)',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  
  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '24px',
    background: 'linear-gradient(135deg, #1e2439 0%, #1a1f3a 100%)',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  aiIcon: {
    fontSize: '48px',
    animation: 'pulse 2s ease-in-out infinite',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '14px',
    color: '#8892b0',
    margin: '4px 0 0 0',
  },
  headerRight: {
    display: 'flex',
    gap: '12px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  statusConnected: {
    backgroundColor: 'rgba(68, 255, 136, 0.2)',
    color: '#44ff88',
    border: '1px solid rgba(68, 255, 136, 0.3)',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    color: '#ff4444',
    border: '1px solid rgba(255, 68, 68, 0.3)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'currentColor',
    animation: 'pulse 2s ease-in-out infinite',
  },
  modelBadge: {
    padding: '8px 16px',
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    borderRadius: '20px',
    fontSize: '13px',
    color: '#667eea',
    fontWeight: 'bold',
  },
  
  // Statistics
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: '#1a1f3a',
    padding: '24px',
    borderRadius: '12px',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  statIcon: {
    fontSize: '36px',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    lineHeight: 1,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#8892b0',
  },
  
  // Attention Section
  attentionSection: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    border: '2px solid rgba(255, 68, 68, 0.3)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
  },
  attentionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  attentionCount: {
    padding: '8px 16px',
    backgroundColor: '#ff4444',
    borderRadius: '20px',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  attentionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  
  // Analyses Section
  analysesSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionIcon: {
    fontSize: '28px',
  },
  analysesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  
  // Analysis Card
  analysisCard: {
    backgroundColor: '#1a1f3a',
    padding: '24px',
    borderRadius: '12px',
    transition: 'all 0.2s',
  },
  analysisCardHighlighted: {
    boxShadow: '0 0 20px rgba(255, 68, 68, 0.3)',
  },
  analysisHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  analysisHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  analysisId: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#8892b0',
  },
  threatBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
  },
  attentionBadge: {
    padding: '4px 12px',
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
    border: '1px solid #ffaa00',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ffaa00',
  },
  analysisTime: {
    fontSize: '12px',
    color: '#8892b0',
  },
  
  // Event Info
  eventInfo: {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(136, 146, 176, 0.2)',
  },
  eventTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  eventDescription: {
    fontSize: '14px',
    color: '#8892b0',
  },
  
  // AI Analysis
  aiAnalysis: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  aiSectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#667eea',
  },
  aiExplanation: {
    fontSize: '14px',
    lineHeight: 1.6,
    marginBottom: '12px',
    color: '#fff',
  },
  aiAction: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  actionLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#667eea',
    flexShrink: 0,
  },
  actionText: {
    fontSize: '13px',
    color: '#fff',
  },
  
  // Expand Button
  expandButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(136, 146, 176, 0.3)',
    borderRadius: '6px',
    color: '#8892b0',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  
  // Expanded Section
  expandedSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(136, 146, 176, 0.2)',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  detailItem: {
    marginBottom: '12px',
  },
  detailLabel: {
    fontSize: '12px',
    color: '#8892b0',
    marginBottom: '4px',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
  },
  
  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#1a1f3a',
    borderRadius: '16px',
    border: '2px dashed rgba(136, 146, 176, 0.3)',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#8892b0',
  },
};

// Add keyframe animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
document.head.appendChild(styleSheet);

export default AIAnalysisDashboard;