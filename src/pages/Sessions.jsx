import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { messages, sessions, matches, reviews } from '../shared/api';
import { isLoggedIn, getUser } from '../shared/auth';

export default function Sessions() {
  const navigate = useNavigate();
  const currentUser = getUser();

  const [matchesList, setMatchesList] = useState([]);
  const [activeMatchId, setActiveMatchId] = useState('');

  const [sessionsList, setSessionsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Form states
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [method, setMethod] = useState('VIDEO');
  const [details, setDetails] = useState('');
  const [agenda, setAgenda] = useState('');

  const [toastMsg, setToastMsg] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [reviewingSessionId, setReviewingSessionId] = useState(null);
  const [rating, setRating] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [comment, setComment] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }

    matches.active()
      .then(res => {
        setMatchesList(res.activeMatches);
      })
      .catch(() => {
        // failed to load matches
      });
  }, [navigate]);

  useEffect(() => {
    if (!activeMatchId) {
      setSessionsList([]);
      return;
    }

    setLoading(true);
    setError(false);
    sessions.list(activeMatchId)
      .then(res => {
        setSessionsList(res.sessions);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeMatchId]);

  const handleRespond = async (id, action) => {
    try {
      await sessions.respond(id, { action });
      showToast(`Session ${action}ed`);
      // Reload sessions
      const res = await sessions.list(activeMatchId);
      setSessionsList(res.sessions);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handlePropose = async (e) => {
    e.preventDefault();
    if (!activeMatchId) {
      showToast('Select a match first');
      return;
    }

    const start = new Date(`${date}T${time}`);
    try {
      await sessions.create(activeMatchId, {
        scheduledStart: start.toISOString(),
        durationMinutes: parseInt(duration, 10),
        agenda,
        meetingMethod: method,
        meetingDetails: details,
      });
      showToast('Session proposed');
      setDate('');
      setTime('');
      setDuration('60');
      setMethod('VIDEO');
      setDetails('');
      setAgenda('');

      // Reload sessions
      const res = await sessions.list(activeMatchId);
      setSessionsList(res.sessions);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleFeedbackSubmit = async (e, sessionId) => {
    e.preventDefault();
    try {
      await reviews.create(sessionId, {
        ratingOverall: parseInt(rating, 10),
        ratingPunctuality: parseInt(punctuality, 10),
        comment,
      });
      showToast('Feedback submitted successfully');
      setReviewingSessionId(null);
      // Reload sessions
      const res = await sessions.list(activeMatchId);
      setSessionsList(res.sessions);
    } catch (err) {
      showToast(err.message);
    }
  };

  const now = new Date();
  const upcomingSessions = sessionsList.filter(s => new Date(s.scheduledEnd) > now);
  const pastSessions = sessionsList.filter(s => new Date(s.scheduledEnd) <= now && s.status !== 'DECLINED' && s.status !== 'CANCELLED');

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '64px' }}>
      <div className="page-header animate-fade-up">
        <h1 className="page-title">Session Scheduling</h1>
        <p className="page-subtitle">Book sessions with matched partners. Times display in your local timezone.</p>
      </div>

      <div className="form-card glass-card animate-fade-up delay-1" style={{ marginBottom: '32px' }}>
        <label htmlFor="match-select">Active Match</label>
        <select 
          id="match-select" 
          style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg-subtle)', color: 'var(--text-primary)' }}
          value={activeMatchId}
          onChange={(e) => setActiveMatchId(e.target.value)}
        >
          <option value="">Select active match</option>
          {matchesList.map(c => (
            <option key={c.id} value={c.id}>{c.partner.name}</option>
          ))}
        </select>
      </div>

      {activeMatchId && (
        <div className="view-toggle animate-fade-up delay-2" style={{ marginBottom: '32px' }}>
          <button 
            className={`view-toggle__btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`view-toggle__btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past & Feedback
          </button>
        </div>
      )}

      {activeTab === 'upcoming' && (
        <>
          <form className="form-card glass-card animate-fade-up delay-2" style={{ marginBottom: '32px' }} onSubmit={handlePropose}>
            <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Propose a Session</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input type="date" id="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="time">Time</label>
                <input type="time" id="time" required value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="duration">Duration</label>
                <select id="duration" value={duration} onChange={(e) => setDuration(e.target.value)}>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="method">Meeting Method</label>
                <select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="VIDEO">Video call</option>
                  <option value="IN_PERSON">In person</option>
                  <option value="PHONE">Phone</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="details">Meeting link / location</label>
              <input id="details" placeholder="Zoom link or address" value={details} onChange={(e) => setDetails(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="agenda">Agenda</label>
              <textarea id="agenda" value={agenda} onChange={(e) => setAgenda(e.target.value)}></textarea>
            </div>
            <button type="submit" className="primary-cta">Propose Session</button>
          </form>

          <div className="session-list animate-fade-up delay-3">
            {!activeMatchId ? (
              <p className="empty-state">Select a match to view sessions</p>
            ) : loading ? (
              <p className="loading">Loading...</p>
            ) : error ? (
              <p className="empty-state">Could not load sessions</p>
            ) : upcomingSessions.length === 0 ? (
              <p className="empty-state">No upcoming sessions</p>
            ) : (
              upcomingSessions.map(s => (
                <div key={s.id} className="session-item glass-card">
                  <div>
                    <div className="session-item__time">
                      {new Date(s.scheduledStart).toLocaleString()} &ndash; {new Date(s.scheduledEnd).toLocaleTimeString()}
                    </div>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {s.durationMinutes} min &middot; {s.meetingMethod} &middot; {s.agenda || 'No agenda'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="badge">{s.status}</span>
                    {s.status === 'PROPOSED' && s.proposerId !== currentUser.id && (
                      <>
                        <button className="btn-secondary" onClick={() => handleRespond(s.id, 'accept')}>Accept</button>
                        <button className="btn-secondary" onClick={() => handleRespond(s.id, 'decline')}>Decline</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'past' && (
        <div className="session-list animate-fade-up delay-3">
          {!activeMatchId ? (
            <p className="empty-state">Select a match to view past sessions</p>
          ) : loading ? (
            <p className="loading">Loading...</p>
          ) : error ? (
            <p className="empty-state">Could not load sessions</p>
          ) : pastSessions.length === 0 ? (
            <p className="empty-state">No past sessions</p>
          ) : (
            pastSessions.map(s => {
              const myReview = s.reviews?.find(r => r.reviewerId === currentUser?.id);
              const isReviewing = reviewingSessionId === s.id;

              return (
                <div key={s.id} className="session-item glass-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="session-item__time">
                        {new Date(s.scheduledStart).toLocaleString()} &ndash; {new Date(s.scheduledEnd).toLocaleTimeString()}
                      </div>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {s.durationMinutes} min &middot; {s.meetingMethod} &middot; {s.agenda || 'No agenda'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="badge badge--success">Completed</span>
                      {myReview ? (
                        <span className="badge" style={{ background: 'var(--brand-blue)', color: 'white' }}>Feedback submitted</span>
                      ) : (
                        !isReviewing && (
                          <button className="btn-secondary" onClick={() => {
                            setReviewingSessionId(s.id);
                            setRating(5);
                            setPunctuality(5);
                            setComment('');
                          }}>
                            Leave Feedback
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {isReviewing && (
                    <form 
                      onSubmit={(e) => handleFeedbackSubmit(e, s.id)} 
                      style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border-subtle)' }}
                    >
                      <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Provide Feedback</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Overall Rating</label>
                          <select value={rating} onChange={(e) => setRating(e.target.value)}>
                            {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Punctuality</label>
                          <select value={punctuality} onChange={(e) => setPunctuality(e.target.value)}>
                            {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Comment (Private until both review)</label>
                        <textarea required value={comment} onChange={(e) => setComment(e.target.value)} rows="2"></textarea>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setReviewingSessionId(null)}>Cancel</button>
                        <button type="submit" className="primary-cta" style={{ width: 'auto' }}>Submit Feedback</button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}


      {toastMsg && (
        <div className="toast toast--info toast--visible" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
