import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './Login.module.css';
import { User, Lock, Eye, EyeOff, ArrowRight, Clock, ShieldCheck, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        p_employee_id: employeeId.trim()
      });

      if (rpcError || !email) {
        throw new Error('Invalid Employee ID. Please check your assigned ID.');
      }

      if (isForgotPassword) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
        if (resetError) throw resetError;
        setMessage('Password reset link sent to your registered email address.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        // App.tsx handles redirect via AuthContext
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardWrapper}>
        
        {/* Left Brand Showcase Panel */}
        <div className={styles.brandPanel}>
          <div>
            <div className={styles.brandHeader}>
              <div className={styles.logoBox}>
                <Clock size={24} />
              </div>
              <div>
                <h1 className={styles.brandTitle}>EOD Tracker</h1>
                <p className={styles.brandSubtitle}>Enterprise Workforce Management</p>
              </div>
            </div>

            <div className={styles.featureSection}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <Activity size={18} />
                </div>
                <div className={styles.featureText}>
                  <h4>Real-Time Task Tracking</h4>
                  <p>Log daily shift activities, track meeting allocations, and monitor productivity status seamlessly.</p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <ShieldCheck size={18} />
                </div>
                <div className={styles.featureText}>
                  <h4>Shift & Defaulter Auditing</h4>
                  <p>Automated shift compliance verification and reporting for enterprise team leaders and administrators.</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.brandFooter}>
            <span>Secure Enterprise Authentication</span>
            <span>v4.0 Release</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className={styles.formPanel}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>
              {isForgotPassword ? 'Reset Password' : 'Sign In to Portal'}
            </h2>
            <p className={styles.formSubtitle}>
              {isForgotPassword
                ? 'Enter your assigned Employee ID to receive a secure recovery link.'
                : 'Enter your Employee ID and password to access your dashboard.'}
            </p>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className={styles.successBox}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Employee ID</label>
              <div className={styles.inputWrapper}>
                <User size={18} className={styles.inputIcon} />
                <input
                  type="text"
                  required
                  className={styles.input}
                  placeholder="e.g. I001 or ADM01"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Password</label>
                <div className={styles.inputWrapper}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className={styles.input}
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              <span>{loading ? 'Authenticating...' : (isForgotPassword ? 'Send Recovery Email' : 'Sign In')}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className={styles.dividerRow}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>or</span>
            <div className={styles.dividerLine} />
          </div>

          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => {
              setIsForgotPassword(!isForgotPassword);
              setError('');
              setMessage('');
            }}
          >
            {isForgotPassword ? 'Return to Sign In' : 'Forgot Password?'}
          </button>
        </div>

      </div>
    </div>
  );
}
