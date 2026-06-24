import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './Login.module.css';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Resolve Employee ID to Email
      const { data: email, error: rpcError } = await supabase.rpc('get_email_by_employee_id', {
        p_employee_id: employeeId
      });

      if (rpcError || !email) {
        throw new Error('Invalid Employee ID.');
      }

      if (isForgotPassword) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
        if (resetError) throw resetError;
        setMessage('Password reset link sent to your registered email.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        // App.tsx handles redirect via AuthContext
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>EOD Tracker</h1>
        <p className={styles.subtitle}>
          {isForgotPassword ? 'Reset your password' : 'Sign in to your account'}
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {message && <div style={{ color: 'var(--success-color)', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Employee ID</label>
            <input
              type="text"
              required
              className={styles.input}
              placeholder="e.g. I001"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
              disabled={loading}
            />
          </div>

          {!isForgotPassword && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                required
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : 'Sign In')}
          </button>
        </form>

        <button 
          className={styles.linkBtn} 
          onClick={() => {
            setIsForgotPassword(!isForgotPassword);
            setError('');
            setMessage('');
          }}
        >
          {isForgotPassword ? 'Back to Login' : 'Forgot Password?'}
        </button>
      </div>
    </div>
  );
}
