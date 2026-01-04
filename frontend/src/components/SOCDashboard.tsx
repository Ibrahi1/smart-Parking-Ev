// frontend/src/components/SOCDashboard.tsx

import React, { useState } from 'react';
import { useSecurityEvents } from '../hooks/useSecurityEvents';

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

  const [activeView, setActiveView] = useState<'overview' | 'events' | 'incidents' | 'rules'>('overview');

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}>
          <div style={styles.spinner}></div>
        </div>
        <div style={styles.loadingText}>Loading SOC Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoContainer}>
            <span style={styles.logo}>🛡️</span>
          </div>
          <div>
            <h1 style={styles.title}>Security Operations Center</h1>
            <p style={styles.subtitle}>Real-time Threat Monitoring & Response</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.liveIndicator}>
            <div style={styles.liveDot}></div>
            <span>LIVE</span>
          </div>
          <div style={styles.timeDisplay}>
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={styles.metricsGrid}>
        <MetricCard
          icon="📊"
          value={metrics.totalEvents || 0}
          label="Total Events"
          sublabel="Last 24 hours"
          color="#00d4ff"
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <MetricCard
          icon="🚨"
          value={metrics.criticalEvents || 0}
          label="Critical Events"
          sublabel="Require attention"
          color="#ff4444"
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        />
        <MetricCard
          icon="🔍"
          value={incidents.filter(i => i.status === 'open').length}
          label="Open Incidents"
          sublabel="Active investigations"
          color="#ffaa00"
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        />
        <MetricCard
          icon="🛑"
          value={metrics.blockedIPs || 0}
          label="Blocked IPs"
          sublabel="Auto-blocked threats"
          color="#44ff88"
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        />
      </div>

      {/* Active Alerts Banner */}
      {alerts.length > 0 && (
        <div style={styles.alertsBanner}>
          <div style={styles.alertsBannerContent}>
            <div style={styles.alertsBannerLeft}>
              <span style={styles.alertIcon}>⚠️</span>
              <div>
                <div style={styles.alertsBannerTitle}>
                  {alerts.length} Active Security {alerts.length === 1 ? 'Alert' : 'Alerts'}
                </div>
                <div style={styles.alertsBannerSubtitle}>
                  Immediate action recommended
                </div>
              </div>
            </div>
            <button 
              style={styles.viewAlertsButton}
              onClick={() => setActiveView('incidents')}
            >
              View All →
            </button>
          </div>
          <div style={styles.alertsList}>
            {alerts.slice(0, 2).map(alert => (
              <div key={alert.alertId} style={styles.alertItem}>
                <div style={styles.alertItemLeft}>
                  <span style={{...styles.alertSeverityBadge, ...getSeverityStyle(alert.severity)}}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <div style={styles.alertItemContent}>
                    <div style={styles.alertItemTitle}>{alert.title}</div>
                    <div style={styles.alertItemMessage}>{alert.message}</div>
                    <div style={styles.alertItemTime}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => acknowledgeAlert(alert.alertId)}
                  style={styles.ackButton}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  ✓ Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={styles.navContainer}>
        <div style={styles.nav}>
          <TabButton
            icon="📊"
            label="Overview"
            count={events.length}
            active={activeView === 'overview'}
            onClick={() => setActiveView('overview')}
          />
          <TabButton
            icon="📋"
            label="Events"
            count={events.length}
            active={activeView === 'events'}
            onClick={() => setActiveView('events')}
          />
          <TabButton
            icon="🔍"
            label="Incidents"
            count={incidents.length}
            active={activeView === 'incidents'}
            onClick={() => setActiveView('incidents')}
          />
          <TabButton
            icon="⚙️"
            label="Rules"
            count={rules.filter(r => r.enabled).length}
            total={rules.length}
            active={activeView === 'rules'}
            onClick={() => setActiveView('rules')}
          />
        </div>
      </div>

      {/* Content Area */}
      <div style={styles.content}>
        {activeView === 'overview' && (
          <OverviewView events={events} metrics={metrics} threats={threats} />
        )}
        {activeView === 'events' && (
          <EventsView events={events} />
        )}
        {activeView === 'incidents' && (
          <IncidentsView incidents={incidents} updateStatus={updateIncidentStatus} />
        )}
        {activeView === 'rules' && (
          <RulesView rules={rules} toggleRule={toggleRule} />
        )}
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<any> = ({ icon, value, label, sublabel, color, gradient }) => (
  <div 
    style={{...styles.metricCard, background: gradient}}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={styles.metricCardContent}>
      <div style={styles.metricIcon}>{icon}</div>
      <div style={styles.metricInfo}>
        <div style={styles.metricValue}>{value}</div>
        <div style={styles.metricLabel}>{label}</div>
        <div style={styles.metricSublabel}>{sublabel}</div>
      </div>
    </div>
    <div style={styles.metricCardShine}></div>
  </div>
);

// Tab Button Component
const TabButton: React.FC<any> = ({ icon, label, count, total, active, onClick }) => (
  <button
    style={{...styles.tabButton, ...(active ? styles.tabButtonActive : {})}}
    onClick={onClick}
    onMouseEnter={(e) => !active && (e.currentTarget.style.backgroundColor = '#1e2439')}
    onMouseLeave={(e) => !active && (e.currentTarget.style.backgroundColor = 'transparent')}
  >
    <span style={styles.tabIcon}>{icon}</span>
    <span style={styles.tabLabel}>{label}</span>
    <span style={styles.tabCount}>
      {total ? `${count}/${total}` : count}
    </span>
  </button>
);

// Overview View Component
const OverviewView: React.FC<any> = ({ events, metrics, threats }) => (
  <div style={styles.viewContainer}>
    {/* Threat Indicators */}
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>🎯</span>
          Threat Indicators
        </h2>
        <span style={styles.sectionBadge}>{threats.length} Active</span>
      </div>
      {threats.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>✓</div>
          <div style={styles.emptyTitle}>No Active Threats</div>
          <div style={styles.emptyText}>All systems operating normally</div>
        </div>
      ) : (
        <div style={styles.threatGrid}>
          {threats.slice(0, 6).map((threat: any, idx: any) => (
            <ThreatCard key={idx} threat={threat} />
          ))}
        </div>
      )}
    </section>

    {/* Events by Category */}
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>📈</span>
          Events by Category
        </h2>
      </div>
      {Object.keys(metrics.threatsByCategory || {}).length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📊</div>
          <div style={styles.emptyText}>No events recorded yet</div>
        </div>
      ) : (
        <div style={styles.categoryGrid}>
          {Object.entries(metrics.threatsByCategory || {}).map(([category, count]: [string, any]) => (
            <CategoryCard key={category} category={category} count={count} />
          ))}
        </div>
      )}
    </section>

    {/* Recent Activity */}
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>⏰</span>
          Recent Activity
        </h2>
        <span style={styles.sectionBadge}>{events.length} Events</span>
      </div>
      <div style={styles.eventsList}>
        {events.slice(0, 8).map((event: any) => (
          <EventCard key={event.eventId} event={event} />
        ))}
      </div>
    </section>
  </div>
);

// Threat Card Component
const ThreatCard: React.FC<any> = ({ threat }) => (
  <div 
    style={{...styles.threatCard, borderColor: getSeverityColor(threat.severity)}}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
  >
    <div style={styles.threatHeader}>
      <span style={{...styles.threatBadge, ...getSeverityStyle(threat.severity)}}>
        {threat.type.toUpperCase()}
      </span>
      <span style={styles.threatConfidence}>{threat.confidence}%</span>
    </div>
    <div style={styles.threatValue}>{threat.value}</div>
    <div style={styles.threatMeta}>
      <span>🔢 {threat.occurrences} occurrences</span>
    </div>
  </div>
);

// Category Card Component
const CategoryCard: React.FC<any> = ({ category, count }) => (
  <div 
    style={styles.categoryCard}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={styles.categoryCount}>{count}</div>
    <div style={styles.categoryName}>{category.replace(/_/g, ' ')}</div>
    <div style={styles.categoryBar}>
      <div style={{...styles.categoryBarFill, width: `${Math.min(count * 10, 100)}%`}}></div>
    </div>
  </div>
);

// Events View Component
const EventsView: React.FC<any> = ({ events }) => (
  <div style={styles.viewContainer}>
    <div style={styles.sectionHeader}>
      <h2 style={styles.sectionTitle}>
        <span style={styles.sectionIcon}>📋</span>
        Security Events
      </h2>
      <span style={styles.sectionBadge}>{events.length} Total</span>
    </div>
    <div style={styles.eventsList}>
      {events.map((event: any) => (
        <EventCard key={event.eventId} event={event} expanded />
      ))}
    </div>
  </div>
);

// Event Card Component
const EventCard: React.FC<any> = ({ event, expanded }) => (
  <div 
    style={styles.eventCard}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e2439'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1f3a'}
  >
    <div style={styles.eventCardHeader}>
      <div style={styles.eventCardLeft}>
        <span style={{...styles.severityBadge, ...getSeverityStyle(event.severity)}}>
          {event.severity.toUpperCase()}
        </span>
        <span style={styles.categoryBadge}>{event.category}</span>
      </div>
      <span style={styles.eventTime}>
        {new Date(event.timestamp).toLocaleTimeString()}
      </span>
    </div>
    <div style={styles.eventTitle}>{event.title}</div>
    <div style={styles.eventDescription}>{event.description}</div>
    {expanded && event.source && (
      <div style={styles.eventTags}>
        {event.source.ip && <span style={styles.tag}>🌐 {event.source.ip}</span>}
        {event.source.userId && <span style={styles.tag}>👤 {event.source.userId}</span>}
        {event.source.carId && <span style={styles.tag}>🚗 {event.source.carId}</span>}
      </div>
    )}
  </div>
);

// Incidents View Component
const IncidentsView: React.FC<any> = ({ incidents, updateStatus }) => (
  <div style={styles.viewContainer}>
    <div style={styles.sectionHeader}>
      <h2 style={styles.sectionTitle}>
        <span style={styles.sectionIcon}>🔍</span>
        Security Incidents
      </h2>
      <span style={styles.sectionBadge}>{incidents.length} Total</span>
    </div>
    {incidents.length === 0 ? (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>✓</div>
        <div style={styles.emptyTitle}>No Active Incidents</div>
        <div style={styles.emptyText}>All incidents have been resolved</div>
      </div>
    ) : (
      <div style={styles.incidentsList}>
        {incidents.map((incident: any) => (
          <IncidentCard 
            key={incident.incidentId} 
            incident={incident} 
            updateStatus={updateStatus}
          />
        ))}
      </div>
    )}
  </div>
);

// Incident Card Component
const IncidentCard: React.FC<any> = ({ incident, updateStatus }) => (
  <div 
    style={styles.incidentCard}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
  >
    <div style={styles.incidentHeader}>
      <div style={styles.incidentHeaderLeft}>
        <span style={styles.incidentId}>#{incident.incidentId}</span>
        <span style={{...styles.statusBadge, ...getStatusStyle(incident.status)}}>
          {incident.status}
        </span>
        <span style={{...styles.severityBadge, ...getSeverityStyle(incident.severity)}}>
          {incident.severity}
        </span>
      </div>
      <span style={styles.incidentTime}>
        {new Date(incident.createdAt).toLocaleDateString()}
      </span>
    </div>
    <div style={styles.incidentTitle}>{incident.title}</div>
    <div style={styles.incidentDescription}>{incident.description}</div>
    <div style={styles.incidentMeta}>
      <span>📅 {new Date(incident.createdAt).toLocaleString()}</span>
      <span>📊 {incident.events?.length || 0} related events</span>
    </div>
    {incident.status === 'open' && (
      <div style={styles.incidentActions}>
        <button
          onClick={() => updateStatus(incident.incidentId, 'investigating')}
          style={styles.actionButton}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          🔍 Investigate
        </button>
        <button
          onClick={() => updateStatus(incident.incidentId, 'resolved')}
          style={{...styles.actionButton, ...styles.resolveButton}}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          ✓ Resolve
        </button>
      </div>
    )}
  </div>
);

// Rules View Component
const RulesView: React.FC<any> = ({ rules, toggleRule }) => (
  <div style={styles.viewContainer}>
    <div style={styles.sectionHeader}>
      <h2 style={styles.sectionTitle}>
        <span style={styles.sectionIcon}>⚙️</span>
        Detection Rules
      </h2>
      <span style={styles.sectionBadge}>
        {rules.filter((r: any) => r.enabled).length} / {rules.length} Enabled
      </span>
    </div>
    <div style={styles.rulesList}>
      {rules.map((rule: any) => (
        <RuleCard key={rule.ruleId} rule={rule} toggleRule={toggleRule} />
      ))}
    </div>
  </div>
);

// Rule Card Component
const RuleCard: React.FC<any> = ({ rule, toggleRule }) => (
  <div 
    style={{...styles.ruleCard, opacity: rule.enabled ? 1 : 0.6}}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e2439'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1f3a'}
  >
    <div style={styles.ruleHeader}>
      <div style={styles.ruleHeaderLeft}>
        <span style={styles.ruleId}>{rule.ruleId}</span>
        <span style={{...styles.severityBadge, ...getSeverityStyle(rule.severity)}}>
          {rule.severity}
        </span>
      </div>
      <label style={styles.toggle}>
        <input
          type="checkbox"
          checked={rule.enabled}
          onChange={(e) => toggleRule(rule.ruleId, e.target.checked)}
          style={styles.toggleInput}
        />
        <span style={{...styles.toggleSlider, ...(rule.enabled ? styles.toggleSliderActive : {})}}></span>
      </label>
    </div>
    <div style={styles.ruleName}>{rule.name}</div>
    <div style={styles.ruleDescription}>{rule.description}</div>
    <div style={styles.ruleMeta}>
      <span>🎯 Triggered: {rule.triggerCount} times</span>
      <span>📂 {rule.category}</span>
    </div>
  </div>
);

// Helper Functions
const getSeverityStyle = (severity: string) => {
  const styles: any = {
    critical: { backgroundColor: '#ff4444', color: '#fff' },
    high: { backgroundColor: '#ff8844', color: '#fff' },
    medium: { backgroundColor: '#ffaa00', color: '#000' },
    low: { backgroundColor: '#4488ff', color: '#fff' },
  };
  return styles[severity] || styles.low;
};

const getSeverityColor = (severity: string) => {
  const colors: any = {
    critical: '#ff4444',
    high: '#ff8844',
    medium: '#ffaa00',
    low: '#4488ff',
  };
  return colors[severity] || colors.low;
};

const getStatusStyle = (status: string) => {
  const styles: any = {
    open: { backgroundColor: '#ff4444', color: '#fff' },
    investigating: { backgroundColor: '#ffaa00', color: '#000' },
    contained: { backgroundColor: '#4488ff', color: '#fff' },
    resolved: { backgroundColor: '#44ff88', color: '#000' },
  };
  return styles[status] || {};
};

// Professional Styles with animations and modern design
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0a0e27',
    height: '100vh',
    color: '#fff',
    padding: '24px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  
  // Loading States
  loading: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#0a0e27',
    color: '#fff',
  },
  loadingSpinner: {
    marginBottom: '20px',
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255, 255, 255, 0.1)',
    borderTop: '4px solid #00d4ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '18px',
    color: '#8892b0',
  },
  
  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '20px 24px',
    background: 'linear-gradient(135deg, #1e2439 0%, #1a1f3a 100%)',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logoContainer: {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },
  logo: {
    fontSize: '32px',
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
    alignItems: 'center',
    gap: '16px',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'rgba(68, 255, 136, 0.1)',
    border: '1px solid rgba(68, 255, 136, 0.3)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#44ff88',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#44ff88',
    borderRadius: '50%',
    boxShadow: '0 0 10px #44ff88',
    animation: 'pulse 2s ease-in-out infinite',
  },
  timeDisplay: {
    padding: '8px 16px',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#00d4ff',
    fontWeight: '500',
  },
  
  // Metrics Grid
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
    flexShrink: 0,
  },
  metricCard: {
    position: 'relative',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
  },
  metricCardContent: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  metricCardShine: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
    transform: 'rotate(45deg)',
  },
  metricIcon: {
    fontSize: '40px',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
  },
  metricInfo: {
    flex: 1,
  },
  metricValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 1,
    marginBottom: '4px',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  metricLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '2px',
  },
  metricSublabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  
  // Alerts Banner
  alertsBanner: {
    background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
    borderRadius: '16px',
    padding: '20px 24px',
    marginBottom: '24px',
    boxShadow: '0 8px 16px rgba(255, 68, 68, 0.3)',
    flexShrink: 0,
  },
  alertsBannerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  alertsBannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  alertIcon: {
    fontSize: '32px',
    animation: 'shake 0.5s ease-in-out infinite',
  },
  alertsBannerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '4px',
  },
  alertsBannerSubtitle: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  viewAlertsButton: {
    padding: '10px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  alertItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '16px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
  },
  alertItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  alertSeverityBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  alertItemContent: {
    flex: 1,
  },
  alertItemTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  alertItemMessage: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '4px',
  },
  alertItemTime: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  ackButton: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#ff4444',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '14px',
  },
  
  // Navigation
  navContainer: {
    marginBottom: '24px',
    flexShrink: 0,
  },
  nav: {
    display: 'flex',
    gap: '8px',
    backgroundColor: '#1a1f3a',
    padding: '8px',
    borderRadius: '12px',
  },
  tabButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    color: '#8892b0',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  tabButtonActive: {
    backgroundColor: '#2d3654',
    color: '#00d4ff',
    fontWeight: 'bold',
    boxShadow: '0 2px 8px rgba(0, 212, 255, 0.2)',
  },
  tabIcon: {
    fontSize: '18px',
  },
  tabLabel: {
    fontSize: '14px',
  },
  tabCount: {
    padding: '2px 8px',
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  
  // Content Area
  content: {
    flex: 1,
    overflow: 'auto',
    paddingRight: '8px',
  },
  viewContainer: {
    paddingBottom: '20px',
  },
  
  // Section Styles
  section: {
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionIcon: {
    fontSize: '24px',
  },
  sectionBadge: {
    padding: '6px 12px',
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#00d4ff',
    fontWeight: 'bold',
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
    color: '#fff',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#8892b0',
  },
  
  // Threat Grid
  threatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
  },
  threatCard: {
    backgroundColor: '#1a1f3a',
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  threatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  threatBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  threatConfidence: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#00d4ff',
  },
  threatValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '12px',
    wordBreak: 'break-all',
  },
  threatMeta: {
    fontSize: '12px',
    color: '#8892b0',
  },
  
  // Category Grid
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
  },
  categoryCard: {
    backgroundColor: '#1a1f3a',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  categoryCount: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#00d4ff',
    marginBottom: '8px',
  },
  categoryName: {
    fontSize: '13px',
    color: '#8892b0',
    textTransform: 'capitalize',
    marginBottom: '12px',
  },
  categoryBar: {
    height: '4px',
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: '#00d4ff',
    transition: 'width 0.3s',
  },
  
  // Events List
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  eventCard: {
    backgroundColor: '#1a1f3a',
    padding: '20px',
    borderRadius: '12px',
    transition: 'all 0.2s',
    cursor: 'pointer',
    border: '1px solid rgba(136, 146, 176, 0.1)',
  },
  eventCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  eventCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  severityBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  categoryBadge: {
    padding: '4px 10px',
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#00d4ff',
    textTransform: 'capitalize',
  },
  eventTime: {
    fontSize: '12px',
    color: '#8892b0',
  },
  eventTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '8px',
  },
  eventDescription: {
    fontSize: '14px',
    color: '#8892b0',
    lineHeight: 1.5,
    marginBottom: '12px',
  },
  eventTags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  tag: {
    padding: '4px 10px',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#00d4ff',
  },
  
  // Incidents List
  incidentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  incidentCard: {
    backgroundColor: '#1a1f3a',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid rgba(136, 146, 176, 0.1)',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  incidentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  incidentHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  incidentId: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#00d4ff',
    fontFamily: 'monospace',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  incidentTime: {
    fontSize: '12px',
    color: '#8892b0',
  },
  incidentTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '8px',
  },
  incidentDescription: {
    fontSize: '14px',
    color: '#8892b0',
    lineHeight: 1.5,
    marginBottom: '12px',
  },
  incidentMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#8892b0',
    marginBottom: '16px',
  },
  incidentActions: {
    display: 'flex',
    gap: '12px',
  },
  actionButton: {
    padding: '10px 20px',
    backgroundColor: '#00d4ff',
    color: '#0a0e27',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  resolveButton: {
    backgroundColor: '#44ff88',
  },
  
  // Rules List
  rulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  ruleCard: {
    backgroundColor: '#1a1f3a',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid rgba(136, 146, 176, 0.1)',
    transition: 'all 0.2s',
  },
  ruleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  ruleHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  ruleId: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#00d4ff',
    fontFamily: 'monospace',
  },
  ruleName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '8px',
  },
  ruleDescription: {
    fontSize: '14px',
    color: '#8892b0',
    lineHeight: 1.5,
    marginBottom: '12px',
  },
  ruleMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#8892b0',
  },
  
  // Toggle Switch
  toggle: {
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '26px',
    cursor: 'pointer',
  },
  toggleInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  toggleSlider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2a3f5a',
    borderRadius: '13px',
    transition: '0.3s',
  },
  toggleSliderActive: {
    backgroundColor: '#00d4ff',
  },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  /* Toggle slider dot */
  .toggle input:checked + span::before {
    transform: translateX(24px);
  }
  
  .toggle span::before {
    content: '';
    position: absolute;
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: 0.3s;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(26, 31, 58, 0.5);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(0, 212, 255, 0.3);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 212, 255, 0.5);
  }
`;
document.head.appendChild(styleSheet);

export default SOCDashboard;
