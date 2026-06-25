import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

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
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="surface" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Add Log Entry</h2>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Category</label>
            <select style={{ width: '100%', padding: '0.75rem' }} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Title</label>
            <input required style={{ width: '100%', padding: '0.75rem' }} value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>From Time</label>
              <input type="time" required style={{ width: '100%', padding: '0.75rem' }} value={fromTime} onChange={e => setFromTime(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>To Time</label>
              <input type="time" required style={{ width: '100%', padding: '0.75rem' }} value={toTime} onChange={e => setToTime(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Notes (Optional)</label>
            <textarea style={{ width: '100%', padding: '0.75rem', minHeight: '80px', resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
