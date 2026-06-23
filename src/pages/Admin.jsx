import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { admin } from '../shared/api';
import { isLoggedIn, isAdmin } from '../shared/auth';

export default function Admin() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [flags, setFlags] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [analyticsRes, usersRes, flagsRes] = await Promise.all([
        admin.analytics(),
        admin.users(),
        admin.moderation(),
      ]);
      setAnalytics(analyticsRes.analytics);
      setUsers(usersRes.users);
      setFlags(flagsRes.flags);
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
    if (!isAdmin()) {
      navigate('/dashboard');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleSuspend = async (userId) => {
    try {
      await admin.suspendUser(userId, 'Admin action');
      showToast('User suspended');
      loadData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleResolveFlag = async (flagId, status) => {
    try {
      await admin.resolveFlag(flagId, status);
      showToast('Flag updated');
      loadData();
    } catch (err) {
      showToast(err.message);
    }
  };

  if (error) return <div style={{ paddingTop: '100px', paddingBottom: '64px' }}><div className="empty-state"><h3>Admin panel unavailable</h3></div></div>;

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '64px' }}>
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Platform analytics, user management, and moderation queue.</p>
      </div>

      {loading || !analytics ? (
        <p className="loading">Loading admin panel…</p>
      ) : (
        <>
      <div className="admin-grid animate-fade-up delay-1" style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card glass-card">
          <div className="stat-card__value">{analytics.users.total}</div>
          <div className="stat-card__label">Total Users (+{analytics.users.growth30d} / 30d)</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-card__value">{analytics.skills.total}</div>
          <div className="stat-card__label">Skills (+{analytics.skills.created30d} / 30d)</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-card__value">{analytics.matches.active}</div>
          <div className="stat-card__label">Active Matches</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-card__value">{analytics.matches.completed}</div>
          <div className="stat-card__label">Completed Swaps</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-card__value">{analytics.moderation.pendingFlags}</div>
          <div className="stat-card__label">Pending Flags</div>
        </div>
      </div>

      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>User Management</h2>
        <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>Role</th>
                <th style={{ padding: '12px' }}>Skills</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border-subtle)' }}>
                  <td style={{ padding: '12px' }}>{u.name}</td>
                  <td style={{ padding: '12px' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>{u.role}</td>
                  <td style={{ padding: '12px' }}>{u._count.skills}</td>
                  <td style={{ padding: '12px' }}>{u.isSuspended ? 'Suspended' : 'Active'}</td>
                  <td style={{ padding: '12px' }}>
                    {!u.isSuspended && u.role !== 'ADMIN' && (
                      <button className="btn-secondary" onClick={() => handleSuspend(u.id)}>Suspend</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card animate-fade-up delay-3" style={{ padding: '24px', marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Moderation Queue</h2>
        {flags.length > 0 ? (
          flags.map(f => (
            <div key={f.id} className="match-card" style={{ marginBottom: '12px', padding: '16px', border: '1px solid var(--glass-border-subtle)', borderRadius: '12px' }}>
              <p><strong>{f.targetType}</strong> &middot; {f.reason}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Reported by {f.reporter.name}</p>
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" onClick={() => handleResolveFlag(f.id, 'RESOLVED')}>Resolve</button>
                <button className="btn-secondary" onClick={() => handleResolveFlag(f.id, 'DISMISSED')}>Dismiss</button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">Queue empty</p>
        )}
      </section>

      {toastMsg && (
        <div className="toast toast--info toast--visible" role="status">
          {toastMsg}
        </div>
      )}
      </>
      )}
    </div>
  );
}
