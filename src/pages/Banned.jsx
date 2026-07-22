import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../shared/api';
import { getUser, clearAuth } from '../shared/auth';

export default function Banned() {
  const [reason, setReason] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const currentUser = getUser();

  useEffect(() => {
    const savedReason = localStorage.getItem('skillswap-ban-reason');
    if (savedReason) {
      setReason(savedReason);
    } else if (currentUser?.isBanned) {
      setReason(currentUser.banReason || 'Your account was suspended.');
    } else {
      navigate('/');
    }
  }, [navigate, currentUser]);

  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem('skillswap-ban-reason');
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contactMsg.trim()) return;
    setSending(true);
    setError('');
    try {
      const email = currentUser?.email || emailInput;
      const name = currentUser?.name || 'Banned User Appeal';
      
      if (!email) {
        throw new Error('Please specify an email address');
      }

      await api('/support', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          message: contactMsg,
          isAppeal: true
        }),
      });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send appeal');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-card">
        <h1 className="auth-title" style={{ color: 'var(--brand-orange)' }}>Account Suspended</h1>
        <p className="auth-subtitle" style={{ color: 'var(--text-primary)' }}>Your access to SkillSwap has been revoked.</p>

        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255, 69, 0, 0.1)', border: '1px solid var(--brand-orange)', borderRadius: '8px' }}>
          <h3 style={{ color: 'var(--brand-orange)', marginBottom: '8px', fontSize: '14px', textTransform: 'uppercase' }}>Reason</h3>
          <p style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{reason}</p>
        </div>

        {sent ? (
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--brand-green)', fontWeight: 'bold' }}>Appeal Sent Successfully</p>
            <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Our support team will review your appeal and contact you if your account status changes.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: '32px' }}>
            <p style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              If you believe this is a mistake, you can contact our support team to appeal this decision.
            </p>
            {!currentUser && (
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="email">Your Email Address</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="appealMsg">Appeal Message</label>
              <textarea
                id="appealMsg"
                required
                rows="4"
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                placeholder="Explain why your account should be reinstated..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
            </div>
            {error && <p className="error-message" style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>{error}</p>}
            <button type="submit" className="primary-cta auth-btn" disabled={sending} style={{ marginTop: '16px', width: '100%' }}>
              {sending ? 'Sending...' : 'Submit Appeal'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          {currentUser && (
            <button 
              type="button" 
              onClick={handleLogout} 
              className="btn-secondary" 
              style={{ padding: '8px 16px', fontSize: '14px', border: 'none', background: 'transparent', color: 'var(--brand-orange)', cursor: 'pointer', fontWeight: '600' }}
            >
              Log Out / Sign Out
            </button>
          )}
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Return to Home</Link>
        </div>
      </div>
    </div>
  );
}
