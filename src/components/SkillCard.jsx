import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../shared/api';

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

export default function SkillCard({ skill, actions }) {
  return (
    <article className="skill-card glass-card animate-fade-up" style={{ display: 'flex', flexDirection: 'column' }}>
      <Link to={`/skill-detail?id=${skill.id}`} className="skill-card__link" style={{ flex: 1 }}>
        <div className="skill-card__cover">
          {skill.coverImageUrl ? (
            <img src={getImageUrl(skill.coverImageUrl)} alt="" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          ) : (
            <div className="skill-card__placeholder">{skill.category?.icon || '📚'}</div>
          )}
        </div>
        <div className="skill-card__body">
          <div className="skill-card__meta">
            <span className="badge">{formatLevel(skill.level)}</span>
            <span className={`badge ${availabilityClass(skill.availability)}`}>
              {formatAvailability(skill.availability)}
            </span>
          </div>
          <h3 className="skill-card__title">{skill.title}</h3>
          <p className="skill-card__desc">{skill.shortDescription}</p>
          <div className="skill-card__provider">
            <Avatar user={skill.provider} size={28} />
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {skill.provider?.name}
              {skill.provider?.isVerified && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-blue)' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              )}
            </span>
          </div>
          <div className="skill-card__footer">
            <span className="skill-card__category">{skill.category?.name}</span>
            {skill.avgRating > 0 && (
              <span className="skill-card__rating">
                {renderStars(skill.avgRating)} {skill.avgRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
      {actions && (
        <div style={{ padding: '0 16px 16px', display: 'flex', gap: '8px', zIndex: 2, position: 'relative' }}>
          {actions}
        </div>
      )}
    </article>
  );
}
