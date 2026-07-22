import React, { useEffect } from 'react';

export default function About() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header animate-fade-up" style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 className="page-title">About SkillSwap</h1>
        <p className="page-subtitle" style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1.25rem', marginBottom: '16px', margin: '0 auto' }}>Learn. Teach. Grow Together.</p>
        <p className="page-subtitle" style={{ maxWidth: '800px', lineHeight: '1.6', margin: '16px auto 0' }}>
          Every person has something valuable to share and something new to learn. SkillSwap is a community where you can connect with people who want to exchange knowledge, develop new skills, and grow together. Whether you're looking to learn from someone with real experience or share your own expertise, SkillSwap makes it easy to connect with the right people.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '32px' }}>
        <section className="glass-card reveal" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px', color: 'var(--accent)' }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            Our Story
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            SkillSwap was created to make learning more practical, accessible, and community driven. Not every valuable skill is learned in a classroom, and not every expert is a teacher by profession. This platform brings people together so they can learn from one another, share experiences, and build meaningful connections through knowledge.
          </p>
        </section>

        <section className="glass-card reveal reveal-delay-1" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px', color: 'var(--accent)' }}><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
            Our Mission & Vision
          </h2>
          <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--accent-subtle)', padding: '10px', borderRadius: '10px', color: 'var(--accent)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Our Mission</h3>
              <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)', margin: 0 }}>To create a trusted platform where anyone can learn, teach, and grow by sharing real-world skills and experiences.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--accent-subtle)', padding: '10px', borderRadius: '10px', color: 'var(--accent)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Our Vision</h3>
              <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)', margin: 0 }}>To build a global community where learning has no limits, knowledge is shared freely, and everyone has the opportunity to reach their full potential.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="glass-card reveal" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px', color: 'var(--accent)' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          Our Values
        </h2>
        <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <li className="reveal reveal-delay-1" style={{ display: 'flex', gap: '12px' }}>
            <div style={{ color: 'var(--accent)', marginTop: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Collaboration</strong>
              Learning is better when people help one another.
            </div>
          </li>
          <li className="reveal reveal-delay-2" style={{ display: 'flex', gap: '12px' }}>
            <div style={{ color: 'var(--accent)', marginTop: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Trust</strong>
              A respectful and reliable community comes first.
            </div>
          </li>
          <li className="reveal reveal-delay-3" style={{ display: 'flex', gap: '12px' }}>
            <div style={{ color: 'var(--accent)', marginTop: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Accessibility</strong>
              Learning opportunities should be available to everyone.
            </div>
          </li>
          <li className="reveal reveal-delay-1" style={{ display: 'flex', gap: '12px' }}>
            <div style={{ color: 'var(--accent)', marginTop: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Growth</strong>
              Every new skill opens the door to new possibilities.
            </div>
          </li>
          <li className="reveal reveal-delay-2" style={{ display: 'flex', gap: '12px' }}>
            <div style={{ color: 'var(--accent)', marginTop: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .5 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line></svg>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Innovation</strong>
              Continuously improving the way people connect and learn.
            </div>
          </li>
          <li className="reveal reveal-delay-3" style={{ display: 'flex', gap: '12px' }}>
            <div style={{ color: 'var(--accent)', marginTop: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Inclusivity</strong>
              Everyone is welcome, regardless of background or experience.
            </div>
          </li>
        </ul>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '32px' }}>
        <section className="glass-card reveal" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px', color: 'var(--accent)' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Why Choose SkillSwap?
          </h2>
          <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              "Learn practical skills from people with real experience.",
              "Share your knowledge and make a positive impact.",
              "Connect with learners and skilled professionals from different backgrounds.",
              "Discover opportunities to grow both personally and professionally.",
              "Enjoy a simple, secure, and easy-to-use platform designed for meaningful learning."
            ].map((text, idx) => (
              <li key={idx} className={`reveal reveal-delay-${(idx % 3) + 1}`} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ color: '#22c55e', marginTop: '3px', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-card reveal reveal-delay-1" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px', color: 'var(--accent)' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            How SkillSwap Works
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.7' }}>Getting started is simple:</p>
          <ol style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { title: "Create your account", desc: "Sign up and build your profile setup in seconds." },
              { title: "Tell others", desc: "List what you can teach and what you'd like to learn." },
              { title: "Connect", desc: "Browse listings to find peer matches that share your goals." },
              { title: "Learn, teach, and exchange", desc: "Coordinate and exchange knowledge through structured learning sessions." },
              { title: "Continue growing", desc: "Grow your skill sets while helping others build theirs." }
            ].map((step, idx) => (
              <li key={idx} className={`reveal reveal-delay-${(idx % 3) + 1}`} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ 
                  background: 'var(--accent-subtle)', 
                  color: 'var(--accent)', 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {idx + 1}
                </span>
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>{step.title}</strong>
                  <span>{step.desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="glass-card reveal" style={{ padding: '48px 32px', textAlign: 'center', background: 'var(--accent-subtle)' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Join the SkillSwap Community</h2>
        <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '700px', margin: '0 auto 24px' }}>
          Whether you're taking your first step toward learning a new skill or sharing years of experience with others, SkillSwap is here to help you connect, learn, and grow. Join a community where knowledge is shared, connections are meaningful, and every skill has value.
        </p>
      </div>
    </div>
  );
}
