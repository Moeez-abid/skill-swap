import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { admin, groups } from '../shared/api';
import { isLoggedIn, isAdmin } from '../shared/auth';

export default function Admin() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [flags, setFlags] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [allGroups, setAllGroups] = useState([]);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [resolvingDisputeId, setResolvingDisputeId] = useState(null);
  const [decisionText, setDecisionText] = useState('');
  const [winnerId, setWinnerId] = useState('');

  const [activeTab, setActiveTab] = useState('analytics');

  // Modal states
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [userToBan, setUserToBan] = useState(null);
  const [banReason, setBanReason] = useState('');


  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [analyticsRes, usersRes, flagsRes, disputesRes, verificationsRes, auditRes, supportRes, groupsRes] = await Promise.all([
        admin.analytics(),
        admin.users(),
        admin.moderation(),
        admin.disputes(),
        admin.verifications(),
        admin.auditLogs(),
        admin.supportMessages(),
        groups.list()
      ]);
      setAnalytics(analyticsRes.analytics);
      setUsers(usersRes.users);
      setFlags(flagsRes.flags);
      setDisputes(disputesRes.disputes);
      setVerifications(verificationsRes.users);
      setAuditLogs(auditRes.logs);
      setSupportMessages(supportRes.messages || []);
      setAllGroups(groupsRes.groups || []);
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


  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await admin.deleteGroup(groupToDelete);
      showToast('Group deleted successfully');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to delete group');
    } finally {
      setGroupToDelete(null);
    }
  };

  const confirmBanUser = async (e) => {
    e.preventDefault();
    if (!userToBan || !banReason.trim()) return;
    try {
      await admin.banUser(userToBan, banReason);
      showToast('User banned');
      loadData();
    } catch (err) {
      showToast(err.message);
    } finally {
      setUserToBan(null);
      setBanReason('');
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

  const handleMarkSupportRead = async (msgId) => {
    try {
      await admin.markSupportMessageRead(msgId);
      loadData();
    } catch (err) {
      showToast(err.message);
    }
  };

  if (error) return <div style={{ paddingTop: '130px', paddingBottom: '64px' }}><div className="empty-state"><h3>Admin panel unavailable</h3></div></div>;

  return (
    <>
    <div style={{ paddingTop: '130px', paddingBottom: '64px' }}>
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Platform analytics, user management, and moderation queue.</p>
      </div>

      {loading || !analytics ? (
        <p className="loading">Loading admin panel…</p>
      ) : (
        <>
      <div className="tabs admin-tabs animate-fade-up delay-1" style={{ marginBottom: '24px', display: 'flex', gap: '16px', overflowX: 'auto', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <button className={`tab ${activeTab === 'analytics' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'analytics' ? '2px solid var(--accent)' : 'none', fontWeight: activeTab === 'analytics' ? 600 : 400 }} onClick={() => setActiveTab('analytics')}>Overview</button>
        <button className={`tab ${activeTab === 'users' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'users' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'users' ? '2px solid var(--accent)' : 'none', fontWeight: activeTab === 'users' ? 600 : 400 }} onClick={() => setActiveTab('users')}>Users</button>
        <button className={`tab ${activeTab === 'groups' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'groups' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'groups' ? '2px solid var(--accent)' : 'none', fontWeight: activeTab === 'groups' ? 600 : 400 }} onClick={() => setActiveTab('groups')}>Groups</button>
        <button className={`tab ${activeTab === 'disputes' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'disputes' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'disputes' ? '2px solid var(--accent)' : 'none', fontWeight: activeTab === 'disputes' ? 600 : 400 }} onClick={() => setActiveTab('disputes')}>Disputes</button>
        <button className={`tab ${activeTab === 'moderation' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'moderation' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'moderation' ? '2px solid var(--accent)' : 'none', fontWeight: activeTab === 'moderation' ? 600 : 400 }} onClick={() => setActiveTab('moderation')}>Moderation</button>
        <button className={`tab ${activeTab === 'verifications' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'verifications' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'verifications' ? '2px solid var(--accent)' : 'none', fontWeight: activeTab === 'verifications' ? 600 : 400 }} onClick={() => setActiveTab('verifications')}>Verifications</button>
        <button className={`tab ${activeTab === 'audit' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'audit' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'audit' ? '2px solid var(--accent)' : 'none', fontWeight: activeTab === 'audit' ? 600 : 400 }} onClick={() => setActiveTab('audit')}>Audit Logs</button>
        <button className={`tab ${activeTab === 'support' ? 'tab--active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: activeTab === 'support' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'support' ? '2px solid var(--accent)' : 'none', fontWeight: activeTab === 'support' ? 600 : 400 }} onClick={() => setActiveTab('support')}>
          Support Inbox
          {supportMessages.filter(m => !m.isRead).length > 0 && (
            <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px' }}>{supportMessages.filter(m => !m.isRead).length}</span>
          )}
        </button>
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


      {activeTab === 'groups' && (
      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Group Management</h2>
        <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
          {allGroups.length > 0 ? (
          <div className="table-responsive">
          <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Description</th>
                <th style={{ padding: '12px' }}>Members</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allGroups.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px' }}><strong>{g.name}</strong></td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{g.description.slice(0, 50)}{g.description.length > 50 ? '...' : ''}</td>
                  <td style={{ padding: '12px' }}>{g.memberCount}</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => setGroupToDelete(g.id)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          ) : (
            <p className="empty-state">No groups found.</p>
          )}
        </div>
      </section>
      )}

      {activeTab === 'users' && (
      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>User Management</h2>
        <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
          {users.length > 0 ? (
          <div className="table-responsive">
          <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>Role</th>
                <th style={{ padding: '12px' }}>Skills</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role !== 'SUPER_ADMIN').map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px' }}>{u.name}</td>
                  <td style={{ padding: '12px' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>{u.role}</td>
                  <td style={{ padding: '12px' }}>{u._count.skills}</td>
                  <td style={{ padding: '12px' }}>{u.isBanned ? 'Banned' : 'Active'}</td>
                  <td style={{ padding: '12px' }}>
                    {!u.isBanned && u.role !== 'SUPER_ADMIN' && (
                      <button className="btn-secondary" onClick={() => { setUserToBan(u.id); setBanReason(''); }}>Ban User</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          ) : (<p className="empty-state">No users found.</p>)}
        </div>
      </section>
      )}

      {activeTab === 'disputes' && (
      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Disputes</h2>
        {disputes.length > 0 ? (
          disputes.map(d => (
            <div key={d.id} className="match-card" style={{ marginBottom: '12px', padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
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
                <div style={{ flex: 1, padding: '12px', background: 'var(--bg-surface-raised)', borderRadius: '8px' }}>
                  <strong>{d.activeMatch.user1.name}'s Stance</strong>
                  <p style={{ fontSize: '14px', marginTop: '8px', color: d.user1Stance ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {d.user1Stance || 'No stance submitted.'}
                  </p>
                </div>
                <div style={{ flex: 1, padding: '12px', background: 'var(--bg-surface-raised)', borderRadius: '8px' }}>
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
                <form onSubmit={(e) => handleResolveDispute(e, d.id)} style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
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
            <div key={f.id} className="match-card" style={{ marginBottom: '12px', padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
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
            <div key={v.id} className="match-card" style={{ marginBottom: '12px', padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
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

      {activeTab === 'support' && (
      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Support Inbox</h2>
        {supportMessages.length > 0 ? (
          supportMessages.map(msg => (
            <div key={msg.id} className="match-card" style={{ background: 'var(--bg-surface)', marginBottom: '12px', padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p><strong>{msg.name}</strong> ({msg.email})</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Received: {new Date(msg.createdAt).toLocaleString()}</p>
                </div>
                {!msg.isRead && (
                  <button className="primary-cta" onClick={() => handleMarkSupportRead(msg.id)}>Mark as Read</button>
                )}
                {msg.isRead && (
                  <span className="badge badge--success">Read</span>
                )}
              </div>
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-surface-raised)', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{msg.message}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">No support messages found.</p>
        )}
      </section>
      )}

      {activeTab === 'audit' && (
      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>System Audit Logs</h2>
        <div className="admin-table-wrap" style={{ overflowX: 'auto', maxHeight: '400px' }}>
          <div className="table-responsive">
          <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-surface)' }}>
                <th style={{ padding: '12px' }}>Timestamp</th>
                <th style={{ padding: '12px' }}>Admin</th>
                <th style={{ padding: '12px' }}>Action</th>
                <th style={{ padding: '12px' }}>Target ID</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '12px' }}>{log.actor?.name}</td>
                  <td style={{ padding: '12px' }}><span className="badge">{log.action}</span></td>
                  <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'monospace' }}>{log.targetId}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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

      {/* Modals */}
      {groupToDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div onClick={() => setGroupToDelete(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-card animate-dropdown-enter" style={{ position: 'relative', zIndex: 1, padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem' }}>Delete Group</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Are you sure you want to permanently delete this community group? This will remove all members and messages!</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn-secondary" onClick={() => setGroupToDelete(null)}>Cancel</button>
              <button type="button" className="primary-cta" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={confirmDeleteGroup}>Delete Group</button>
            </div>
          </div>
        </div>
      )}

      {userToBan && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div onClick={() => setUserToBan(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <form onSubmit={confirmBanUser} className="glass-card animate-dropdown-enter" style={{ position: 'relative', zIndex: 1, padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem' }}>Ban User</h2>
            <div className="form-group">
              <label htmlFor="banReason">Reason for ban:</label>
              <input
                type="text"
                id="banReason"
                autoFocus
                required
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button type="button" className="btn-secondary" onClick={() => setUserToBan(null)}>Cancel</button>
              <button type="submit" className="primary-cta" style={{ background: '#ef4444', borderColor: '#ef4444' }}>Ban User</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
