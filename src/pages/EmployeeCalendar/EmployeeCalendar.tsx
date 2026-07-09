import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { calculateMergedMinutes, isDateLocked, formatDuration } from '../../utils/timeUtils';
import styles from './EmployeeCalendar.module.css';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isToday, parseISO, isAfter, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Clock, FileText, Calendar, BadgeCheck, X } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import VisualTimeline from '../../components/Dashboard/VisualTimeline';

export default function EmployeeCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date(getCurrentDateIST()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [statuses, setStatuses] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedLogDetail, setSelectedLogDetail] = useState<any | null>(null);

  // Reset expanded log when changing selected date
  useEffect(() => {
    setExpandedLogId(null);
    setSelectedLogDetail(null);
  }, [selectedDate]);

  useEffect(() => {
    if (!user) return;
    const fetchMonthData = async () => {
      setLoading(true);
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const { data: s } = await supabase.from('daily_statuses').select('*, shift:shifts(duration_hours, start_time, end_time)').eq('user_id', user.id).gte('date', start).lte('date', end);
      const { data: l } = await supabase.from('log_entries').select('*').eq('user_id', user.id).gte('date', start).lte('date', end);

      if (s) setStatuses(s);
      if (l) setLogs(l);
      setLoading(false);
    };
    fetchMonthData();
  }, [user, currentDate]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const getStatusDot = (dateStr: string) => {
    const status = statuses.find(s => s.date === dateStr);
    if (!status) return null;

    if (status.status === 'leave') return 'dot-leave';
    if (status.status === 'week-off') return 'dot-week-off';
    
    if (status.status === 'shift') {
      const dayLogs = logs.filter(l => l.date === dateStr);
      const totalMins = calculateMergedMinutes(dayLogs.map(l => ({ from: parseISO(l.from_time), to: parseISO(l.to_time) })));
      const requiredMins = (status.shift?.duration_hours || 0) * 60;
      
      if (totalMins >= requiredMins) return 'dot-completed';
      
      const locked = isDateLocked(dateStr);
      if (locked) return 'dot-defaulter';
      return 'dot-partial';
    }
    return null;
  };

  const selectedStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedStatus = selectedStr ? statuses.find(s => s.date === selectedStr) : null;
  const selectedLogs = selectedStr ? logs.filter(l => l.date === selectedStr) : [];
  const selectedTotalMins = calculateMergedMinutes(selectedLogs.map(l => ({ from: parseISO(l.from_time), to: parseISO(l.to_time) })));
  
  return (
    <div className="page-container">
      <div className={styles.calendarRoot}>
        {/* Hero Calendar Banner matching Admin pages */}
        <div className="bannerCard" style={{ '--banner-accent': '#3B82F6' } as React.CSSProperties}>
          <div className="bannerIconBox" style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#3B82F6' }}>
            <Calendar size={24} />
          </div>
          <p className="bannerText">
            Track your daily work hours, shift statuses, and review detailed activity timelines across the month.
          </p>
        </div>

        <div className={styles.summaryStrip}>
          <div className={styles.summaryItem}><div className={`${styles.statusDot} ${styles['dot-completed']}`} /> Completed</div>
          <div className={styles.summaryItem}><div className={`${styles.statusDot} ${styles['dot-partial']}`} /> Partial</div>
          <div className={styles.summaryItem}><div className={`${styles.statusDot} ${styles['dot-leave']}`} /> Leave</div>
          <div className={styles.summaryItem}><div className={`${styles.statusDot} ${styles['dot-week-off']}`} /> Week-off</div>
          <div className={styles.summaryItem}><div className={`${styles.statusDot} ${styles['dot-defaulter']}`} /> Defaulter</div>
        </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.calendarHeader}>
            <button className="btn-outline" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft /></button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{format(currentDate, 'MMMM yyyy')}</h2>
            <button className="btn-outline" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight /></button>
          </div>

          <div className={styles.calendarGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className={styles.dayHeader}>{d}</div>)}
            {/* Blank spaces for first day offset */}
            {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => <div key={`empty-${i}`} className={styles.dayCell} style={{ backgroundColor: 'var(--border-color)' }} />)}
            
            {daysInMonth.map(day => {
              const str = format(day, 'yyyy-MM-dd');
              const isFuture = isAfter(day, parseISO(getCurrentDateIST()));
              const dotClass = getStatusDot(str);
              return (
                <div 
                  key={str} 
                  className={`${styles.dayCell} ${isFuture ? styles.disabled : ''} ${isToday(day) ? styles.today : ''} ${selectedDate && isSameDay(day, selectedDate) ? styles.selected : ''}`}
                  onClick={() => !isFuture && setSelectedDate(day)}
                >
                  <span className={styles.dayNumber}>{format(day, 'd')}</span>
                  {dotClass && <div className={`${styles.statusDot} ${styles[dotClass]}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Details Panel */}
        <div className={styles.detailsPanel}>
          {selectedDate ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                <Calendar size={22} style={{ color: 'var(--accent-color)' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{format(selectedDate, 'dd MMMM yyyy')}</h3>
              </div>
              {!selectedStatus ? (
                <p className="text-secondary">No status recorded for this day.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '0.85rem 1rem', background: 'linear-gradient(135deg, var(--bg-page) 0%, rgba(59, 130, 246, 0.06) 100%)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <BadgeCheck size={14} style={{ color: 'var(--accent-color)' }} />
                        <span>Status</span>
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{selectedStatus.status}</div>
                    </div>
                    {selectedStatus.status === 'shift' && (
                      <div style={{ padding: '0.85rem 1rem', background: 'linear-gradient(135deg, var(--bg-page) 0%, rgba(59, 130, 246, 0.06) 100%)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={14} style={{ color: 'var(--accent-color)' }} />
                          <span>Hours Logged</span>
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {(selectedTotalMins/60).toFixed(2)} <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>/ {selectedStatus.shift?.duration_hours} hrs</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedStatus.status === 'shift' && (
                    <>
                      <div>
                        <VisualTimeline entries={selectedLogs} shiftStart={selectedStatus.shift?.start_time} shiftEnd={selectedStatus.shift?.end_time} dateStr={selectedStr || undefined} />
                      </div>
                      
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
                          <FileText size={16} style={{ color: 'var(--accent-color)' }} />
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Logged Activities</h4>
                        </div>
                        <div className={styles.activitiesTableContainer}>
                          {selectedLogs.length === 0 ? (
                            <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No activities logged for this day.</div>
                          ) : (
                            <table className={styles.activitiesTable}>
                              <thead>
                                <tr>
                                  <th>Category</th>
                                  <th style={{ textAlign: 'right' }}>Details</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedLogs.map(l => (
                                  <tr key={l.id}>
                                    <td>
                                      <span style={{ backgroundColor: `var(--category-${l.category.toLowerCase()})`, padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'inline-block' }}>
                                        {l.category}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <button 
                                        className={styles.viewLogBtn}
                                        onClick={() => setSelectedLogDetail(l)}
                                        title="View all details about this log"
                                      >
                                        <Eye size={15} />
                                        <span>View</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-secondary">Select a past or current date to view details.</p>
          )}
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLogDetail && (
        <div className={styles.modalOverlay} onClick={() => setSelectedLogDetail(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Activity Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedLogDetail(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Category</div>
                <span style={{ backgroundColor: `var(--category-${selectedLogDetail.category.toLowerCase()})`, padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'inline-block' }}>
                  {selectedLogDetail.category}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Activity Title</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{selectedLogDetail.title}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Time Range & Duration</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)', fontSize: '0.9rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.08)', padding: '0.5rem 0.85rem', borderRadius: '8px', width: 'fit-content' }}>
                  <Clock size={16} />
                  <span>{formatInTimeZone(parseISO(selectedLogDetail.from_time), 'Asia/Kolkata', 'HH:mm')} - {formatInTimeZone(parseISO(selectedLogDetail.to_time), 'Asia/Kolkata', 'HH:mm')} ({formatDuration(selectedLogDetail.duration_minutes)})</span>
                </div>
              </div>

              {selectedLogDetail.notes && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Activity Notes</div>
                  <div style={{ background: 'var(--bg-page)', borderLeft: '3px solid var(--accent-color)', padding: '0.85rem 1rem', borderRadius: '4px 8px 8px 4px', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {selectedLogDetail.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
