import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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
// We will import others as we build them

export default function App() {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
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
          {/* We will add routes here as we migrate them */}
          <Route path="*" element={<div className="empty-state"><h3>Page not found</h3></div>} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}
