import { initApp, avatarHtml, skillCardHtml, starsHtml, formatAvailability } from '../app.js';
import { users } from '../shared/api.js';
import { getUser } from '../shared/auth.js';

initApp('dashboard');

const userId = new URLSearchParams(window.location.search).get('id') || getUser()?.id;
const content = document.getElementById('profile-content');

if (!userId) {
  content.innerHTML = '<div class="empty-state"><h3>Profile not found</h3></div>';
} else {
  loadProfile();
}

async function loadProfile() {
  try {
    const { profile } = await users.profile(userId);
    content.innerHTML = `
      <header class="profile-header glass-card">
        ${avatarHtml({ ...profile, name: profile.name }, 96).replace('avatar--initials', 'avatar--initials profile-header__avatar')}
        <div>
          <h1 class="page-title">${profile.name}</h1>
          <p class="page-subtitle">${profile.bio || 'No bio yet'}</p>
          <p style="font-size:14px;color:var(--text-secondary);margin-top:8px">${profile.location || ''} · ${formatAvailability(profile.availabilityStatus)}</p>
          <div class="profile-stats" style="margin-top:16px">
            <div class="profile-stat"><strong>${profile.stats.activeMatches}</strong><span>Active Matches</span></div>
            <div class="profile-stat"><strong>${profile.stats.completedSwaps}</strong><span>Completed Swaps</span></div>
            <div class="profile-stat"><strong>${profile.stats.avgRating || '—'}</strong><span>Avg Rating</span></div>
          </div>
        </div>
      </header>
      <section style="margin-bottom:32px"><h2 class="section-title" style="text-align:left;font-size:1.5rem">Offered Skills</h2><div class="skills-grid">${profile.skills.map((s) => skillCardHtml(s)).join('') || '<p class="empty-state">No skills listed</p>'}</div></section>
      <section><h2 class="section-title" style="text-align:left;font-size:1.5rem">Reviews</h2>
        ${profile.reviewsReceived.length ? profile.reviewsReceived.map((r) => `
          <article class="review-card glass-card">
            <div class="review-card__header">${avatarHtml(r.reviewer, 32)} <strong>${r.reviewer.name}</strong></div>
            <div class="review-ratings">${starsHtml(r.ratingOverall)} Overall · Teaching ${r.ratingTeaching} · Communication ${r.ratingCommunication} · Punctuality ${r.ratingPunctuality}</div>
            <p style="color:var(--text-secondary);line-height:1.6">${r.feedback}</p>
          </article>`).join('') : '<p class="empty-state">No reviews yet</p>'}
      </section>`;
  } catch {
    content.innerHTML = '<div class="empty-state"><h3>Profile not found</h3></div>';
  }
}
