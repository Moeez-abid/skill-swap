import { initApp, skillCardHtml } from '../app.js';
import { skills, categories } from '../shared/api.js';

initApp('marketplace');

const grid = document.getElementById('skills-grid');
const pagination = document.getElementById('pagination');
const resultsCount = document.getElementById('results-count');
const filters = { category: '', level: '', sort: 'newest', page: 1 };

async function loadCategories() {
  const select = document.getElementById('filter-category');
  try {
    const { categories: cats } = await categories.list();
    cats.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.slug;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  } catch { /* offline */ }
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('category')) filters.category = params.get('category');
}

async function loadSkills() {
  grid.innerHTML = '<p class="loading">Loading skills…</p>';
  const query = { page: filters.page, limit: 12, sort: filters.sort };
  if (filters.category) query.category = filters.category;
  if (filters.level) query.level = filters.level;

  try {
    const data = await skills.list(query);
    resultsCount.textContent = `${data.pagination.total} skill${data.pagination.total !== 1 ? 's' : ''} found`;
    if (!data.skills.length) {
      grid.innerHTML = '<div class="empty-state"><h3>No skills found</h3><p>Try adjusting your filters or list your own skill.</p></div>';
      pagination.innerHTML = '';
      return;
    }
    grid.innerHTML = data.skills.map((s) => skillCardHtml(s)).join('');
    renderPagination(data.pagination);
  } catch {
    grid.innerHTML = '<div class="empty-state"><h3>Unable to load marketplace</h3><p>Make sure the backend is running on port 3001.</p></div>';
  }
}

function renderPagination(p) {
  pagination.innerHTML = '';
  const prev = document.createElement('button');
  prev.textContent = '←';
  prev.disabled = p.page <= 1;
  prev.addEventListener('click', () => { filters.page--; loadSkills(); });
  pagination.appendChild(prev);

  for (let i = 1; i <= p.totalPages && i <= 7; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === p.page) btn.classList.add('active');
    btn.addEventListener('click', () => { filters.page = i; loadSkills(); });
    pagination.appendChild(btn);
  }

  const next = document.createElement('button');
  next.textContent = '→';
  next.disabled = p.page >= p.totalPages;
  next.addEventListener('click', () => { filters.page++; loadSkills(); });
  pagination.appendChild(next);
}

document.getElementById('filter-category')?.addEventListener('change', (e) => {
  filters.category = e.target.value;
  filters.page = 1;
  loadSkills();
});
document.getElementById('filter-level')?.addEventListener('change', (e) => {
  filters.level = e.target.value;
  filters.page = 1;
  loadSkills();
});
document.getElementById('filter-sort')?.addEventListener('change', (e) => {
  filters.sort = e.target.value;
  filters.page = 1;
  loadSkills();
});

getParams();
loadCategories().then(() => {
  const catSelect = document.getElementById('filter-category');
  if (filters.category && catSelect) catSelect.value = filters.category;
  loadSkills();
});
