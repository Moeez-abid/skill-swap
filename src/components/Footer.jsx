import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="nav-logo">SkillSwap</span>
          <p>Teach what you know. Learn what you need. No money, just skills.</p>
        </div>
        <div className="footer-links">
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/register">Join Free</Link>
        </div>
      </div>
      <p className="footer-copy">&copy; {new Date().getFullYear()} SkillSwap. Educational barter economy.</p>
    </footer>
  );
}
