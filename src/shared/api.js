export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  const baseUrl = API_BASE.replace(/\/api$/, '');
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}
export async function api(path, options = {}) {
  const token = localStorage.getItem('skillswap-token');
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403 && data.isBanned) {
      localStorage.setItem('skillswap-ban-reason', data.reason || 'Your account was suspended.');
      localStorage.removeItem('skillswap-token');
      window.location.href = '/banned';
      throw new Error('Account suspended');
    }
    throw new Error(data.error || data.message || 'Request failed');
  }
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

export function clearApiCache(prefix = '') {
  const keys = Object.keys(sessionStorage);
  keys.forEach(k => {
    if (k.startsWith('ss_cache_' + prefix)) {
      sessionStorage.removeItem(k);
    }
  });
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
  create: async (formData) => {
    const res = await api('/skills', { method: 'POST', body: formData });
    clearApiCache('/skills');
    clearApiCache('/dashboard');
    return res;
  },
  update: async (id, formData) => {
    const res = await api(`/skills/${id}`, { method: 'PATCH', body: formData });
    clearApiCache('/skills');
    clearApiCache('/dashboard');
    return res;
  },
  delete: async (id) => {
    const res = await api(`/skills/${id}`, { method: 'DELETE' });
    clearApiCache('/skills');
    clearApiCache('/dashboard');
    return res;
  },
};

export const categories = {
  list: () => cachedApi('/categories'),
};

export const notifications = {
  list: () => api('/notifications'),
  markRead: (id) => api(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => api('/notifications/read-all', { method: 'PATCH' }),
};

export const stats = {
  community: () => cachedApi('/stats/community'),
};

export const matches = {
  list: (direction) => cachedApi(`/matches?direction=${direction || 'all'}`),
  active: (status) => cachedApi(`/matches/active${status ? `?status=${status}` : ''}`),
  create: async (data) => {
    const res = await api('/matches', { method: 'POST', body: JSON.stringify(data) });
    clearApiCache('/matches');
    clearApiCache('/dashboard');
    return res;
  },
  updateStatus: async (id, status) => {
    const res = await api(`/matches/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    clearApiCache('/matches');
    clearApiCache('/dashboard');
    return res;
  },
  complete: async (id) => {
    const res = await api(`/matches/active/${id}/complete`, { method: 'PATCH' });
    clearApiCache('/matches');
    clearApiCache('/dashboard');
    return res;
  },
};

export const messages = {
  conversations: () => api('/messages/conversations'), // Keep real-time
  createConversation: (partnerId) => api('/messages/conversations', { method: 'POST', body: JSON.stringify({ partnerId }) }),
  deleteConversation: (conversationId) => api(`/messages/conversations/${conversationId}`, { method: 'DELETE' }),
  list: (conversationId) => api(`/messages/${conversationId}/messages`), // We use our custom SWR cache in component
  send: (conversationId, formData) => api(`/messages/${conversationId}/messages`, { method: 'POST', body: formData }),
  deleteMessage: (conversationId, messageId, forEveryone = false) => api(`/messages/${conversationId}/messages/${messageId}?forEveryone=${forEveryone}`, { method: 'DELETE' }),
  bulkDeleteMessages: (messageIds, forEveryone = false) => api(`/messages/bulk-delete?forEveryone=${forEveryone}`, { method: 'POST', body: JSON.stringify({ messageIds }) }),
};

export const sessions = {
  list: (matchId) => cachedApi(`/sessions/match/${matchId}`),
  create: async (matchId, data) => {
    const res = await api(`/sessions/match/${matchId}`, { method: 'POST', body: JSON.stringify(data) });
    clearApiCache('/sessions');
    clearApiCache('/dashboard');
    return res;
  },
  update: async (id, data) => {
    const res = await api(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    clearApiCache('/sessions');
    clearApiCache('/dashboard');
    return res;
  },
  respond: async (id, data) => {
    const res = await api(`/sessions/${id}/respond`, { method: 'PATCH', body: JSON.stringify(data) });
    clearApiCache('/sessions');
    clearApiCache('/matches');
    return res;
  },
  cancel: async (id) => {
    const res = await api(`/sessions/${id}/cancel`, { method: 'PATCH' });
    clearApiCache('/sessions');
    clearApiCache('/matches');
    return res;
  },
};

export const dashboard = {
  get: () => cachedApi('/dashboard'),
};

export const users = {
  list: () => cachedApi('/users'),
  profile: (id) => cachedApi(`/users/${id}/profile`),
  linkGoogle: async (credential) => {
    const res = await api('/users/me/link-google', { method: 'POST', body: JSON.stringify({ credential }) });
    clearApiCache('/auth');
    clearApiCache('/users');
    return res;
  },
  sendEmailOtp: async () => {
    return api('/users/me/send-email-otp', { method: 'POST' });
  },
  verifyEmailOtp: async (otp) => {
    const res = await api('/users/me/verify-email-otp', { method: 'POST', body: JSON.stringify({ otp }) });
    clearApiCache('/auth');
    clearApiCache('/users');
    return res;
  },
  sendPhoneOtp: async (phone) => {
    return api('/users/me/send-phone-otp', { method: 'POST', body: JSON.stringify({ phone }) });
  },
  verifyPhoneOtp: async (otp) => {
    const res = await api('/users/me/verify-phone-otp', { method: 'POST', body: JSON.stringify({ otp }) });
    clearApiCache('/auth');
    clearApiCache('/users');
    return res;
  },
  update: async (data) => {
    const res = await api('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
    clearApiCache('/users');
    clearApiCache('/dashboard');
    return res;
  },
  uploadAvatar: async (formData) => {
    const res = await api('/users/me/avatar', { method: 'POST', body: formData });
    clearApiCache('/users');
    clearApiCache('/dashboard');
    return res;
  },
  blockUser: async (id, reason) => {
    const res = await api(`/users/${id}/block`, { method: 'POST', body: JSON.stringify({ reason }) });
    clearApiCache('/users');
    clearApiCache('/matches');
    return res;
  },
  reportUser: async (id, reason, description) => {
    const res = await api(`/users/${id}/flag`, { method: 'POST', body: JSON.stringify({ reason, description }) });
    return res;
  },
  updatePassword: (data) => api('/users/me/password', { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAccount: () => api('/users/me', { method: 'DELETE' }),
};

export const reviews = {
  create: async (sessionId, data) => {
    const res = await api(`/reviews/session/${sessionId}`, { method: 'POST', body: JSON.stringify(data) });
    clearApiCache('/reviews');
    clearApiCache('/users');
    clearApiCache('/dashboard');
    return res;
  },
  createMatchReview: async (matchId, data) => {
    const res = await api(`/reviews/match/${matchId}`, { method: 'POST', body: JSON.stringify(data) });
    clearApiCache('/reviews');
    clearApiCache('/users');
    clearApiCache('/dashboard');
    return res;
  },
  forUser: (userId) => cachedApi(`/reviews/user/${userId}`),
  featured: () => cachedApi('/reviews/featured'),
};

export const admin = {
  analytics: () => api('/admin/analytics'),
  users: () => api('/admin/users'),
  moderation: () => api('/admin/moderation'),
  resolveFlag: async (id, status) => {
    const res = await api(`/admin/moderation/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    return res;
  },
  banUser: async (id, reason) => {
    const res = await api(`/admin/users/${id}/ban`, { method: 'PATCH', body: JSON.stringify({ reason }) });
    clearApiCache('/users');
    return res;
  },
  audit: () => api('/admin/audit'),
  disputes: () => api('/admin/disputes'),
  resolveDispute: async (id, data) => {
    const res = await api(`/admin/disputes/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) });
    clearApiCache('/matches');
    return res;
  },

  auditLogs: () => api('/admin/audit-logs'),
  supportMessages: () => api('/support'),
  markSupportMessageRead: async (id) => {
    const res = await api(`/support/${id}/read`, { method: 'PATCH' });
    return res;
  },
  deleteGroup: async (id) => {
    const res = await api(`/admin/groups/${id}`, { method: 'DELETE' });
    clearApiCache('/groups');
    return res;
  },
  setUserRole: async (id, role) => {
    const res = await api(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
    clearApiCache('/users');
    return res;
  },
  impersonate: async (id) => {
    return api(`/admin/impersonate/${id}`, { method: 'POST' });
  },
  unbanUser: async (id) => {
    const res = await api(`/admin/users/${id}/unban`, { method: 'PATCH' });
    clearApiCache('/users');
    return res;
  },
  acceptAppeal: async (id) => {
    return api(`/support/${id}/accept-appeal`, { method: 'POST' });
  },
  rejectAppeal: async (id) => {
    return api(`/support/${id}/reject-appeal`, { method: 'POST' });
  }
};

export const disputes = {
  create: async (matchId) => {
    const res = await api(`/disputes/match/${matchId}`, { method: 'POST' });
    clearApiCache('/matches');
    return res;
  },
  submitStance: async (id, stance) => {
    const res = await api(`/disputes/${id}/stance`, { method: 'POST', body: JSON.stringify({ stance }) });
    clearApiCache('/matches');
    return res;
  },
};

export const blogs = {
  list: () => cachedApi('/blogs'),
  get: (id) => cachedApi(`/blogs/${id}`),
  create: async (data) => {
    const res = await api('/blogs', { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) });
    clearApiCache('/blogs');
    return res;
  },
  update: async (id, data) => {
    const res = await api(`/blogs/${id}`, { method: 'PUT', body: data instanceof FormData ? data : JSON.stringify(data) });
    clearApiCache('/blogs');
    return res;
  },
  delete: async (id) => {
    const res = await api(`/blogs/${id}`, { method: 'DELETE' });
    clearApiCache('/blogs');
    return res;
  },
  addComment: async (id, data) => {
    const res = await api(`/blogs/${id}/comments`, { method: 'POST', body: JSON.stringify(data) });
    clearApiCache('/blogs');
    return res;
  },
  deleteComment: async (id, commentId) => {
    const res = await api(`/blogs/${id}/comments/${commentId}`, { method: 'DELETE' });
    clearApiCache('/blogs');
    return res;
  },
};

export const groups = {
  list: () => cachedApi('/groups'),
  create: async (data) => {
    const res = await api('/groups', { method: 'POST', body: JSON.stringify(data) });
    clearApiCache('/groups');
    return res;
  },
  join: async (id) => {
    const res = await api(`/groups/${id}/join`, { method: 'POST' });
    clearApiCache('/groups');
    return res;
  },
  leave: async (id) => {
    const res = await api(`/groups/${id}/leave`, { method: 'POST' });
    clearApiCache('/groups');
    return res;
  },
  invite: async (id, userId) => api(`/groups/${id}/invite`, { method: 'POST', body: JSON.stringify({ userId }) }),
  getInvitations: () => api('/groups/invitations'),
  acceptInvitation: async (id) => {
    const res = await api(`/groups/invitations/${id}/accept`, { method: 'POST' });
    clearApiCache('/groups');
    return res;
  },
  declineInvitation: (id) => api(`/groups/invitations/${id}/decline`, { method: 'POST' }),
  messages: (id) => api(`/groups/${id}/messages`), // Skip cache for chat messages
  sendMessage: (id, data) => api(`/groups/${id}/messages`, { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) }),
  deleteMessage: (groupId, messageId, forEveryone = false) => api(`/groups/${groupId}/messages/${messageId}?forEveryone=${forEveryone}`, { method: 'DELETE' }),
  updateSettings: async (groupId, settings) => {
    const res = await api(`/groups/${groupId}/settings`, { method: 'PATCH', body: JSON.stringify(settings) });
    clearApiCache('/groups');
    return res;
  },
  setMemberRole: async (groupId, userId, role) => {
    const res = await api(`/groups/${groupId}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
    clearApiCache('/groups');
    return res;
  },
  bulkDeleteMessages: (groupId, messageIds) => api(`/groups/${groupId}/messages/bulk-delete`, { method: 'POST', body: JSON.stringify({ messageIds }) })
};

export function subscribeToGroupEvents(groupId, eventName, callback) {
  const pusher = getPusher();
  if (!pusher || !groupId) return null;
  const channel = pusher.subscribe(`group-${groupId}`);
  channel.bind(eventName, callback);
  return () => {
    channel.unbind(eventName, callback);
  };
}

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
    // Removed pusher.unsubscribe to prevent breaking other active listeners on the same channel
  };
}
