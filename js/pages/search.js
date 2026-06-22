import { initApp, skillCardHtml } from '../app.js';
import { skills, categories } from '../shared/api.js';

initApp('search');

const grid = document.getElementById('skills-grid');
const resultsCount = document.getElementById('results-count');
let viewMode = 'grid';

async function loadCategories() {
  const container = document.getElementById('filter-categories');
  try {
    const { categories: cats } = await categories.list();
    container.innerHTML = cats.map((c) =>
      `<label><input type="checkbox" name="category" value="${c.slug}" data-label="${c.name}" /> ${c.name}</label>`
    ).join('');
    setupMultiSelect('ms-categories', 'Any Category');
  } catch { container.innerHTML = '<p class="form-hint" style="padding:8px">Categories unavailable</p>'; }
}

function getFilters() {
  const q = document.getElementById('search-q').value.trim();
  const categories = [...document.querySelectorAll('input[name="category"]:checked')].map((el) => el.value);
  const levels = [...document.querySelectorAll('input[name="level"]:checked')].map((el) => el.value);
  const location = document.getElementById('filter-location').value.trim();
  const minRating = document.getElementById('filter-rating').value;
  const params = { page: 1, limit: 12, sort: document.getElementById('filter-sort').value };
  if (q) params.q = q;
  if (categories.length) params.categories = categories.join(',');
  if (levels.length) params.levels = levels.join(',');
  if (location) params.location = location;
  if (minRating) params.minRating = minRating;
  return params;
}

async function search() {
  grid.innerHTML = '<p class="loading">Searching…</p>';
  grid.className = viewMode === 'list' ? 'skills-grid skills-grid--list' : 'skills-grid';
  try {
    const data = await skills.list(getFilters());
    resultsCount.textContent = `${data.pagination.total} result${data.pagination.total !== 1 ? 's' : ''}`;
    grid.innerHTML = data.skills.length
      ? data.skills.map((s) => skillCardHtml(s)).join('')
      : '<div class="empty-state"><h3>No results</h3><p>Try different keywords or filters.</p></div>';
  } catch {
    grid.innerHTML = '<div class="empty-state"><h3>Search unavailable</h3><p>Start the backend to search skills.</p></div>';
  }
}

document.getElementById('search-form')?.addEventListener('submit', (e) => { e.preventDefault(); search(); });
document.getElementById('view-grid')?.addEventListener('click', () => { viewMode = 'grid'; document.getElementById('view-grid').classList.add('active'); document.getElementById('view-list').classList.remove('active'); search(); });
document.getElementById('view-list')?.addEventListener('click', () => { viewMode = 'list'; document.getElementById('view-list').classList.add('active'); document.getElementById('view-grid').classList.remove('active'); search(); });

function setupMultiSelect(id, defaultText) {
  const container = document.getElementById(id);
  if (!container) return;
  const header = container.querySelector('.multi-select-header');
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');

  header.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close others
    document.querySelectorAll('.multi-select').forEach(ms => {
      if (ms !== container) ms.classList.remove('open');
    });
    container.classList.toggle('open');
  });

  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = Array.from(checkboxes).filter(c => c.checked);
      if (checked.length === 0) {
        header.textContent = defaultText;
      } else if (checked.length <= 2) {
        // Use data-label if available, else standard text
        header.textContent = checked.map(c => c.dataset.label || c.nextSibling.textContent.trim()).join(', ');
      } else {
        header.textContent = `${checked.length} selected`;
      }
    });
  });
}

// Close dropdowns on outside click
document.addEventListener('click', () => {
  document.querySelectorAll('.multi-select').forEach(ms => ms.classList.remove('open'));
});

setupMultiSelect('ms-levels', 'Any Level');

loadCategories();
search();
