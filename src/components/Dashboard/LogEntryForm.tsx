import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

interface LogEntryFormProps {
  onSaved: () => void;
  disabled?: boolean;
  suggestedStartTime?: string;
}

const CATEGORIES = ['Meeting', 'Support', 'Troubleshooting', 'Break', 'Activity', 'Others'];

export default function LogEntryForm({ onSaved, disabled, suggestedStartTime }: LogEntryFormProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (suggestedStartTime) {
      setFromTime(suggestedStartTime);
      // We don't overwrite toTime if it's already later, but for a fresh entry let's just leave it blank or default to fromTime
    }
  }, [suggestedStartTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || disabled) return;
    setError('');
    setSaving(true);

    try {
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
      
      // Reset form
      setTitle('');
      setFromTime(toTime); // auto-set next start time to current end time
      setToTime('');
      setNotes('');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save log entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Add Log Entry</h3>
      
      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Category</label>
            <select disabled={disabled || saving} style={{ width: '100%', padding: '0.75rem' }} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Title</label>
            <input disabled={disabled || saving} required maxLength={100} style={{ width: '100%', padding: '0.75rem' }} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>From Time</label>
            <input disabled={disabled || saving} type="time" required style={{ width: '100%', padding: '0.75rem' }} value={fromTime} onChange={e => setFromTime(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>To Time</label>
            <input disabled={disabled || saving} type="time" required style={{ width: '100%', padding: '0.75rem' }} value={toTime} onChange={e => setToTime(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Notes (Optional)</label>
          <input disabled={disabled || saving} maxLength={300} style={{ width: '100%', padding: '0.75rem' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific details..." />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={disabled || saving}>
            {saving ? 'Adding...' : 'Add Log Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
