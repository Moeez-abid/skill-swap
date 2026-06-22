import { initApp, showToast, showError } from '../app.js';
import { auth as authApi } from '../shared/api.js';
import { setAuth, isLoggedIn } from '../shared/auth.js';

const page = document.body.dataset.page;
initApp(page === 'register' ? 'register' : 'login');

if (isLoggedIn()) {
  window.location.href = '/dashboard.html';
}

const form = document.getElementById('auth-form');
const isRegister = page === 'register';

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('form-error');
  errEl.hidden = true;

  try {
    let result;
    if (isRegister) {
      result = await authApi.register(form.email.value, form.password.value, form.name.value);
    } else {
      result = await authApi.login(form.email.value, form.password.value);
    }
    setAuth(result.token, result.user);
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/dashboard.html';
    window.location.href = redirect;
  } catch (err) {
    showError(errEl, err.message);
  }
});

window.handleGoogleCredentialResponse = async (response) => {
  const errEl = document.getElementById('form-error');
  errEl.hidden = true;
  try {
    const result = await authApi.google(response.credential);
    setAuth(result.token, result.user);
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/dashboard.html';
    window.location.href = redirect;
  } catch (err) {
    showError(errEl, err.message);
  }
};

window.onload = function () {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId || typeof google === 'undefined') return;
  google.accounts.id.initialize({
    client_id: clientId,
    callback: window.handleGoogleCredentialResponse
  });
  
  const googleBtn = document.getElementById('google-btn');
  if (googleBtn) {
    google.accounts.id.renderButton(
      googleBtn,
      { theme: 'outline', size: 'large', width: '100%' }
    );
  }
};
