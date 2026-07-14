import React, { useState, useEffect } from 'react';
import { reviews } from '../shared/api.js';

export default function SuccessStories() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviews.featured().then(res => {
      if (res && res.reviews) {
        const mapped = res.reviews.map(r => {
          let learned = 'a new skill';
          let taught = 'their expertise';
          
          const match = r.activeMatch || r.session?.activeMatch;
          if (match && match.matchRequest) {
            const req = match.matchRequest;
            if (r.reviewerId === req.senderId) {
              taught = req.offeredSkill?.title || taught;
              learned = req.wantedSkill?.title || learned;
            } else {
              taught = req.wantedSkill?.title || taught;
              learned = req.offeredSkill?.title || learned;
            }
          }
          
          return {
            id: r.id,
            name: r.reviewer?.name || 'Anonymous',
            avatar: r.reviewer?.avatarUrl || r.reviewer?.name?.[0] || 'A',
            isImageUrl: !!r.reviewer?.avatarUrl,
            quote: r.feedback,
            learned,
            taught
          };
        });
        setStories(mapped);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header animate-fade-up" style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 className="page-title">Success Stories</h1>
        <p className="page-subtitle" style={{ maxWidth: '600px', lineHeight: '1.6', margin: '16px auto 0' }}>
          See how our community members are achieving their goals through peer-to-peer knowledge exchange.
        </p>
      </div>

      {loading ? (
        <p className="loading">Loading stories...</p>
      ) : stories.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {stories.map(story => (
            <div key={story.id} className="glass-card animate-fade-up delay-1" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: '1.7' }}>
                "{story.quote}"
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
                {story.isImageUrl ? (
                  <img src={story.avatar} alt={story.name} className="avatar" style={{ width: '48px', height: '48px', objectFit: 'cover' }} />
                ) : (
                  <div className="avatar avatar--initials" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
                    {story.avatar}
                  </div>
                )}
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '4px' }}>{story.name}</strong>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Learned {story.learned}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No stories yet</h3>
          <p>Complete a session and leave a 5-star review to be featured here!</p>
        </div>
      )}
    </div>
  );
}
