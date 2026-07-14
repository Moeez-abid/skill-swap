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
      const searchParams = new URLSearchParams(location.search);
      navigate(searchParams.get('redirect') || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px' }}>
      <form className="form-card glass-card animate-fade-up" onSubmit={handleSubmit}>
        <h1 className="page-title animate-fade-up delay-1">{isRegister ? 'Join the Community' : 'Welcome back'}</h1>
        <p className="page-subtitle animate-fade-up delay-1" style={{ marginBottom: '24px' }}>
          {isRegister ? 'Create an account to start swapping skills.' : 'Log in to manage your skills and swaps.'}
        </p>
        
        {isRegister && (
          <div className="form-group animate-fade-up delay-2">
            <label htmlFor="name">Full Name</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        
        <div className="form-group animate-fade-up delay-2">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        
        <div className="form-group animate-fade-up delay-2">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isRegister ? 'new-password' : 'current-password'} />
        </div>
        
        <button type="submit" className="primary-cta animate-fade-up delay-3" disabled={loading}>
          {loading ? 'Please wait...' : (isRegister ? 'Sign up' : 'Log in')}
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }} className="animate-fade-up delay-4">
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span style={{ padding: '0 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>or</span>
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>
        
        <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} className="animate-fade-up delay-4"></div>
        
        <p style={{ marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center' }} className="animate-fade-up delay-5">
          {isRegister ? 'Already have an account? ' : 'No account? '}
          {isRegister ? (
            <Link to="/login">Log in here</Link>
          ) : (
            <Link to="/register">Sign up free</Link>
          )}
        </p>
        
        {error && <p className="form-error">{error}</p>}
      </form>
    </div>
  );
}
