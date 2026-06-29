import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { isLoggedIn, getUser, logout, isAdmin } from '../shared/auth';
import { getImageUrl } from '../shared/api';
import NotificationsDropdown from './NotificationsDropdown';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('skillswap-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  useEffect(() => {
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
  if (isAdmin()) {
    links = [
      { href: '/admin', label: 'Admin Dashboard' }
    ];
  } else {
    links = loggedIn && user
      ? [
          { href: '/', label: 'Home' },
          { href: '/marketplace', label: 'Marketplace' },
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/matches', label: 'Matches' },
          { href: '/messages', label: 'Messages' },
          { href: '/sessions', label: 'Sessions' },
          { href: '/settings', label: 'Settings' },
        ]
      : [
          { href: '/', label: 'Home' },
          { href: '/marketplace', label: 'Marketplace' },
        ];
  }

  function getInitials(name) {
    return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2);
  }

  return (
    <>
      <nav className="navbar" aria-label="Main navigation">
        <Link to="/" className="nav-logo">SkillSwap</Link>
        <div className="nav-links">
          {links.map(l => (
            <Link 
              key={l.href} 
              to={l.href} 
              className={currentPath === l.href || (currentPath === '/' && l.href === '/index.html') ? 'active' : ''}
              aria-current={currentPath === l.href ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-pressed={theme === 'dark'} aria-label="Switch to night mode">
            {theme === 'light' ? (
              <svg className="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg className="theme-icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>
          
          {loggedIn && user ? (
            isAdmin() ? (
              <button type="button" onClick={handleLogout} className="nav-btn nav-btn--ghost" style={{ marginLeft: '12px' }}>Log out</button>
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-blue)' }}>
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                        )}
                      </strong>
                      <span>{user.email || ''}</span>
                    </div>
                    <Link to="/profile">My Profile</Link>
                    <Link to="/settings">Settings</Link>
                    <button type="button" onClick={handleLogout}>Log out</button>
                  </div>
                </div>
              </>
            )
          ) : (
            <>
              <Link to="/login" className="nav-btn nav-btn--ghost">Log in</Link>
              <Link to="/register" className="nav-btn">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
