import { initApp, formatLevel, formatAvailability, availabilityClass, avatarHtml, starsHtml, showToast } from '../app.js';
import { skills, matches } from '../shared/api.js';
import { isLoggedIn, getUser } from '../shared/auth.js';

initApp('marketplace');

const id = new URLSearchParams(window.location.search).get('id');
const content = document.getElementById('skill-detail');

if (!id) {
  content.innerHTML = '<div class="empty-state"><h3>Skill not found</h3></div>';
} else {
  loadSkill();
}

async function loadSkill() {
  try {
    const { skill } = await skills.get(id);
    document.title = `${skill.title} — SkillSwap`;
    content.innerHTML = `
      <div class="detail-layout">
        <article class="detail-main glass-card">
          <div class="skill-card__meta">
            <span class="badge">${formatLevel(skill.level)}</span>
            <span class="badge ${availabilityClass(skill.availability)}">${formatAvailability(skill.availability)}</span>
            <span class="badge">${skill.category?.name}</span>
          </div>
          <h1 class="page-title" style="margin-top:16px">${skill.title}</h1>
          <p class="page-subtitle">${skill.shortDescription}</p>
          <h2 style="font-family:Fustat,sans-serif;margin:24px 0 12px">About this skill</h2>
          <p style="color:var(--text-secondary);line-height:1.7">${skill.fullDescription}</p>
          <h2 style="font-family:Fustat,sans-serif;margin:24px 0 12px">Learning outcomes</h2>
          <p style="color:var(--text-secondary);line-height:1.7">${skill.learningOutcomes}</p>
          ${skill.prerequisites ? `<h2 style="font-family:Fustat,sans-serif;margin:24px 0 12px">Prerequisites</h2><p style="color:var(--text-secondary)">${skill.prerequisites}</p>` : ''}
          ${skill.tags?.length ? `<div class="tag-list">${skill.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
        </article>
        <aside class="detail-sidebar glass-card">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            ${avatarHtml(skill.provider, 48)}
            <div><strong>${skill.provider.name}</strong><br><span style="font-size:14px;color:var(--text-secondary)">${skill.provider.location || 'Location not set'}</span></div>
          </div>
          ${skill.avgRating > 0 ? `<p>${starsHtml(skill.avgRating)} ${skill.avgRating.toFixed(1)} (${skill.reviewCount} reviews)</p>` : ''}
          <p style="font-size:14px;color:var(--text-secondary);margin:12px 0">Sessions: ${skill.sessionDurations?.join(', ') || 30} min</p>
          <button type="button" class="primary-cta" id="request-swap">Request Swap</button>
          <a href="/profile.html?id=${skill.provider.id}" class="btn-secondary" style="display:block;text-align:center;margin-top:12px">View Profile</a>
        </aside>
      </div>
      <dialog id="swap-dialog" class="glass-card" style="border:none;padding:32px;max-width:480px;width:100%;margin:auto;border-radius:16px;">
        <form id="swap-form">
          <h2 style="font-family:Fustat,sans-serif;margin-bottom:16px">Send Swap Request</h2>
          <div class="form-group">
            <label for="offered-skill">Your offered skill</label>
            <select id="offered-skill" required>
              <option value="">Select a skill to offer...</option>
            </select>
            <p class="form-hint">Choose which of your skills you'd like to teach in exchange.</p>
          </div>
          <div class="form-group"><label for="swap-message">Message</label><textarea id="swap-message" required minlength="10" maxlength="1000" placeholder="Introduce yourself and explain the swap…"></textarea></div>
          <div class="cta-row"><button type="submit" class="primary-cta">Send Request</button><button type="button" class="btn-secondary" id="close-dialog">Cancel</button></div>
          <p id="swap-error" class="form-error" hidden></p>
        </form>
      </dialog>`;

    document.getElementById('request-swap')?.addEventListener('click', async () => {
      if (!isLoggedIn()) { window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.href); return; }
      document.getElementById('swap-dialog').showModal();
      
      const select = document.getElementById('offered-skill');
      select.innerHTML = '<option value="">Loading your skills...</option>';
      try {
        const user = getUser();
        const { skills: mySkills } = await skills.list({ provider: user.id });
        if (mySkills.length === 0) {
          select.innerHTML = '<option value="">You have no skills listed.</option>';
        } else {
          select.innerHTML = '<option value="">Select a skill to offer...</option>' + mySkills.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
        }
      } catch (e) {
        select.innerHTML = '<option value="">Failed to load skills</option>';
      }
    });
    document.getElementById('close-dialog')?.addEventListener('click', () => document.getElementById('swap-dialog').close());
    document.getElementById('swap-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('swap-error');
      try {
        await matches.create({
          offeredSkillId: document.getElementById('offered-skill').value,
          wantedSkillId: id,
          message: document.getElementById('swap-message').value,
        });
        showToast('Swap request sent!');
        document.getElementById('swap-dialog').close();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
      }
    });
  } catch {
    content.innerHTML = '<div class="empty-state"><h3>Skill not found</h3></div>';
  }
}
