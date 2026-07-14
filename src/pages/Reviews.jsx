import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviews } from '../shared/api';
import { isLoggedIn } from '../shared/auth';

export default function Reviews() {
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState('');
  const [ratingOverall, setRatingOverall] = useState('5');
  const [ratingTeaching, setRatingTeaching] = useState('5');
  const [ratingCommunication, setRatingCommunication] = useState('5');
  const [ratingPunctuality, setRatingPunctuality] = useState('5');
  const [feedback, setFeedback] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!sessionId) {
      setError('Enter a session ID');
      return;
    }

    setLoading(true);
    try {
      await reviews.create(sessionId, {
        ratingOverall: parseInt(ratingOverall, 10),
        ratingTeaching: parseInt(ratingTeaching, 10),
        ratingCommunication: parseInt(ratingCommunication, 10),
        ratingPunctuality: parseInt(ratingPunctuality, 10),
        feedback,
      });
      showToast('Review submitted. It will reveal when both parties submit.');
      setSessionId('');
      setRatingOverall('5');
      setRatingTeaching('5');
      setRatingCommunication('5');
      setRatingPunctuality('5');
      setFeedback('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px' }}>
      <div className="page-header">
        <h1 className="page-title">Mutual Reviews</h1>
        <p className="page-subtitle">Blind review system &mdash; feedback reveals only after both parties submit. Locked 48 hours after submission.</p>
      </div>

      <form className="form-card glass-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="sessionId">Session ID</label>
          <input 
            id="sessionId" 
            required 
            placeholder="From completed session" 
            value={sessionId} 
            onChange={(e) => setSessionId(e.target.value)} 
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Overall</label>
            <select required value={ratingOverall} onChange={(e) => setRatingOverall(e.target.value)}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} star{n>1?'s':''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Teaching</label>
            <select required value={ratingTeaching} onChange={(e) => setRatingTeaching(e.target.value)}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} star{n>1?'s':''}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Communication</label>
            <select required value={ratingCommunication} onChange={(e) => setRatingCommunication(e.target.value)}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} star{n>1?'s':''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Punctuality</label>
            <select required value={ratingPunctuality} onChange={(e) => setRatingPunctuality(e.target.value)}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} star{n>1?'s':''}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="feedback">Written feedback (50–1000 chars)</label>
          <textarea 
            id="feedback" 
            required 
            minLength="50" 
            maxLength="1000"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          ></textarea>
        </div>

        <button type="submit" className="primary-cta" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>

        {error && <p className="form-error">{error}</p>}
      </form>

      {toastMsg && (
        <div className="toast toast--info toast--visible" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
