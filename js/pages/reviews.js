import { initApp, starsHtml, showToast, showError } from '../app.js';
import { requireAuth } from '../shared/auth.js';
import { reviews } from '../shared/api.js';

if (!requireAuth()) throw new Error('auth');
initApp('dashboard');

document.getElementById('review-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById('form-error');
  errEl.hidden = true;
  const sessionId = form.sessionId.value;
  if (!sessionId) { showError(errEl, 'Enter a session ID'); return; }

  try {
    await reviews.create(sessionId, {
      ratingOverall: parseInt(form.ratingOverall.value, 10),
      ratingTeaching: parseInt(form.ratingTeaching.value, 10),
      ratingCommunication: parseInt(form.ratingCommunication.value, 10),
      ratingPunctuality: parseInt(form.ratingPunctuality.value, 10),
      feedback: form.feedback.value,
    });
    showToast('Review submitted. It will reveal when both parties submit.');
    form.reset();
  } catch (err) { showError(errEl, err.message); }
});

function starSelect(name) {
  return `<select name="${name}" required>${[1,2,3,4,5].map((n) => `<option value="${n}">${n} star${n>1?'s':''}</option>`).join('')}</select>`;
}

document.getElementById('rating-fields').innerHTML = `
  <div class="form-row"><div class="form-group"><label>Overall</label>${starSelect('ratingOverall')}</div><div class="form-group"><label>Teaching</label>${starSelect('ratingTeaching')}</div></div>
  <div class="form-row"><div class="form-group"><label>Communication</label>${starSelect('ratingCommunication')}</div><div class="form-group"><label>Punctuality</label>${starSelect('ratingPunctuality')}</div></div>`;
