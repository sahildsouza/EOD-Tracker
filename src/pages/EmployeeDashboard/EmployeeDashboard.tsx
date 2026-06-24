import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDailyStatus } from '../../hooks/useDailyStatus';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { calculateMergedMinutes, isDateLocked } from '../../utils/timeUtils';
import type { LogEntry } from '../../utils/timeUtils';
import VisualTimeline from '../../components/Dashboard/VisualTimeline';
import LogEntryForm from '../../components/Dashboard/LogEntryForm';
import styles from './EmployeeDashboard.module.css';
import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Edit, Trash2 } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  Meeting: 'var(--category-meeting)',
  Support: 'var(--category-support)',
  Troubleshooting: 'var(--category-troubleshooting)',
  Break: 'var(--category-break)',
  Activity: 'var(--category-activity)',
  Others: 'var(--category-others)',
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { status } = useDailyStatus();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const today = getCurrentDateIST();
  const locked = isDateLocked(today);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    if (status?.shift_id) {
      const { data } = await supabase.from('shifts').select('*').eq('id', status.shift_id).single();
      setShift(data);
    }

    const { data: logs } = await supabase
      .from('log_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('from_time', { ascending: true });
    
    if (logs) {
      setEntries(logs as LogEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, status]);

  const totalLoggedMinutes = useMemo(() => {
    return calculateMergedMinutes(entries.map(e => ({ from: parseISO(e.from_time), to: parseISO(e.to_time) })));
  }, [entries]);

  const suggestedStartTime = useMemo(() => {
    if (entries.length > 0) {
      const lastEntry = entries[entries.length - 1];
      return formatInTimeZone(parseISO(lastEntry.to_time), 'Asia/Kolkata', 'HH:mm');
    }
    if (shift?.start_time) {
      return shift.start_time.slice(0, 5);
    }
    return '';
  }, [entries, shift]);

  const requiredMinutes = (shift?.duration_hours || 0) * 60;
  const loggedHours = Math.floor(totalLoggedMinutes / 60);
  const loggedMins = totalLoggedMinutes % 60;

  const progressPercent = requiredMinutes > 0 ? Math.min((totalLoggedMinutes / requiredMinutes) * 100, 100) : 0;
  const radius = 74; // 160/2 - 6
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressPercent / 100) * circumference;

  const handleDelete = async (id: string) => {
    if (locked) return;
    if (!confirm('Are you sure you want to delete this entry?')) return;
    await supabase.from('log_entries').delete().eq('id', id);
    fetchData();
  };

  const handleCopyYesterday = async () => {
    // Left as an exercise or basic implementation:
    alert("Copy Yesterday's Template functionality would fetch yesterday's logs and open them.");
  };

  if (loading) return <div className="page-container">Loading Dashboard...</div>;

  return (
    <div className={`page-container ${styles.container}`}>
      <div className={styles.topSection}>
        {/* Left Column */}
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <div className={styles.ringContainer}>
              <svg className={styles.progressRing} viewBox="0 0 160 160">
                <circle className={styles.progressCircleBg} cx="80" cy="80" r={radius} />
                <circle 
                  className={styles.progressCircleValue} 
                  cx="80" cy="80" r={radius} 
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform="rotate(-90 80 80)"
                />
              </svg>
              <div className={styles.ringText}>
                <div className={styles.ringLogged}>{loggedHours}h {loggedMins}m</div>
                <div className={styles.ringRequired}>of {shift?.duration_hours || 0} hrs</div>
              </div>
            </div>
            
            <div className={styles.badges}>
              <div className={styles.badge}>Status: {status?.status.toUpperCase()}</div>
              {shift && (
                <div className={styles.badge}>
                  Shift: {shift.name} ({shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)})
                </div>
              )}
            </div>

            <div className={styles.actions}>
              {!locked && (
                <button className="btn-outline" onClick={() => window.location.href = '/daily-status'}>Change Today's Status</button>
              )}
              {status?.status === 'shift' && !locked && (
                <button className="btn-outline" onClick={handleCopyYesterday}>Use Yesterday's Template</button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightCol}>
          <div className={styles.card}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Today's Timeline</h2>
            {status?.status !== 'shift' ? (
              <p className="text-secondary">You are not on a shift today.</p>
            ) : (
              <VisualTimeline 
                entries={entries} 
                shiftStart={shift?.start_time} 
                shiftEnd={shift?.end_time} 
              />
            )}
          </div>

          {status?.status === 'shift' && (
            <div className={styles.card}>
              <LogEntryForm 
                onSaved={() => { setEditingLogId(null); fetchData(); }} 
                disabled={locked} 
                suggestedStartTime={suggestedStartTime}
                editingLog={entries.find(e => e.id === editingLogId) || null}
                onCancelEdit={() => setEditingLogId(null)}
              />
            </div>
          )}
        </div>
      </div>

      {status?.status === 'shift' && (
        <div className={styles.card}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Today's Log Entries</h2>
          {entries.length === 0 ? (
            <p className="text-secondary">No log entries for today yet.</p>
          ) : (
            <div className={styles.logList}>
              {/* Header for Desktop */}
              <div className={`${styles.logRow} ${styles.logHeader}`}>
                <div>Category</div>
                <div>Title</div>
                <div>From</div>
                <div>To</div>
                <div>Dur</div>
                <div style={{ textAlign: 'right' }}>Actions</div>
              </div>
              
              {/* Rows */}
              {entries.map(entry => (
                <div key={entry.id} className={styles.logRow}>
                  <div className={styles.colCategory}>
                    <span className={styles.catBadge} style={{ backgroundColor: CATEGORY_COLORS[entry.category] || CATEGORY_COLORS['Others'] }}>
                      {entry.category}
                    </span>
                  </div>
                  
                  <div className={`${styles.logTitleCol} ${styles.colTitle}`}>
                    {entry.title}
                  </div>
                  
                  <div className={styles.desktopTime}>{formatInTimeZone(parseISO(entry.from_time), 'Asia/Kolkata', 'HH:mm')}</div>
                  <div className={styles.desktopTime}>{formatInTimeZone(parseISO(entry.to_time), 'Asia/Kolkata', 'HH:mm')}</div>
                  <div className={styles.desktopTime}>{entry.duration_minutes}m</div>
                  
                  <div className={styles.colTimeGroup}>
                    <div>{formatInTimeZone(parseISO(entry.from_time), 'Asia/Kolkata', 'HH:mm')} - {formatInTimeZone(parseISO(entry.to_time), 'Asia/Kolkata', 'HH:mm')}</div>
                    <div>({entry.duration_minutes}m)</div>
                  </div>

                  <div className={styles.colActions}>
                    {!locked ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button className={styles.iconBtn} onClick={() => { setEditingLogId(entry.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} title="Edit"><Edit size={16} /></button>
                        <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDelete(entry.id)} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    ) : (
                      <span title="Day is locked">🔒</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
