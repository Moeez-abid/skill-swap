import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboard, subscribeToUserEvents, skills } from '../shared/api';
import { isLoggedIn, getUser } from '../shared/auth';
import SkillCard from '../components/SkillCard';

function Avatar({ user, size = 36 }) {
  const initials = (user?.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2);
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className="avatar" width={size} height={size} />;
  }
  return (
    <span className="avatar avatar--initials" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const [data, setData] = useState(null);
  const [mySkills, setMySkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: direction * 320, behavior: 'smooth' });
    }
  };

  const handleDeleteSkill = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this skill?')) {
      try {
        await skills.delete(id);
        loadDashboard();
      } catch (e) {
        alert(e.message || 'Failed to delete skill');
      }
    }
  };

  const loadDashboard = async () => {
    try {
      const user = getUser();
      const [res, skillsRes] = await Promise.all([
        dashboard.get(),
        skills.list({ provider: user.id })
      ]);
      setData(res.dashboard);
      setMySkills(skillsRes.skills || []);
      setError(false);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
    
    loadDashboard();

    const user = getUser();
    const unsubscribe = subscribeToUserEvents(user.id, 'new-message', () => {
      loadDashboard();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigate]);

  if (error) return <div style={{ paddingTop: '130px', paddingBottom: '64px' }}><div className="empty-state"><h3>Dashboard unavailable</h3><p>Start the backend to load your dashboard.</p></div></div>;

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px' }}>
      <div className="page-header animate-fade-up" style={{ marginBottom: '32px' }}>
        <h1 className="page-title">Welcome back, {getUser()?.name?.split(' ')[0] || 'User'}!</h1>
        <p className="page-subtitle" style={{ fontSize: '1.1rem' }}>Here is what's happening with your skills and swaps right now.</p>
      </div>
      
      {loading || !data ? (
        <p className="loading animate-fade-up delay-1">Loading dashboard…</p>
      ) : (() => {
        const { overview, pendingActions, upcomingSessions, unreadMessages } = data;
        return (
        <>
        <div className="dashboard-grid animate-fade-up delay-1">
          
        <section className="quick-actions" style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', justifyContent: 'flex-end' }}>
          <button className="primary-cta" style={{ flex: '0 1 auto', padding: '10px 20px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => navigate('/marketplace')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
            Find Skills
          </button>
          <button className="primary-cta" style={{ flex: '0 1 auto', padding: '10px 20px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => navigate('/create-skill')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Teach a Skill
          </button>
        </section>

        <div className="overview-cards" style={{ gridColumn: '1 / -1' }}>
          <div className="stat-card glass-card">
            <div className="stat-card__value">{overview.totalSkills}</div>
            <div className="stat-card__label">Your Skills</div>
          </div>
          <div className="stat-card glass-card">
            <div className="stat-card__value">{overview.activeMatches}</div>
            <div className="stat-card__label">Active Matches</div>
          </div>
          <div className="stat-card glass-card">
            <div className="stat-card__value">{overview.avgRating || '—'}</div>
            <div className="stat-card__label">Avg Rating</div>
          </div>
          {pendingActions > 0 && (
            <div className="stat-card glass-card" style={{ borderColor: 'var(--accent)' }}>
              <div className="stat-card__value">{pendingActions}</div>
              <div className="stat-card__label">Pending Requests</div>
            </div>
          )}
        </div>

        <section className="glass-card" style={{ padding: '24px', marginTop: '24px' }}>
          <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Upcoming Sessions (7 days)</h2>
          {upcomingSessions.length > 0 ? (
            <div className="session-list">
              {upcomingSessions.map((s, i) => (
                <div key={i} className="session-item glass-card">
                  <div>
                    <div className="session-item__time">{new Date(s.scheduledStart).toLocaleString()}</div>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      with {s.partner?.name} &middot; {s.durationMinutes} min
                    </span>
                  </div>
                  <span className="badge">{s.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No upcoming sessions</p>
          )}
        </section>

        <section className="glass-card" style={{ padding: '24px', marginTop: '24px' }}>
          <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Recent Unread Messages</h2>
          {unreadMessages.length > 0 ? (
            unreadMessages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <Avatar user={m.sender} size={36} />
                <div>
                  <strong>{m.sender.name}</strong>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{m.content || 'Attachment'}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">No unread messages</p>
          )}
          <Link to="/messages" className="btn-secondary" style={{ marginTop: '16px', display: 'inline-flex' }}>
            Open Messages
          </Link>
        </section>

        <section style={{ marginBottom: '32px', marginTop: '32px', gridColumn: '1 / -1' }}>
          <h2 className="section-title" style={{ textAlign: 'left', fontSize: '1.5rem', margin: 0, marginBottom: '16px' }}>My Skills</h2>
          <div className="skills-grid">
            {mySkills.length > 0 ? (
              mySkills.map(s => (
                <SkillCard 
                  key={s.id} 
                  skill={s} 
                  actions={
                    <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
                      <button 
                        onClick={(e) => { e.preventDefault(); navigate(`/create-skill?id=${s.id}`); }}
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); handleDeleteSkill(s.id); }}
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444' }}
                      >
                        Delete
                      </button>
                    </div>
                  }
                />
              ))
            ) : (
              <p className="empty-state" style={{ gridColumn: '1 / -1', padding: '24px 0' }}>You haven't listed any skills yet.</p>
            )}
          </div>
        </section>


      </div>

      {pendingActions > 0 && (
        <div className="toast toast--info toast--visible" role="status">
          You have {pendingActions} pending match request(s)
        </div>
      )}
      </>
      )})()}
    </div>
  );
}
