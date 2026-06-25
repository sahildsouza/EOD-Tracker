import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDailyStatus } from '../../hooks/useDailyStatus';
import { supabase } from '../../lib/supabase';
import styles from './DailyStatus.module.css';

export default function DailyStatus() {
  const navigate = useNavigate();
  const { status, isLoading, updateStatus } = useDailyStatus();
  const [selectedStatus, setSelectedStatus] = useState<'shift' | 'leave' | 'week-off' | null>(null);
  const [shifts, setShifts] = useState<{ id: string, name: string }[]>([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && status) {
      setSelectedStatus(status.status as any);
      if (status.shift_id) {
        setSelectedShift(status.shift_id);
      }
    }
  }, [status, isLoading]);

  useEffect(() => {
    const fetchShifts = async () => {
      const { data } = await supabase.from('shifts').select('id, name');
      if (data) {
        setShifts(data);
      }
    };
    fetchShifts();
  }, []);

  const handleSubmit = async () => {
    if (!selectedStatus) {
      setError('Please select a status for today.');
      return;
    }
    if (selectedStatus === 'shift' && !selectedShift) {
      setError('Please select your shift.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await updateStatus(selectedStatus, selectedStatus === 'shift' ? selectedShift : undefined);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Good Morning!</h1>
        <p className={styles.subtitle}>Please select your work status for today.</p>

        <div className={styles.optionsGrid}>
          <button 
            className={`${styles.optionBtn} ${selectedStatus === 'shift' ? styles.selected : ''}`}
            onClick={() => setSelectedStatus('shift')}
          >
            Working on a Shift
          </button>
          <button 
            className={`${styles.optionBtn} ${selectedStatus === 'leave' ? styles.selected : ''}`}
            onClick={() => setSelectedStatus('leave')}
          >
            On Leave
          </button>
          <button 
            className={`${styles.optionBtn} ${selectedStatus === 'week-off' ? styles.selected : ''}`}
            onClick={() => setSelectedStatus('week-off')}
          >
            Week-off
          </button>
        </div>

        {selectedStatus === 'shift' && (
          <select 
            className={styles.shiftSelect} 
            value={selectedShift} 
            onChange={(e) => setSelectedShift(e.target.value)}
          >
            <option value="">-- Select your Shift --</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        <button 
          className="btn-primary" 
          style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
          onClick={handleSubmit}
          disabled={submitting || !selectedStatus}
        >
          {submitting ? 'Saving...' : 'Confirm Status'}
        </button>

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}
