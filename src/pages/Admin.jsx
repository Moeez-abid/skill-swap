import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { admin } from '../shared/api';
import { isLoggedIn, isAdmin } from '../shared/auth';

export default function Admin() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [flags, setFlags] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [resolvingDisputeId, setResolvingDisputeId] = useState(null);
  const [decisionText, setDecisionText] = useState('');
  const [winnerId, setWinnerId] = useState('');

  const [activeTab, setActiveTab] = useState('analytics');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [analyticsRes, usersRes, flagsRes, disputesRes, verificationsRes, auditRes] = await Promise.all([
        admin.analytics(),
        admin.users(),
        admin.moderation(),
        admin.disputes(),
        admin.verifications(),
        admin.auditLogs()
      ]);
      setAnalytics(analyticsRes.analytics);
      setUsers(usersRes.users);
      setFlags(flagsRes.flags);
      setDisputes(disputesRes.disputes);
      setVerifications(verificationsRes.users);
      setAuditLogs(auditRes.logs);
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

  const handleResolveDispute = async (e, disputeId) => {
    e.preventDefault();
    try {
      await admin.resolveDispute(disputeId, { decision: decisionText, winnerId });
      showToast('Dispute resolved');
      setResolvingDisputeId(null);
      loadData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleApproveVerification = async (userId) => {
    try {
      await admin.approveVerification(userId);
      showToast('User verified');
      loadData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleRejectVerification = async (userId) => {
    try {
      await admin.rejectVerification(userId);
      showToast('Verification rejected');
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
      <div className="tabs admin-tabs animate-fade-up delay-1" style={{ marginBottom: '24px', display: 'flex', gap: '16px', overflowX: 'auto', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
        <button className={`tab ${activeTab === 'analytics' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'analytics' ? '2px solid var(--brand-blue)' : 'none', fontWeight: activeTab === 'analytics' ? 600 : 400 }} onClick={() => setActiveTab('analytics')}>Overview</button>
        <button className={`tab ${activeTab === 'users' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'users' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'users' ? '2px solid var(--brand-blue)' : 'none', fontWeight: activeTab === 'users' ? 600 : 400 }} onClick={() => setActiveTab('users')}>Users</button>
        <button className={`tab ${activeTab === 'disputes' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'disputes' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'disputes' ? '2px solid var(--brand-blue)' : 'none', fontWeight: activeTab === 'disputes' ? 600 : 400 }} onClick={() => setActiveTab('disputes')}>Disputes</button>
        <button className={`tab ${activeTab === 'moderation' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'moderation' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'moderation' ? '2px solid var(--brand-blue)' : 'none', fontWeight: activeTab === 'moderation' ? 600 : 400 }} onClick={() => setActiveTab('moderation')}>Moderation</button>
        <button className={`tab ${activeTab === 'verifications' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'verifications' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'verifications' ? '2px solid var(--brand-blue)' : 'none', fontWeight: activeTab === 'verifications' ? 600 : 400 }} onClick={() => setActiveTab('verifications')}>Verifications</button>
        <button className={`tab ${activeTab === 'audit' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'audit' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'audit' ? '2px solid var(--brand-blue)' : 'none', fontWeight: activeTab === 'audit' ? 600 : 400 }} onClick={() => setActiveTab('audit')}>Audit Logs</button>
      </div>

      {activeTab === 'analytics' && (
      <div className="admin-grid animate-fade-up delay-2" style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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
      )}

      {activeTab === 'users' && (
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
              {users.filter(u => u.role !== 'ADMIN').map(u => (
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
      )}

      {activeTab === 'disputes' && (
      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Disputes</h2>
        {disputes.length > 0 ? (
          disputes.map(d => (
            <div key={d.id} className="match-card" style={{ marginBottom: '12px', padding: '16px', border: '1px solid var(--glass-border-subtle)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p><strong>Dispute #{d.id.slice(-6)}</strong> &middot; <span className={`badge ${d.status === 'RESOLVED' ? 'badge--success' : ''}`}>{d.status.replace('_', ' ')}</span></p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Created by {d.creator.name} &middot; Deadline: {new Date(d.deadline).toLocaleDateString()}</p>
                </div>
                {d.status === 'UNDER_REVIEW' && resolvingDisputeId !== d.id && (
                  <button className="primary-cta" onClick={() => {
                    setResolvingDisputeId(d.id);
                    setDecisionText('');
                    setWinnerId('');
                  }}>Resolve Dispute</button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <div style={{ flex: 1, padding: '12px', background: 'var(--glass-bg-subtle)', borderRadius: '8px' }}>
                  <strong>{d.activeMatch.user1.name}'s Stance</strong>
                  <p style={{ fontSize: '14px', marginTop: '8px', color: d.user1Stance ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {d.user1Stance || 'No stance submitted.'}
                  </p>
                </div>
                <div style={{ flex: 1, padding: '12px', background: 'var(--glass-bg-subtle)', borderRadius: '8px' }}>
                  <strong>{d.activeMatch.user2.name}'s Stance</strong>
                  <p style={{ fontSize: '14px', marginTop: '8px', color: d.user2Stance ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {d.user2Stance || 'No stance submitted.'}
                  </p>
                </div>
              </div>

              {d.status === 'RESOLVED' && (
                <div style={{ marginTop: '16px', padding: '12px', borderLeft: '4px solid var(--brand-green)' }}>
                  <strong>Admin Decision:</strong> {d.decision}
                  {d.winner && <p style={{ margin: '4px 0 0', fontSize: '14px' }}>Winner: <strong>{d.winner.name}</strong></p>}
                </div>
              )}

              {resolvingDisputeId === d.id && (
                <form onSubmit={(e) => handleResolveDispute(e, d.id)} style={{ marginTop: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                  <div className="form-group">
                    <label>Decision</label>
                    <textarea required value={decisionText} onChange={(e) => setDecisionText(e.target.value)} rows="3" placeholder="Explain the resolution..."></textarea>
                  </div>
                  <div className="form-group">
                    <label>Winner (Optional)</label>
                    <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                      <option value="">None (Dismissed / Mutual)</option>
                      <option value={d.activeMatch.user1Id}>{d.activeMatch.user1.name}</option>
                      <option value={d.activeMatch.user2Id}>{d.activeMatch.user2.name}</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-secondary" onClick={() => setResolvingDisputeId(null)}>Cancel</button>
                    <button type="submit" className="primary-cta">Submit Resolution</button>
                  </div>
                </form>
              )}
            </div>
          ))
        ) : (
          <p className="empty-state">No disputes found.</p>
        )}
      </section>
      )}

      {activeTab === 'moderation' && (
      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
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
      )}

      {activeTab === 'verifications' && (
      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Verification Requests</h2>
        {verifications.length > 0 ? (
          verifications.map(v => (
            <div key={v.id} className="match-card" style={{ marginBottom: '12px', padding: '16px', border: '1px solid var(--glass-border-subtle)', borderRadius: '12px' }}>
              <p><strong>{v.name}</strong> ({v.email})</p>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {v.linkedinUrl && <a href={v.linkedinUrl} target="_blank" rel="noreferrer" style={{ marginRight: '8px' }}>LinkedIn</a>}
                {v.portfolioUrl && <a href={v.portfolioUrl} target="_blank" rel="noreferrer">Portfolio</a>}
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button className="primary-cta" onClick={() => handleApproveVerification(v.id)}>Approve</button>
                <button className="btn-secondary" onClick={() => handleRejectVerification(v.id)}>Reject</button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">No pending verifications</p>
        )}
      </section>
      )}

      {activeTab === 'audit' && (
      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>System Audit Logs</h2>
        <div className="admin-table-wrap" style={{ overflowX: 'auto', maxHeight: '400px' }}>
          <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', position: 'sticky', top: 0, background: 'var(--bg-layer)' }}>
                <th style={{ padding: '12px' }}>Timestamp</th>
                <th style={{ padding: '12px' }}>Admin</th>
                <th style={{ padding: '12px' }}>Action</th>
                <th style={{ padding: '12px' }}>Target ID</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border-subtle)' }}>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '12px' }}>{log.actor?.name}</td>
                  <td style={{ padding: '12px' }}><span className="badge">{log.action}</span></td>
                  <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'monospace' }}>{log.targetId}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditLogs.length === 0 && <p className="empty-state">No audit logs found</p>}
        </div>
      </section>
      )}

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
