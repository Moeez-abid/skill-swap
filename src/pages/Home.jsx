import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { skills, stats, categories } from '../shared/api';
import SkillCard from '../components/SkillCard';

import { initNodeGraph } from '../components/node-graph.js';
export default function Home() {
  const [featuredSkills, setFeaturedSkills] = useState([]);
  const [communityStats, setCommunityStats] = useState(null);
  const [categoryPills, setCategoryPills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const carouselRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target); // Only animate once
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [featuredSkills, categoryPills]);

  useEffect(() => {
    // Initialize hero canvas animation
    initNodeGraph('hero-node-graph');

    // Fetch data
    Promise.all([
      skills.featured().catch(() => ({ skills: [] })),
      stats.community().catch(() => ({ stats: { totalUsers: 0, skillsExchanged: 0, activeMatches: 0 } })),
      categories.list().catch(() => ({ categories: [] }))
    ]).then(([featuredData, statsData, categoriesData]) => {
      setFeaturedSkills(featuredData.skills || []);
      setCommunityStats(statsData.stats);
      setCategoryPills(categoriesData.categories || []);
      setLoading(false);
    });
  }, []);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: direction * 320, behavior: 'smooth' });
    }
  };

  return (
    <>
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-content">
          <div className="social-proof animate-fade-up">
            <span>Educational barter — zero monetary transactions</span>
          </div>
          <h1 id="hero-title" className="hero-title animate-fade-up delay-1">Teach what you know,<br />learn what you need</h1>
          <p className="hero-subtitle animate-fade-up delay-2">SkillSwap connects people who want to exchange knowledge directly. Offer a skill you have, request one you want — no payments, just mutual learning.</p>
          <div className="cta-row animate-fade-up delay-3">
            <Link to="/register" className="primary-cta">
              Start Swapping
              <span className="cta-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </span>
            </Link>
            <Link to="/marketplace" className="btn-secondary">Browse Marketplace</Link>
          </div>
        </div>
        <div className="hero-media">
          <canvas id="hero-node-graph" width="500" height="500" aria-label="Interactive Node Graph Animation"></canvas>
        </div>
      </section>

      <section className="section" aria-labelledby="benefits-title">
        <h2 id="benefits-title" className="section-title reveal">Why Join SkillSwap?</h2>
        <div className="steps-grid">
          <article className="step-card glass-card reveal">
            <h3>Learn Practical Skills</h3>
            <p>Learn practical skills from people with real experience.</p>
          </article>
          <article className="step-card glass-card reveal reveal-delay-1">
            <h3>Share Your Knowledge</h3>
            <p>Share your knowledge and make a positive impact.</p>
          </article>
          <article className="step-card glass-card reveal reveal-delay-2">
            <h3>Connect & Network</h3>
            <p>Connect with learners and skilled professionals from different backgrounds.</p>
          </article>
          <article className="step-card glass-card reveal">
            <h3>Discover Opportunities</h3>
            <p>Discover opportunities to grow both personally and professionally.</p>
          </article>
          <article className="step-card glass-card reveal reveal-delay-1">
            <h3>Simple & Secure Platform</h3>
            <p>Enjoy a simple, secure, and easy-to-use platform designed for meaningful learning.</p>
          </article>
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title reveal">How It Works</h2>
        <div className="timeline">
          <article className="timeline-item reveal">
            <div className="timeline-icon" aria-hidden="true">1</div>
            <div className="timeline-content glass-card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Create Account</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Create your account to get started on your learning journey.</p>
            </div>
          </article>
          <article className="timeline-item reveal reveal-delay-1">
            <div className="timeline-icon" aria-hidden="true">2</div>
            <div className="timeline-content glass-card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-primary)' }}>List Your Interests</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Tell others what you can teach or what you'd like to learn.</p>
            </div>
          </article>
          <article className="timeline-item reveal reveal-delay-2">
            <div className="timeline-icon" aria-hidden="true">3</div>
            <div className="timeline-content glass-card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Connect</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Connect with people who share your interests.</p>
            </div>
          </article>
          <article className="timeline-item reveal">
            <div className="timeline-icon" aria-hidden="true">4</div>
            <div className="timeline-content glass-card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Exchange Knowledge</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Learn, teach, and exchange knowledge through meaningful sessions.</p>
            </div>
          </article>
          <article className="timeline-item reveal reveal-delay-1">
            <div className="timeline-icon" aria-hidden="true">5</div>
            <div className="timeline-content glass-card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Continue Growing</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Continue growing your skills while helping others grow theirs.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="section reveal" aria-labelledby="featured-title">
        <h2 id="featured-title" className="section-title">Most Requested Skills</h2>
        <div className="carousel">
          <div id="featured-carousel" className="carousel__track" role="list" ref={carouselRef}>
            {loading ? (
              <p className="empty-state">Loading featured skills...</p>
            ) : featuredSkills.length > 0 ? (
              featuredSkills.map(skill => <SkillCard key={skill.id} skill={skill} />)
            ) : (
              <p className="empty-state">No featured skills yet. Be the first to list one!</p>
            )}
          </div>
          <div className="carousel__controls">
            <button type="button" className="carousel__btn" onClick={() => scrollCarousel(-1)} aria-label="Previous skills">&larr;</button>
            <button type="button" className="carousel__btn" onClick={() => scrollCarousel(1)} aria-label="Next skills">&rarr;</button>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="stats-title">
        <h2 id="stats-title" className="section-title reveal">Community at a Glance</h2>
        <div id="community-stats" className="stats-grid">
          <div className="stat-card glass-card reveal">
            <div className="stat-card__value">{communityStats?.totalUsers.toLocaleString() || '—'}</div>
            <div className="stat-card__label">Total Users</div>
          </div>
          <div className="stat-card glass-card reveal reveal-delay-1">
            <div className="stat-card__value">{communityStats?.skillsExchanged.toLocaleString() || '—'}</div>
            <div className="stat-card__label">Skills Exchanged</div>
          </div>
          <div className="stat-card glass-card reveal reveal-delay-2">
            <div className="stat-card__value">{communityStats?.activeMatches.toLocaleString() || '—'}</div>
            <div className="stat-card__label">Active Matches</div>
          </div>
        </div>
      </section>

      <section className="section reveal" aria-labelledby="categories-title">
        <h2 id="categories-title" className="section-title">Explore by Category</h2>
        <div id="category-pills" className="category-pills">
          {categoryPills.map(c => (
            <Link key={c.slug} to={`/marketplace?category=${c.slug}`} className="category-pill">
              {c.name}
            </Link>
          ))}
          {categoryPills.length === 0 && <Link to="/marketplace" className="category-pill">View Marketplace</Link>}
        </div>
      </section>

      <section className="section reveal" aria-labelledby="faq-title" style={{ marginTop: '64px', marginBottom: '64px' }}>
        <h2 id="faq-title" className="section-title">Frequently Asked Questions</h2>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            {
              q: "What is SkillSwap?",
              a: "SkillSwap is a community-driven platform where people trade knowledge directly. No money is exchanged—you teach a skill you have in exchange for learning a skill you need."
            },
            {
              q: "How does the barter system work?",
              a: "It is a direct 1-to-1 exchange. Once you request a match and the other person accepts, you can chat, propose sessions, and take turns teaching each other your respective skills."
            },
            {
              q: "Is there any charge to use SkillSwap?",
              a: "No, SkillSwap is completely free of charge. Our mission is to make learning accessible to everyone through peer-to-peer knowledge sharing."
            },
            {
              q: "Who can teach on SkillSwap?",
              a: "Anyone! Everyone has a skill, hobby, or area of expertise they can share—whether it is coding, photography, playing an instrument, learning a language, or business planning."
            },
            {
              q: "How do I get started?",
              a: "Simply sign up for an account, set up your profile, list the skills you want to teach and learn, and browse the marketplace to find people to connect with."
            }
          ].map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div 
                key={idx} 
                className="glass-card" 
                style={{ 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  border: '1px solid var(--border)',
                  transition: 'all 0.3s ease'
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <span>{faq.q}</span>
                  <span style={{ 
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                    transition: 'transform 0.2s ease',
                    fontSize: '1.25rem',
                    color: 'var(--accent)',
                    fontWeight: 'bold'
                  }}>
                    ▼
                  </span>
                </button>
                <div style={{
                  maxHeight: isOpen ? '200px' : '0px',
                  opacity: isOpen ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0, 1, 0, 1)',
                  padding: isOpen ? '0 24px 20px 24px' : '0 24px'
                }}>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6', fontSize: '0.975rem' }}>{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
