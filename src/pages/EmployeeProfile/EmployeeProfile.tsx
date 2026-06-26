import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
// Reusing some base styles
import styles from '../AdminSettings/AdminSettings.module.css';

export default function EmployeeProfile() {
  const { profile, user, refreshProfile } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true); setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      setMessage('Verification link sent to new email. Please verify to update.');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`page-container ${styles.container}`}>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.title}>Personal Information</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input disabled className="surface input" value={profile?.full_name || ''} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Employee ID</label>
            <input disabled className="surface input" value={profile?.employee_id || ''} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number</label>
            <input disabled className="surface input" value={profile?.phone || '-'} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Work Location</label>
            <input disabled className="surface input" value={profile?.work_location || '-'} />
          </div>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '1rem' }}>Contact your admin to update these details.</p>
        </div>

        <div className={styles.card}>
          <h2 className={styles.title}>Account Settings</h2>
          
          <form className={styles.addForm} onSubmit={handleChangeEmail} style={{ border: 'none', paddingTop: 0 }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <input required type="email" className="surface input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Sending...' : 'Change Email'}
            </button>
            {message && <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--accent-color)' }}>{message}</div>}
          </form>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />
          
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Password</h3>
            <button className="btn-outline" onClick={() => window.location.href='/settings'}>Go to Settings to Change Password</button>
          </div>
        </div>
      </div>
    </div>
  );
}
