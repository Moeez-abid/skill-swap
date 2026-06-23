import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboard, subscribeToUserEvents } from '../shared/api';
import { isLoggedIn, getUser } from '../shared/auth';

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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadDashboard = async () => {
    try {
      const res = await dashboard.get();
      setData(res.dashboard);
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
      <div className="page-header animate-fade-up">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your personalized overview — skills, matches, sessions, and messages.</p>
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
