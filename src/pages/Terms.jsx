import React from 'react';

export default function Terms() {
  return (
    <div style={{ paddingTop: '130px', paddingBottom: '64px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-card animate-fade-up" style={{ padding: '48px 32px' }}>
        <h1 className="page-title" style={{ marginBottom: '24px', fontSize: '2.25rem', fontFamily: 'Fustat, sans-serif' }}>Terms & Conditions</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px' }}>Last updated: July 2026</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
          <section>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '12px' }}>1. Acceptance of Terms</h2>
            <p>By creating an account or using the SkillSwap platform, you agree to comply with and be bound by these Terms & Conditions. If you do not agree, please do not use the service.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '12px' }}>2. Platform Nature (No Monetary Transactions)</h2>
            <p>SkillSwap is strictly a peer-to-peer educational barter community. No monetary exchange is permitted for skill sharing sessions. Engaging in financial transactions or charging users for teaching/services on the platform is grounds for immediate termination of your account.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '12px' }}>3. User Conduct & Safety</h2>
            <p>You agree to treat all members with respect, trust, and inclusivity. Harassment, discrimination, abusive behavior, and posting offensive content are strictly prohibited. Users must coordinate matches and session details responsibly and safely.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '12px' }}>4. Content Ownership & Responsibility</h2>
            <p>You retain ownership of any details, bio, or learning materials you upload. However, you grant SkillSwap a non-exclusive license to host and display this content to support platform operations. You are solely responsible for all content posted on your profile or blog posts.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '12px' }}>5. Limitation of Liability</h2>
            <p>SkillSwap does not verify the credentials or skill level of its members. All swaps are completed at the users' own risk. SkillSwap is not liable for any disputes, damages, or issues arising from peer-to-peer matches, communications, or learning sessions.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
