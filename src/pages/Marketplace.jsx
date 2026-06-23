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
    <div style={{ paddingTop: '100px', paddingBottom: '64px' }}>
      <div className="page-header animate-fade-up">
        <h1 className="page-title">Skills Marketplace</h1>
        <p className="page-subtitle">Browse skills offered by the community. Search, filter by category and level, then request a swap.</p>
      </div>

      <form onSubmit={handleSearchSubmit} className="glass-card animate-fade-up delay-1" style={{ display: 'flex', padding: '6px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 4px 20px var(--glass-shadow)' }}>
        <input 
          type="search" 
          placeholder="What skill are you looking for?" 
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '1rem', padding: '12px 16px', color: 'var(--text-primary)', outline: 'none', boxShadow: 'none' }} 
        />
        <button type="submit" className="primary-cta" style={{ padding: '0 24px', fontSize: '0.95rem', borderRadius: '8px' }}>Search</button>
      </form>
      
      <div className="filters-bar glass-card animate-fade-up delay-2">
        <label>Category 
          <select value={category} onChange={handleCategoryChange}>
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>Level 
          <select value={level} onChange={handleLevelChange}>
            <option value="">All levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </label>
        <label>Sort by 
          <select value={sort} onChange={handleSortChange}>
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </label>
        <Link to="/create-skill" className="primary-cta" style={{ marginLeft: 'auto' }}>+ List a Skill</Link>
      </div>
      
      <p className="results-count animate-fade-up delay-3">
        {pagination.total} skill{pagination.total !== 1 ? 's' : ''} found
      </p>
      
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
