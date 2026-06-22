import { initApp, showToast } from '../app.js';
import { requireAuth } from '../shared/auth.js';
import { messages, sessions } from '../shared/api.js';

if (!requireAuth()) throw new Error('auth');
initApp('sessions');

let activeMatchId = null;

async function loadMatches() {
  const select = document.getElementById('match-select');
  try {
    const { conversations } = await messages.conversations();
    select.innerHTML = '<option value="">Select active match</option>' +
      conversations.map((c) => `<option value="${c.matchId}">${c.partner.name}</option>`).join('');
    select.addEventListener('change', () => { activeMatchId = select.value; loadSessions(); });
  } catch { /* empty */ }
}

async function loadSessions() {
  const el = document.getElementById('session-list');
  if (!activeMatchId) { el.innerHTML = '<p class="empty-state">Select a match to view sessions</p>'; return; }
  try {
    const { sessions: list } = await sessions.list(activeMatchId);
    el.innerHTML = list.length ? list.map((s) => `
      <div class="session-item glass-card">
        <div>
          <div class="session-item__time">${new Date(s.scheduledStart).toLocaleString()} – ${new Date(s.scheduledEnd).toLocaleTimeString()}</div>
          <span style="font-size:14px;color:var(--text-secondary)">${s.durationMinutes} min · ${s.meetingMethod} · ${s.agenda || 'No agenda'}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge">${s.status}</span>
          ${s.status === 'PROPOSED' && s.proposerId !== JSON.parse(localStorage.getItem('skillswap-user')).id ? `
            <button class="btn-secondary" data-accept="${s.id}">Accept</button>
            <button class="btn-secondary" data-decline="${s.id}">Decline</button>` : ''}
        </div>
      </div>`).join('') : '<p class="empty-state">No sessions scheduled</p>';

    el.querySelectorAll('[data-accept]').forEach((b) => b.addEventListener('click', () => respond(b.dataset.accept, 'accept')));
    el.querySelectorAll('[data-decline]').forEach((b) => b.addEventListener('click', () => respond(b.dataset.decline, 'decline')));
  } catch {
    el.innerHTML = '<p class="empty-state">Could not load sessions</p>';
  }
}

async function respond(id, action) {
  await sessions.respond(id, { action });
  showToast(`Session ${action}ed`);
  loadSessions();
}

document.getElementById('session-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeMatchId) { showToast('Select a match first', 'error'); return; }
  const form = e.target;
  const start = new Date(`${form.date.value}T${form.time.value}`);
  try {
    await sessions.create(activeMatchId, {
      scheduledStart: start.toISOString(),
      durationMinutes: parseInt(form.duration.value, 10),
      agenda: form.agenda.value,
      meetingMethod: form.method.value,
      meetingDetails: form.details.value,
    });
    showToast('Session proposed');
    form.reset();
    loadSessions();
  } catch (err) { showToast(err.message, 'error'); }
});

loadMatches();
