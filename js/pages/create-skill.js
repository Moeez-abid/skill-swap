import { initApp, showToast, showError } from '../app.js';
import { requireAuth } from '../shared/auth.js';
import { skills, categories } from '../shared/api.js';

if (!requireAuth()) throw new Error('auth');
initApp('marketplace');

const form = document.getElementById('create-skill-form');
const subSelect = document.getElementById('subcategory');
let categoryMap = {};

async function loadCategories() {
  const select = document.getElementById('category');
  const { categories: cats } = await categories.list();
  cats.forEach((c) => {
    categoryMap[c.id] = c;
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

document.getElementById('category')?.addEventListener('change', (e) => {
  subSelect.innerHTML = '<option value="">Select subcategory</option>';
  const cat = categoryMap[e.target.value];
  cat?.subcategories?.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    subSelect.appendChild(opt);
  });
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('form-error');
  errEl.hidden = true;

  const durations = [...form.querySelectorAll('input[name="duration"]:checked')].map((el) => parseInt(el.value, 10));
  if (!durations.length) { showError(errEl, 'Select at least one session duration'); return; }

  const fd = new FormData();
  fd.append('title', form.title.value);
  fd.append('categoryId', form.category.value);
  fd.append('subcategoryId', form.subcategory.value);
  fd.append('level', form.level.value);
  fd.append('shortDescription', form.shortDescription.value);
  fd.append('fullDescription', form.fullDescription.value);
  fd.append('learningOutcomes', form.learningOutcomes.value);
  if (form.prerequisites.value) fd.append('prerequisites', form.prerequisites.value);
  fd.append('sessionDurations', JSON.stringify(durations));
  const tags = form.tags.value.split(',').map((t) => t.trim()).filter(Boolean);
  fd.append('tags', JSON.stringify(tags));
  if (form.coverImage.files[0]) fd.append('coverImage', form.coverImage.files[0]);

  try {
    const { skill } = await skills.create(fd);
    showToast('Skill listed successfully!');
    window.location.href = `/skill-detail.html?id=${skill.id}`;
  } catch (err) {
    showError(errEl, err.message);
  }
});

loadCategories().catch(() => showError(document.getElementById('form-error'), 'Could not load categories'));
