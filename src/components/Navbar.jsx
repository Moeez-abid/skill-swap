import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { isLoggedIn, getUser, logout, isAdmin, isSuperAdmin } from '../shared/auth';
import { getImageUrl } from '../shared/api';
import NotificationsDropdown from './NotificationsDropdown';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('skillswap-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false); // Close menu on route change
    const handleAuthChange = () => {
      setLoggedIn(isLoggedIn());
      if (isLoggedIn()) {
        setUser(getUser());
      }
    };
    handleAuthChange();

    window.addEventListener('user-updated', handleAuthChange);
    return () => window.removeEventListener('user-updated', handleAuthChange);
  }, [location.pathname]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('skillswap-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.documentElement.style.colorScheme = newTheme;
  };

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    setLoggedIn(false);
    setUser(null);
    window.location.href = '/';
  };

  const currentPath = location.pathname;

  let links = [];
  if (currentPath.startsWith('/admin') || (isSuperAdmin() && currentPath === '/groups')) {
    const userRole = getUser()?.role;
    if (userRole === 'MANAGER') {
      links = [
        { href: '/admin?tab=users', label: 'Users' },
        { href: '/admin?tab=groups', label: 'Groups' },
        { href: '/admin?tab=support', label: 'Support' },
        { href: '/admin?tab=blogs', label: 'Blogs' }
      ];
    } else {
      links = [
        { href: '/admin?tab=analytics', label: 'Overview' },
        { href: '/admin?tab=users', label: 'Users' },
        { href: '/admin?tab=groups', label: 'Groups' },
        { href: '/admin?tab=disputes', label: 'Disputes' },
        { href: '/admin?tab=moderation', label: 'Moderation' },
        { href: '/admin?tab=audit', label: 'Audit Logs' },
        { href: '/admin?tab=support', label: 'Support' },
        { href: '/admin?tab=blogs', label: 'Blogs' }
      ];
    }
  } else {
    if (loggedIn && user && isSuperAdmin()) {
      links = [
        { href: '/groups', label: 'Groups' },
        { href: '/blogs', label: 'Blogs' },
        { href: '/admin', label: 'Admin Panel' }
      ];
    } else {
      links = loggedIn && user
        ? [
          { href: '/', label: 'Home' },
          { href: '/marketplace', label: 'Marketplace' },
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/blogs', label: 'Blogs' },
          { href: '/groups', label: 'Groups' },
          { href: '/matches', label: 'Matches' },
          { href: '/messages', label: 'Messages' },
          { href: '/sessions', label: 'Sessions' },
        ]
        : [
          { href: '/', label: 'Home' },
          { href: '/marketplace', label: 'Marketplace' },
          { href: '/blogs', label: 'Blogs' },
          { href: '/about', label: 'About Us' },
          { href: '/success-stories', label: 'Success Stories' },
          { href: '/contact', label: 'Contact Us' },
        ];

      if (loggedIn && user && isAdmin()) {
        links.push({ href: '/admin', label: 'Admin Panel' });
      }
    }
  }

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'analytics';

  const isActive = (l) => {
    if (l.href.startsWith('/admin?tab=')) {
      const tab = new URLSearchParams(l.href.split('?')[1]).get('tab');
      if (tab === 'groups' && location.pathname === '/groups') {
        return true;
      }
      return location.pathname === '/admin' && currentTab === tab;
    }
    return location.pathname === l.href || (location.pathname === '/' && l.href === '/index.html');
  };

  const handleReturnToAdmin = () => {
    const originalToken = localStorage.getItem('skillswap-original-token');
    const originalUser = localStorage.getItem('skillswap-original-user');
    if (originalToken && originalUser) {
      localStorage.setItem('skillswap-token', originalToken);
      localStorage.setItem('skillswap-user', originalUser);
      localStorage.removeItem('skillswap-original-token');
      localStorage.removeItem('skillswap-original-user');
      window.location.href = '/admin?tab=users';
    }
  };

  const isImpersonating = !!localStorage.getItem('skillswap-original-token');

  function getInitials(name) {
    return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2);
  }

  return (
    <>
      {isImpersonating && (
        <div style={{
          background: 'var(--accent)',
          color: 'white',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100
        }}>
          <span>You are viewing as <strong>{user?.name}</strong> (Impersonating)</span>
          <button 
            type="button" 
            onClick={handleReturnToAdmin} 
            style={{
              background: 'white',
              color: 'var(--accent)',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Return to Admin
          </button>
        </div>
      )}
      <nav className="navbar" aria-label="Main navigation">
        <Link to="/" className="nav-logo">SkillSwap</Link>

        <div className="nav-links">
          {links.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={isActive(l) ? 'active' : ''}
              aria-current={isActive(l) ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-pressed={theme === 'dark'} aria-label="Switch to night mode">
            {theme === 'light' ? (
              <svg className="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg className="theme-icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          {loggedIn && user ? (
            isSuperAdmin() ? (
              <button type="button" onClick={handleLogout} className="nav-btn nav-btn--ghost hide-on-mobile" style={{ marginLeft: '12px' }}>Log out</button>
            ) : (
              <>
                <NotificationsDropdown />
                <div className="nav-profile-dropdown">
                  <button className="nav-profile-trigger" aria-haspopup="true" aria-label="Open profile menu">
                    {user.avatarUrl ? (
                      <img src={getImageUrl(user.avatarUrl)} alt={user.name} className="avatar nav-avatar" width="36" height="36" style={{ objectFit: 'cover' }} />
                    ) : (
                      <span className="avatar avatar--initials nav-avatar" style={{ width: '36px', height: '36px', fontSize: '14px', cursor: 'pointer' }} aria-hidden="true">
                        {getInitials(user.name)}
                      </span>
                    )}
                  </button>
                  <div className="nav-profile-menu">
                    <div className="nav-profile-info">
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {user.name || 'User'}
                        {user.isVerified && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                        )}
                      </strong>
                      <span>{user.email || ''}</span>
                    </div>
                    <Link to="/profile">My Profile</Link>
                    {isAdmin() && <Link to="/admin">Admin Panel</Link>}
                    <Link to="/settings">Settings</Link>
                    <Link to="/settings/notifications">Notification Settings</Link>
                    <button type="button" onClick={handleLogout}>Log out</button>
                  </div>
                </div>
              </>
            )
          ) : (
            <>
              <Link to="/login" className="nav-btn nav-btn--ghost hide-on-mobile">Log in</Link>
              <Link to="/register" className="nav-btn hide-on-mobile">Sign up</Link>
            </>
          )}

          <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(true)} aria-label="Open menu" aria-expanded={isMenuOpen}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      {isMenuOpen && (
        <div className="mobile-sidebar-overlay animate-fade-in" onClick={() => setIsMenuOpen(false)} aria-hidden="true" />
      )}

      {/* Mobile Sidebar */}
      <aside className={`mobile-sidebar ${isMenuOpen ? 'open' : ''}`} aria-label="Mobile navigation">
        <div className="mobile-sidebar-header">
          <span className="nav-logo">SkillSwap Menu</span>
          <button className="mobile-sidebar-close" onClick={() => setIsMenuOpen(false)} aria-label="Close menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="mobile-sidebar-links">
          {links.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={isActive(l) ? 'active' : ''}
              aria-current={isActive(l) ? 'page' : undefined}
              onClick={() => setIsMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin() && (
            <Link to="/admin" className={currentPath === '/admin' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Admin Dashboard</Link>
          )}

          <div className="mobile-sidebar-auth" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loggedIn && user ? (
              <>
                <Link to="/profile" className="nav-btn nav-btn--ghost" onClick={() => setIsMenuOpen(false)} style={{ justifyContent: 'center' }}>My Profile</Link>
                <Link to="/settings" className="nav-btn nav-btn--ghost" onClick={() => setIsMenuOpen(false)} style={{ justifyContent: 'center' }}>Settings</Link>
                <Link to="/settings/notifications" className="nav-btn nav-btn--ghost" onClick={() => setIsMenuOpen(false)} style={{ justifyContent: 'center' }}>Notification Settings</Link>
                <button type="button" onClick={(e) => { handleLogout(e); setIsMenuOpen(false); }} className="btn-secondary" style={{ width: '100%', padding: '12px' }}>Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-btn nav-btn--ghost" onClick={() => setIsMenuOpen(false)} style={{ justifyContent: 'center' }}>Log in</Link>
                <Link to="/register" className="nav-btn" onClick={() => setIsMenuOpen(false)} style={{ justifyContent: 'center' }}>Sign up</Link>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
