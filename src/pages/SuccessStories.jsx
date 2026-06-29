import React from 'react';

export default function SuccessStories() {
  const stories = [
    {
      id: 1,
      name: "Sarah M.",
      learned: "Frontend Web Development",
      taught: "Graphic Design",
      quote: "SkillSwap changed my career path completely. I traded my design expertise with a developer who wanted to make his app look better. Over 3 months, he learned UI principles, and I learned React. Now I'm a UX Engineer!",
      avatar: "S"
    },
    {
      id: 2,
      name: "David K.",
      learned: "Conversational Spanish",
      taught: "Guitar Basics",
      quote: "Finding a language partner who actually wanted to stick to a schedule was hard until I joined SkillSwap. Teaching guitar gave me a sense of accountability, and my Spanish has improved so much.",
      avatar: "D"
    },
    {
      id: 3,
      name: "Aisha R.",
      learned: "Machine Learning Concepts",
      taught: "Digital Marketing",
      quote: "I had no idea where to start with AI. A data scientist on SkillSwap needed help marketing his side project, so we swapped skills. It's the most practical learning experience I've ever had.",
      avatar: "A"
    }
  ];

  return (
    <div className="container animate-fade-up">
      <div className="section-title">Success Stories</div>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px auto' }}>
        See how our community members are achieving their goals through peer-to-peer knowledge exchange.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {stories.map(story => (
          <div key={story.id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: '1.6' }}>
              "{story.quote}"
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--glass-border-subtle)' }}>
              <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                {story.avatar}
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{story.name}</strong>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Learned {story.learned}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
