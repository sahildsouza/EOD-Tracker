import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './AdminSettings.module.css';
import { Trash2, Edit, Clock, Briefcase, Plus, X, Check, Settings, PlusCircle, Sparkles, Layers, ShieldCheck, Tag, ChevronDown } from 'lucide-react';
import { parseISO, differenceInMinutes } from 'date-fns';
import Loader from '../../components/Loader/Loader';

export default function AdminSettings() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Accordion toggle states
  const [showShiftsList, setShowShiftsList] = useState(false);
  const [showDesigList, setShowDesigList] = useState(false);

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
      {/* Hero Banner Header */}
      <div className={styles.heroCard}>
        <div className={styles.heroIconBadge}>
          <Settings size={32} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h2 className={styles.heroTitle}>System Settings & Hierarchy</h2>
          <p className={styles.heroSubtitle}>Configure organization work shift schedules, time requirements, and role designation directory.</p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Shifts Management Column */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Clock size={24} style={{ color: 'var(--accent-color)' }} />
            <h2 className={styles.cardTitle}>Shifts Management</h2>
          </div>

          {/* Top Add/Edit Form Box */}
          <form className={`${styles.formBox} ${editingShiftId ? styles.editing : ''}`} onSubmit={handleSaveShift}>
            <div className={styles.formHeader}>
              <h3 className={styles.formHeaderTitle}>
                {editingShiftId ? <><Edit size={16} /> Editing Shift Schedule</> : <><PlusCircle size={16} /> Create New Shift</>}
              </h3>
              {editingShiftId && (
                <button type="button" className={styles.iconBtn} onClick={handleCancelShiftEdit} title="Cancel Edit" style={{ padding: '0.35rem', height: 'auto' }}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}><Tag size={12} style={{ display: 'inline', marginRight: '4px' }} /> Shift Name</label>
              <input required className={styles.input} placeholder="e.g. General Shift or Morning Shift" value={newShiftName} onChange={e => setNewShiftName(e.target.value)} />
            </div>

            <div className={styles.timeGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}><Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> Start Time</label>
                <input type="time" required className={styles.input} value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}><Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> End Time</label>
                <input type="time" required className={styles.input} value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '42px', fontWeight: 700 }}>
                {editingShiftId ? <><Check size={18} /> Update Shift Schedule</> : <><Plus size={18} /> Add New Shift</>}
              </button>
              {editingShiftId && (
                <button type="button" className="btn-outline" onClick={handleCancelShiftEdit} style={{ padding: '0 1.25rem', height: '42px', borderRadius: '8px' }}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Configured List Section */}
          <div className={styles.sectionHeading} onClick={() => setShowShiftsList(!showShiftsList)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Configured Shifts Schedule</span>
              <span className={styles.countBadge}>{shifts.length}</span>
            </div>
            <ChevronDown size={18} style={{ transform: showShiftsList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease', flexShrink: 0 }} />
          </div>

          {showShiftsList && (
            <div className={styles.list}>
              {shifts.map(s => (
                <div key={s.id} className={`${styles.listItem} ${editingShiftId === s.id ? styles.activeEdit : ''}`}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemName}>{s.name}</div>
                    <div className={styles.itemDesc}>
                      <Clock size={14} style={{ color: 'var(--accent-color)' }} />
                      <span>{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}</span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>• ({s.duration_hours} hrs required)</span>
                    </div>
                  </div>
                  <div className={styles.itemActions}>
                    <button type="button" className={styles.iconBtn} onClick={() => handleEditShiftClick(s)} title="Edit Shift">
                      <Edit size={17} />
                    </button>
                    <button type="button" className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDeleteShift(s.id)} title="Delete Shift">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
              {shifts.length === 0 && <div className={styles.emptyState}>No shift windows configured yet. Add one above.</div>}
            </div>
          )}
        </div>

        {/* Designations Hierarchy Column */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Briefcase size={24} style={{ color: 'var(--accent-color)' }} />
            <h2 className={styles.cardTitle}>Designations Hierarchy</h2>
          </div>

          {/* Top Add/Edit Form Box */}
          <form className={`${styles.formBox} ${editingDesigId ? styles.editing : ''}`} onSubmit={handleSaveDesignation}>
            <div className={styles.formHeader}>
              <h3 className={styles.formHeaderTitle}>
                {editingDesigId ? <><Edit size={16} /> Editing Role Designation</> : <><PlusCircle size={16} /> Create New Designation</>}
              </h3>
              {editingDesigId && (
                <button type="button" className={styles.iconBtn} onClick={handleCancelDesigEdit} title="Cancel Edit" style={{ padding: '0.35rem', height: 'auto' }}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}><Briefcase size={12} style={{ display: 'inline', marginRight: '4px' }} /> Designation Name</label>
              <input required className={styles.input} placeholder="e.g. Implementation Engineer or Lead Developer" value={newDesigName} onChange={e => setNewDesigName(e.target.value)} />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '42px', fontWeight: 700 }}>
                {editingDesigId ? <><Check size={18} /> Update Role Designation</> : <><Plus size={18} /> Add New Designation</>}
              </button>
              {editingDesigId && (
                <button type="button" className="btn-outline" onClick={handleCancelDesigEdit} style={{ padding: '0 1.25rem', height: '42px', borderRadius: '8px' }}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Configured List Section */}
          <div className={styles.sectionHeading} onClick={() => setShowDesigList(!showDesigList)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Configured Designations Directory</span>
              <span className={styles.countBadge}>{designations.length}</span>
            </div>
            <ChevronDown size={18} style={{ transform: showDesigList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease', flexShrink: 0 }} />
          </div>

          {showDesigList && (
            <div className={styles.list}>
              {designations.map(d => (
                <div key={d.id} className={`${styles.listItem} ${editingDesigId === d.id ? styles.activeEdit : ''}`}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemName}>{d.name}</div>
                    <div className={styles.itemDesc} style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>
                      <ShieldCheck size={14} />
                      <span>Active Organization Role</span>
                    </div>
                  </div>
                  <div className={styles.itemActions}>
                    <button type="button" className={styles.iconBtn} onClick={() => handleEditDesigClick(d)} title="Edit Designation">
                      <Edit size={17} />
                    </button>
                    <button type="button" className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDeleteDesignation(d.id)} title="Delete Designation">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
              {designations.length === 0 && <div className={styles.emptyState}>No role designations configured yet. Add one above.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
