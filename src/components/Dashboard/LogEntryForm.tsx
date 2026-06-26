import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

interface LogEntryFormProps {
  onSaved: () => void;
  disabled?: boolean;
  suggestedStartTime?: string;
  editingLog?: any;
  onCancelEdit?: () => void;
}

const CATEGORIES = ['Meeting', 'Support', 'Troubleshooting', 'Break', 'Activity', 'Others'];

export default function LogEntryForm({ onSaved, disabled, suggestedStartTime, editingLog, onCancelEdit }: LogEntryFormProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingLog) {
      setCategory(editingLog.category);
      setTitle(editingLog.title);
      setFromTime(formatInTimeZone(parseISO(editingLog.from_time), 'Asia/Kolkata', 'HH:mm'));
      setToTime(formatInTimeZone(parseISO(editingLog.to_time), 'Asia/Kolkata', 'HH:mm'));
      setNotes(editingLog.notes || '');
      setError('');
    } else if (suggestedStartTime) {
      setFromTime(suggestedStartTime);
      setToTime('');
      setTitle('');
      setNotes('');
    }
  }, [editingLog, suggestedStartTime]);

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

      const payload = {
        user_id: user.id,
        date: today,
        category,
        title,
        from_time: fromIso,
        to_time: toIso,
        duration_minutes: durationMins,
        notes: notes || null
      };

      if (editingLog) {
        const { error: dbError } = await supabase.from('log_entries').update(payload).eq('id', editingLog.id);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase.from('log_entries').insert([payload]);
        if (dbError) throw dbError;
      }
      
      // Reset form
      setTitle('');
      if (!editingLog) {
        setFromTime(toTime); // auto-set next start time to current end time
      } else {
        setFromTime('');
      }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{editingLog ? 'Edit Log Entry' : 'Add Log Entry'}</h3>
        {editingLog && onCancelEdit && (
          <button type="button" className="btn-outline" onClick={onCancelEdit} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
            Cancel Edit
          </button>
        )}
      </div>
      
      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Category</label>
            <select disabled={disabled || saving} style={{ width: '100%', padding: '0.75rem' }} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Title</label>
            <input disabled={disabled || saving} required style={{ width: '100%', padding: '0.75rem' }} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
          <input disabled={disabled || saving} style={{ width: '100%', padding: '0.75rem' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific details..." />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={disabled || saving}>
            {saving ? 'Saving...' : (editingLog ? 'Save Changes' : 'Add Log Entry')}
          </button>
        </div>
      </form>
    </div>
  );
}
