import axios from 'axios';

const API_BASE = '/api';

export const api = {
    // Chat
    async chat(query, sessionId = null, context = {}) {
        const response = await axios.post(`${API_BASE}/chat`, {
            query,
            session_id: sessionId,
            context,
        });
        return response.data;
    },

    // Agents
    async listAgents() {
        const response = await axios.get(`${API_BASE}/agents`);
        return response.data;
    },

    async getAgentStatus(agentName) {
        const response = await axios.get(`${API_BASE}/agents/${agentName}/status`);
        return response.data;
    },

    // Sessions
    async listSessions() {
        const response = await axios.get(`${API_BASE}/sessions`);
        return response.data;
    },

    async createSession() {
        const response = await axios.post(`${API_BASE}/sessions`);
        return response.data;
    },

    async getSessionMessages(sessionId) {
        const response = await axios.get(`${API_BASE}/sessions/${sessionId}/messages`);
        return response.data;
    },
};

export default api;
