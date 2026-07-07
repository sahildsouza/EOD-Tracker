import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import styles from './LogEntryModal.module.css';

interface LogEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = ['Meeting', 'Support', 'Troubleshooting', 'Break', 'Activity', 'Others'];

export default function LogEntryModal({ isOpen, onClose, onSaved }: LogEntryModalProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSaving(true);

    try {
      // Build proper ISO strings. Assume today in IST.
      const today = getCurrentDateIST();
      const fromIso = `${today}T${fromTime}:00+05:30`;
      const toIso = `${today}T${toTime}:00+05:30`;

      const fromDate = new Date(fromIso);
      const toDate = new Date(toIso);

      if (toDate <= fromDate) {
        throw new Error('To Time must be after From Time.');
      }

      const durationMins = Math.round((toDate.getTime() - fromDate.getTime()) / 60000);

      const { error: dbError } = await supabase.from('log_entries').insert([{
        user_id: user.id,
        date: today,
        category,
        title,
        from_time: fromIso,
        to_time: toIso,
        duration_minutes: durationMins,
        notes: notes || null
      }]);

      if (dbError) throw dbError;
      
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save log entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={`surface ${styles.modal}`}>
        <h2 className={styles.title}>Add Log Entry</h2>
        
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Category</label>
            <select className={styles.select} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Title</label>
            <input required className={styles.input} value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className={styles.timeRow}>
            <div className={styles.timeCol}>
              <label className={styles.label}>From Time</label>
              <input type="time" required className={styles.input} value={fromTime} onChange={e => setFromTime(e.target.value)} />
            </div>
            <div className={styles.timeCol}>
              <label className={styles.label}>To Time</label>
              <input type="time" required className={styles.input} value={toTime} onChange={e => setToTime(e.target.value)} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Notes (Optional)</label>
            <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className={styles.actions}>
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
