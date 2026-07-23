import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { admin, groups, blogs, getImageUrl } from '../shared/api';
import { isLoggedIn, isAdmin, getUser } from '../shared/auth';

export default function Admin() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [flags, setFlags] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);

  // Blog form states
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [blogEditingId, setBlogEditingId] = useState(null);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogCoverFile, setBlogCoverFile] = useState(null);
  const [blogSubmitting, setBlogSubmitting] = useState(false);

  // Group form states
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [groupSubmitting, setGroupSubmitting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [resolvingDisputeId, setResolvingDisputeId] = useState(null);
  const [decisionText, setDecisionText] = useState('');
  const [winnerId, setWinnerId] = useState('');
  const [supportFilter, setSupportFilter] = useState('ALL'); // ALL, SUPPORT, APPEALS

  const [searchParams, setSearchParams] = useSearchParams();

  const currentUser = getUser();
  const isManager = currentUser?.role === 'MANAGER';

  const tabFromUrl = searchParams.get('tab') || (isManager ? 'users' : 'analytics');
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    const tab = searchParams.get('tab') || (isManager ? 'users' : 'analytics');
    if (isManager && !['users', 'groups', 'support', 'blogs'].includes(tab)) {
      setSearchParams({ tab: 'users' });
    } else {
      setActiveTab(tab);
    }
  }, [searchParams, isManager, setSearchParams]);

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
      if (isManager) {
        const [usersRes, groupsRes, supportRes, blogsRes] = await Promise.all([
          admin.users(),
          groups.list(),
          admin.supportMessages(),
          blogs.list()
        ]);
        setUsers(usersRes.users);
        setAllGroups(groupsRes.groups || []);
        setSupportMessages(supportRes.messages || []);
        setBlogPosts(blogsRes.posts || []);
        // Dummy analytics structure to prevent crash if anything expects it
        setAnalytics({ users: { total: 0, growth30d: 0 }, skills: { total: 0, created30d: 0 }, matches: { active: 0, completed: 0 }, moderation: { pendingFlags: 0 } });
      } else {
        const [analyticsRes, usersRes, flagsRes, disputesRes, auditRes, supportRes, groupsRes, blogsRes] = await Promise.all([
          admin.analytics(),
          admin.users(),
          admin.moderation(),
          admin.disputes(),
          admin.auditLogs(),
          admin.supportMessages(),
          groups.list(),
          blogs.list()
        ]);
        setAnalytics(analyticsRes.analytics);
        setUsers(usersRes.users);
        setFlags(flagsRes.flags);
        setDisputes(disputesRes.disputes);
        setAuditLogs(auditRes.logs);
        setSupportMessages(supportRes.messages || []);
        setAllGroups(groupsRes.groups || []);
        setBlogPosts(blogsRes.posts || []);
      }
    } catch (e) {
      console.error(e);
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



  const handleMarkSupportRead = async (msgId) => {
    try {
      await admin.markSupportMessageRead(msgId);
      loadData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleUnbanUser = async (userId) => {
    if (!window.confirm('Are you sure you want to reinstate/unban this user?')) return;
    try {
      await admin.unbanUser(userId);
      showToast('User has been successfully unbanned.');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to unban user');
    }
  };

  const handleAcceptAppeal = async (msgId) => {
    if (!window.confirm('Are you sure you want to ACCEPT this appeal? This will unban the user.')) return;
    try {
      await admin.acceptAppeal(msgId);
      showToast('Appeal accepted and user unbanned.');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to accept appeal');
    }
  };

  const handleRejectAppeal = async (msgId) => {
    if (!window.confirm('Are you sure you want to REJECT this appeal? The user will remain banned.')) return;
    try {
      await admin.rejectAppeal(msgId);
      showToast('Appeal rejected.');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to reject appeal');
    }
  };

  const handleSetRole = async (userId, role) => {
    try {
      await admin.setUserRole(userId, role);
      showToast(`User role updated to ${role}`);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update user role');
    }
  };

  const handleImpersonate = async (userId) => {
    try {
      const res = await admin.impersonate(userId);
      localStorage.setItem('skillswap-original-token', localStorage.getItem('skillswap-token'));
      localStorage.setItem('skillswap-original-user', localStorage.getItem('skillswap-user'));
      localStorage.setItem('skillswap-token', res.token);
      localStorage.setItem('skillswap-user', JSON.stringify(res.user));
      showToast(`Logged in as ${res.user.name}`);
      window.location.href = '/dashboard';
    } catch (err) {
      showToast(err.message || 'Impersonation failed');
    }
  };

  const openCreateBlog = () => {
    setBlogEditingId(null);
    setBlogTitle('');
    setBlogContent('');
    setBlogCoverFile(null);
    setIsBlogModalOpen(true);
  };

  const openEditBlog = (post) => {
    setBlogEditingId(post.id);
    setBlogTitle(post.title);
    setBlogContent(post.content);
    setBlogCoverFile(null);
    setIsBlogModalOpen(true);
  };

  const handleSaveBlog = async (e) => {
    e.preventDefault();
    if (!blogTitle.trim() || !blogContent.trim()) return;
    setBlogSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', blogTitle);
      formData.append('content', blogContent);
      if (blogCoverFile) {
        formData.append('coverImage', blogCoverFile);
      }

      if (blogEditingId) {
        await blogs.update(blogEditingId, formData);
        showToast('Blog post updated');
      } else {
        await blogs.create(formData);
        showToast('Blog post created');
      }
      setIsBlogModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save blog post');
    } finally {
      setBlogSubmitting(false);
    }
  };

  const handleDeleteBlog = async (postId) => {
    if (!window.confirm('Delete this blog post?')) return;
    try {
      await blogs.delete(postId);
      showToast('Blog post deleted');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to delete blog post');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupDescription.trim()) return;
    setGroupSubmitting(true);
    try {
      await groups.create({ name: newGroupName, description: newGroupDescription });
      showToast('Community group created successfully');
      setNewGroupName('');
      setNewGroupDescription('');
      setIsGroupModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to create group');
    } finally {
      setGroupSubmitting(false);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'Fustat,sans-serif', margin: 0 }}>Group Management</h2>
          <button type="button" className="primary-cta" onClick={() => setIsGroupModalOpen(true)} style={{ padding: '8px 16px', fontSize: '0.9rem', width: 'auto' }}>+ Create Group</button>
        </div>
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {!u.isBanned && u.role !== 'SUPER_ADMIN' && (
                        <button className="btn-secondary" onClick={() => { setUserToBan(u.id); setBanReason(''); }} style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>Ban User</button>
                      )}
                      {u.isBanned && (
                        <button className="primary-cta" onClick={() => handleUnbanUser(u.id)} style={{ padding: '6px 12px', fontSize: '12px', width: 'auto', background: 'var(--brand-green)', borderColor: 'var(--brand-green)' }}>Unban User</button>
                      )}
                      {currentUser?.role === 'SUPER_ADMIN' && (
                        <>
                          {u.role === 'MANAGER' ? (
                            <button className="btn-secondary" onClick={() => handleSetRole(u.id, 'USER')} style={{ padding: '6px 12px', fontSize: '12px' }}>Remove Manager</button>
                          ) : (
                            <button className="btn-secondary" onClick={() => handleSetRole(u.id, 'MANAGER')} style={{ padding: '6px 12px', fontSize: '12px' }}>Set as Manager</button>
                          )}
                          <button className="primary-cta" onClick={() => handleImpersonate(u.id)} style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}>Login as User</button>
                        </>
                      )}
                    </div>
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



      {activeTab === 'support' && (
      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Support Inbox</h2>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className={supportFilter === 'ALL' ? 'primary-cta' : 'btn-secondary'} 
            onClick={() => setSupportFilter('ALL')}
            style={{ padding: '6px 16px', fontSize: '13px', minHeight: 'auto' }}
          >
            All Messages ({supportMessages.length})
          </button>
          <button 
            type="button" 
            className={supportFilter === 'SUPPORT' ? 'primary-cta' : 'btn-secondary'} 
            onClick={() => setSupportFilter('SUPPORT')}
            style={{ padding: '6px 16px', fontSize: '13px', minHeight: 'auto' }}
          >
            General Support ({supportMessages.filter(m => !m.isAppeal).length})
          </button>
          <button 
            type="button" 
            className={supportFilter === 'APPEALS' ? 'primary-cta' : 'btn-secondary'} 
            onClick={() => setSupportFilter('APPEALS')}
            style={{ padding: '6px 16px', fontSize: '13px', minHeight: 'auto' }}
          >
            Ban Appeals ({supportMessages.filter(m => m.isAppeal).length})
          </button>
        </div>

        {(() => {
          const filtered = supportMessages.filter(msg => {
            if (supportFilter === 'SUPPORT') return !msg.isAppeal;
            if (supportFilter === 'APPEALS') return msg.isAppeal;
            return true;
          });

          return filtered.length > 0 ? (
            filtered.map(msg => (
              <div key={msg.id} className="match-card" style={{ background: 'var(--bg-surface)', marginBottom: '12px', padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '0 0 4px 0' }}>
                      <strong>{msg.name}</strong> 
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>({msg.email})</span>
                      {msg.isAppeal && (
                        <span className="badge" style={{ background: 'var(--brand-orange)', color: 'white', padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}>Ban Appeal</span>
                      )}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Received: {new Date(msg.createdAt).toLocaleString()}</p>
                  </div>
                  {!msg.isRead && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {msg.isAppeal ? (
                        <>
                          <button className="primary-cta" style={{ background: 'var(--brand-green)', borderColor: 'var(--brand-green)', padding: '6px 12px', fontSize: '13px', width: 'auto' }} onClick={() => handleAcceptAppeal(msg.id)}>Accept Appeal</button>
                          <button className="btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', padding: '6px 12px', fontSize: '13px' }} onClick={() => handleRejectAppeal(msg.id)}>Reject Appeal</button>
                        </>
                      ) : (
                        <button className="primary-cta" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleMarkSupportRead(msg.id)}>Mark as Read</button>
                      )}
                    </div>
                  )}
                  {msg.isRead && (
                    <span className="badge badge--success">{msg.isAppeal ? 'Handled' : 'Read'}</span>
                  )}
                </div>
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-surface-raised)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap', margin: 0 }}>{msg.message}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">No support messages found.</p>
          );
        })()}
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

      {activeTab === 'blogs' && (
      <section className="glass-card animate-fade-up delay-2" style={{ padding: '24px', marginTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'Fustat,sans-serif', margin: 0 }}>Blog Management</h2>
          <button className="primary-cta" style={{ width: 'auto' }} onClick={openCreateBlog}>+ Add Blog Post</button>
        </div>
        <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
          {blogPosts.length > 0 ? (
          <div className="table-responsive">
          <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px' }}>Cover</th>
                <th style={{ padding: '12px' }}>Title</th>
                <th style={{ padding: '12px' }}>Author</th>
                <th style={{ padding: '12px' }}>Created</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {blogPosts.map(post => (
                <tr key={post.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px' }}>
                    {post.coverImageUrl ? (
                      <img src={getImageUrl(post.coverImageUrl)} alt="" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No Cover</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}><strong>{post.title}</strong></td>
                  <td style={{ padding: '12px' }}>{post.author?.name}</td>
                  <td style={{ padding: '12px' }}>{new Date(post.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" onClick={() => openEditBlog(post)} style={{ padding: '6px 12px', fontSize: '12px' }}>Edit</button>
                      <button className="btn-secondary" onClick={() => handleDeleteBlog(post.id)} style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          ) : (
            <p className="empty-state">No blog posts found.</p>
          )}
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

      {isBlogModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div onClick={() => setIsBlogModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <form onSubmit={handleSaveBlog} className="glass-card animate-dropdown-enter" style={{ position: 'relative', zIndex: 1, padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem' }}>
              {blogEditingId ? 'Edit Blog Post' : 'Add Blog Post'}
            </h2>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="blogTitle" style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Title</label>
              <input
                type="text"
                id="blogTitle"
                required
                value={blogTitle}
                onChange={(e) => setBlogTitle(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="blogContent" style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Content</label>
              <textarea
                id="blogContent"
                required
                rows="8"
                value={blogContent}
                onChange={(e) => setBlogContent(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', resize: 'vertical' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label htmlFor="blogCover" style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Cover Picture</label>
              <input
                type="file"
                id="blogCover"
                accept="image/*"
                onChange={(e) => setBlogCoverFile(e.target.files[0])}
                style={{ width: '100%', padding: '8px', background: 'transparent', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsBlogModalOpen(false)}>Cancel</button>
              <button type="submit" className="primary-cta" disabled={blogSubmitting} style={{ width: 'auto' }}>
                {blogSubmitting ? 'Saving...' : 'Save Post'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isGroupModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div onClick={() => setIsGroupModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <form onSubmit={handleCreateGroup} className="glass-card animate-dropdown-enter" style={{ position: 'relative', zIndex: 1, padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem' }}>Create Community Group</h2>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="groupName" style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Group Name</label>
              <input
                type="text"
                id="groupName"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. JavaScript Developers"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label htmlFor="groupDescription" style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Description</label>
              <textarea
                id="groupDescription"
                required
                rows="4"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Describe what this community group is about..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsGroupModalOpen(false)}>Cancel</button>
              <button type="submit" className="primary-cta" disabled={groupSubmitting} style={{ width: 'auto' }}>
                {groupSubmitting ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
