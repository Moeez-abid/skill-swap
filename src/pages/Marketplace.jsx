import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { skills, categories as categoriesApi } from '../shared/api';
import { isLoggedIn, getUser } from '../shared/auth';
import SkillCard from '../components/SkillCard';

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filters
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [level, setLevel] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [activeQuery, setActiveQuery] = useState(searchParams.get('q') || '');

  // Data
  const [categories, setCategories] = useState([]);
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    categoriesApi.list()
      .then(res => setCategories(res.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const query = { page, limit: 12, sort };
    if (activeQuery) query.q = activeQuery;
    if (category) query.categories = category; // The API accepts comma separated, here we just send one
    if (level) query.levels = level;
    if (isLoggedIn()) {
      const user = getUser();
      if (user) query.excludeProvider = user.id;
    }

    skills.list(query)
      .then(data => {
        setResults(data.skills);
        setPagination(data.pagination);
      })
      .catch(() => {
        setError(true);
        setResults([]);
        setPagination({ total: 0, totalPages: 1 });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [category, level, sort, page, activeQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveQuery(searchInput);
    setPage(1);
    const newParams = Object.fromEntries(searchParams.entries());
    if (searchInput) newParams.q = searchInput;
    else delete newParams.q;
    setSearchParams(newParams);
  };

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setCategory(newCat);
    setPage(1);
    if (newCat) setSearchParams({ category: newCat });
    else setSearchParams({});
  };

  const handleLevelChange = (e) => {
    setLevel(e.target.value);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    setPage(1);
  };

  // Pagination logic
  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;
    
    const buttons = [];
    buttons.push(
      <button key="prev" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        &larr;
      </button>
    );

    for (let i = 1; i <= pagination.totalPages && i <= 7; i++) {
      buttons.push(
        <button key={i} className={i === page ? 'active' : ''} onClick={() => setPage(i)}>
          {i}
        </button>
      );
    }

    buttons.push(
      <button key="next" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
        &rarr;
      </button>
    );

    return buttons;
  };

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px' }}>
      <section className="hero-search-area glass-card animate-fade-up">
        <h2>What do you want to learn today?</h2>
        <p>Discover experts ready to swap skills. Connect, learn, and grow together.</p>
        
        <form onSubmit={handleSearchSubmit} className="hero-search-input-group">
          <svg className="search-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="e.g. Advanced React, Conversational French, 3D Modeling..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="primary-cta">Search</button>
        </form>
        
        <div className="filter-chips">
          <span className="filter-chip-label">Categories:</span>
          <button 
            type="button" 
            className={`filter-chip ${category === '' ? 'active' : ''}`}
            onClick={() => handleCategoryChange({ target: { value: '' } })}
          >
            All
          </button>
          {categories.map(c => (
            <button 
              key={c.slug}
              type="button" 
              className={`filter-chip ${category === c.slug ? 'active' : ''}`}
              onClick={() => handleCategoryChange({ target: { value: c.slug } })}
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <select value={level} onChange={handleLevelChange} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '8px', color: 'var(--text-primary)' }}>
            <option value="">All levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
          <select value={sort} onChange={handleSortChange} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '8px', color: 'var(--text-primary)' }}>
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <p className="results-count" style={{ margin: 0 }}>
            {pagination.total} skill{pagination.total !== 1 ? 's' : ''} found
          </p>
          <Link to="/create-skill" className="primary-cta" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>+ List a Skill</Link>
        </div>
      </div>
      
      <div className="skills-grid">
        {loading ? (
          <p className="loading" style={{ gridColumn: '1 / -1' }}>Loading skills…</p>
        ) : error ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <h3>Unable to load marketplace</h3>
            <p>Make sure the backend is running.</p>
          </div>
        ) : results.length > 0 ? (
          results.map(skill => <SkillCard key={skill.id} skill={skill} />)
        ) : (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <h3>No skills found</h3>
            <p>Try adjusting your filters or list your own skill.</p>
          </div>
        )}
      </div>
      
      <nav className="pagination" aria-label="Pagination">
        {renderPagination()}
      </nav>
    </div>
  );
}
