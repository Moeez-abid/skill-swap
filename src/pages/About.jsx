import React from 'react';

export default function About() {
  return (
    <div className="container animate-fade-up">
      <div className="section-title">About SkillSwap</div>
      
      <section className="glass-card" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>Our Mission</h2>
        <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          SkillSwap is a platform built on the idea that everyone has something valuable to teach, and something new they want to learn. Our mission is to break down financial barriers to education by enabling peer-to-peer knowledge exchange. Whether you're a designer wanting to learn coding, or a marketer wanting to learn a new language, SkillSwap connects you with the perfect partner.
        </p>
      </section>

      <section className="glass-card" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'Fustat,sans-serif', marginBottom: '16px' }}>How it Works</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3 style={{ marginBottom: '8px' }}>1. Create Your Profile</h3>
            <p style={{ color: 'var(--text-secondary)' }}>List the skills you can teach and the skills you want to learn. The more detail you provide, the better your matches will be.</p>
          </div>
          <div>
            <h3 style={{ marginBottom: '8px' }}>2. Find a Match</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Browse the marketplace or let our algorithm suggest perfect partners who have what you want and need what you have.</p>
          </div>
          <div>
            <h3 style={{ marginBottom: '8px' }}>3. Swap Skills</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Schedule video sessions, chat with your partner, and learn together. It's completely free and driven by mutual growth.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
