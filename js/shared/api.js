const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('skillswap-token');
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export async function cachedApi(path, options = {}) {
  if (options.method && options.method !== 'GET') return api(path, options);
  
  const cacheKey = `ss_cache_${path}`;
  const cached = sessionStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed.data;
      }
    } catch (e) {
      sessionStorage.removeItem(cacheKey);
    }
  }

  const data = await api(path, options);
  sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  return data;
}

export const auth = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password, name) => api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  google: (credential) => api('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  me: () => api('/auth/me'),
};

export const skills = {
  list: (params) => cachedApi(`/skills?${new URLSearchParams(params)}`),
  featured: () => cachedApi('/skills/featured'),
  get: (id) => cachedApi(`/skills/${id}`),
  create: (formData) => api('/skills', { method: 'POST', body: formData }),
};

export const categories = {
  list: () => cachedApi('/categories'),
};

export const stats = {
  community: () => cachedApi('/stats/community'),
};

export const matches = {
  list: (direction) => api(`/matches?direction=${direction || 'all'}`), // Don't cache real-time state
  create: (data) => api('/matches', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, status) => api(`/matches/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export const messages = {
  conversations: () => api('/messages/conversations'), // Real-time
  createConversation: (partnerId) => api('/messages/conversations', { method: 'POST', body: JSON.stringify({ partnerId }) }),
  list: (conversationId) => api(`/messages/${conversationId}/messages`),
  send: (conversationId, formData) => api(`/messages/${conversationId}/messages`, { method: 'POST', body: formData }),
};

export const sessions = {
  list: (matchId) => api(`/sessions/match/${matchId}`),
  create: (matchId, data) => api(`/sessions/match/${matchId}`, { method: 'POST', body: JSON.stringify(data) }),
  respond: (id, data) => api(`/sessions/${id}/respond`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const dashboard = {
  get: () => api('/dashboard'), // Fast changing state, maybe don't cache, or use cache for initial load. We will use standard api for now.
};

export const users = {
  list: () => api('/users'),
  profile: (id) => api(`/users/${id}/profile`),
  update: (data) => api('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  updatePassword: (data) => api('/users/me/password', { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAccount: () => api('/users/me', { method: 'DELETE' }),
};

export const reviews = {
  create: (sessionId, data) => api(`/reviews/session/${sessionId}`, { method: 'POST', body: JSON.stringify(data) }),
  forUser: (userId) => api(`/reviews/user/${userId}`),
};

export const admin = {
  analytics: () => api('/admin/analytics'),
  users: () => api('/admin/users'),
  moderation: () => api('/admin/moderation'),
  resolveFlag: (id, status) => api(`/admin/moderation/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  suspendUser: (id, reason) => api(`/admin/users/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  audit: () => api('/admin/audit'),
};

import Pusher from 'pusher-js';

let pusherInstance = null;

export function getPusher() {
  if (!pusherInstance && import.meta.env.VITE_PUSHER_KEY) {
    pusherInstance = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'mt1',
    });
  }
  return pusherInstance;
}

export function subscribeToUserEvents(userId, eventName, callback) {
  const pusher = getPusher();
  if (!pusher || !userId) return null;
  const channel = pusher.subscribe(`user-${userId}`);
  channel.bind(eventName, callback);
  return () => {
    channel.unbind(eventName, callback);
    pusher.unsubscribe(`user-${userId}`);
  };
}
