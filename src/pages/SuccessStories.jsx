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
    <div className="container animate-fade-up" style={{ paddingTop: '120px', minHeight: 'calc(100vh - 200px)', paddingBottom: '40px' }}>
      <div className="section-title">Success Stories</div>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px auto' }}>
        See how our community members are achieving their goals through peer-to-peer knowledge exchange.
      </p>

      {loading ? (
        <p className="loading">Loading stories...</p>
      ) : stories.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {stories.map(story => (
            <div key={story.id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                "{story.quote}"
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--glass-border-subtle)' }}>
                {story.isImageUrl ? (
                  <img src={story.avatar} alt={story.name} className="avatar" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                ) : (
                  <div className="avatar avatar--initials" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                    {story.avatar}
                  </div>
                )}
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{story.name}</strong>
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
