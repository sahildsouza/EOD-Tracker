import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInMinutes, parseISO, subDays, format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { calculateMergedMinutes } from '../../utils/timeUtils';
import styles from './AdminDashboard.module.css';
import Loader from '../../components/Loader/Loader';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ employees: 0, loggedToday: 0, offToday: 0, defaulters: 0 });
  const [pieData, setPieData] = useState<{category: string, color: string, percentage: number}[]>([]);
  const [defaultersList, setDefaultersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const today = getCurrentDateIST();
      
      const { count: empCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employee');
      const { count: loggedCount } = await supabase.from('daily_statuses').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'shift');
      const { count: offCount } = await supabase.from('daily_statuses').select('*', { count: 'exact', head: true }).eq('date', today).in('status', ['leave', 'week-off']);
      
      // Fetch log entries for today's pie chart
      const { data: logData, error: logErr } = await supabase
        .from('log_entries')
        .select('category, duration_minutes')
        .eq('date', today);

      if (logErr) console.error("Error fetching logs:", logErr);

      const categoryTotals: Record<string, number> = {};
      let totalMins = 0;

      if (logData) {
        logData.forEach((entry: any) => {
          const mins = entry.duration_minutes || 0;
          if (mins > 0) {
            const cat = entry.category || 'Others';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + mins;
            totalMins += mins;
          }
        });
      }

      const CATEGORY_COLORS: Record<string, string> = {
        Meeting: 'var(--category-meeting)',
        Support: 'var(--category-support)',
        Troubleshooting: 'var(--category-troubleshooting)',
        Break: 'var(--category-break)',
        Activity: 'var(--category-activity)'
      };

      const pieChart: any[] = [];
      if (totalMins > 0) {
        Object.entries(categoryTotals).forEach(([cat, mins]) => {
          pieChart.push({
            category: cat,
            color: CATEGORY_COLORS[cat] || 'var(--category-others)',
            percentage: (mins / totalMins) * 100
          });
        });
      }
      setPieData(pieChart);

      // Fetch defaulters from yesterday
      const yesterdayStr = format(subDays(parseISO(today), 1), 'yyyy-MM-dd');
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').eq('role', 'employee');
      const { data: yestStatuses } = await supabase.from('daily_statuses').select('*, shift:shifts(duration_hours)').eq('date', yesterdayStr).eq('status', 'shift');
      const { data: yestLogs } = await supabase.from('log_entries').select('*').eq('date', yesterdayStr);

      const defs: any[] = [];
      if (profiles && yestStatuses) {
        yestStatuses.forEach(status => {
          const profile = profiles.find(p => p.id === status.user_id);
          if (!profile) return;
          const uLogs = yestLogs?.filter(l => l.user_id === status.user_id) || [];
          const totalMins = calculateMergedMinutes(uLogs.map(l => ({ from: parseISO(l.from_time), to: parseISO(l.to_time) })));
          const shiftDurationMins = (status.shift?.duration_hours || 0) * 60;
          if (totalMins < shiftDurationMins) {
            defs.push({
              id: profile.id,
              full_name: profile.full_name,
              shortfall_hours: ((shiftDurationMins - totalMins) / 60).toFixed(1)
            });
          }
        });
      }
      setDefaultersList(defs);

      setStats({
        employees: empCount || 0,
        loggedToday: loggedCount || 0,
        offToday: offCount || 0,
        defaulters: defs.length
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  let currentPercentage = 0;
  const gradientStops = pieData.map(slice => {
    const start = currentPercentage;
    const end = currentPercentage + slice.percentage;
    currentPercentage = end;
    return `${slice.color} ${start}% ${end}%`;
  }).join(', ');
  
  const conicGradient = pieData.length > 0 
    ? `conic-gradient(${gradientStops})` 
    : 'var(--border-color)'; // empty state

  if (loading) return <div className="page-container"><Loader message="Loading dashboard overview..." /></div>;

  return (
    <div className={`page-container ${styles.container}`}>
      <h1 className={styles.title} style={{ marginBottom: '1.5rem' }}>Dashboard Overview</h1>
      
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Active Employees</div>
          <div className={styles.kpiValue} style={{ color: 'var(--text-primary)' }}>{stats.employees}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>On Shift Today</div>
          <div className={styles.kpiValue} style={{ color: 'var(--accent-color)' }}>{stats.loggedToday}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Leave / Week-off</div>
          <div className={styles.kpiValue} style={{ color: 'var(--text-primary)' }}>{stats.offToday}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Defaulters (Yesterday)</div>
          <div className={styles.kpiValue} style={{ color: 'var(--danger-color)' }}>{stats.defaulters}</div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.title}>Today's Log Breakdown</h2>
          <div className={styles.pieContainer}>
            <div className={`pie-chart ${styles.pieElement}`} style={{ background: conicGradient }} />
            {pieData.length > 0 && (
              <div className={styles.pieLegend}>
                {pieData.map(d => (
                  <div key={d.category} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    <span className="pie-chart" style={{ width: '12px', height: '12px', backgroundColor: d.color }} />
                    <span>{d.category} ({d.percentage.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            )}
            {pieData.length === 0 && <p className="text-secondary">No logs recorded yet today.</p>}
          </div>
        </div>
        <div className={styles.card}>
          <h2 className={styles.title}>Yesterday's Defaulters</h2>
          {defaultersList.length === 0 ? (
            <p className="text-secondary">No defaulters found for yesterday! 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, maxHeight: '180px' }}>
              {defaultersList.slice(0, 5).map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-page)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{d.full_name}</span>
                  <span style={{ color: 'var(--danger-color)', fontWeight: 600, fontSize: '0.8rem' }}>-{d.shortfall_hours} hrs</span>
                </div>
              ))}
            </div>
          )}
          <button className="btn-outline" onClick={() => navigate('/admin/defaulters')} style={{ marginTop: 'auto' }}>View Full List ({defaultersList.length})</button>
        </div>
      </div>
    </div>
  );
}
