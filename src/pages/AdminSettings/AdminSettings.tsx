import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './AdminSettings.module.css';
import { Trash2, Edit } from 'lucide-react';
import { parseISO, differenceInMinutes } from 'date-fns';

export default function AdminSettings() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('');
  const [newShiftEnd, setNewShiftEnd] = useState('');
  
  const [newDesigName, setNewDesigName] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const { data: s } = await supabase.from('shifts').select('*').order('name');
    if (s) setShifts(s);

    const { data: d } = await supabase.from('designations').select('*').order('name');
    if (d) setDesignations(d);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    // Calculate duration
    const today = new Date().toISOString().split('T')[0];
    const start = parseISO(`${today}T${newShiftStart}:00`);
    let end = parseISO(`${today}T${newShiftEnd}:00`);
    
    if (end < start) {
      // Crosses midnight
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    
    const diffMins = differenceInMinutes(end, start);
    const durationHours = diffMins / 60; // Total duration including break

    await supabase.from('shifts').insert([{
      name: newShiftName,
      start_time: newShiftStart + ':00',
      end_time: newShiftEnd + ':00',
      duration_hours: durationHours
    }]);

    setNewShiftName(''); setNewShiftStart(''); setNewShiftEnd('');
    fetchData();
  };

  const handleDeleteShift = async (id: string) => {
    // Basic check for deletion. (In a real app, also check today's usage explicitly)
    if (!confirm('Delete this shift? Ensure it is not used in active logs.')) return;
    await supabase.from('shifts').delete().eq('id', id);
    fetchData();
  };

  const handleAddDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('designations').insert([{ name: newDesigName }]);
    setNewDesigName('');
    fetchData();
  };

  const handleDeleteDesignation = async (id: string) => {
    // Check if used
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('designation_id', id);
    if (count && count > 0) {
      alert(`Cannot delete. There are ${count} employees assigned to this designation. Reassign them first.`);
      return;
    }
    if (!confirm('Delete this designation?')) return;
    await supabase.from('designations').delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="page-container">Loading Settings...</div>;

  return (
    <div className={`page-container ${styles.container}`}>
      <h1 className={styles.title} style={{ marginBottom: '0.5rem' }}>System Settings</h1>
      
      <div className={styles.grid}>
        {/* Shifts */}
        <div className={styles.card}>
          <h2 className={styles.title}>Shifts</h2>
          <div className={styles.list}>
            {shifts.map(s => (
              <div key={s.id} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{s.name}</div>
                  <div className={styles.itemDesc}>{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)} ({s.duration_hours} hrs required)</div>
                </div>
                <div className={styles.itemActions}>
                  <button className="btn-danger" style={{ padding: '0.5rem' }} onClick={() => handleDeleteShift(s.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {shifts.length === 0 && <p className="text-secondary">No shifts configured.</p>}
          </div>

          <form className={styles.addForm} onSubmit={handleAddShift}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Add New Shift</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>Shift Name</label>
              <input required className="surface input" value={newShiftName} onChange={e => setNewShiftName(e.target.value)} />
            </div>
            <div className={styles.timeGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Start Time</label>
                <input type="time" required className="surface input" value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>End Time</label>
                <input type="time" required className="surface input" value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Add Shift</button>
          </form>
        </div>

        {/* Designations */}
        <div className={styles.card}>
          <h2 className={styles.title}>Designations</h2>
          <div className={styles.list}>
            {designations.map(d => (
              <div key={d.id} className={styles.listItem}>
                <div className={styles.itemName}>{d.name}</div>
                <div className={styles.itemActions}>
                  <button className="btn-danger" style={{ padding: '0.5rem' }} onClick={() => handleDeleteDesignation(d.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {designations.length === 0 && <p className="text-secondary">No designations configured.</p>}
          </div>

          <form className={styles.addForm} onSubmit={handleAddDesignation}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Add New Designation</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>Designation Name</label>
              <input required className="surface input" value={newDesigName} onChange={e => setNewDesigName(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Add Designation</button>
          </form>
        </div>
      </div>
    </div>
  );
}
