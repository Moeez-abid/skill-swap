import React, { useState } from 'react';
import { api } from '../shared/api.js';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/support', { method: 'POST', body: JSON.stringify(formData) });
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header animate-fade-up" style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 className="page-title">Contact Us</h1>
        <p className="page-subtitle" style={{ maxWidth: '600px', lineHeight: '1.6', margin: '16px auto 0' }}>
          Have a question, suggestion, or need support? We'd love to hear from you. Fill out the form below and our team will get back to you shortly.
        </p>
      </div>
      
      <div className="glass-card animate-fade-up delay-1" style={{ maxWidth: '600px', margin: '0 auto', padding: '40px' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(22, 163, 74, 0.1)', color: '#16A34A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>✓</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>Message Sent</h3>
            <p style={{ color: 'var(--text-secondary)' }}>We've received your message and will be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label>Name</label>
              <input 
                type="text" 
                required 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="Your Name"
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label>Email</label>
              <input 
                type="email" 
                required 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                placeholder="you@example.com"
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label>Message</label>
              <textarea 
                required 
                rows="5"
                value={formData.message} 
                onChange={(e) => setFormData({...formData, message: e.target.value})} 
                placeholder="How can we help you?"
              ></textarea>
            </div>
            {error && <div className="form-error" style={{ textAlign: 'center' }}>{error}</div>}
            <button type="submit" className="primary-cta" style={{ marginTop: '12px', width: '100%', padding: '14px' }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
