// frontend/src/services/soc-api.ts

import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const socAPI = {
  // Security Events
  getSecurityEvents: async (params?: any) => {
    const response = await axios.get(`${API_URL}/soc/events`, { params });
    return response.data;
  },

  getMetrics: async () => {
    const response = await axios.get(`${API_URL}/soc/metrics`);
    return response.data;
  },

  getThreatIndicators: async () => {
    const response = await axios.get(`${API_URL}/soc/threats`);
    return response.data;
  },

  // Incidents
  getIncidents: async (params?: any) => {
    const response = await axios.get(`${API_URL}/soc/incidents`, { params });
    return response.data;
  },

  getIncident: async (id: string) => {
    const response = await axios.get(`${API_URL}/soc/incidents/${id}`);
    return response.data;
  },

  getIncidentStatistics: async () => {
    const response = await axios.get(`${API_URL}/soc/incidents/statistics`);
    return response.data;
  },

  updateIncidentStatus: async (id: string, status: string, actor: string, notes?: string) => {
    const response = await axios.put(`${API_URL}/soc/incidents/${id}/status`, {
      status,
      actor,
      notes,
    });
    return response.data;
  },

  // Alerts
  getAlerts: async (params?: any) => {
    const response = await axios.get(`${API_URL}/soc/alerts`, { params });
    return response.data;
  },

  getAlertCounts: async () => {
    const response = await axios.get(`${API_URL}/soc/alerts/counts`);
    return response.data;
  },

  acknowledgeAlert: async (id: string, acknowledgedBy: string) => {
    const response = await axios.post(`${API_URL}/soc/alerts/${id}/acknowledge`, {
      acknowledgedBy,
    });
    return response.data;
  },

  // IP Blocking
  getBlockedIPs: async () => {
    const response = await axios.get(`${API_URL}/soc/blocked-ips`);
    return response.data;
  },

  blockIP: async (ip: string, reason: string) => {
    const response = await axios.post(`${API_URL}/soc/block-ip`, { ip, reason });
    return response.data;
  },

  unblockIP: async (ip: string) => {
    const response = await axios.delete(`${API_URL}/soc/block-ip/${ip}`);
    return response.data;
  },

  // Rules
  getRules: async () => {
    const response = await axios.get(`${API_URL}/soc/rules`);
    return response.data;
  },

  enableRule: async (ruleId: string) => {
    const response = await axios.post(`${API_URL}/soc/rules/${ruleId}/enable`);
    return response.data;
  },

  disableRule: async (ruleId: string) => {
    const response = await axios.post(`${API_URL}/soc/rules/${ruleId}/disable`);
    return response.data;
  },
};
