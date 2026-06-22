export function getToken() {
  return localStorage.getItem('skillswap-token');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('skillswap-user') || 'null');
  } catch {
    return null;
  }
}

export function setAuth(token, user) {
  localStorage.setItem('skillswap-token', token);
  localStorage.setItem('skillswap-user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('skillswap-token');
  localStorage.removeItem('skillswap-user');
}

export function isLoggedIn() {
  return !!getToken();
}

export function isAdmin() {
  return getUser()?.role === 'ADMIN';
}

export function requireAuth(redirectTo = '/login.html') {
  if (!isLoggedIn()) {
    window.location.href = `${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`;
    return false;
  }
  return true;
}

export function logout() {
  clearAuth();
  window.location.href = '/index.html';
}
