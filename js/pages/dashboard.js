import { initApp, avatarHtml, showToast } from '../app.js';
import { requireAuth, getUser } from '../shared/auth.js';
import { dashboard, subscribeToUserEvents } from '../shared/api.js';

if (!requireAuth()) throw new Error('auth');
initApp('dashboard');

async function load() {
  const el = document.getElementById('dashboard-content');
  try {
    const { dashboard: d } = await dashboard.get();
    const { overview, pendingActions, upcomingSessions, unreadMessages } = d;

    el.innerHTML = `
      <div class="overview-cards">
        <div class="stat-card glass-card"><div class="stat-card__value">${overview.totalSkills}</div><div class="stat-card__label">Your Skills</div></div>
        <div class="stat-card glass-card"><div class="stat-card__value">${overview.activeMatches}</div><div class="stat-card__label">Active Matches</div></div>
        <div class="stat-card glass-card"><div class="stat-card__value">${overview.avgRating || '—'}</div><div class="stat-card__label">Avg Rating</div></div>
        ${pendingActions > 0 ? `<div class="stat-card glass-card" style="border-color:var(--brand-blue)"><div class="stat-card__value">${pendingActions}</div><div class="stat-card__label">Pending Requests</div></div>` : ''}
      </div>
      <section class="glass-card" style="padding:24px;margin-top:24px">
        <h2 style="font-family:Fustat,sans-serif;margin-bottom:16px">Upcoming Sessions (7 days)</h2>
        ${upcomingSessions.length ? `<div class="session-list">${upcomingSessions.map((s) => `
          <div class="session-item glass-card">
            <div><div class="session-item__time">${new Date(s.scheduledStart).toLocaleString()}</div><span style="font-size:14px;color:var(--text-secondary)">with ${s.partner?.name} · ${s.durationMinutes} min</span></div>
            <span class="badge">${s.status}</span>
          </div>`).join('')}</div>` : '<p class="empty-state">No upcoming sessions</p>'}
      </section>
      <section class="glass-card" style="padding:24px;margin-top:24px">
        <h2 style="font-family:Fustat,sans-serif;margin-bottom:16px">Recent Unread Messages</h2>
        ${unreadMessages.length ? unreadMessages.map((m) => `
          <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--glass-border-subtle)">
            ${avatarHtml(m.sender, 36)}
            <div><strong>${m.sender.name}</strong><p style="font-size:14px;color:var(--text-secondary)">${m.content || 'Attachment'}</p></div>
          </div>`).join('') : '<p class="empty-state">No unread messages</p>'}
        <a href="/messages.html" class="btn-secondary" style="margin-top:16px;display:inline-flex">Open Messages</a>
      </section>`;

    if (pendingActions > 0) {
      showToast(`You have ${pendingActions} pending match request(s)`, 'info');
    }
  } catch {
    el.innerHTML = '<div class="empty-state"><h3>Dashboard unavailable</h3><p>Start the backend to load your dashboard.</p></div>';
  }
}

load();

const currentUser = getUser();
subscribeToUserEvents(currentUser.id, 'new-message', () => {
  load(); // Reload dashboard on new message
});
