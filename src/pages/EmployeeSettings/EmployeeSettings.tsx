import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { Settings, Palette, Key, Lock, Moon, Sun, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import styles from './EmployeeSettings.module.css';

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
      setError('New password and confirm password do not match.');
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
    <div className="page-container">
      <div className={styles.settingsRoot}>
        {/* Hero Settings Banner */}
        <div className={styles.heroCard}>
          <div className={styles.heroIconBadge}>
            <Settings size={32} />
          </div>
          <div className={styles.heroInfo}>
            <h2 className={styles.heroTitle}>Preferences & Security</h2>
            <p className={styles.heroSubtitle}>Customize your interface appearance and safeguard your account credentials.</p>
          </div>
        </div>

        {/* Settings Grid */}
        <div className={styles.grid}>
          {/* Appearance Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Palette size={20} style={{ color: 'var(--accent-color)' }} />
              <h2 className={styles.cardTitle}>Appearance & Display</h2>
            </div>

            <div className={styles.settingRow}>
              <div style={{ minWidth: 0, flex: 1, paddingRight: '0.4rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {theme === 'light' ? <Sun size={17} style={{ color: '#F59E0B', flexShrink: 0 }} /> : <Moon size={17} style={{ color: '#60A5FA', flexShrink: 0 }} />}
                  <span>Interface Theme</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Currently using <strong style={{ textTransform: 'capitalize' }}>{theme}</strong> mode
                </div>
              </div>

              <button 
                type="button" 
                className={theme === 'light' ? 'btn-primary' : 'btn-outline'} 
                onClick={toggleTheme}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', fontSize: '0.78rem', flexShrink: 0 }}
              >
                {theme === 'light' ? <><Moon size={15} /> Switch to Dark</> : <><Sun size={15} /> Switch to Light</>}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 'auto' }}>
              <ShieldCheck size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
              <span>Theme preference is saved locally across your active browser sessions.</span>
            </div>
          </div>

          {/* Security & Password Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Key size={20} style={{ color: 'var(--accent-color)' }} />
              <h2 className={styles.cardTitle}>Password & Authentication</h2>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}><Lock size={14} /> New Password</label>
                <input 
                  required 
                  type="password" 
                  minLength={6} 
                  className={styles.fieldInput} 
                  placeholder="At least 6 characters"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}><Lock size={14} /> Confirm New Password</label>
                <input 
                  required 
                  type="password" 
                  minLength={6} 
                  className={styles.fieldInput} 
                  placeholder="Repeat new password"
                  value={confirm} 
                  onChange={e => setConfirm(e.target.value)} 
                />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-color)', background: 'rgba(220, 38, 38, 0.1)', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <Check size={16} style={{ flexShrink: 0 }} />
                  <span>{message}</span>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading} style={{ height: '42px', marginTop: '0.5rem' }}>
                {loading ? 'Updating...' : 'Update Account Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
