import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './AdminSettings.module.css';
import { Trash2, Edit, Clock, Briefcase, Plus, X, Check } from 'lucide-react';
import { parseISO, differenceInMinutes } from 'date-fns';
import Loader from '../../components/Loader/Loader';

export default function AdminSettings() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('');
  const [newShiftEnd, setNewShiftEnd] = useState('');
  
  const [newDesigName, setNewDesigName] = useState('');

  // Edit states
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingDesigId, setEditingDesigId] = useState<string | null>(null);

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

  const handleSaveShift = async (e: React.FormEvent) => {
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

    const payload = {
      name: newShiftName,
      start_time: newShiftStart + ':00',
      end_time: newShiftEnd + ':00',
      duration_hours: durationHours
    };

    if (editingShiftId) {
      await supabase.from('shifts').update(payload).eq('id', editingShiftId);
      setEditingShiftId(null);
    } else {
      await supabase.from('shifts').insert([payload]);
    }

    setNewShiftName(''); setNewShiftStart(''); setNewShiftEnd('');
    fetchData();
  };

  const handleEditShiftClick = (shift: any) => {
    setEditingShiftId(shift.id);
    setNewShiftName(shift.name);
    setNewShiftStart(shift.start_time.slice(0, 5));
    setNewShiftEnd(shift.end_time.slice(0, 5));
  };

  const handleCancelShiftEdit = () => {
    setEditingShiftId(null);
    setNewShiftName(''); setNewShiftStart(''); setNewShiftEnd('');
  };

  const handleDeleteShift = async (id: string) => {
    // Basic check for deletion. (In a real app, also check today's usage explicitly)
    if (!confirm('Delete this shift? Ensure it is not used in active logs.')) return;
    await supabase.from('shifts').delete().eq('id', id);
    fetchData();
  };

  const handleSaveDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDesigId) {
      await supabase.from('designations').update({ name: newDesigName }).eq('id', editingDesigId);
      setEditingDesigId(null);
    } else {
      await supabase.from('designations').insert([{ name: newDesigName }]);
    }
    setNewDesigName('');
    fetchData();
  };

  const handleEditDesigClick = (desig: any) => {
    setEditingDesigId(desig.id);
    setNewDesigName(desig.name);
  };

  const handleCancelDesigEdit = () => {
    setEditingDesigId(null);
    setNewDesigName('');
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

  if (loading) return <div className="page-container"><Loader message="Loading system settings..." /></div>;

  return (
    <div className={`page-container ${styles.container}`}>
      <h1 className={styles.title} style={{ marginBottom: '0.5rem' }}>System Settings</h1>
      
      <div className={styles.grid}>
        {/* Shifts */}
        <div className={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Clock className="text-secondary" size={24} />
            <h2 className={styles.title} style={{ margin: 0 }}>Shifts</h2>
          </div>
          
          <div className={styles.list}>
            {shifts.map(s => (
              <div key={s.id} className={styles.listItem} style={{ borderColor: editingShiftId === s.id ? 'var(--accent-color)' : '' }}>
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{s.name}</div>
                  <div className={styles.itemDesc}>{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)} ({s.duration_hours} hrs required)</div>
                </div>
                <div className={styles.itemActions}>
                  <button className={styles.iconBtn} onClick={() => handleEditShiftClick(s)} title="Edit">
                    <Edit size={18} />
                  </button>
                  <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDeleteShift(s.id)} title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {shifts.length === 0 && <p className="text-secondary" style={{ padding: '1rem', textAlign: 'center', backgroundColor: 'var(--bg-page)', borderRadius: '8px' }}>No shifts configured.</p>}
          </div>

          <form className={styles.addForm} onSubmit={handleSaveShift}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{editingShiftId ? 'Edit Shift' : 'Add New Shift'}</h3>
              {editingShiftId && (
                <button type="button" className={styles.iconBtn} onClick={handleCancelShiftEdit} title="Cancel Edit">
                  <X size={18} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div className={styles.formGroup} style={{ flex: '1 1 200px' }}>
                <label className={styles.label}>Shift Name</label>
                <input required className="surface input" placeholder="e.g. Morning Shift" value={newShiftName} onChange={e => setNewShiftName(e.target.value)} style={{ padding: '0.5rem' }} />
              </div>
              <div className={styles.formGroup} style={{ flex: '0 0 110px' }}>
                <label className={styles.label}>Start Time</label>
                <input type="time" required className="surface input" value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} style={{ padding: '0.5rem' }} />
              </div>
              <div className={styles.formGroup} style={{ flex: '0 0 110px' }}>
                <label className={styles.label}>End Time</label>
                <input type="time" required className="surface input" value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} style={{ padding: '0.5rem' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '36px', padding: '0 1rem' }}>
                {editingShiftId ? <><Check size={16} /> Save</> : <><Plus size={16} /> Add</>}
              </button>
            </div>
          </form>
        </div>

        {/* Designations */}
        <div className={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Briefcase className="text-secondary" size={24} />
            <h2 className={styles.title} style={{ margin: 0 }}>Designations</h2>
          </div>
          <div className={styles.list}>
            {designations.map(d => (
              <div key={d.id} className={styles.listItem} style={{ borderColor: editingDesigId === d.id ? 'var(--accent-color)' : '' }}>
                <div className={styles.itemName}>{d.name}</div>
                <div className={styles.itemActions}>
                  <button className={styles.iconBtn} onClick={() => handleEditDesigClick(d)} title="Edit">
                    <Edit size={18} />
                  </button>
                  <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDeleteDesignation(d.id)} title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {designations.length === 0 && <p className="text-secondary" style={{ padding: '1rem', textAlign: 'center', backgroundColor: 'var(--bg-page)', borderRadius: '8px' }}>No designations configured.</p>}
          </div>

          <form className={styles.addForm} onSubmit={handleSaveDesignation}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{editingDesigId ? 'Edit Designation' : 'Add New Designation'}</h3>
              {editingDesigId && (
                <button type="button" className={styles.iconBtn} onClick={handleCancelDesigEdit} title="Cancel Edit">
                  <X size={18} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Designation Name</label>
                <input required className="surface input" placeholder="e.g. Software Engineer" value={newDesigName} onChange={e => setNewDesigName(e.target.value)} style={{ padding: '0.5rem' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '36px', padding: '0 1rem' }}>
                {editingDesigId ? <><Check size={16} /> Save</> : <><Plus size={16} /> Add</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
