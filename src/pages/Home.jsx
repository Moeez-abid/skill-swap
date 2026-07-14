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
            <h3>Learn & Share Practical Skills</h3>
            <p>Learn practical skills from people with real experience, and share your own knowledge to make a positive impact.</p>
          </article>
          <article className="step-card glass-card reveal reveal-delay-1">
            <h3>Connect & Network</h3>
            <p>Connect with learners and skilled professionals from different backgrounds to grow both personally and professionally.</p>
          </article>
          <article className="step-card glass-card reveal reveal-delay-2">
            <h3>Simple & Secure Platform</h3>
            <p>Enjoy a simple, secure, and easy-to-use platform designed specifically for meaningful, peer-to-peer learning.</p>
          </article>
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title reveal">How It Works</h2>
        <div className="steps-grid">
          <article className="step-card glass-card reveal">
            <div className="step-card__icon" aria-hidden="true">1</div>
            <h3>Setup & List</h3>
            <p>Create your account and tell others what you can teach or what you'd like to learn.</p>
          </article>
          <article className="step-card glass-card reveal reveal-delay-1">
            <div className="step-card__icon" aria-hidden="true">2</div>
            <h3>Connect & Match</h3>
            <p>Connect with people who share your interests and find the perfect knowledge exchange partner.</p>
          </article>
          <article className="step-card glass-card reveal reveal-delay-2">
            <div className="step-card__icon" aria-hidden="true">3</div>
            <h3>Learn & Grow</h3>
            <p>Learn, teach, and exchange knowledge through meaningful sessions while helping others grow their skills.</p>
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
    </>
  );
}
