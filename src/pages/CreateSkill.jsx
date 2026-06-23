import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { skills, categories as categoriesApi } from '../shared/api';
import { isLoggedIn } from '../shared/auth';

export default function CreateSkill() {
  const navigate = useNavigate();

  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [level, setLevel] = useState('BEGINNER');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }

    categoriesApi.list()
      .then(res => setCategoriesList(res.categories))
      .catch(() => setError('Could not load categories'));
  }, [navigate]);

  const handleCategoryChange = (e) => {
    const catId = e.target.value;
    setCategoryId(catId);
    setSubcategoryId('');
    
    const cat = categoriesList.find(c => c.id === catId);
    if (cat) {
      setSubcategoriesList(cat.subcategories || []);
    } else {
      setSubcategoriesList([]);
    }
  };


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 2 * 1024 * 1024) {
      alert('Cover Image max size is 2MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setCoverImage(null);
      return;
    }
    setCoverImage(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);

    const fd = new FormData();
    fd.append('title', title);
    fd.append('categoryId', categoryId);
    fd.append('subcategoryId', subcategoryId);
    fd.append('level', level);
    fd.append('shortDescription', shortDescription);
    fd.append('fullDescription', fullDescription);
    fd.append('learningOutcomes', learningOutcomes);
    if (prerequisites) fd.append('prerequisites', prerequisites);
    
    const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    fd.append('tags', JSON.stringify(tagsArray));
    
    if (coverImage) fd.append('coverImage', coverImage);

    try {
      const res = await skills.create(fd);
      setToastMsg('Skill listed successfully!');
      setTimeout(() => {
        navigate(`/skill-detail?id=${res.skill.id}`);
      }, 1000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '64px' }}>
      <div className="page-header animate-fade-up">
        <h1 className="page-title">List a Skill</h1>
        <p className="page-subtitle">Share what you can teach. All fields marked with validation rules from the spec apply.</p>
      </div>

      <form className="form-card glass-card animate-fade-up delay-1" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Skill Title *</label>
          <input id="title" required minLength="5" maxLength="100" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select id="category" required value={categoryId} onChange={handleCategoryChange}>
              <option value="">Select category</option>
              {categoriesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="subcategory">Subcategory *</label>
            <select id="subcategory" required value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} disabled={!categoryId}>
              <option value="">Select subcategory</option>
              {subcategoriesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="level">Skill Level *</label>
          <select id="level" required value={level} onChange={e => setLevel(e.target.value)}>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="shortDescription">Short Description * (20–200 chars)</label>
          <input id="shortDescription" required minLength="20" maxLength="200" value={shortDescription} onChange={e => setShortDescription(e.target.value)} />
        </div>

        <div className="form-group">
          <label htmlFor="fullDescription">Full Description * (50–5000 chars)</label>
          <textarea id="fullDescription" required minLength="50" maxLength="5000" value={fullDescription} onChange={e => setFullDescription(e.target.value)}></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="learningOutcomes">Learning Outcomes *</label>
          <textarea id="learningOutcomes" required minLength="10" value={learningOutcomes} onChange={e => setLearningOutcomes(e.target.value)}></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="prerequisites">Prerequisites (optional)</label>
          <textarea id="prerequisites" value={prerequisites} onChange={e => setPrerequisites(e.target.value)}></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated, max 10)</label>
          <input id="tags" placeholder="e.g. javascript, frontend" value={tags} onChange={e => setTags(e.target.value)} />
        </div>

        <div className="form-group">
          <label htmlFor="coverImage">Cover Image (max 2MB, optional)</label>
          <input type="file" id="coverImage" accept="image/*" ref={fileInputRef} onChange={handleFileChange} />
        </div>

        <button type="submit" className="primary-cta" disabled={loading}>
          {loading ? 'Publishing...' : 'Publish Skill'}
        </button>
        {error && <p className="form-error">{error}</p>}
      </form>

      {toastMsg && (
        <div className="toast toast--info toast--visible" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
