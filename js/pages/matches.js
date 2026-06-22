import { initApp, avatarHtml, showToast } from '../app.js';
import { requireAuth } from '../shared/auth.js';
import { matches } from '../shared/api.js';

if (!requireAuth()) throw new Error('auth');
initApp('matches');

let activeTab = 'all';

async function load() {
  const el = document.getElementById('match-list');
  try {
    const { requests } = await matches.list(activeTab === 'all' ? 'all' : activeTab);
    const filtered = activeTab === 'all' ? requests : requests.filter((r) => r.direction === activeTab);
    if (!filtered.length) {
      el.innerHTML = '<div class="empty-state"><h3>No match requests</h3></div>';
      return;
    }
    el.innerHTML = filtered.map((r) => `
      <article class="match-card glass-card">
        <div class="match-card__header">
          <div>${avatarHtml(r.direction === 'incoming' ? r.sender : r.receiver, 40)}</div>
          <span class="badge">${r.status}</span>
        </div>
        <p><strong>${r.direction === 'incoming' ? r.sender.name : r.receiver.name}</strong> · ${r.direction}</p>
        <p style="font-size:14px;color:var(--text-secondary);margin:8px 0">Offers: <em>${r.offeredSkill.title}</em> ↔ Wants: <em>${r.wantedSkill.title}</em></p>
        <p style="font-size:14px">${r.message}</p>
        ${renderActions(r)}
      </article>`).join('');
    bindActions();
  } catch {
    el.innerHTML = '<div class="empty-state"><h3>Unable to load matches</h3></div>';
  }
}

function renderActions(r) {
  if (r.status !== 'PENDING') return '';
  if (r.direction === 'incoming') {
    return `<div class="match-card__actions"><button class="primary-cta" data-action="ACCEPTED" data-id="${r.id}">Accept</button><button class="btn-secondary" data-action="DECLINED" data-id="${r.id}">Decline</button></div>`;
  }
  return `<div class="match-card__actions"><button class="btn-secondary" data-action="CANCELLED" data-id="${r.id}">Cancel</button></div>`;
}

function bindActions() {
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await matches.updateStatus(btn.dataset.id, btn.dataset.action);
        showToast('Request updated');
        load();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    load();
  });
});

load();
