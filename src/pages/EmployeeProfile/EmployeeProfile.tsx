import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, Mail, Phone, MapPin, Shield, Lock, BadgeCheck, AlertCircle } from 'lucide-react';
import styles from './EmployeeProfile.module.css';

export default function EmployeeProfile() {
  const { profile, user } = useAuth();
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
      setMessage('Verification link sent to new email. Please check your inbox.');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0][0].toUpperCase();
  };

  return (
    <div className="page-container">
      <div className={styles.profileRoot}>
        {/* Hero Profile Header */}
        <div className={styles.heroCard}>
          <div className={styles.avatar}>
            {getInitials(profile?.full_name)}
          </div>
          <div className={styles.heroInfo}>
            <h2 className={styles.heroName}>{profile?.full_name || 'Employee Profile'}</h2>
            <div className={styles.heroRole}>
              <BadgeCheck size={16} />
              <span>{profile?.role || 'Employee'} • ID: {profile?.employee_id || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Details & Settings Grid */}
        <div className={styles.grid}>
          {/* Personal Information Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <User size={20} style={{ color: 'var(--accent-color)' }} />
              <h2 className={styles.cardTitle}>Personal Information</h2>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}><User size={14} /> Full Name</label>
                <input disabled className={styles.fieldInput} value={profile?.full_name || ''} />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Badge ID</label>
                <input disabled className={styles.fieldInput} value={profile?.employee_id || ''} />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}><Phone size={14} /> Phone Number</label>
                <input disabled className={styles.fieldInput} value={profile?.phone || '-'} />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}><MapPin size={14} /> Work Location</label>
                <input disabled className={styles.fieldInput} value={profile?.work_location || '-'} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 'auto' }}>
              <AlertCircle size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
              <span>To update personal directory details, please contact your system administrator.</span>
            </div>
          </div>

          {/* Account Settings Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Shield size={20} style={{ color: 'var(--accent-color)' }} />
              <h2 className={styles.cardTitle}>Account & Security</h2>
            </div>

            <form onSubmit={handleChangeEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}><Mail size={14} /> Email Address</label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input 
                    required 
                    type="email" 
                    className={styles.fieldInput} 
                    style={{ flex: '1 1 200px' }}
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                  <button type="submit" className="btn-primary" disabled={loading} style={{ height: '42px', padding: '0 1.25rem', whiteSpace: 'nowrap' }}>
                    {loading ? 'Sending...' : 'Update Email'}
                  </button>
                </div>
              </div>
              {message && <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.6rem 0.85rem', borderRadius: '6px' }}>{message}</div>}
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className={styles.fieldLabel}><Lock size={14} /> Password Authentication</label>
              <p className="text-secondary" style={{ fontSize: '0.85rem', margin: 0 }}>Manage your account password and security preferences.</p>
              <button 
                type="button" 
                className="btn-outline" 
                onClick={() => window.location.href = '/settings'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', marginTop: '0.5rem' }}
              >
                <Lock size={16} /> Change Account Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
