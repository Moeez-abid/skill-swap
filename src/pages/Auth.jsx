import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth as authApi } from '../shared/api';
import { setAuth, isLoggedIn } from '../shared/auth';

export default function Auth({ isRegister = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGoogle = () => {
      if (!window.google) return;
      
      window.handleGoogleCredentialResponse = async (response) => {
        setError('');
        try {
          const result = await authApi.google(response.credential);
          setAuth(result.token, result.user);
          if (result.user?.isBanned) {
            localStorage.setItem('skillswap-ban-reason', result.user.banReason || 'Your account has been suspended.');
            navigate('/banned', { replace: true });
            return;
          }
          const searchParams = new URLSearchParams(location.search);
          navigate(searchParams.get('redirect') || '/dashboard');
        } catch (err) {
          setError(err.message);
        }
      };

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: window.handleGoogleCredentialResponse
      });

      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(
          googleBtnRef.current,
          { theme: 'outline', size: 'large', width: '100%' }
        );
      }
    };

    if (window.google) {
      initGoogle();
    } else {
      const intervalId = setInterval(() => {
        if (window.google) {
          clearInterval(intervalId);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(intervalId);
    }
  }, [location.search, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isRegister) {
        result = await authApi.register(email, password, name);
      } else {
        result = await authApi.login(email, password);
      }
      setAuth(result.token, result.user);
      if (result.user?.isBanned) {
        localStorage.setItem('skillswap-ban-reason', result.user.banReason || 'Your account has been suspended.');
        navigate('/banned', { replace: true });
        return;
      }
      const searchParams = new URLSearchParams(location.search);
      navigate(searchParams.get('redirect') || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      paddingTop: '120px', 
      paddingBottom: '80px', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: 'calc(100vh - 80px)',
      background: 'radial-gradient(circle at 50% 0%, rgba(var(--accent-rgb, 59, 130, 246), 0.08) 0%, transparent 60%)'
    }}>
      <form className="form-card glass-card animate-fade-up" onSubmit={handleSubmit} style={{ 
        width: '100%', 
        maxWidth: '440px', 
        padding: '48px 40px', 
        borderRadius: '20px', 
        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.15), 0 0 0 1px var(--border)',
        background: 'var(--bg-card)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link to="/" className="nav-logo" style={{ fontSize: '2.2rem', display: 'inline-block', marginBottom: '20px', textDecoration: 'none' }}>SkillSwap</Link>
          <h1 className="page-title" style={{ fontSize: '1.8rem', marginBottom: '10px', fontWeight: '700', letterSpacing: '-0.02em' }}>
            {isRegister ? 'Create an account' : 'Welcome back'}
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
            {isRegister ? 'Join the community to start swapping skills.' : 'Log in to manage your skills and swaps.'}
          </p>
        </div>
        
        {error && (
          <div className="form-error animate-fade-up" style={{ marginBottom: '24px', padding: '14px', background: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', borderRadius: '10px', textAlign: 'center', fontSize: '0.95rem', fontWeight: '500', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
            {error}
          </div>
        )}
        
        {isRegister && (
          <div className="form-group animate-fade-up delay-1">
            <label htmlFor="name" style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>Full Name</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Jane Doe" style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', width: '100%', fontSize: '1rem', transition: 'border-color 0.2s ease' }} />
          </div>
        )}
        
        <div className="form-group animate-fade-up delay-1">
          <label htmlFor="email" style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>Email Address</label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', width: '100%', fontSize: '1rem', transition: 'border-color 0.2s ease' }} />
        </div>
        
        <div className="form-group animate-fade-up delay-2">
          <label htmlFor="password" style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>Password</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="••••••••" style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', width: '100%', fontSize: '1rem', transition: 'border-color 0.2s ease' }} />
        </div>
        
        <button type="submit" className="primary-cta animate-fade-up delay-3" disabled={loading} style={{ 
          width: '100%', 
          marginTop: '12px'
        }}>
          {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Log In')}
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', margin: '28px 0' }} className="animate-fade-up delay-4">
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--border)' }}></div>
          <span style={{ padding: '0 16px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or continue with</span>
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--border)' }}></div>
        </div>
        
        <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} className="animate-fade-up delay-4"></div>
        
        <p style={{ marginTop: '32px', fontSize: '0.95rem', color: 'var(--text-secondary)', textAlign: 'center' }} className="animate-fade-up delay-5">
          {isRegister ? 'Already have an account? ' : 'Don\'t have an account? '}
          {isRegister ? (
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>Log in here</Link>
          ) : (
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>Sign up for free</Link>
          )}
        </p>
      </form>
    </div>
  );
}
