import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../shared/api';

export default function Banned() {
  const [reason, setReason] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedReason = localStorage.getItem('skillswap-ban-reason');
    if (savedReason) {
      setReason(savedReason);
    } else {
      // If they land here without a reason, redirect to home
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contactMsg.trim()) return;
    setSending(true);
    setError('');
    try {
      // Note: In an actual robust system, you'd want to allow banned users to submit 
      // support tickets by attaching their email since they are logged out.
      await api('/support', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Banned User Appeal',
          email: 'banned@skillswap.local', // Placeholder, the backend should ideally capture the real email if possible, or they can provide it in the message
          message: `[BAN APPEAL]\n\n${contactMsg}`,
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
            <div className="form-group">
              <label>Appeal Message (Please include your email)</label>
              <textarea
                required
                rows="4"
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                placeholder="Explain why your account should be reinstated, and provide an email we can reach you at..."
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="primary-cta auth-btn" disabled={sending}>
              {sending ? 'Sending...' : 'Submit Appeal'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Return to Home</Link>
        </div>
      </div>
    </div>
  );
}
