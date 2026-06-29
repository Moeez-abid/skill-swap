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

  if (error) return <div style={{ paddingTop: '100px', paddingBottom: '64px' }}><div className="empty-state"><h3>Dashboard unavailable</h3><p>Start the backend to load your dashboard.</p></div></div>;

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '64px' }}>
      <div className="page-header animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your personalized overview — skills, matches, sessions, and messages.</p>
        </div>
        <button className="primary-cta" onClick={() => navigate('/create-skill')}>List a Skill</button>
      </div>
      
      {loading || !data ? (
        <p className="loading animate-fade-up delay-1">Loading dashboard…</p>
      ) : (() => {
        const { overview, pendingActions, upcomingSessions, unreadMessages } = data;
        return (
        <>
        <div className="dashboard-grid animate-fade-up delay-1">
        <div className="overview-cards">
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
            <div className="stat-card glass-card" style={{ borderColor: 'var(--brand-blue)' }}>
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
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--glass-border-subtle)' }}>
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

        <section className="glass-card" style={{ padding: '24px', marginTop: '24px', gridColumn: '1 / -1', overflow: 'hidden' }}>
          <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>My Skills</h2>
          {mySkills.length > 0 ? (
            <div className="carousel">
              <div id="my-skills-carousel" className="carousel__track" role="list" ref={carouselRef}>
                {mySkills.map((s, i) => (
                  <SkillCard 
                    key={s.id} 
                    skill={s} 
                    actions={
                      <>
                        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => navigate(`/create-skill?id=${s.id}`)}>Edit</button>
                        <button className="btn-secondary" style={{ flex: 1, color: 'var(--brand-red)', borderColor: 'var(--brand-red)' }} onClick={() => handleDeleteSkill(s.id)}>Delete</button>
                      </>
                    }
                  />
                ))}
              </div>
              <div className="carousel__controls">
                <button type="button" className="carousel__btn" onClick={() => scrollCarousel(-1)} aria-label="Previous skills">&larr;</button>
                <button type="button" className="carousel__btn" onClick={() => scrollCarousel(1)} aria-label="Next skills">&rarr;</button>
              </div>
            </div>
          ) : (
            <p className="empty-state">You haven't listed any skills yet</p>
          )}
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
