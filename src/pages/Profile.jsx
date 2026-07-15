import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { users, skills, getImageUrl } from '../shared/api';
import { getUser } from '../shared/auth';
import SkillCard from '../components/SkillCard';

function formatAvailability(status) {
  return { AVAILABLE: 'Available', BUSY: 'Busy', UNAVAILABLE: 'Unavailable' }[status] || status;
}

function renderStars(rating, max = 5) {
  return Array.from({ length: max }, (_, i) => (
    <svg key={i} className={`star ${i < Math.round(rating) ? 'star--filled' : ''}`} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  ));
}

function Avatar({ user, size = 40, className = "avatar" }) {
  const initials = (user?.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2);
  if (user?.avatarUrl) {
    return <img src={getImageUrl(user.avatarUrl)} alt="" className={className} width={size} height={size} style={{ objectFit: 'cover' }} />;
  }
  return (
    <span className={`${className} avatar--initials`} style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const loggedInUser = getUser();
  const userId = queryId || loggedInUser?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const blockDialogRef = useRef(null);
  const reportDialogRef = useRef(null);
  const [reportForm, setReportForm] = useState({ reason: '', details: '' });
  const [blockError, setBlockError] = useState('');
  const [reportMessage, setReportMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!userId) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    users.profile(userId)
      .then(res => {
        setProfile(res.profile);
        setError(false);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  const isOwner = loggedInUser?.id === profile?.id;

  const confirmBlock = async () => {
    setBlockError('');
    try {
      await users.blockUser(profile.id, 'User blocked from profile');
      blockDialogRef.current?.close();
      window.location.href = '/';
    } catch (err) {
      if (err.message.toLowerCase().includes('auth') || !loggedInUser) {
        window.location.href = '/login';
      } else {
        setBlockError(err.message);
      }
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!reportForm.reason) return;
    setReportMessage({ type: '', text: '' });
    try {
      await users.reportUser(profile.id, reportForm.reason, reportForm.details);
      setReportMessage({ type: 'success', text: 'User reported successfully.' });
      setTimeout(() => {
        reportDialogRef.current?.close();
        setReportForm({ reason: '', details: '' });
        setReportMessage({ type: '', text: '' });
      }, 2000);
    } catch (err) {
      if (err.message.toLowerCase().includes('auth') || !loggedInUser) {
        window.location.href = '/login';
      } else {
        setReportMessage({ type: 'error', text: err.message });
      }
    }
  };

  if (error) return <div style={{ paddingTop: '130px', paddingBottom: '64px' }}><div className="empty-state"><h3>Profile not found</h3></div></div>;

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px' }}>
      {loading || !profile ? (
        <p className="loading">Loading profile…</p>
      ) : (
        <>
      <header className="profile-header glass-card animate-fade-up" style={{ padding: '40px', overflow: 'hidden', borderRadius: '24px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Avatar user={{ ...profile, name: profile.name }} size={132} className="avatar profile-header__avatar" style={{ background: 'var(--bg-card)', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <div>
              {isOwner ? (
                <button className="btn-secondary" onClick={() => window.location.href='/settings'} style={{ padding: '8px 24px', fontWeight: 600, borderRadius: '24px' }}>Edit Profile</button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '24px' }} onClick={() => reportDialogRef.current?.showModal()}>Report</button>
                  <button className="btn-secondary" style={{ fontSize: '13px', padding: '8px 16px', color: '#ef4444', borderColor: '#ef4444', borderRadius: '24px' }} onClick={() => blockDialogRef.current?.showModal()}>Block</button>
                </div>
              )}
            </div>
          </div>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', fontSize: '2rem' }}>
              {profile.name}
              {profile.isVerified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, marginLeft: '12px', padding: '3px 8px', background: 'color-mix(in srgb, var(--accent) 10%, transparent)', borderRadius: '16px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Approved
                </span>
              )}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '1.1rem', fontWeight: 500 }}>@{profile.email?.split('@')[0] || profile.name.toLowerCase().replace(/\s+/g, '')}</p>
            {profile.headline && <p style={{ fontSize: '1.15rem', fontWeight: 500, marginBottom: '12px', color: 'var(--text-primary)' }}>{profile.headline}</p>}
            <p style={{ lineHeight: '1.6', marginBottom: '24px', maxWidth: '800px', fontSize: '1.05rem', color: 'var(--text-secondary)' }}>{profile.bio || 'This user hasn\'t added a bio yet.'}</p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {profile.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {profile.location}
                </div>
              )}
              {profile.timezone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {profile.timezone}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} title="LinkedIn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              )}
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} title="GitHub">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              )}
              {profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} title="Portfolio">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <section style={{ marginBottom: '32px' }} className="animate-fade-up delay-1">
        <h2 className="section-title" style={{ textAlign: 'left', fontSize: '1.5rem' }}>Offered Skills</h2>
        <div className="skills-grid">
          {profile.skills.length > 0 ? (
            profile.skills.map(s => (
              <SkillCard 
                key={s.id} 
                skill={{ ...s, provider: { id: profile.id, name: profile.name, avatarUrl: profile.avatarUrl, isVerified: profile.isVerified } }} 
                actions={
                  isOwner ? (
                    <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
                      <button 
                        onClick={(e) => { e.preventDefault(); navigate(`/create-skill?id=${s.id}`); }}
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          if(window.confirm('Delete this skill?')) {
                            skills.delete(s.id).then(() => {
                              window.location.reload();
                            }).catch(err => alert(err.message));
                          }
                        }}
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444' }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null
                }
              />
            ))
          ) : (
            <p className="empty-state" style={{ gridColumn: '1 / -1' }}>No skills listed</p>
          )}
        </div>
      </section>

      <section className="animate-fade-up delay-2">
        <h2 className="section-title" style={{ textAlign: 'left', fontSize: '1.5rem' }}>Reviews</h2>
        {profile.reviewsReceived.length > 0 ? (
          profile.reviewsReceived.map(r => (
            <article key={r.id} className="review-card glass-card">
              <div className="review-card__header">
                <Avatar user={r.reviewer} size={32} /> <strong>{r.reviewer.name}</strong>
              </div>
              <div className="review-ratings">
                {renderStars(r.ratingOverall)} Overall &middot; Teaching {r.ratingTeaching} &middot; Communication {r.ratingCommunication} &middot; Punctuality {r.ratingPunctuality}
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.feedback}</p>
            </article>
          ))
        ) : (
          <p className="empty-state">No reviews yet</p>
        )}
      </section>

      <dialog ref={blockDialogRef} className="glass-card" style={{ border: 'none', padding: '32px', maxWidth: '400px', width: '100%', margin: 'auto', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '1.25rem', marginBottom: '8px' }}>Block User</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
          Are you sure you want to block {profile.name}? You will no longer be able to interact with them, and they will not see your profile or skills.
        </p>
        {blockError && <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>{blockError}</div>}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={() => blockDialogRef.current?.close()}>Cancel</button>
          <button type="button" className="primary-cta" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={confirmBlock}>Confirm Block</button>
        </div>
      </dialog>

      <dialog ref={reportDialogRef} className="glass-card" style={{ border: 'none', padding: '32px', maxWidth: '400px', width: '100%', margin: 'auto', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '1.25rem', marginBottom: '8px' }}>Report User</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
          Please provide details about your report. This will be reviewed by an administrator.
        </p>
        {reportMessage.text && (
          <div style={{ padding: '12px', background: reportMessage.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: reportMessage.type === 'error' ? '#ef4444' : '#22c55e', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
            {reportMessage.text}
          </div>
        )}
        <form onSubmit={submitReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Reason</label>
            <select 
              required 
              value={reportForm.reason} 
              onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            >
              <option value="">Select a reason</option>
              <option value="Spam">Spam or Misleading</option>
              <option value="Harassment">Harassment or Abuse</option>
              <option value="Inappropriate Content">Inappropriate Content</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Additional Details (Optional)</label>
            <textarea 
              rows="3" 
              value={reportForm.details} 
              onChange={(e) => setReportForm({ ...reportForm, details: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', resize: 'vertical' }}
              placeholder="Provide more context..."
            ></textarea>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={() => reportDialogRef.current?.close()}>Cancel</button>
            <button type="submit" className="primary-cta">Submit Report</button>
          </div>
        </form>
      </dialog>
      </>
      )}
    </div>
  );
}
