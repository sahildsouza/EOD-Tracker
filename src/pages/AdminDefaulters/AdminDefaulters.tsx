import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { calculateMergedMinutes, isDateLocked } from '../../utils/timeUtils';
import { exportToExcel } from '../../utils/exportUtils';
import { parseISO, subDays, format } from 'date-fns';
import { Copy, Download } from 'lucide-react';
// Reusing some styles from AdminEodLogs
import styles from '../AdminEodLogs/AdminEodLogs.module.css';
import Pagination from '../../components/Pagination/Pagination';
import Loader from '../../components/Loader/Loader';

export default function AdminDefaulters() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Defaulters list is explicitly for "yesterday"
  const yesterdayStr = format(subDays(parseISO(getCurrentDateIST()), 1), 'yyyy-MM-dd');
  const isLocked = isDateLocked(yesterdayStr);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: profiles } = await supabase.from('profiles').select('*, designation:designations(name)').eq('role', 'employee');
      const { data: statuses } = await supabase.from('daily_statuses').select('*, shift:shifts(name, duration_hours)').eq('date', yesterdayStr).eq('status', 'shift');
      const { data: logs } = await supabase.from('log_entries').select('*').eq('date', yesterdayStr);

      if (profiles && statuses) {
        const defaulters: any[] = [];

        statuses.forEach(status => {
          const profile = profiles.find(p => p.id === status.user_id);
          if (!profile) return;

          const userLogs = logs?.filter(l => l.user_id === status.user_id) || [];
          const totalMins = calculateMergedMinutes(userLogs.map(l => ({ from: parseISO(l.from_time), to: parseISO(l.to_time) })));
          
          const shiftDurationMins = (status.shift?.duration_hours || 0) * 60;
          
          if (totalMins < shiftDurationMins) {
            const shortfallMins = shiftDurationMins - totalMins;
            defaulters.push({
              id: profile.id,
              full_name: profile.full_name,
              employee_id: profile.employee_id,
              designation: profile.designation?.name || '-',
              shift_name: status.shift?.name || '-',
              hours_logged: (totalMins / 60).toFixed(2),
              shortfall_hours: (shortfallMins / 60).toFixed(2),
              shortfall_mins: shortfallMins
            });
          }
        });

        defaulters.sort((a, b) => b.shortfall_mins - a.shortfall_mins); // worst first
        setData(defaulters);
      }
      setLoading(false);
    };

    fetchData();
  }, [yesterdayStr]);

  const handleCopyNames = () => {
    const text = data.map((d, i) => `${i + 1}. ${d.full_name}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExport = () => {
    exportToExcel(data.map(d => ({
      Date: yesterdayStr,
      Name: d.full_name,
      'Employee ID': d.employee_id,
      Designation: d.designation,
      Shift: d.shift_name,
      'Hours Logged': d.hours_logged,
      'Shortfall (Hours)': d.shortfall_hours
    })), 'Defaulters_Report');
  };

  return (
    <div className={`page-container ${styles.container}`}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div>
            <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>
              Date: {yesterdayStr} {isLocked ? '(Finalized)' : '(Not yet locked - edits still possible until 10 AM)'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-outline" onClick={handleCopyNames} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Copy size={16} /> {copySuccess ? 'Copied!' : 'Copy Names'}
            </button>
            <button className="btn-outline" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        <div className={styles.tableContainer} style={{ marginTop: '1.5rem' }}>
          {loading ? <Loader message="Calculating defaulters..." /> : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Designation</th>
                  <th>Shift</th>
                  <th>Hours Logged</th>
                  <th>Shortfall</th>
                </tr>
              </thead>
              <tbody>
                {data.slice((currentPage - 1) * 10, currentPage * 10).map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.full_name}</td>
                    <td>{row.employee_id}</td>
                    <td>{row.designation}</td>
                    <td>{row.shift_name}</td>
                    <td style={{ fontWeight: 600 }}>{row.hours_logged} hrs</td>
                    <td style={{ color: 'var(--danger-color)', fontWeight: 600 }}>{row.shortfall_hours} hrs</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No defaulters found for yesterday.</td></tr>
                )}
              </tbody>
            </table>
          )}
          <Pagination 
            currentPage={currentPage}
            totalItems={data.length}
            itemsPerPage={10}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
