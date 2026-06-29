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
  const [availabilityStatus, setAvailabilityStatus] = useState('AVAILABLE');
  const [notifyMatches, setNotifyMatches] = useState(false);
  const [notifyMessages, setNotifyMessages] = useState(false);
  const [notifySessions, setNotifySessions] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationRequested, setVerificationRequested] = useState(false);

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
        setAvailabilityStatus(user.availabilityStatus || 'AVAILABLE');
        setNotifyMatches(user.notifyMatches || false);
        setNotifyMessages(user.notifyMessages || false);
        setNotifySessions(user.notifySessions || false);
        setIsVerified(user.isVerified || false);
        setVerificationRequested(user.verificationRequested || false);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

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
        availabilityStatus,
        notifyMatches,
        notifyMessages,
        notifySessions,
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
    <div style={{ paddingTop: '100px', paddingBottom: '64px' }}>
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
            <input id="timezone" placeholder="UTC" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
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
        <div className="form-group">
          <label htmlFor="availabilityStatus">Global Availability</label>
          <select id="availabilityStatus" value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value)}>
            <option value="AVAILABLE">Available</option>
            <option value="BUSY">Busy</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
        </div>
        <fieldset style={{ border: 'none', marginTop: '16px' }}>
          <legend style={{ marginBottom: '12px' }}>Notifications</legend>
          <div className="checkbox-group">
            <label>
              <input type="checkbox" checked={notifyMatches} onChange={(e) => setNotifyMatches(e.target.checked)} /> Match requests
            </label>
            <label>
              <input type="checkbox" checked={notifyMessages} onChange={(e) => setNotifyMessages(e.target.checked)} /> Messages
            </label>
            <label>
              <input type="checkbox" checked={notifySessions} onChange={(e) => setNotifySessions(e.target.checked)} /> Sessions
            </label>
          </div>
        </fieldset>
        <button type="submit" className="primary-cta" style={{ marginTop: '16px' }}>Save Settings</button>
        {profileError && <p className="form-error">{profileError}</p>}
      </form>

      <div className="form-card glass-card animate-fade-up delay-2" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Account Verification</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Get a verified badge on your profile and skills to build trust with other users.
        </p>
        {isVerified ? (
          <div className="badge badge--success" style={{ display: 'inline-flex', padding: '8px 16px', fontSize: '14px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Verified Account
          </div>
        ) : verificationRequested ? (
          <div className="badge" style={{ display: 'inline-block', padding: '8px 16px', fontSize: '14px' }}>
            Verification Pending
          </div>
        ) : (
          <button type="button" className="btn-secondary" onClick={handleRequestVerification}>
            Request Verification
          </button>
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
