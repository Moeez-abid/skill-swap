import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { matches, reviews, getImageUrl } from '../shared/api';
import { isLoggedIn, getUser } from '../shared/auth';

function Avatar({ user, size = 40 }) {
  const initials = (user?.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2);
  if (user?.avatarUrl) {
    return <img src={getImageUrl(user.avatarUrl)} alt="" className="avatar" width={size} height={size} style={{ objectFit: 'cover' }} />;
  }
  return (
    <span className="avatar avatar--initials" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export default function Matches() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const [activeTab, setActiveTab] = useState('active');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [reviewingMatchId, setReviewingMatchId] = useState(null);
  const [ratingOverall, setRatingOverall] = useState(5);
  const [ratingTeaching, setRatingTeaching] = useState(5);
  const [ratingCommunication, setRatingCommunication] = useState(5);
  const [ratingPunctuality, setRatingPunctuality] = useState(5);
  const [feedback, setFeedback] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadMatches = async () => {
    setLoading(true);
    setError(false);
    try {
      if (activeTab === 'requests') {
        const res = await matches.list('all');
        setItems(res.requests);
      } else {
        const res = await matches.active(activeTab);
        setItems(res.activeMatches);
      }
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
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, navigate]);

  const handleAction = async (id, action) => {
    try {
      await matches.updateStatus(id, action);
      showToast('Request updated');
      loadMatches();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleComplete = async (id) => {
    try {
      await matches.complete(id);
      showToast('Match marked as completed');
      loadMatches();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleReviewSubmit = async (e, matchId) => {
    e.preventDefault();
    try {
      await reviews.createMatchReview(matchId, {
        ratingOverall: parseInt(ratingOverall, 10),
        ratingTeaching: parseInt(ratingTeaching, 10),
        ratingCommunication: parseInt(ratingCommunication, 10),
        ratingPunctuality: parseInt(ratingPunctuality, 10),
        feedback,
      });
      showToast('Review submitted successfully');
      setReviewingMatchId(null);
      loadMatches();
    } catch (err) {
      showToast(err.message);
    }
  };

  const renderActions = (r) => {
    if (activeTab === 'requests') {
      if (r.status !== 'PENDING') return null;
      if (r.direction === 'incoming') {
        return (
          <div className="match-card__actions">
            <button className="primary-cta" onClick={() => handleAction(r.id, 'ACCEPTED')}>Accept</button>
            <button className="btn-secondary" onClick={() => handleAction(r.id, 'DECLINED')}>Decline</button>
          </div>
        );
      }
      return (
        <div className="match-card__actions">
          <button className="btn-secondary" onClick={() => handleAction(r.id, 'CANCELLED')}>Cancel</button>
        </div>
      );
    }

    if (activeTab === 'active') {
      const dispute = r.dispute;
      const isUser1 = r.user1Id === currentUser?.id;
      const hasSubmittedStance = dispute && (isUser1 ? dispute.user1Stance : dispute.user2Stance);

      return (
        <div className="match-card__actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {!dispute ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="primary-cta" onClick={() => navigate(`/sessions?matchId=${r.id}`)}>Schedule Session</button>
                <button className="btn-secondary" style={{ borderColor: 'var(--brand-red)' }} onClick={() => handleComplete(r.id)}>Complete Match</button>
              </div>
              <button className="btn-secondary" style={{ color: 'var(--brand-red)', borderColor: 'var(--brand-red)' }} onClick={async () => {
                if (window.confirm('Are you sure you want to file a dispute?')) {
                  try {
                    await import('../shared/api').then(m => m.disputes.create(r.id));
                    showToast('Dispute filed successfully');
                    loadMatches();
                  } catch (err) {
                    showToast(err.message);
                  }
                }
              }}>File Dispute</button>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-surface-raised)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginTop: '8px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                Dispute Status
                <span className={`badge ${dispute.status === 'RESOLVED' ? 'badge--success' : ''}`}>{dispute.status.replace('_', ' ')}</span>
              </h4>

              {dispute.status === 'PENDING_STANCES' && !hasSubmittedStance && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const stance = e.target.stance.value;
                    await import('../shared/api').then(m => m.disputes.submitStance(dispute.id, stance));
                    showToast('Stance submitted');
                    loadMatches();
                  } catch (err) {
                    showToast(err.message);
                  }
                }}>
                  <div className="form-group">
                    <label>Your Stance (Deadline: {new Date(dispute.deadline).toLocaleDateString()})</label>
                    <textarea name="stance" required rows="3" placeholder="Explain your side of the dispute..."></textarea>
                  </div>
                  <button type="submit" className="primary-cta">Submit Stance</button>
                </form>
              )}

              {dispute.status === 'PENDING_STANCES' && hasSubmittedStance && (
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>You have submitted your stance. Waiting for partner or deadline.</p>
              )}

              {dispute.status === 'UNDER_REVIEW' && (
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Admin is reviewing both stances.</p>
              )}

              {dispute.status === 'RESOLVED' && (
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Decision:</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>{dispute.decision}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'past') {
      const partner = r.partner || {};
      const myReview = r.reviews?.find(rev => rev.reviewerId === currentUser?.id);
      const partnerReview = r.reviews?.find(rev => rev.reviewerId !== currentUser?.id);
      const isReviewing = reviewingMatchId === r.id;

      return (
        <div className="match-card__actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {myReview ? (
            <span className="badge" style={{ background: 'var(--accent)', color: 'white', alignSelf: 'flex-start' }}>Review Submitted</span>
          ) : !isReviewing ? (
            <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => {
              setReviewingMatchId(r.id);
              setRatingOverall(5);
              setRatingTeaching(5);
              setRatingCommunication(5);
              setRatingPunctuality(5);
              setFeedback('');
            }}>Leave Review</button>
          ) : null}

          {partnerReview && !partnerReview.isRevealed && !myReview && (
            <p style={{ fontSize: '13px', color: 'var(--accent)', marginTop: '8px' }}>{partner.name} has submitted their review! Submit yours to see it.</p>
          )}

          {partnerReview && partnerReview.isRevealed && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-surface-raised)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                Partner's Review
                <span className="badge badge--success">★ {partnerReview.ratingOverall}/5 Overall</span>
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>"{partnerReview.feedback}"</p>
            </div>
          )}

          {isReviewing && (
            <form onSubmit={(e) => handleReviewSubmit(e, r.id)} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Provide Match Review</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Overall</label>
                  <select value={ratingOverall} onChange={(e) => setRatingOverall(e.target.value)}>
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Teaching</label>
                  <select value={ratingTeaching} onChange={(e) => setRatingTeaching(e.target.value)}>
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Communication</label>
                  <select value={ratingCommunication} onChange={(e) => setRatingCommunication(e.target.value)}>
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Punctuality</label>
                  <select value={ratingPunctuality} onChange={(e) => setRatingPunctuality(e.target.value)}>
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Feedback (Hidden until both review)</label>
                <textarea required value={feedback} onChange={(e) => setFeedback(e.target.value)} rows="3"></textarea>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setReviewingMatchId(null)}>Cancel</button>
                <button type="submit" className="primary-cta" style={{ width: 'auto' }}>Submit Review</button>
              </div>
            </form>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Active Exchanges</h1>
          <p className="page-subtitle" style={{ margin: '8px 0 0' }}>Manage your skill swaps, requests, and mentorship sessions.</p>
        </div>
        <div className="tabs animate-fade-up" role="tablist" style={{ margin: 0 }}>
          <button className={`tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')} role="tab">Active</button>
          <button className={`tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')} role="tab">Requests</button>
          <button className={`tab ${activeTab === 'past' ? 'active' : ''}`} onClick={() => setActiveTab('past')} role="tab">Past</button>
        </div>
      </header>

      {loading ? (
        <p className="loading animate-fade-up delay-2">Loading…</p>
      ) : error ? (
        <div className="empty-state animate-fade-up delay-2"><h3>Unable to load matches</h3></div>
      ) : items.length === 0 ? (
        <div className="empty-state animate-fade-up delay-2">
          <h3>No {activeTab === 'requests' ? 'Requests' : activeTab === 'active' ? 'Active Matches' : 'Past Matches'}</h3>
        </div>
      ) : activeTab === 'requests' || activeTab === 'past' ? (
        <section className="mb-12 animate-fade-up delay-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Action Needed</h3>
          </div>
          <div className="bento-grid">
            {items.map((r, i) => {
              const partner = activeTab === 'requests' ? (r.direction === 'incoming' ? r.sender : r.receiver) : r.partner;
              const isUrgent = activeTab === 'requests' && r.direction === 'incoming';
              
              return (
                <div key={r.id} className={`glass-card bento-card ${isUrgent ? 'urgent' : 'warning'}`}>
                  <div className="bento-card-content">
                    <div className="bento-card-main">
                      <Avatar user={partner} size={48} />
                      <div style={{ flex: 1 }}>
                        <h4>{activeTab === 'requests' ? `Request from ${partner?.name}` : `Past match with ${partner?.name}`}</h4>
                        <p>{activeTab === 'requests' ? r.message || 'No message provided.' : 'Session completed.'}</p>
                        {renderActions(r)}
                      </div>
                    </div>
                    {activeTab === 'requests' && <span className="bento-time">{r.direction}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="animate-fade-up delay-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>In Progress</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {items.map((r, i) => {
              const partner = r.partner;
              const offeredSkill = r.matchRequest?.offeredSkill;
              const wantedSkill = r.matchRequest?.wantedSkill;
              
              return (
                <div key={r.id} className="glass-card swap-card">
                  <div className="swap-header">
                    <div className="swap-user">
                      <div className="swap-user-avatar-wrap">
                        <Avatar user={partner} size={56} />
                        <div className="status-dot"></div>
                      </div>
                      <div>
                        <h4>{partner?.name || 'Unknown User'}</h4>
                        <p>SkillSwap Member</p>
                      </div>
                    </div>
                    <div className="swap-status-col">
                      <span className="swap-badge-active">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="swap-equation">
                    <div className="swap-equation-side left">
                      <span className="swap-equation-label">You Teach</span>
                      <div className="swap-equation-subject">
                        <div className="swap-icon-box teach"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div>
                        <div>
                          <p className="swap-equation-title">{offeredSkill?.title || 'Skill'}</p>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            <span style={{ width: '24px', height: '4px', background: 'var(--accent)', borderRadius: '99px' }}></span>
                            <span style={{ width: '24px', height: '4px', background: 'var(--accent)', borderRadius: '99px' }}></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="swap-equation-divider">
                      <div className="swap-equation-divider-line"></div>
                      <div className="swap-equation-divider-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"></path></svg></div>
                      <div className="swap-equation-divider-line"></div>
                    </div>

                    <div className="swap-equation-side right">
                      <span className="swap-equation-label">You Learn</span>
                      <div className="swap-equation-subject">
                        <div className="swap-icon-box learn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg></div>
                        <div>
                          <p className="swap-equation-title">{wantedSkill?.title || 'Skill'}</p>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                            <span style={{ width: '24px', height: '4px', background: '#ec4899', borderRadius: '99px' }}></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="swap-progress-section">
                    {renderActions(r)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {toastMsg && (
        <div className="toast toast--info toast--visible" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
