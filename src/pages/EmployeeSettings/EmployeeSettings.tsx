import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import styles from '../AdminSettings/AdminSettings.module.css';

export default function EmployeeSettings() {
  const { theme, toggleTheme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true); setError(''); setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Password updated successfully.');
      setPassword(''); setConfirm('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`page-container ${styles.container}`}>
      <h1 className={styles.title} style={{ marginBottom: '0.5rem' }}>Settings</h1>
      
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.title}>Appearance</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Theme</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Toggle between light and dark mode</div>
            </div>
            <button className="btn-outline" onClick={toggleTheme}>
              {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.title}>Change Password</h2>
          <form className={styles.addForm} onSubmit={handleChangePassword} style={{ border: 'none', paddingTop: 0, marginTop: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>New Password</label>
              <input required type="password" minLength={6} className="surface input" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Confirm Password</label>
              <input required type="password" minLength={6} className="surface input" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem' }}>{error}</div>}
            {message && <div style={{ color: 'var(--success-color)', fontSize: '0.875rem' }}>{message}</div>}
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
