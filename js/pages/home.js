import { initApp, skillCardHtml, showToast } from '../app.js';
import { skills, stats, categories } from '../shared/api.js';
import { initNodeGraph } from '../components/node-graph.js';

initApp('home');

async function loadFeatured() {
  const track = document.getElementById('featured-carousel');
  try {
    const { skills: featured } = await skills.featured();
    if (!featured.length) {
      track.innerHTML = '<p class="empty-state">No featured skills yet. Be the first to list one!</p>';
      return;
    }
    track.innerHTML = featured.map((s) => skillCardHtml(s)).join('');
  } catch {
    track.innerHTML = '<p class="empty-state">Connect the backend to see featured skills.</p>';
  }
}

async function loadStats() {
  const el = document.getElementById('community-stats');
  try {
    const { stats: s } = await stats.community();
    el.innerHTML = `
      <div class="stat-card glass-card"><div class="stat-card__value">${s.totalUsers.toLocaleString()}</div><div class="stat-card__label">Total Users</div></div>
      <div class="stat-card glass-card"><div class="stat-card__value">${s.skillsExchanged.toLocaleString()}</div><div class="stat-card__label">Skills Exchanged</div></div>
      <div class="stat-card glass-card"><div class="stat-card__value">${s.activeMatches.toLocaleString()}</div><div class="stat-card__label">Active Matches</div></div>`;
  } catch {
    el.innerHTML = `
      <div class="stat-card glass-card"><div class="stat-card__value">—</div><div class="stat-card__label">Total Users</div></div>
      <div class="stat-card glass-card"><div class="stat-card__value">—</div><div class="stat-card__label">Skills Exchanged</div></div>
      <div class="stat-card glass-card"><div class="stat-card__value">—</div><div class="stat-card__label">Active Matches</div></div>`;
  }
}

async function loadCategories() {
  const el = document.getElementById('category-pills');
  try {
    const { categories: cats } = await categories.list();
    el.innerHTML = cats.map((c) =>
      `<a href="/marketplace.html?category=${c.slug}" class="category-pill"><span aria-hidden="true">${c.icon || '📚'}</span> ${c.name}</a>`
    ).join('');
  } catch {
    el.innerHTML = '<a href="/marketplace.html" class="category-pill">View Marketplace</a>';
  }
}

document.getElementById('carousel-prev')?.addEventListener('click', () => {
  document.getElementById('featured-carousel')?.scrollBy({ left: -320, behavior: 'smooth' });
});
document.getElementById('carousel-next')?.addEventListener('click', () => {
  document.getElementById('featured-carousel')?.scrollBy({ left: 320, behavior: 'smooth' });
});

loadFeatured();
loadStats();
loadCategories();
initNodeGraph('hero-node-graph');
