import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './SetPassword.module.css';

export default function SetPassword() {
  const { user, refreshProfile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Update profile to mark password as changed
      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', user.id);
          
        if (profileError) throw profileError;
      }

      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Set New Password</h1>
        <p className={styles.subtitle}>
          For your security, you must set a new password before continuing.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>New Password</label>
            <input
              type="password"
              required
              minLength={6}
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Confirm Password</label>
            <input
              type="password"
              required
              minLength={6}
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
