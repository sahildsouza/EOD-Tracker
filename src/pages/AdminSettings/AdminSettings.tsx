import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './AdminSettings.module.css';
import { 
  Trash2, Edit, Clock, Briefcase, Plus, X, Check, Settings, 
  PlusCircle, Search, Sparkles, ShieldCheck, Tag, Layers 
} from 'lucide-react';
import { parseISO, differenceInMinutes } from 'date-fns';
import Loader from '../../components/Loader/Loader';

export default function AdminSettings() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'shifts' | 'designations'>('shifts');

  // Search filter states
  const [shiftSearch, setShiftSearch] = useState('');
  const [desigSearch, setDesigSearch] = useState('');

  // Form states for Shifts
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('');
  const [newShiftEnd, setNewShiftEnd] = useState('');
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  // Form states for Designations
  const [newDesigName, setNewDesigName] = useState('');
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

  // --- Shift Handlers ---
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const start = parseISO(`${today}T${newShiftStart}:00`);
    let end = parseISO(`${today}T${newShiftEnd}:00`);
    
    if (end < start) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    
    const diffMins = differenceInMinutes(end, start);
    const durationHours = diffMins / 60;

    const payload = {
      name: newShiftName.trim(),
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelShiftEdit = () => {
    setEditingShiftId(null);
    setNewShiftName(''); setNewShiftStart(''); setNewShiftEnd('');
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Delete this shift window? Ensure it is not assigned to active employee logs.')) return;
    await supabase.from('shifts').delete().eq('id', id);
    if (editingShiftId === id) handleCancelShiftEdit();
    fetchData();
  };

  // --- Designation Handlers ---
  const handleSaveDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: newDesigName.trim() };
    if (editingDesigId) {
      await supabase.from('designations').update(payload).eq('id', editingDesigId);
      setEditingDesigId(null);
    } else {
      await supabase.from('designations').insert([payload]);
    }
    setNewDesigName('');
    fetchData();
  };

  const handleEditDesigClick = (desig: any) => {
    setEditingDesigId(desig.id);
    setNewDesigName(desig.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelDesigEdit = () => {
    setEditingDesigId(null);
    setNewDesigName('');
  };

  const handleDeleteDesignation = async (id: string) => {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('designation_id', id);
    if (count && count > 0) {
      alert(`Cannot delete: ${count} employee(s) are currently assigned to this role designation. Reassign them first.`);
      return;
    }
    if (!confirm('Delete this role designation?')) return;
    await supabase.from('designations').delete().eq('id', id);
    if (editingDesigId === id) handleCancelDesigEdit();
    fetchData();
  };

  // Filtered lists
  const filteredShifts = shifts.filter(s => 
    s.name.toLowerCase().includes(shiftSearch.toLowerCase())
  );

  const filteredDesignations = designations.filter(d => 
    d.name.toLowerCase().includes(desigSearch.toLowerCase())
  );

  if (loading) return <div className="page-container"><Loader message="Loading system configurations..." /></div>;

  return (
    <div className={`page-container ${styles.container}`}>
      {/* Top Hero Banner Card */}
      <div className="bannerCard" style={{ '--banner-accent': '#3B82F6' } as React.CSSProperties}>
        <div className="bannerIconBox" style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#3B82F6' }}>
          <Settings size={24} />
        </div>
        <p className="bannerText">
          Manage organization work shift schedules, time requirements, and employee role designation directory.
        </p>
      </div>

      {/* Navigation Tab Bar */}
      <div className={styles.tabsBar}>
        <button 
          type="button" 
          className={`${styles.tabBtn} ${activeTab === 'shifts' ? styles.active : ''}`}
          onClick={() => setActiveTab('shifts')}
        >
          <Clock size={18} />
          <span>Manage Shift</span>
        </button>

        <button 
          type="button" 
          className={`${styles.tabBtn} ${activeTab === 'designations' ? styles.active : ''}`}
          onClick={() => setActiveTab('designations')}
        >
          <Briefcase size={18} />
          <span>Manage Designation</span>
        </button>
      </div>

      {/* Workspace Grid */}
      {activeTab === 'shifts' ? (
        <div className={styles.workspaceGrid}>
          {/* Left Panel: Configured Shifts List */}
          <div className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <Layers size={20} style={{ color: '#3B82F6' }} />
                Configured Shifts Directory
              </h2>
              <div className={styles.searchBox}>
                <Search size={16} style={{ color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className={styles.searchInput}
                  placeholder="Search shift schedules..." 
                  value={shiftSearch}
                  onChange={e => setShiftSearch(e.target.value)}
                />
                {shiftSearch && (
                  <button type="button" onClick={() => setShiftSearch('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className={styles.itemsContainer}>
              {filteredShifts.map(s => (
                <div key={s.id} className={`${styles.itemCard} ${editingShiftId === s.id ? styles.activeEdit : ''}`}>
                  <div className={styles.itemMain}>
                    <div className={styles.itemNameRow}>
                      <span className={styles.itemName}>{s.name}</span>
                      <span className={styles.itemTag}>{s.duration_hours}h required</span>
                    </div>
                    <div className={styles.itemMeta}>
                      <span className={styles.metaBadge}>
                        <Clock size={14} style={{ color: '#3B82F6' }} />
                        {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    <button type="button" className={styles.actionBtn} onClick={() => handleEditShiftClick(s)} title="Edit Shift">
                      <Edit size={16} />
                    </button>
                    <button type="button" className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDeleteShift(s.id)} title="Delete Shift">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {filteredShifts.length === 0 && (
                <div className={styles.emptyState}>
                  <Clock size={36} style={{ opacity: 0.4 }} />
                  <span>{shiftSearch ? `No shift found matching "${shiftSearch}"` : 'No shift schedules configured yet. Create one on the right!'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Shift Editor Form */}
          <div className={`${styles.editorPanel} ${editingShiftId ? styles.isEditing : ''}`}>
            <div className={styles.editorHeader}>
              <h3 className={styles.editorTitle}>
                {editingShiftId ? <><Edit size={18} /> Editing Shift Schedule</> : <><PlusCircle size={18} /> Create New Shift</>}
              </h3>
              {editingShiftId && (
                <button type="button" className="btn-outline" onClick={handleCancelShiftEdit} style={{ padding: '0.3rem 0.6rem', height: 'auto', fontSize: '0.78rem' }}>
                  Cancel Edit
                </button>
              )}
            </div>

            <form className={styles.formBody} onSubmit={handleSaveShift}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}><Tag size={13} /> Shift Schedule Name</label>
                <input 
                  required 
                  className={styles.formInput} 
                  placeholder="e.g. General Shift or Morning Shift" 
                  value={newShiftName} 
                  onChange={e => setNewShiftName(e.target.value)} 
                />
              </div>

              <div className={styles.timeRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><Clock size={13} /> Start Time</label>
                  <input 
                    type="time" 
                    required 
                    className={styles.formInput} 
                    value={newShiftStart} 
                    onChange={e => setNewShiftStart(e.target.value)} 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><Clock size={13} /> End Time</label>
                  <input 
                    type="time" 
                    required 
                    className={styles.formInput} 
                    value={newShiftEnd} 
                    onChange={e => setNewShiftEnd(e.target.value)} 
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={`btn-primary ${styles.submitBtn}`}>
                  {editingShiftId ? <><Check size={18} /> Save Changes</> : <><Plus size={18} /> Add Shift Schedule</>}
                </button>
                {editingShiftId && (
                  <button type="button" className={`btn-outline ${styles.cancelBtn}`} onClick={handleCancelShiftEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className={styles.workspaceGrid}>
          {/* Left Panel: Configured Designations List */}
          <div className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <ShieldCheck size={20} style={{ color: '#10B981' }} />
                Organization Role Directory
              </h2>
              <div className={styles.searchBox}>
                <Search size={16} style={{ color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className={styles.searchInput}
                  placeholder="Search roles..." 
                  value={desigSearch}
                  onChange={e => setDesigSearch(e.target.value)}
                />
                {desigSearch && (
                  <button type="button" onClick={() => setDesigSearch('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className={styles.itemsContainer}>
              {filteredDesignations.map(d => (
                <div key={d.id} className={`${styles.itemCard} ${editingDesigId === d.id ? styles.activeEdit : ''}`}>
                  <div className={styles.itemMain}>
                    <div className={styles.itemNameRow}>
                      <span className={styles.itemName}>{d.name}</span>
                    </div>
                    <div className={styles.itemMeta}>
                      <span className={styles.metaBadge} style={{ color: '#10B981', fontSize: '0.78rem' }}>
                        <ShieldCheck size={14} /> Active Organization Role
                      </span>
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    <button type="button" className={styles.actionBtn} onClick={() => handleEditDesigClick(d)} title="Edit Role Designation">
                      <Edit size={16} />
                    </button>
                    <button type="button" className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDeleteDesignation(d.id)} title="Delete Role Designation">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {filteredDesignations.length === 0 && (
                <div className={styles.emptyState}>
                  <Briefcase size={36} style={{ opacity: 0.4 }} />
                  <span>{desigSearch ? `No role found matching "${desigSearch}"` : 'No role designations configured yet. Create one on the right!'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Designation Editor Form */}
          <div className={`${styles.editorPanel} ${editingDesigId ? styles.isEditing : ''}`}>
            <div className={styles.editorHeader}>
              <h3 className={styles.editorTitle}>
                {editingDesigId ? <><Edit size={18} /> Editing Role Designation</> : <><PlusCircle size={18} /> Create New Role</>}
              </h3>
              {editingDesigId && (
                <button type="button" className="btn-outline" onClick={handleCancelDesigEdit} style={{ padding: '0.3rem 0.6rem', height: 'auto', fontSize: '0.78rem' }}>
                  Cancel Edit
                </button>
              )}
            </div>

            <form className={styles.formBody} onSubmit={handleSaveDesignation}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}><Briefcase size={13} /> Role Designation Name</label>
                <input 
                  required 
                  className={styles.formInput} 
                  placeholder="e.g. Lead Engineer or HR Specialist" 
                  value={newDesigName} 
                  onChange={e => setNewDesigName(e.target.value)} 
                />
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={`btn-primary ${styles.submitBtn}`}>
                  {editingDesigId ? <><Check size={18} /> Save Changes</> : <><Plus size={18} /> Add Role Designation</>}
                </button>
                {editingDesigId && (
                  <button type="button" className={`btn-outline ${styles.cancelBtn}`} onClick={handleCancelDesigEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
