import { initApp, showToast, showError } from '../app.js';
import { requireAuth, clearAuth } from '../shared/auth.js';
import { auth, users } from '../shared/api.js';

if (!requireAuth()) throw new Error('auth');
initApp('dashboard');

async function loadSettings() {
  try {
    const { user } = await auth.me();
    const form = document.getElementById('settings-form');
    form.name.value = user.name || '';
    form.bio.value = user.bio || '';
    form.location.value = user.location || '';
    form.timezone.value = user.timezone || 'UTC';
    form.availabilityStatus.value = user.availabilityStatus || 'AVAILABLE';
    form.notifyMatches.checked = user.notifyMatches;
    form.notifyMessages.checked = user.notifyMessages;
    form.notifySessions.checked = user.notifySessions;
  } catch { /* offline */ }
}

document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    await users.update({
      name: form.name.value,
      bio: form.bio.value,
      location: form.location.value,
      timezone: form.timezone.value,
      availabilityStatus: form.availabilityStatus.value,
      notifyMatches: form.notifyMatches.checked,
      notifyMessages: form.notifyMessages.checked,
      notifySessions: form.notifySessions.checked,
    });
    showToast('Settings saved');
  } catch (err) { showError(document.getElementById('form-error'), err.message); }
});

document.getElementById('password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    await users.updatePassword({
      currentPassword: form.currentPassword.value,
      newPassword: form.newPassword.value,
    });
    showToast('Password updated');
    form.reset();
  } catch (err) { showError(document.getElementById('pw-error'), err.message); }
});

document.getElementById('delete-account')?.addEventListener('click', async () => {
  if (!confirm('Permanently delete your account? This cannot be undone.')) return;
  await users.deleteAccount();
  clearAuth();
  window.location.href = '/index.html';
});

loadSettings();
