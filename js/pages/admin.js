import { initApp, showToast } from '../app.js';
import { requireAuth, isAdmin } from '../shared/auth.js';
import { admin } from '../shared/api.js';

if (!requireAuth()) throw new Error('auth');
if (!isAdmin()) { window.location.href = '/dashboard.html'; throw new Error('admin'); }
initApp('admin');

async function load() {
  const el = document.getElementById('admin-content');
  try {
    const [{ analytics }, { users }, { flags }] = await Promise.all([
      admin.analytics(),
      admin.users(),
      admin.moderation(),
    ]);

    el.innerHTML = `
      <div class="admin-grid">
        <div class="stat-card glass-card"><div class="stat-card__value">${analytics.users.total}</div><div class="stat-card__label">Total Users (+${analytics.users.growth30d} / 30d)</div></div>
        <div class="stat-card glass-card"><div class="stat-card__value">${analytics.skills.total}</div><div class="stat-card__label">Skills (+${analytics.skills.created30d} / 30d)</div></div>
        <div class="stat-card glass-card"><div class="stat-card__value">${analytics.matches.active}</div><div class="stat-card__label">Active Matches</div></div>
        <div class="stat-card glass-card"><div class="stat-card__value">${analytics.matches.completed}</div><div class="stat-card__label">Completed Swaps</div></div>
        <div class="stat-card glass-card"><div class="stat-card__value">${analytics.moderation.pendingFlags}</div><div class="stat-card__label">Pending Flags</div></div>
      </div>
      <section class="glass-card" style="padding:24px;margin-top:32px">
        <h2 style="font-family:Fustat,sans-serif;margin-bottom:16px">User Management</h2>
        <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Skills</th><th>Status</th><th></th></tr></thead><tbody>
          ${users.map((u) => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td>${u._count.skills}</td><td>${u.isSuspended ? 'Suspended' : 'Active'}</td><td>${!u.isSuspended && u.role !== 'ADMIN' ? `<button class="btn-secondary" data-suspend="${u.id}">Suspend</button>` : ''}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
      <section class="glass-card" style="padding:24px;margin-top:32px">
        <h2 style="font-family:Fustat,sans-serif;margin-bottom:16px">Moderation Queue</h2>
        ${flags.length ? flags.map((f) => `
          <div class="match-card" style="margin-bottom:12px;padding:16px;border:1px solid var(--glass-border-subtle);border-radius:12px">
            <p><strong>${f.targetType}</strong> · ${f.reason}</p>
            <p style="font-size:13px;color:var(--text-secondary)">Reported by ${f.reporter.name}</p>
            <div style="margin-top:8px;display:flex;gap:8px"><button class="btn-secondary" data-resolve="${f.id}" data-status="RESOLVED">Resolve</button><button class="btn-secondary" data-resolve="${f.id}" data-status="DISMISSED">Dismiss</button></div>
          </div>`).join('') : '<p class="empty-state">Queue empty</p>'}
      </section>`;

    el.querySelectorAll('[data-suspend]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await admin.suspendUser(btn.dataset.suspend, 'Admin action');
        showToast('User suspended');
        load();
      });
    });
    el.querySelectorAll('[data-resolve]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await admin.resolveFlag(btn.dataset.resolve, btn.dataset.status);
        showToast('Flag updated');
        load();
      });
    });
  } catch {
    el.innerHTML = '<div class="empty-state"><h3>Admin panel unavailable</h3></div>';
  }
}

load();
