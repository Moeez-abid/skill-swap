import React, { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => {
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    }, 500);
  };

  return (
    <div className="container animate-fade-up">
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
            <button type="submit" className="primary-cta" style={{ marginTop: '8px' }}>Send Message</button>
          </form>
        )}
      </div>
    </div>
  );
}
