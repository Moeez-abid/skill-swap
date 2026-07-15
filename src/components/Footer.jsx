import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-page)', marginTop: '64px' }}>
      <div className="container" style={{ padding: '64px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '48px' }}>
        <div className="footer-brand">
          <span className="nav-logo" style={{ fontSize: '1.5rem', marginBottom: '16px', display: 'inline-block' }}>SkillSwap</span>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px', fontSize: '0.95rem' }}>
            Teach what you know. Learn what you need. No money, just skills.
          </p>
        </div>

        <div className="footer-links-col">
          <h4 style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '20px' }}>Platform</h4>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li><Link to="/marketplace" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem' }}>Marketplace</Link></li>
            <li><Link to="/groups" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem' }}>Community Groups</Link></li>
            <li><Link to="/success-stories" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem' }}>Success Stories</Link></li>
            <li><Link to="/blogs" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem' }}>Blog</Link></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <h4 style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '20px' }}>Company</h4>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li><Link to="/about" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem' }}>About Us</Link></li>
            <li><Link to="/contact" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem' }}>Contact Us</Link></li>
            <li><Link to="/register" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem' }}>Join SkillSwap</Link></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <h4 style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '20px' }}>Connect</h4>
          <ul className="social-links" style={{ display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li>
              <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease', fontSize: '0.95rem' }} aria-label="Twitter">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                <span>Twitter / X</span>
              </a>
            </li>
            <li>
              <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease', fontSize: '0.95rem' }} aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.8c0-1.2-.4-2.2-1-3 2.5-.3 5-1.2 5-5.5 0-1.2-.4-2.2-1.1-3 .1-.3.5-1.4-.1-3 0 0-1-.3-3 1.1C13.6 5.8 12.8 5.6 12 5.6c-.8 0-1.6.2-2.4.6C7.6 4.8 6.6 5.1 6.6 5.1c-.6 1.6-.2 2.7-.1 3-.7.8-1.1 1.8-1.1 3 0 4.3 2.5 5.2 5 5.5-.5.4-1 1.2-1 2.5V23"/></svg>
                <span>GitHub</span>
              </a>
            </li>
            <li>
              <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease', fontSize: '0.95rem' }} aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                <span>LinkedIn</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom" style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>&copy; {new Date().getFullYear()} SkillSwap. Built for the community.</p>
      </div>
    </footer>
  );
}
