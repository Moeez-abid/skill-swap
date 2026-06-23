import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { skills, matches, getImageUrl } from '../shared/api';
import { isLoggedIn, getUser } from '../shared/auth';

function formatLevel(level) {
  return { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' }[level] || level;
}

function formatAvailability(status) {
  return { AVAILABLE: 'Available', BUSY: 'Busy', UNAVAILABLE: 'Unavailable' }[status] || status;
}

function availabilityClass(status) {
  return { AVAILABLE: 'badge--success', BUSY: 'badge--warning', UNAVAILABLE: 'badge--muted' }[status] || '';
}

function renderStars(rating, max = 5) {
  return Array.from({ length: max }, (_, i) => (
    <svg key={i} className={`star ${i < Math.round(rating) ? 'star--filled' : ''}`} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  ));
}

function Avatar({ user, size = 40 }) {
  const initials = (user?.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2);
  if (user?.avatarUrl) {
    return <img src={getImageUrl(user.avatarUrl)} alt="" className="avatar" width={size} height={size} style={{ objectFit: 'cover' }} />;
  }
  return (
    <span className="avatar avatar--initials" style={{ width: size, height: size }} aria-hidden="true">
      {initials}
    </span>
  );
}

export default function SkillDetail() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();

  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Modal states
  const dialogRef = useRef(null);
  const [mySkills, setMySkills] = useState([]);
  const [mySkillsLoading, setMySkillsLoading] = useState(false);
  const [offeredSkillId, setOfferedSkillId] = useState('');
  const [swapMessage, setSwapMessage] = useState('');
  const [swapError, setSwapError] = useState('');
  const [swapLoading, setSwapLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }

    skills.get(id)
      .then(res => {
        setSkill(res.skill);
        document.title = `${res.skill.title} — SkillSwap`;
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const openSwapDialog = async () => {
    if (!isLoggedIn()) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    
    setOfferedSkillId('');
    setSwapMessage('');
    setSwapError('');
    if (dialogRef.current) dialogRef.current.showModal();

    setMySkillsLoading(true);
    try {
      const user = getUser();
      const res = await skills.list({ provider: user.id });
      setMySkills(res.skills || []);
    } catch (e) {
      setSwapError('Failed to load your skills');
    } finally {
      setMySkillsLoading(false);
    }
  };

  const closeSwapDialog = () => {
    if (dialogRef.current) dialogRef.current.close();
  };

  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    setSwapError('');
    setSwapLoading(true);

    try {
      await matches.create({
        offeredSkillId,
        wantedSkillId: id,
        message: swapMessage,
      });
      showToast('Swap request sent!');
      closeSwapDialog();
    } catch (err) {
      setSwapError(err.message);
    } finally {
      setSwapLoading(false);
    }
  };

  if (loading) return <div className="main-container" style={{ paddingTop: '100px', paddingBottom: '64px' }}><p className="loading">Loading skill…</p></div>;
  if (error || !skill) return <div className="main-container" style={{ paddingTop: '100px', paddingBottom: '64px' }}><div className="empty-state"><h3>Skill not found</h3></div></div>;

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '64px' }}>
      <div className="detail-layout">
        <article className="detail-main glass-card animate-fade-up">
          {skill.coverImageUrl && (
            <div style={{ width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
              <img src={getImageUrl(skill.coverImageUrl)} alt="Cover" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            </div>
          )}
          <div className="skill-card__meta">
            <span className="badge">{formatLevel(skill.level)}</span>
            <span className={`badge ${availabilityClass(skill.availability)}`}>{formatAvailability(skill.availability)}</span>
            <span className="badge">{skill.category?.name}</span>
          </div>
          <h1 className="page-title" style={{ marginTop: '16px' }}>{skill.title}</h1>
          <p className="page-subtitle">{skill.shortDescription}</p>
          
          <h2 style={{ fontFamily: 'Fustat,sans-serif', margin: '24px 0 12px' }}>About this skill</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{skill.fullDescription}</p>
          
          <h2 style={{ fontFamily: 'Fustat,sans-serif', margin: '24px 0 12px' }}>Learning outcomes</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{skill.learningOutcomes}</p>
          
          {skill.prerequisites && (
            <>
              <h2 style={{ fontFamily: 'Fustat,sans-serif', margin: '24px 0 12px' }}>Prerequisites</h2>
              <p style={{ color: 'var(--text-secondary)' }}>{skill.prerequisites}</p>
            </>
          )}
          
          {skill.tags?.length > 0 && (
            <div className="tag-list">
              {skill.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          )}
        </article>
        
        <aside className="detail-sidebar glass-card animate-fade-up delay-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Avatar user={skill.provider} size={48} />
            <div>
              <strong>{skill.provider.name}</strong><br/>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{skill.provider.location || 'Location not set'}</span>
            </div>
          </div>
          {skill.avgRating > 0 && (
            <p>{renderStars(skill.avgRating)} {skill.avgRating.toFixed(1)} ({skill.reviewCount} reviews)</p>
          )}
          
          <button type="button" className="primary-cta" onClick={openSwapDialog} style={{ width: '100%' }}>Request Swap</button>
          <Link to={`/profile?id=${skill.provider.id}`} className="btn-secondary" style={{ display: 'block', textAlign: 'center', marginTop: '12px', width: '100%' }}>
            View Profile
          </Link>
        </aside>
      </div>

      <dialog ref={dialogRef} className="glass-card" style={{ border: 'none', padding: '32px', maxWidth: '480px', width: '100%', margin: 'auto', borderRadius: '16px' }}>
        <form onSubmit={handleSwapSubmit}>
          <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Send Swap Request</h2>
          <div className="form-group">
            <label htmlFor="offered-skill">Your offered skill</label>
            <select 
              id="offered-skill" 
              required 
              value={offeredSkillId} 
              onChange={(e) => setOfferedSkillId(e.target.value)}
            >
              <option value="">
                {mySkillsLoading ? 'Loading your skills...' : 'Select a skill to offer...'}
              </option>
              {!mySkillsLoading && mySkills.length === 0 && (
                <option value="" disabled>You have no skills listed.</option>
              )}
              {mySkills.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            <p className="form-hint">Choose which of your skills you'd like to teach in exchange.</p>
          </div>
          <div className="form-group">
            <label htmlFor="swap-message">Message</label>
            <textarea 
              id="swap-message" 
              required 
              minLength="10" 
              maxLength="1000" 
              placeholder="Introduce yourself and explain the swap…"
              value={swapMessage}
              onChange={(e) => setSwapMessage(e.target.value)}
            ></textarea>
          </div>
          <div className="cta-row">
            <button type="submit" className="primary-cta" disabled={swapLoading}>
              {swapLoading ? 'Sending...' : 'Send Request'}
            </button>
            <button type="button" className="btn-secondary" onClick={closeSwapDialog}>Cancel</button>
          </div>
          {swapError && <p className="form-error">{swapError}</p>}
        </form>
      </dialog>

      {toastMsg && (
        <div className="toast toast--info toast--visible" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
