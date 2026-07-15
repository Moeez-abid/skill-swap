import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, users } from '../shared/api';
import { isLoggedIn, getUser, setAuth, getToken } from '../shared/auth';

export default function NotificationSettings() {
  const navigate = useNavigate();

  const [notifyMatches, setNotifyMatches] = useState(false);
  const [notifyMessages, setNotifyMessages] = useState(false);
  const [notifySessions, setNotifySessions] = useState(false);
  const [emailNotifyMatches, setEmailNotifyMatches] = useState(false);
  const [emailNotifyMessages, setEmailNotifyMessages] = useState(false);
  const [emailNotifySessions, setEmailNotifySessions] = useState(false);

  const [loading, setLoading] = useState(true);
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
        setNotifyMatches(user.notifyMatches ?? false);
        setNotifyMessages(user.notifyMessages ?? false);
        setNotifySessions(user.notifySessions ?? false);
        setEmailNotifyMatches(user.emailNotifyMatches ?? false);
        setEmailNotifyMessages(user.emailNotifyMessages ?? false);
        setEmailNotifySessions(user.emailNotifySessions ?? false);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  const handleNotificationsSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await users.update({
        notifyMatches,
        notifyMessages,
        notifySessions,
        emailNotifyMatches,
        emailNotifyMessages,
        emailNotifySessions,
      });
      const currentUser = getUser();
      if (currentUser && res.user) {
        setAuth(getToken(), { ...currentUser, ...res.user });
      }
      showToast('Notification settings saved');
    } catch (err) {
      showToast(err.message || 'Failed to update notifications');
    }
  };

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px' }}>
      <div className="page-header">
        <h1 className="page-title">Notification Settings</h1>
        <p className="page-subtitle">Manage how you receive alerts and updates.</p>
      </div>

      {loading ? (
        <p className="loading">Loading settings…</p>
      ) : (
        <>
          <form className="form-card glass-card animate-fade-up delay-1" style={{ marginBottom: '32px' }} onSubmit={handleNotificationsSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
              <fieldset style={{ border: 'none', padding: 0 }}>
                <legend style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>In-App Notifications</legend>
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

              <fieldset style={{ border: 'none', padding: 0 }}>
                <legend style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Email Notifications</legend>
                <div className="checkbox-group">
                  <label>
                    <input type="checkbox" checked={emailNotifyMatches} onChange={(e) => setEmailNotifyMatches(e.target.checked)} /> Match requests
                  </label>
                  <label>
                    <input type="checkbox" checked={emailNotifySessions} onChange={(e) => setEmailNotifySessions(e.target.checked)} /> Sessions
                  </label>
                </div>
              </fieldset>
            </div>
            
            <button type="submit" className="primary-cta" style={{ marginTop: '24px' }}>Save Notifications</button>
          </form>

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
