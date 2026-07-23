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
  const [hasAppealed, setHasAppealed] = useState(false);
  const [checking, setChecking] = useState(true);
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

  useEffect(() => {
    const checkStatus = async () => {
      const email = currentUser?.email;
      if (!email) {
        setChecking(false);
        return;
      }
      try {
        const res = await api(`/support/check-appeal?email=${encodeURIComponent(email)}`);
        if (res.hasAppealed) {
          setHasAppealed(true);
          setSent(true);
        }
      } catch (err) {
        console.error('Failed to check appeal status:', err);
      } finally {
        setChecking(false);
      }
    };
    if (currentUser) {
      checkStatus();
    } else {
      setChecking(false);
    }
  }, [currentUser]);

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
      setHasAppealed(true);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send appeal');
    } finally {
      setSending(false);
    }
  };

  if (checking) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(100vh - 80px)',
        background: 'radial-gradient(circle at 50% 0%, rgba(var(--accent-rgb, 232, 83, 14), 0.08) 0%, transparent 60%)',
        position: 'relative'
      }}>
        <div className="bg-ambient-layer">
          <div className="bg-grid-overlay"></div>
          <div className="glow-orb orb-top-left"></div>
          <div className="glow-orb orb-bottom-right"></div>
        </div>
        <div className="glass-card" style={{ padding: '24px 48px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-surface)', zIndex: 1 }}>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Fustat, sans-serif', fontSize: '1.1rem' }}>Checking status...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      paddingTop: '120px', 
      paddingBottom: '80px', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: 'calc(100vh - 80px)',
      background: 'radial-gradient(circle at 50% 0%, rgba(var(--accent-rgb, 232, 83, 14), 0.08) 0%, transparent 60%)',
      position: 'relative'
    }}>
      {/* Background glow orbs */}
      <div className="bg-ambient-layer">
        <div className="bg-grid-overlay"></div>
        <div className="glow-orb orb-top-left"></div>
        <div className="glow-orb orb-bottom-right"></div>
      </div>

      <div className="glass-card animate-fade-up" style={{ 
        width: '100%', 
        maxWidth: '520px', 
        padding: '48px 40px', 
        borderRadius: '20px', 
        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.15), 0 0 0 1px var(--border)',
        background: 'var(--bg-surface)',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '16px', 
            background: 'var(--accent-subtle)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'var(--accent)', 
            margin: '0 auto 20px auto',
            boxShadow: '0 8px 16px var(--accent-shadow)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)', fontFamily: 'Fustat, sans-serif' }}>
            Account Suspended
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
            Your access to SkillSwap has been suspended.
          </p>
        </div>

        <div style={{ 
          padding: '20px', 
          background: 'var(--bg-surface-raised)', 
          border: '1px solid var(--border)', 
          borderRadius: '14px',
          marginBottom: '32px'
        }}>
          <h3 style={{ 
            color: 'var(--accent)', 
            marginBottom: '8px', 
            fontSize: '0.85rem', 
            fontWeight: '700', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em' 
          }}>
            Suspension Reason
          </h3>
          <p style={{ 
            color: 'var(--text-primary)', 
            whiteSpace: 'pre-wrap', 
            fontSize: '0.95rem', 
            lineHeight: '1.6' 
          }}>
            {reason}
          </p>
        </div>

        {sent ? (
          <div style={{ marginTop: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }} className="animate-fade-up">
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              background: 'rgba(22, 163, 74, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--brand-green)' 
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 style={{ color: 'var(--brand-green)', fontWeight: '700', fontSize: '1.2rem' }}>
              {hasAppealed ? 'Appeal Already Submitted' : 'Appeal Submitted'}
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0' }}>
              {hasAppealed 
                ? 'We have already received your appeal for this account. Our support team is currently reviewing it.' 
                : 'Our support team will review your appeal and contact you at your email address if your account status changes.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: '0.95rem', marginBottom: '20px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              If you believe this is a mistake, you can contact our support team to appeal this decision.
            </p>
            {!currentUser && (
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label htmlFor="email" style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>Your Email Address</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--bg-surface)', 
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                />
              </div>
            )}
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label htmlFor="appealMsg" style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>Appeal Message</label>
              <textarea
                id="appealMsg"
                required
                rows="4"
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                placeholder="Explain why your account should be reinstated..."
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border)', 
                  background: 'var(--bg-surface)', 
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  lineHeight: '1.5',
                  transition: 'border-color 0.2s ease',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>
            {error && (
              <div className="form-error" style={{ marginBottom: '16px', padding: '12px', background: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', borderRadius: '10px', textAlign: 'center', fontSize: '0.95rem', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
                {error}
              </div>
            )}
            <button type="submit" className="primary-cta" disabled={sending} style={{ width: '100%' }}>
              {sending ? 'Sending...' : 'Submit Appeal'}
            </button>
          </form>
        )}

        <div style={{ 
          marginTop: '32px', 
          paddingTop: '24px', 
          borderTop: '1px solid var(--border)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px', 
          alignItems: 'center' 
        }}>
          {currentUser && (
            <button 
              type="button" 
              onClick={handleLogout} 
              className="btn-secondary" 
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600' }}
            >
              Sign Out
            </button>
          )}
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '500', transition: 'color 0.2s' }}>
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
