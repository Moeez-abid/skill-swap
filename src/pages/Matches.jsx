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
  const [activeTab, setActiveTab] = useState('requests');
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
      return (
        <div className="match-card__actions">
          <button className="primary-cta" onClick={() => handleComplete(r.id)}>Complete Match</button>
        </div>
      );
    }

    if (activeTab === 'past') {
      const myReview = r.reviews?.find(rev => rev.reviewerId === currentUser?.id);
      const partnerReview = r.reviews?.find(rev => rev.reviewerId !== currentUser?.id);
      const isReviewing = reviewingMatchId === r.id;

      return (
        <div className="match-card__actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {myReview ? (
            <span className="badge" style={{ background: 'var(--brand-blue)', color: 'white', alignSelf: 'flex-start' }}>Review Submitted</span>
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
             <p style={{ fontSize: '13px', color: 'var(--brand-blue)', marginTop: '8px' }}>Your partner has submitted their review! Submit yours to see it.</p>
          )}

          {partnerReview && partnerReview.isRevealed && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--glass-bg-subtle)', borderRadius: '12px', border: '1px solid var(--glass-border-subtle)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                Partner's Review
                <span className="badge badge--success">★ {partnerReview.ratingOverall}/5 Overall</span>
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>"{partnerReview.feedback}"</p>
            </div>
          )}

          {isReviewing && (
            <form onSubmit={(e) => handleReviewSubmit(e, r.id)} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border-subtle)' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Provide Match Review</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Overall</label>
                  <select value={ratingOverall} onChange={(e) => setRatingOverall(e.target.value)}>
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Teaching</label>
                  <select value={ratingTeaching} onChange={(e) => setRatingTeaching(e.target.value)}>
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Communication</label>
                  <select value={ratingCommunication} onChange={(e) => setRatingCommunication(e.target.value)}>
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Punctuality</label>
                  <select value={ratingPunctuality} onChange={(e) => setRatingPunctuality(e.target.value)}>
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
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
    <div style={{ paddingTop: '100px', paddingBottom: '64px' }}>
      <div className="page-header animate-fade-up">
        <h1 className="page-title">Matches</h1>
        <p className="page-subtitle">Manage your requests, active skill swaps, and past matches.</p>
      </div>

      <div className="tabs animate-fade-up delay-1" role="tablist">
        <button 
          className={`tab ${activeTab === 'requests' ? 'active' : ''}`} 
          onClick={() => setActiveTab('requests')} 
          role="tab"
        >
          Requests
        </button>
        <button 
          className={`tab ${activeTab === 'active' ? 'active' : ''}`} 
          onClick={() => setActiveTab('active')} 
          role="tab"
        >
          Active
        </button>
        <button 
          className={`tab ${activeTab === 'past' ? 'active' : ''}`} 
          onClick={() => setActiveTab('past')} 
          role="tab"
        >
          Past & Reviews
        </button>
      </div>

      <div className="match-list">
        {loading ? (
          <p className="loading animate-fade-up delay-2">Loading…</p>
        ) : error ? (
          <div className="empty-state animate-fade-up delay-2"><h3>Unable to load matches</h3></div>
        ) : items.length === 0 ? (
          <div className="empty-state animate-fade-up delay-2"><h3>No matches found</h3></div>
        ) : (
          items.map((r, i) => {
            const partner = activeTab === 'requests' 
              ? (r.direction === 'incoming' ? r.sender : r.receiver) 
              : r.partner;
            const offeredSkill = activeTab === 'requests' ? r.offeredSkill : r.matchRequest?.offeredSkill;
            const wantedSkill = activeTab === 'requests' ? r.wantedSkill : r.matchRequest?.wantedSkill;
            const statusLabel = activeTab === 'requests' ? r.status : (r.isActive ? 'ACTIVE' : 'COMPLETED');

            return (
              <article key={r.id} className={`match-card glass-card animate-fade-up delay-${Math.min(i + 1, 5)}`}>
                <div className="match-card__header">
                  <div>
                    <Avatar user={partner} size={40} />
                  </div>
                  <span className="badge">{statusLabel}</span>
                </div>
                <p>
                  <strong>{partner?.name || 'Unknown User'}</strong> 
                  {activeTab === 'requests' && <span> &middot; {r.direction}</span>}
                </p>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '8px 0' }}>
                  Offers: <em>{offeredSkill?.title || 'Unknown Skill'}</em> &harr; Wants: <em>{wantedSkill?.title || 'Unknown Skill'}</em>
                </p>
                {activeTab === 'requests' && <p style={{ fontSize: '14px' }}>{r.message}</p>}
                {renderActions(r)}
              </article>
            );
          })
        )}
      </div>

      {toastMsg && (
        <div className="toast toast--info toast--visible" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
