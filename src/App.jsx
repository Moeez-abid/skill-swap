import React, { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';

// Pages
import Home from './pages/Home.jsx';
import Auth from './pages/Auth.jsx';
import Marketplace from './pages/Marketplace.jsx';
import SkillDetail from './pages/SkillDetail.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Messages from './pages/Messages.jsx';
import Settings from './pages/Settings.jsx';
import CreateSkill from './pages/CreateSkill.jsx';
import Matches from './pages/Matches.jsx';
import Sessions from './pages/Sessions.jsx';
import Reviews from './pages/Reviews.jsx';
import Admin from './pages/Admin.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import SuccessStories from './pages/SuccessStories.jsx';
import { isAdmin } from './shared/auth.js';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Route guarding for Admin isolation
    if (isAdmin() && location.pathname !== '/admin' && location.pathname !== '/login') {
      navigate('/admin', { replace: true });
    } else if (!isAdmin() && location.pathname === '/admin') {
      navigate('/', { replace: true });
    }

    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location.pathname, navigate]);

  return (
    <>
      <div className="bg-ambient-layer" aria-hidden="true">
        <div className="bg-grid-overlay"></div>
        <div className="glow-orb orb-top-left"></div>
        <div className="glow-orb orb-top-right"></div>
        <div className="glow-orb orb-mid-left"></div>
        <div className="glow-orb orb-center"></div>
        <div className="glow-orb orb-bottom-right"></div>
      </div>

      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header id="app-header">
        <Navbar />
      </header>
      
      <main id="main-content" className="main-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth isRegister={true} />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/skill-detail" element={<SkillDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/create-skill" element={<CreateSkill />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/success-stories" element={<SuccessStories />} />
          <Route path="*" element={<div className="empty-state"><h3>Page not found</h3></div>} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}
