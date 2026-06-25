import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { calculateMergedMinutes, isDateLocked, formatDuration } from '../../utils/timeUtils';
import styles from './EmployeeCalendar.module.css';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isToday, parseISO, isAfter, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Clock, FileText } from 'lucide-react';
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

  // Reset expanded log when changing selected date
  useEffect(() => {
    setExpandedLogId(null);
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
    <div className={`page-container ${styles.container}`}>
      <h1 className={styles.title} style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Calendar History</h1>
      
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>{format(selectedDate, 'dd MMMM yyyy')}</h3>
              {!selectedStatus ? (
                <p className="text-secondary">No status recorded for this day.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-page)', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase' }}>Status</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'capitalize' }}>{selectedStatus.status}</div>
                    </div>
                    {selectedStatus.status === 'shift' && (
                      <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-page)', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase' }}>Hours Logged</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                          {(selectedTotalMins/60).toFixed(2)} <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>/ {selectedStatus.shift?.duration_hours} hrs</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedStatus.status === 'shift' && (
                    <>
                      <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Daily Timeline</h4>
                        <VisualTimeline entries={selectedLogs} shiftStart={selectedStatus.shift?.start_time} shiftEnd={selectedStatus.shift?.end_time} />
                      </div>
                      
                      <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Logged Activities</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {selectedLogs.length === 0 ? (
                            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>No activities logged for this day.</p>
                          ) : (
                            selectedLogs.map(l => {
                              const isExpanded = expandedLogId === l.id;
                              return (
                                <div key={l.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                                  {/* Log Header (Always visible) */}
                                  <div 
                                    style={{ 
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                      padding: '0.75rem 1rem', backgroundColor: isExpanded ? 'var(--bg-page)' : 'transparent',
                                      cursor: 'pointer', transition: 'background-color 0.2s ease'
                                    }}
                                    onClick={() => setExpandedLogId(isExpanded ? null : l.id)}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                      <span className="catBadge" style={{ backgroundColor: `var(--category-${l.category.toLowerCase()})`, padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>
                                        {l.category}
                                      </span>
                                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatDuration(l.duration_minutes)}</span>
                                    </div>
                                    <button style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {isExpanded ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                  </div>
                                  
                                  {/* Log Details (Expandable) */}
                                  {isExpanded && (
                                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
                                      <div style={{ marginBottom: '0.75rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.25rem' }}>Title</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{l.title}</div>
                                      </div>
                                      <div style={{ display: 'flex', gap: '2rem', marginBottom: l.notes ? '0.75rem' : '0' }}>
                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12}/> Time</div>
                                          <div style={{ fontSize: '0.875rem' }}>
                                            {formatInTimeZone(parseISO(l.from_time), 'Asia/Kolkata', 'HH:mm')} - {formatInTimeZone(parseISO(l.to_time), 'Asia/Kolkata', 'HH:mm')}
                                          </div>
                                        </div>
                                      </div>
                                      {l.notes && (
                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><FileText size={12}/> Notes</div>
                                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', background: 'var(--bg-page)', padding: '0.5rem', borderRadius: '4px' }}>{l.notes}</div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
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
    </div>
  );
}
