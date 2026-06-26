import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDailyStatus } from '../../hooks/useDailyStatus';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { calculateMergedMinutes, isDateLocked, formatDuration } from '../../utils/timeUtils';
import type { LogEntry } from '../../utils/timeUtils';
import VisualTimeline from '../../components/Dashboard/VisualTimeline';
import LogEntryForm from '../../components/Dashboard/LogEntryForm';
import styles from './EmployeeDashboard.module.css';
import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Edit, Trash2, Eye, EyeOff, LayoutDashboard, Clock, BadgeCheck, Calendar, RefreshCw, Copy, ListTodo, FileText } from 'lucide-react';
import Loader from '../../components/Loader/Loader';

const CATEGORY_COLORS: Record<string, string> = {
  Meeting: 'var(--category-meeting)',
  Support: 'var(--category-support)',
  Troubleshooting: 'var(--category-troubleshooting)',
  Break: 'var(--category-break)',
  Activity: 'var(--category-activity)',
  Others: 'var(--category-others)',
};

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { status } = useDailyStatus();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const toggleExpandLog = (id: string) => {
    const newSet = new Set(expandedLogIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedLogIds(newSet);
  };

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

  if (loading) return <div className="page-container"><Loader message="Loading your dashboard..." /></div>;

  return (
    <div className="page-container">
      <div className={styles.dashboardRoot}>
        {/* Hero Dashboard Greeting Banner */}
        <div className={styles.heroCard}>
          <div className={styles.heroIconBadge}>
            <LayoutDashboard size={32} />
          </div>
          <div className={styles.heroInfo}>
            <h2 className={styles.heroTitle}>Welcome back, {profile?.full_name || user?.email?.split('@')[0] || 'Employee'}</h2>
            <p className={styles.heroSubtitle}>Here is your real-time attendance overview, shift timer ring, and daily activity logs.</p>
          </div>
        </div>

        {/* Top Full Row: Today's Timeline */}
        <div className={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
            <Clock size={20} style={{ color: 'var(--accent-color)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Today's Timeline Window</h2>
          </div>
          {status?.status !== 'shift' ? (
            <p className="text-secondary" style={{ margin: 0 }}>You are not on an active shift today.</p>
          ) : (
            <VisualTimeline 
              entries={entries} 
              shiftStart={shift?.start_time} 
              shiftEnd={shift?.end_time} 
            />
          )}
        </div>

        {/* Row 2: Status & Add Log Entry side-by-side */}
        <div className={styles.modulesGrid}>
          <div className={styles.card} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <BadgeCheck size={20} style={{ color: 'var(--accent-color)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Shift Progress & Control</h3>
            </div>

            <div className={styles.progressRow}>
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
                <div className={styles.badge}>
                  <BadgeCheck size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                  <span>Status: <strong style={{ textTransform: 'uppercase' }}>{status?.status || 'NOT SET'}</strong></span>
                </div>
                {shift && (
                  <div className={styles.badge}>
                    <Calendar size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                    <span>Shift: <strong>{shift.name}</strong> ({shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)})</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.actions}>
              {!locked && (
                <button className={`btn-outline ${styles.quickActionBtn}`} onClick={() => navigate('/daily-status')}>
                  <RefreshCw size={16} /> Change Today's Status
                </button>
              )}
              {status?.status === 'shift' && !locked && (
                <button className={`btn-outline ${styles.quickActionBtn}`} onClick={handleCopyYesterday}>
                  <Copy size={16} /> Use Yesterday's Template
                </button>
              )}
            </div>
          </div>

          {status?.status === 'shift' && (
            <div className={styles.card} style={{ height: '100%' }}>
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

        {status?.status === 'shift' && (
          <div className={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <ListTodo size={20} style={{ color: 'var(--accent-color)' }} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Today's Log Entries</h2>
            </div>
            {entries.length === 0 ? (
              <p className="text-secondary" style={{ margin: 0 }}>No log entries recorded for today yet.</p>
            ) : (
              <div className={styles.logList}>
                {/* Header for Desktop */}
                <div className={`${styles.logRow} ${styles.logHeader}`}>
                  <div>Category</div>
                  <div>Title</div>
                  <div>From</div>
                  <div>To</div>
                  <div>Dur</div>
                  <div style={{ textAlign: 'center' }}>Actions</div>
                </div>
                
                {/* Rows */}
                {entries.map(entry => {
                  const isExpanded = expandedLogIds.has(entry.id);
                  return (
                    <div key={entry.id} className={`${styles.logCardWrapper} ${isExpanded ? styles.expandedWrapper : ''}`}>
                      <div className={styles.logRow}>
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
                        <div className={styles.desktopTime} style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{formatDuration(entry.duration_minutes)}</div>
                        
                        <div className={styles.colTimeGroup}>
                          <Clock size={14} style={{ color: 'var(--accent-color)' }} />
                          <span>{formatInTimeZone(parseISO(entry.from_time), 'Asia/Kolkata', 'HH:mm')} - {formatInTimeZone(parseISO(entry.to_time), 'Asia/Kolkata', 'HH:mm')} ({formatDuration(entry.duration_minutes)})</span>
                        </div>

                        <div className={styles.colActions}>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'center' }}>
                            <button className={styles.iconBtn} onClick={() => toggleExpandLog(entry.id)} title={isExpanded ? "Hide Notes" : "View Title & Notes"}>
                              {isExpanded ? <EyeOff size={16} style={{ color: 'var(--accent-color)' }} /> : <Eye size={16} />}
                            </button>
                            {!locked ? (
                              <>
                                <button className={styles.iconBtn} onClick={() => { setEditingLogId(entry.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} title="Edit"><Edit size={16} /></button>
                                <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDelete(entry.id)} title="Delete"><Trash2 size={16} /></button>
                              </>
                            ) : (
                              <span title="Day is locked">🔒</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={styles.expandedDetails}>
                          <div>
                            <h5 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{entry.title}</h5>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.08)', padding: '0.4rem 0.75rem', borderRadius: '6px', width: 'fit-content' }}>
                            <Clock size={14} />
                            <span>{formatInTimeZone(parseISO(entry.from_time), 'Asia/Kolkata', 'HH:mm')} - {formatInTimeZone(parseISO(entry.to_time), 'Asia/Kolkata', 'HH:mm')} IST</span>
                          </div>
                          {entry.notes && (
                            <div style={{ background: 'var(--bg-page)', borderLeft: '3px solid var(--accent-color)', padding: '0.75rem 1rem', borderRadius: '4px 8px 8px 4px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <FileText size={13} style={{ color: 'var(--accent-color)' }} />
                                <span>Entry Notes</span>
                              </div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{entry.notes}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
