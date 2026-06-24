import React, { useMemo } from 'react';
import { differenceInMinutes, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { LogEntry } from '../../utils/timeUtils';
import { getCurrentDateIST } from '../../utils/dateUtils';

interface VisualTimelineProps {
  entries: LogEntry[];
  shiftStart: string; // HH:mm:ss
  shiftEnd: string; // HH:mm:ss
}

const CATEGORY_COLORS: Record<string, string> = {
  Meeting: 'var(--category-meeting)',
  Support: 'var(--category-support)',
  Troubleshooting: 'var(--category-troubleshooting)',
  Break: 'var(--category-break)',
  Activity: 'var(--category-activity)',
  Others: 'var(--category-others)',
};

export default function VisualTimeline({ entries, shiftStart, shiftEnd }: VisualTimelineProps) {
  const today = getCurrentDateIST();
  
  const baseStart = parseISO(`${today}T${shiftStart || '09:00:00'}+05:30`);
  const baseEnd = parseISO(`${today}T${shiftEnd || '18:00:00'}+05:30`);

  const windowStart = useMemo(() => {
    if (!entries.length) return baseStart;
    const firstEntry = new Date(Math.min(...entries.map(e => parseISO(e.from_time).getTime())));
    return firstEntry < baseStart ? firstEntry : baseStart;
  }, [entries, baseStart]);

  const windowEnd = useMemo(() => {
    if (!entries.length) return baseEnd;
    const lastEntry = new Date(Math.max(...entries.map(e => parseISO(e.to_time).getTime())));
    return lastEntry > baseEnd ? lastEntry : baseEnd;
  }, [entries, baseEnd]);

  const totalWindowMinutes = Math.max(1, differenceInMinutes(windowEnd, windowStart));

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Daily Timeline</h3>
      <div 
        style={{ 
          height: '40px', 
          backgroundColor: 'var(--bg-page)', 
          border: '1px solid var(--border-color)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {entries.map(entry => {
          const from = parseISO(entry.from_time);
          const to = parseISO(entry.to_time);
          const offsetMinutes = differenceInMinutes(from, windowStart);
          const durMinutes = differenceInMinutes(to, from);
          
          const leftPercent = (offsetMinutes / totalWindowMinutes) * 100;
          const widthPercent = (durMinutes / totalWindowMinutes) * 100;
          
          return (
            <div 
              key={entry.id}
              title={`${entry.category}: ${entry.title} (${durMinutes}m)`}
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                height: '100%',
                backgroundColor: CATEGORY_COLORS[entry.category] || CATEGORY_COLORS['Others'],
                borderLeft: '1px solid rgba(255,255,255,0.2)'
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
        <span>{formatInTimeZone(windowStart, 'Asia/Kolkata', 'HH:mm')}</span>
        <span>{formatInTimeZone(windowEnd, 'Asia/Kolkata', 'HH:mm')}</span>
      </div>
    </div>
  );
}
