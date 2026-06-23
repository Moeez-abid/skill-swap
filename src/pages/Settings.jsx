import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, users } from '../shared/api';
import { isLoggedIn, clearAuth } from '../shared/auth';

export default function Settings() {
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [availabilityStatus, setAvailabilityStatus] = useState('AVAILABLE');
  const [notifyMatches, setNotifyMatches] = useState(false);
  const [notifyMessages, setNotifyMessages] = useState(false);
  const [notifySessions, setNotifySessions] = useState(false);

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
        setBio(user.bio || '');
        setLocation(user.location || '');
        setTimezone(user.timezone || 'UTC');
        setAvailabilityStatus(user.availabilityStatus || 'AVAILABLE');
        setNotifyMatches(user.notifyMatches || false);
        setNotifyMessages(user.notifyMessages || false);
        setNotifySessions(user.notifySessions || false);
      })
      .catch(() => {
        // Handle error, e.g. offline
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    try {
      await users.update({
        name,
        bio,
        location,
        timezone,
        availabilityStatus,
        notifyMatches,
        notifyMessages,
        notifySessions,
      });
      showToast('Settings saved');
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
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
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
