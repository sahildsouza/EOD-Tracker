import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { PlusCircle, Edit3, Clock, Tag, FileText, CheckCircle, AlertCircle } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {editingLog ? <Edit3 size={20} style={{ color: 'var(--accent-color)' }} /> : <PlusCircle size={20} style={{ color: 'var(--accent-color)' }} />}
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{editingLog ? 'Edit Activity Log' : 'Log New Activity'}</h3>
        </div>
        {editingLog && onCancelEdit && (
          <button type="button" className="btn-outline" onClick={onCancelEdit} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}>
            Cancel Edit
          </button>
        )}
      </div>
      
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-color)', background: 'rgba(220, 38, 38, 0.1)', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', flexGrow: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
              <Tag size={14} style={{ color: 'var(--accent-color)' }} /> Category
            </label>
            <select disabled={disabled || saving} style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem', outline: 'none' }} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
              <FileText size={14} style={{ color: 'var(--accent-color)' }} /> Title
            </label>
            <input disabled={disabled || saving} required placeholder="e.g. Daily Standup / Bug Fix" style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem', outline: 'none' }} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
              <Clock size={14} style={{ color: 'var(--accent-color)' }} /> From Time (IST)
            </label>
            <input disabled={disabled || saving} type="time" required style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem', outline: 'none' }} value={fromTime} onChange={e => setFromTime(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
              <Clock size={14} style={{ color: 'var(--accent-color)' }} /> To Time (IST)
            </label>
            <input disabled={disabled || saving} type="time" required style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem', outline: 'none' }} value={toTime} onChange={e => setToTime(e.target.value)} />
          </div>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
            <FileText size={14} style={{ color: 'var(--accent-color)' }} /> Notes (Optional)
          </label>
          <input disabled={disabled || saving} style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem', outline: 'none' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any specific links, ticket IDs, or summary notes..." />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.5rem' }}>
          <button type="submit" className="btn-primary" disabled={disabled || saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 700, borderRadius: '8px', width: '100%', justifyContent: 'center' }}>
            <CheckCircle size={18} />
            <span>{saving ? 'Saving Activity...' : (editingLog ? 'Save Changes' : 'Record Activity Entry')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
