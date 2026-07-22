import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, users } from '../shared/api';
import { isLoggedIn, clearAuth, getUser, setAuth, getToken } from '../shared/auth';
import { getImageUrl } from '../shared/api';

export default function Settings() {
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  const [isVerified, setIsVerified] = useState(false);
  const [verificationRequested, setVerificationRequested] = useState(false);

  // New verification states
  const [googleId, setGoogleId] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phone, setPhone] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const googleBtnRef = React.useRef(null);

  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }

    auth.me()
      .then(res => {
        const { user } = res;
        setName(user.name || '');
        setHeadline(user.headline || '');
        setBio(user.bio || '');
        setLocation(user.location || '');
        setLinkedinUrl(user.linkedinUrl || '');
        setGithubUrl(user.githubUrl || '');
        setPortfolioUrl(user.portfolioUrl || '');
        setAvatarUrl(user.avatarUrl || '');
        setTimezone(user.timezone || 'UTC');

        setIsVerified(user.isVerified || false);
        setVerificationRequested(user.verificationRequested || false);
        setGoogleId(user.googleId || '');
        setPhoneVerified(user.phoneVerified || false);
        setPhone(user.phone || '');
        setInputPhone(user.phone || '');
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  useEffect(() => {
    if (googleId || loading) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGoogleLink = () => {
      if (!window.google) return;
      
      window.handleGoogleLinkResponse = async (response) => {
        try {
          const result = await users.linkGoogle(response.credential);
          setGoogleId(result.user.googleId);
          setIsVerified(result.user.isVerified);
          setPhoneVerified(result.user.phoneVerified);
          const currentUser = getUser();
          if (currentUser) {
            setAuth(getToken(), { ...currentUser, ...result.user });
          }
          showToast('Google account linked successfully');
          window.dispatchEvent(new Event('user-updated'));
        } catch (err) {
          showToast(err.message || 'Google account link failed');
        }
      };

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: window.handleGoogleLinkResponse
      });

      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(
          googleBtnRef.current,
          { theme: 'outline', size: 'large', text: 'continue_with' }
        );
      }
    };

    if (window.google) {
      initGoogleLink();
    } else {
      const intervalId = setInterval(() => {
        if (window.google) {
          clearInterval(intervalId);
          initGoogleLink();
        }
      }, 100);
      return () => clearInterval(intervalId);
    }
  }, [googleId, loading]);

  const handleSendEmailOtp = async () => {
    try {
      const res = await users.sendEmailOtp();
      setEmailOtpSent(true);
      if (res.otp) {
        showToast(`Verification code: ${res.otp}`);
      } else {
        showToast('Verification code sent to your email');
      }
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleVerifyEmailOtp = async () => {
    try {
      const res = await users.verifyEmailOtp(emailOtpCode);
      setIsVerified(res.user.isVerified);
      setPhoneVerified(res.user.phoneVerified);
      const currentUser = getUser();
      if (currentUser) {
        setAuth(getToken(), { ...currentUser, ...res.user });
      }
      showToast('Email verified successfully');
      setEmailOtpSent(false);
      setEmailOtpCode('');
      window.dispatchEvent(new Event('user-updated'));
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!inputPhone.trim()) {
      showToast('Please enter a valid phone number');
      return;
    }
    try {
      const res = await users.sendPhoneOtp(inputPhone);
      setPhoneOtpSent(true);
      if (res.otp) {
        showToast(`Simulated SMS code: ${res.otp}`);
      } else {
        showToast('Verification code sent via SMS');
      }
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    try {
      const res = await users.verifyPhoneOtp(phoneOtpCode);
      setIsVerified(res.user.isVerified);
      setPhoneVerified(res.user.phoneVerified);
      setPhone(res.user.phone);
      const currentUser = getUser();
      if (currentUser) {
        setAuth(getToken(), { ...currentUser, ...res.user });
      }
      showToast('Phone verified successfully');
      setPhoneOtpSent(false);
      setPhoneOtpCode('');
      window.dispatchEvent(new Event('user-updated'));
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await users.uploadAvatar(formData);
      setAvatarUrl(res.user.avatarUrl);
      const currentUser = getUser();
      if (currentUser) {
        setAuth(getToken(), { ...currentUser, avatarUrl: res.user.avatarUrl });
        window.dispatchEvent(new Event('user-updated'));
      }
      showToast('Profile picture updated');
    } catch (err) {
      showToast(err.message || 'Failed to upload image');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    try {
      const res = await users.update({
        name,
        headline,
        bio,
        location,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        timezone,

      });
      const currentUser = getUser();
      if (currentUser && res.user) {
        setAuth(getToken(), { ...currentUser, ...res.user });
      }
      showToast('Settings saved');
      // Dispatch event to update navbar instantly without reload
      window.dispatchEvent(new Event('user-updated'));
    } catch (err) {
      setProfileError(err.message);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    try {
      await users.updatePassword({
        currentPassword,
        newPassword,
      });
      showToast('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Permanently delete your account? This cannot be undone.')) return;
    try {
      await users.deleteAccount();
      clearAuth();
      navigate('/');
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleRequestVerification = async () => {
    try {
      await users.requestVerification();
      showToast('Verification requested');
      setVerificationRequested(true);
      window.dispatchEvent(new Event('user-updated'));
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px' }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Update your profile, notifications, and account security.</p>
      </div>

      {loading ? (
        <p className="loading">Loading settings…</p>
      ) : (
        <>
      <form className="form-card glass-card animate-fade-up delay-1" style={{ marginBottom: '32px' }} onSubmit={handleProfileSubmit}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Profile</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          {avatarUrl ? (
            <img src={getImageUrl(avatarUrl)} alt="" className="avatar" width="80" height="80" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="avatar avatar--initials" style={{ width: '80px', height: '80px', fontSize: '32px' }}>
              {(name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}
          <div>
            <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
              Upload Picture
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </label>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>JPG, JPEG, or PNG, max 5MB</p>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="headline">Professional Headline</label>
          <input id="headline" placeholder="e.g. Senior Software Engineer" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="bio">Bio</label>
          <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)}></textarea>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="timezone">Timezone</label>
            <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="EST">EST (Eastern Standard Time)</option>
              <option value="CST">CST (Central Standard Time)</option>
              <option value="PST">PST (Pacific Standard Time)</option>
              <option value="GMT">GMT (Greenwich Mean Time)</option>
              <option value="CET">CET (Central European Time)</option>
              <option value="IST">IST (Indian Standard Time)</option>
              <option value="JST">JST (Japan Standard Time)</option>
              <option value="AEST">AEST (Australian Eastern Standard Time)</option>
            </select>
          </div>
        </div>
        
        <h3 style={{ fontSize: '1rem', marginBottom: '12px', marginTop: '16px' }}>Social Links</h3>
        <div className="form-group">
          <label htmlFor="linkedinUrl">LinkedIn URL</label>
          <input id="linkedinUrl" type="url" placeholder="https://linkedin.com/in/username" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="githubUrl">GitHub URL</label>
          <input id="githubUrl" type="url" placeholder="https://github.com/username" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="portfolioUrl">Portfolio/Website URL</label>
          <input id="portfolioUrl" type="url" placeholder="https://yourwebsite.com" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
        </div>
        
        <button type="submit" className="primary-cta" style={{ marginTop: '16px' }}>Save Settings</button>
        {profileError && <p className="form-error">{profileError}</p>}
      </form>



      <div className="form-card glass-card animate-fade-up delay-2" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Account Verification</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Get a verified badge on your profile and skills to build trust with other users.
        </p>

        {isVerified ? (
          <div className="badge badge--success" style={{ display: 'inline-flex', padding: '10px 20px', fontSize: '15px', borderRadius: '30px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Verified Account
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Step 1: Google account */}
            <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-surface-raised)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                1. Google Account Link
                {googleId && (
                  <span style={{ color: '#22c55e', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Linked
                  </span>
                )}
              </h3>
              
              {!googleId ? (
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Please link your Google account to confirm your identity.
                  </p>
                  <div ref={googleBtnRef} style={{ display: 'inline-block' }}></div>
                </div>
              ) : (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Google account linked successfully. Please verify your email inbox to verify ownership.
                  </p>
                  
                  {emailOtpSent ? (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', maxWidth: '360px' }}>
                      <input 
                        type="text" 
                        placeholder="Enter 6-digit Email code" 
                        value={emailOtpCode} 
                        onChange={(e) => setEmailOtpCode(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                      />
                      <button type="button" className="primary-cta" onClick={handleVerifyEmailOtp} style={{ minHeight: 'auto', padding: '10px 16px' }}>
                        Verify
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="btn-secondary" onClick={handleSendEmailOtp} style={{ minHeight: 'auto', padding: '8px 16px' }}>
                      Send Verification Code
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Phone number */}
            <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-surface-raised)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                2. Phone Number Verification
                {phoneVerified && (
                  <span style={{ color: '#22c55e', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Verified
                  </span>
                )}
              </h3>

              {phoneVerified ? (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Verified Number: <strong>{phone}</strong>
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Add a verified phone number to complete account validation.
                  </p>
                  
                  {!phoneOtpSent ? (
                    <div style={{ display: 'flex', gap: '12px', maxWidth: '360px' }}>
                      <input 
                        type="tel" 
                        placeholder="+1 555-555-5555" 
                        value={inputPhone} 
                        onChange={(e) => setInputPhone(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', flex: 1 }}
                      />
                      <button type="button" className="btn-secondary" onClick={handleSendPhoneOtp} style={{ minHeight: 'auto', padding: '10px 16px' }}>
                        Send SMS
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', maxWidth: '360px' }}>
                      <input 
                        type="text" 
                        placeholder="Enter 6-digit SMS code" 
                        value={phoneOtpCode} 
                        onChange={(e) => setPhoneOtpCode(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                      />
                      <button type="button" className="primary-cta" onClick={handleVerifyPhoneOtp} style={{ minHeight: 'auto', padding: '10px 16px' }}>
                        Verify SMS
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <form className="form-card glass-card animate-fade-up delay-2" style={{ marginBottom: '32px' }} onSubmit={handlePasswordSubmit}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Change Password</h2>
        <div className="form-group">
          <label htmlFor="currentPassword">Current password</label>
          <input type="password" id="currentPassword" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="newPassword">New password</label>
          <input type="password" id="newPassword" required minLength="8" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn-secondary">Update Password</button>
        {passwordError && <p className="form-error">{passwordError}</p>}
      </form>

      <div className="form-card glass-card animate-fade-up delay-3">
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px', color: '#dc2626' }}>Danger Zone</h2>
        <button type="button" onClick={handleDeleteAccount} className="btn-secondary" style={{ borderColor: '#dc2626', color: '#dc2626' }}>
          Delete Account
        </button>
      </div>

      {toastMsg && (
        <div className="toast toast--info toast--visible" role="status">
          {toastMsg}
        </div>
      )}
      </>
      )}
    </div>
  );
}
