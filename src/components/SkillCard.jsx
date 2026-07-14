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
    <article className="skill-card glass-card animate-fade-up" style={{ display: 'flex', flexDirection: 'column', height: '380px', padding: '24px', borderRadius: '16px' }}>
      <Link to={`/skill-detail?id=${skill.id}`} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', textDecoration: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Avatar user={skill.provider} size={48} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                {skill.provider?.name || 'Unknown User'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                {skill.avgRating > 0 ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-star)" stroke="none">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    {skill.avgRating.toFixed(1)}
                  </>
                ) : (
                  <span>New</span>
                )}
              </div>
            </div>
          </div>
          <span style={{ padding: '4px 12px', background: 'var(--accent-subtle)', borderRadius: '99px', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
            {skill.category?.name || 'Skill'}
          </span>
        </div>

        <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {skill.title}
        </h4>
        
        <div style={{ flexGrow: 1, minHeight: 0, overflow: 'hidden', marginBottom: '24px' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0, height: '100%', WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 24px), transparent 100%)', maskImage: 'linear-gradient(to bottom, black calc(100% - 24px), transparent 100%)', wordBreak: 'break-word', hyphens: 'auto' }}>
            {skill.shortDescription}
          </p>
        </div>

        {skill.requirements && (
          <div className="seeking-exchange-box" style={{ marginBottom: '16px' }}>
            <p className="seeking-exchange-label">Requirements</p>
            <p className="seeking-exchange-value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{skill.requirements}</span>
            </p>
          </div>
        )}
      </Link>

      <div style={{ marginTop: 'auto', paddingTop: skill.requirements ? '0' : '16px' }}>
        {actions ? (
          <div style={{ display: 'flex', gap: '8px', zIndex: 2, position: 'relative' }}>
            {actions}
          </div>
        ) : (
          <Link to={`/skill-detail?id=${skill.id}`} className="primary-cta" style={{ width: '100%', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Request Exchange
          </Link>
        )}
      </div>
    </article>
  );
}
