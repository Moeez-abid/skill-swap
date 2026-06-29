import React, { useState } from 'react';
import api from '../shared/api.js';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/support', formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to send message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-up" style={{ paddingTop: '120px', minHeight: 'calc(100vh - 200px)' }}>
      <div className="section-title">Contact Us</div>
      
      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '32px' }}>
        <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Have a question, suggestion, or need support? We'd love to hear from you. Fill out the form below and our team will get back to you shortly.
        </p>

        {submitted ? (
          <div className="toast toast--success" style={{ display: 'block', position: 'relative', margin: '0 auto' }}>
            Message sent successfully! We'll be in touch soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text" 
                required 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="Your Name"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                required 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                placeholder="you@example.com"
              />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea 
                required 
                rows="5"
                value={formData.message} 
                onChange={(e) => setFormData({...formData, message: e.target.value})} 
                placeholder="How can we help you?"
              ></textarea>
            </div>
            <button type="submit" className="primary-cta" style={{ marginTop: '8px' }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
