import React from 'react';

export default function About() {
  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header animate-fade-up" style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 className="page-title">About SkillSwap</h1>
        <p className="page-subtitle" style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1.25rem', marginBottom: '16px', margin: '0 auto' }}>Learn. Teach. Grow Together.</p>
        <p className="page-subtitle" style={{ maxWidth: '800px', lineHeight: '1.6', margin: '16px auto 0' }}>
          Every person has something valuable to share and something new to learn. SkillSwap is a community where you can connect with people who want to exchange knowledge, develop new skills, and grow together. Whether you're looking to learn from someone with real experience or share your own expertise, SkillSwap makes it easy to connect with the right people.
        </p>
      </div>

      <div className="animate-fade-up delay-1" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '32px' }}>
        <section className="glass-card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Our Story</h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            SkillSwap was created to make learning more practical, accessible, and community driven. Not every valuable skill is learned in a classroom, and not every expert is a teacher by profession. This platform brings people together so they can learn from one another, share experiences, and build meaningful connections through knowledge.
          </p>
        </section>

        <section className="glass-card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Our Mission & Vision</h2>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Our Mission</h3>
            <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>To create a trusted platform where anyone can learn, teach, and grow by sharing real-world skills and experiences.</p>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Our Vision</h3>
            <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>To build a global community where learning has no limits, knowledge is shared freely, and everyone has the opportunity to reach their full potential.</p>
          </div>
        </section>
      </div>

      <section className="glass-card animate-fade-up delay-2" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)' }}>Our Values</h2>
        <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <li><strong style={{ color: 'var(--text-primary)' }}>Collaboration</strong><br/>Learning is better when people help one another.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Trust</strong><br/>A respectful and reliable community comes first.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Accessibility</strong><br/>Learning opportunities should be available to everyone.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Growth</strong><br/>Every new skill opens the door to new possibilities.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Innovation</strong><br/>Continuously improving the way people connect and learn.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Inclusivity</strong><br/>Everyone is welcome, regardless of background or experience.</li>
        </ul>
      </section>

      <div className="animate-fade-up delay-3" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '32px' }}>
        <section className="glass-card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)' }}>Why Choose SkillSwap?</h2>
          <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>Learn practical skills from people with real experience.</li>
            <li>Share your knowledge and make a positive impact.</li>
            <li>Connect with learners and skilled professionals from different backgrounds.</li>
            <li>Discover opportunities to grow both personally and professionally.</li>
            <li>Enjoy a simple, secure, and easy-to-use platform designed for meaningful learning.</li>
          </ul>
        </section>

        <section className="glass-card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)' }}>How SkillSwap Works</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.7' }}>Getting started is simple:</p>
          <ol style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li><strong style={{ color: 'var(--text-primary)' }}>Create your account.</strong></li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Tell others</strong> what you can teach or what you'd like to learn.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Connect</strong> with people who share your interests.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Learn, teach, and exchange</strong> knowledge through meaningful sessions.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Continue growing</strong> your skills while helping others grow theirs.</li>
          </ol>
        </section>
      </div>

      <div className="glass-card animate-fade-up delay-4" style={{ padding: '48px 32px', textAlign: 'center', background: 'var(--accent-subtle)' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Join the SkillSwap Community</h2>
        <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '700px', margin: '0 auto 24px' }}>
          Whether you're taking your first step toward learning a new skill or sharing years of experience with others, SkillSwap is here to help you connect, learn, and grow. Join a community where knowledge is shared, connections are meaningful, and every skill has value.
        </p>
      </div>
    </div>
  );
}
