import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { users } from '../shared/api';
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
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const loggedInUser = getUser();
  const userId = queryId || loggedInUser?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  if (error) return <div style={{ paddingTop: '100px', paddingBottom: '64px' }}><div className="empty-state"><h3>Profile not found</h3></div></div>;

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '64px' }}>
      {loading || !profile ? (
        <p className="loading">Loading profile…</p>
      ) : (
        <>
      <header className="profile-header glass-card animate-fade-up">
        <Avatar user={{ ...profile, name: profile.name }} size={96} className="avatar profile-header__avatar" />
        <div>
          <h1 className="page-title">{profile.name}</h1>
          <p className="page-subtitle">{profile.bio || 'No bio yet'}</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            {profile.location ? `${profile.location} · ` : ''}{formatAvailability(profile.availabilityStatus)}
          </p>
          <div className="profile-stats" style={{ marginTop: '16px' }}>
            <div className="profile-stat"><strong>{profile.stats.activeMatches}</strong><span>Active Matches</span></div>
            <div className="profile-stat"><strong>{profile.stats.completedSwaps}</strong><span>Completed Swaps</span></div>
            <div className="profile-stat"><strong>{profile.stats.avgRating || '—'}</strong><span>Avg Rating</span></div>
          </div>
        </div>
      </header>

      <section style={{ marginBottom: '32px' }} className="animate-fade-up delay-1">
        <h2 className="section-title" style={{ textAlign: 'left', fontSize: '1.5rem' }}>Offered Skills</h2>
        <div className="skills-grid">
          {profile.skills.length > 0 ? (
            profile.skills.map(s => <SkillCard key={s.id} skill={{ ...s, provider: { id: profile.id, name: profile.name, avatarUrl: profile.avatarUrl } }} />)
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
      </>
      )}
    </div>
  );
}
