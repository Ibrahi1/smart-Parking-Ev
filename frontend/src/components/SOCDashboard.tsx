// frontend/src/components/SOCDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useSecurityEvents } from '../hooks/useSecurityEvents';
import { socAPI } from '../services/soc-api';

const SOCDashboard: React.FC = () => {
  const {
    events,
    metrics,
    threats,
    incidents,
    alerts,
    rules,
    loading,
    acknowledgeAlert,
    updateIncidentStatus,
    toggleRule,
  } = useSecurityEvents();

  const [blockedIPs, setBlockedIPs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<'alerts' | 'events' | 'incidents' | 'rules'>('alerts');

  // Fetch blocked IPs
  useEffect(() => {
    const fetchBlockedIPs = async () => {
      try {
        const response = await socAPI.getBlockedIPs();
        setBlockedIPs(response.blockedIPs || []);
      } catch (error) {
        console.error('Error fetching blocked IPs:', error);
      }
    };
    fetchBlockedIPs();
    const interval = setInterval(fetchBlockedIPs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUnblockIP = async (ip: string) => {
    try {
      await socAPI.unblockIP(ip);
      setBlockedIPs(prev => prev.filter(i => i !== ip));
    } catch (error) {
      console.error('Error unblocking IP:', error);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading Security Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🛡️</span>
          <div>
            <h1 style={styles.title}>SOC Dashboard</h1>
            <span style={styles.liveIndicator}>● LIVE</span>
          </div>
        </div>
        <div style={styles.headerTime}>{new Date().toLocaleString()}</div>
      </header>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, borderLeft: '4px solid #3b82f6'}}>
          <div style={styles.statValue}>{metrics.totalEvents || 0}</div>
          <div style={styles.statLabel}>Total Events</div>
        </div>
        <div style={{...styles.statCard, borderLeft: '4px solid #ef4444'}}>
          <div style={styles.statValue}>{alerts.length}</div>
          <div style={styles.statLabel}>Active Alerts</div>
        </div>
        <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
          <div style={styles.statValue}>{incidents.filter(i => i.status === 'open').length}</div>
          <div style={styles.statLabel}>Open Incidents</div>
        </div>
        <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
          <div style={styles.statValue}>{blockedIPs.length}</div>
          <div style={styles.statLabel}>Blocked IPs</div>
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div style={styles.mainContent}>
        {/* Left Panel - Blocked IPs & Threats */}
        <div style={styles.leftPanel}>
          {/* Blocked IPs */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>🚫 Blocked IPs</h2>
              <span style={styles.badge}>{blockedIPs.length}</span>
            </div>
            <div style={styles.panelContent}>
              {blockedIPs.length === 0 ? (
                <div style={styles.emptyState}>No blocked IPs</div>
              ) : (
                blockedIPs.map((ip) => (
                  <div key={ip} style={styles.blockedIPItem}>
                    <span style={styles.ipAddress}>{ip}</span>
                    <button 
                      onClick={() => handleUnblockIP(ip)}
                      style={styles.unblockBtn}
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Threat Indicators */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>🎯 Threat Indicators</h2>
              <span style={styles.badge}>{threats.length}</span>
            </div>
            <div style={styles.panelContent}>
              {threats.length === 0 ? (
                <div style={styles.emptyState}>No active threats</div>
              ) : (
                threats.slice(0, 10).map((threat: any, idx: number) => (
                  <div key={idx} style={styles.threatItem}>
                    <div style={styles.threatInfo}>
                      <span style={{...styles.severityBadge, ...getSeverityColor(threat.severity)}}>
                        {threat.severity}
                      </span>
                      <span style={styles.threatValue}>{threat.value}</span>
                    </div>
                    <span style={styles.threatCount}>{threat.occurrences}x</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Tabs for Alerts, Events, Incidents, Rules */}
        <div style={styles.rightPanel}>
          {/* Tab Navigation */}
          <div style={styles.tabNav}>
            <button 
              style={{...styles.tab, ...(selectedTab === 'alerts' ? styles.tabActive : {})}}
              onClick={() => setSelectedTab('alerts')}
            >
              🚨 Alerts ({alerts.length})
            </button>
            <button 
              style={{...styles.tab, ...(selectedTab === 'events' ? styles.tabActive : {})}}
              onClick={() => setSelectedTab('events')}
            >
              📋 Events ({events.length})
            </button>
            <button 
              style={{...styles.tab, ...(selectedTab === 'incidents' ? styles.tabActive : {})}}
              onClick={() => setSelectedTab('incidents')}
            >
              🔍 Incidents ({incidents.length})
            </button>
            <button 
              style={{...styles.tab, ...(selectedTab === 'rules' ? styles.tabActive : {})}}
              onClick={() => setSelectedTab('rules')}
            >
              ⚙️ Rules ({rules.filter((r: any) => r.enabled).length}/{rules.length})
            </button>
          </div>

          {/* Tab Content */}
          <div style={styles.tabContent}>
            {/* Alerts Tab */}
            {selectedTab === 'alerts' && (
              <div style={styles.scrollableContent}>
                {alerts.length === 0 ? (
                  <div style={styles.emptyState}>✓ No active alerts</div>
                ) : (
                  alerts.map((alert: any) => (
                    <div key={alert.alertId} style={styles.alertCard}>
                      <div style={styles.alertHeader}>
                        <span style={{...styles.severityBadge, ...getSeverityColor(alert.severity)}}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span style={styles.timestamp}>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={styles.alertTitle}>{alert.title}</div>
                      <div style={styles.alertMessage}>{alert.message}</div>
                      <button 
                        onClick={() => acknowledgeAlert(alert.alertId)}
                        style={styles.actionBtn}
                      >
                        ✓ Acknowledge
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Events Tab */}
            {selectedTab === 'events' && (
              <div style={styles.scrollableContent}>
                {events.length === 0 ? (
                  <div style={styles.emptyState}>No events recorded</div>
                ) : (
                  events.map((event: any) => (
                    <div key={event.eventId} style={styles.eventCard}>
                      <div style={styles.eventHeader}>
                        <span style={{...styles.severityBadge, ...getSeverityColor(event.severity)}}>
                          {event.severity}
                        </span>
                        <span style={styles.categoryBadge}>{event.category}</span>
                        <span style={styles.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={styles.eventTitle}>{event.title}</div>
                      <div style={styles.eventDesc}>{event.description}</div>
                      {event.source?.ip && (
                        <div style={styles.eventMeta}>IP: {event.source.ip}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Incidents Tab */}
            {selectedTab === 'incidents' && (
              <div style={styles.scrollableContent}>
                {incidents.length === 0 ? (
                  <div style={styles.emptyState}>✓ No active incidents</div>
                ) : (
                  incidents.map((incident: any) => (
                    <div key={incident.incidentId} style={styles.incidentCard}>
                      <div style={styles.incidentHeader}>
                        <span style={styles.incidentId}>{incident.incidentId}</span>
                        <span style={{...styles.statusBadge, ...getStatusColor(incident.status)}}>
                          {incident.status}
                        </span>
                        <span style={{...styles.severityBadge, ...getSeverityColor(incident.severity)}}>
                          {incident.severity}
                        </span>
                      </div>
                      <div style={styles.incidentTitle}>{incident.title}</div>
                      <div style={styles.incidentDesc}>{incident.description}</div>
                      <div style={styles.incidentMeta}>
                        Created: {new Date(incident.createdAt).toLocaleString()}
                      </div>
                      {incident.status === 'open' && (
                        <div style={styles.incidentActions}>
                          <button 
                            onClick={() => updateIncidentStatus(incident.incidentId, 'investigating')}
                            style={styles.actionBtn}
                          >
                            🔍 Investigate
                          </button>
                          <button 
                            onClick={() => updateIncidentStatus(incident.incidentId, 'resolved')}
                            style={{...styles.actionBtn, backgroundColor: '#10b981'}}
                          >
                            ✓ Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Rules Tab */}
            {selectedTab === 'rules' && (
              <div style={styles.scrollableContent}>
                {rules.map((rule: any) => (
                  <div key={rule.ruleId} style={{...styles.ruleCard, opacity: rule.enabled ? 1 : 0.6}}>
                    <div style={styles.ruleHeader}>
                      <span style={styles.ruleId}>{rule.ruleId}</span>
                      <span style={{...styles.severityBadge, ...getSeverityColor(rule.severity)}}>
                        {rule.severity}
                      </span>
                      <label style={styles.toggleSwitch}>
                        <input 
                          type="checkbox" 
                          checked={rule.enabled}
                          onChange={(e) => toggleRule(rule.ruleId, e.target.checked)}
                        />
                        <span style={styles.toggleSlider}></span>
                      </label>
                    </div>
                    <div style={styles.ruleName}>{rule.name}</div>
                    <div style={styles.ruleDesc}>{rule.description}</div>
                    <div style={styles.ruleMeta}>
                      Triggered: {rule.triggerCount} times | Category: {rule.category}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getSeverityColor = (severity: string) => {
  const colors: Record<string, React.CSSProperties> = {
    critical: { backgroundColor: '#dc2626', color: '#fff' },
    high: { backgroundColor: '#ea580c', color: '#fff' },
    medium: { backgroundColor: '#d97706', color: '#fff' },
    low: { backgroundColor: '#2563eb', color: '#fff' },
  };
  return colors[severity] || colors.low;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, React.CSSProperties> = {
    open: { backgroundColor: '#dc2626', color: '#fff' },
    investigating: { backgroundColor: '#d97706', color: '#fff' },
    contained: { backgroundColor: '#2563eb', color: '#fff' },
    resolved: { backgroundColor: '#16a34a', color: '#fff' },
    closed: { backgroundColor: '#6b7280', color: '#fff' },
  };
  return colors[status] || {};
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0f172a',
    minHeight: '100vh',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #334155',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontSize: '32px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
    color: '#f8fafc',
  },
  liveIndicator: {
    fontSize: '12px',
    color: '#22c55e',
    fontWeight: 'bold',
  },
  headerTime: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    padding: '20px 24px',
  },
  statCard: {
    backgroundColor: '#1e293b',
    padding: '20px',
    borderRadius: '8px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: '14px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    gap: '20px',
    padding: '0 24px 24px',
    height: 'calc(100vh - 200px)',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  panel: {
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#334155',
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    margin: 0,
    color: '#f8fafc',
  },
  badge: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  panelContent: {
    padding: '12px',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  emptyState: {
    textAlign: 'center',
    color: '#64748b',
    padding: '20px',
    fontSize: '14px',
  },
  blockedIPItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  ipAddress: {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#fca5a5',
  },
  unblockBtn: {
    padding: '6px 12px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  threatItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  threatInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  threatValue: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#e2e8f0',
  },
  threatCount: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  tabNav: {
    display: 'flex',
    backgroundColor: '#334155',
    padding: '4px',
    gap: '4px',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
  },
  tabContent: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollableContent: {
    padding: '16px',
    height: 'calc(100vh - 340px)',
    overflowY: 'auto',
  },
  alertCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  alertTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: '6px',
  },
  alertMessage: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '12px',
  },
  eventCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '14px',
    marginBottom: '10px',
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  eventTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: '4px',
  },
  eventDesc: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  eventMeta: {
    fontSize: '12px',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  incidentCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  },
  incidentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  incidentId: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  incidentTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: '6px',
  },
  incidentDesc: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  incidentMeta: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '12px',
  },
  incidentActions: {
    display: 'flex',
    gap: '10px',
  },
  ruleCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    transition: 'opacity 0.2s',
  },
  ruleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  ruleId: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  ruleName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: '4px',
  },
  ruleDesc: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  ruleMeta: {
    fontSize: '12px',
    color: '#64748b',
  },
  severityBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  categoryBadge: {
    padding: '3px 8px',
    backgroundColor: '#334155',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#94a3b8',
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: '11px',
    color: '#64748b',
    marginLeft: 'auto',
  },
  actionBtn: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  toggleSwitch: {
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
    marginLeft: 'auto',
  },
  toggleSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#475569',
    borderRadius: '24px',
    transition: '0.3s',
  },
};

// Add global CSS for toggle and animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Toggle switch */
  .toggle-switch input { opacity: 0; width: 0; height: 0; }
  
  label[style*="toggleSwitch"] input:checked + span {
    background-color: #22c55e !important;
  }
  
  label[style*="toggleSwitch"] span::before {
    content: '';
    position: absolute;
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: 0.3s;
  }
  
  label[style*="toggleSwitch"] input:checked + span::before {
    transform: translateX(20px);
  }
  
  /* Custom scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #1e293b; }
  ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #64748b; }
  
  /* Button hover effects */
  button:hover { opacity: 0.9; }
  button:active { transform: scale(0.98); }
`;
document.head.appendChild(styleSheet);

export default SOCDashboard;
