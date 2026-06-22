import { getUser, isLoggedIn, isAdmin, logout } from './auth.js';

export const THEME_SCRIPT = `(function(){var t=localStorage.getItem('skillswap-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;})();`;

export function renderNavbar(activePage = '') {
  const user = getUser();
  const loggedIn = isLoggedIn();

  const links = loggedIn
    ? [
        { href: '/index.html', label: 'Home', id: 'home' },
        { href: '/marketplace.html', label: 'Marketplace', id: 'marketplace' },
        { href: '/search.html', label: 'Search', id: 'search' },
        { href: '/dashboard.html', label: 'Dashboard', id: 'dashboard' },
        { href: '/matches.html', label: 'Matches', id: 'matches' },
        { href: '/messages.html', label: 'Messages', id: 'messages' },
        { href: '/sessions.html', label: 'Sessions', id: 'sessions' },
        { href: '/settings.html', label: 'Settings', id: 'settings' },
      ]
    : [
        { href: '/index.html', label: 'Home', id: 'home' },
        { href: '/marketplace.html', label: 'Marketplace', id: 'marketplace' },
        { href: '/search.html', label: 'Search', id: 'search' },
      ];

  if (isAdmin()) {
    links.push({ href: '/admin.html', label: 'Admin', id: 'admin' });
  }

  const navLinks = links
    .map((l) => `<a href="${l.href}" ${l.id === activePage ? 'class="active" aria-current="page"' : ''}>${l.label}</a>`)
    .join('');

  function generateAvatar(u) {
    const initials = (u?.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2);
    if (u?.avatarUrl) {
      return `<img src="${u.avatarUrl}" alt="${u.name}" class="avatar nav-avatar" width="36" height="36" />`;
    }
    return `<span class="avatar avatar--initials nav-avatar" style="width:36px;height:36px;font-size:14px;cursor:pointer;" aria-hidden="true">${initials}</span>`;
  }

  const authButtons = loggedIn
    ? `<div class="nav-profile-dropdown">
         <button class="nav-profile-trigger" aria-haspopup="true" aria-label="Open profile menu">
           ${generateAvatar(user)}
         </button>
         <div class="nav-profile-menu">
           <div class="nav-profile-info">
             <strong>${user?.name || 'User'}</strong>
             <span>${user?.email || ''}</span>
           </div>
           <a href="/profile.html">My Profile</a>
           <a href="/settings.html">Settings</a>
           <button type="button" data-logout>Log out</button>
         </div>
       </div>`
    : `<a href="/login.html" class="nav-btn nav-btn--ghost">Log in</a>
       <a href="/register.html" class="nav-btn">Sign up</a>`;

  return `
    <div class="bg-glow" aria-hidden="true">
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
    </div>
    <nav class="navbar" aria-label="Main navigation">
      <a href="/index.html" class="nav-logo">SkillSwap</a>
      <div class="nav-links">${navLinks}</div>
      <div class="nav-actions">
        <button type="button" class="theme-toggle" data-theme-toggle aria-pressed="false" aria-label="Switch to night mode">
          <svg class="theme-icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg class="theme-icon-moon" hidden xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        ${authButtons}
      </div>
    </nav>`;
}

export function mountLayout(activePage) {
  const header = document.getElementById('app-header');
  if (header) header.innerHTML = renderNavbar(activePage);

  document.querySelector('[data-logout]')?.addEventListener('click', logout);
}

export function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="nav-logo">SkillSwap</span>
          <p>Teach what you know. Learn what you need. No money, just skills.</p>
        </div>
        <div class="footer-links">
          <a href="/marketplace.html">Marketplace</a>
          <a href="/search.html">Search</a>
          <a href="/register.html">Join Free</a>
        </div>
      </div>
      <p class="footer-copy">&copy; ${new Date().getFullYear()} SkillSwap. Educational barter economy.</p>
    </footer>`;
}

export function mountFooter() {
  const el = document.getElementById('app-footer');
  if (el) el.innerHTML = renderFooter();
}
