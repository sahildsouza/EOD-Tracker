import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/exportUtils';
import { formatDuration } from '../../utils/timeUtils';
import styles from '../AdminSettings/AdminSettings.module.css';

export default function AdminExport() {
  const [logsFrom, setLogsFrom] = useState('');
  const [logsTo, setLogsTo] = useState('');
  const [defFrom, setDefFrom] = useState('');
  const [defTo, setDefTo] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    if (!logsFrom || !logsTo) return alert('Select date range');
    setLoading(true);
    const { data: logs } = await supabase.from('log_entries').select('*, profile:profiles(full_name, employee_id, designation:designations(name)), status:daily_statuses(status, shift:shifts(name))')
      .gte('date', logsFrom).lte('date', logsTo);
    
    if (logs && logs.length > 0) {
      const exportData = logs.map(l => ({
        Date: l.date,
        'Employee Name': l.profile?.full_name,
        'Employee ID': l.profile?.employee_id,
        Designation: l.profile?.designation?.name,
        Shift: l.status?.shift?.name,
        Category: l.category,
        Title: l.title,
        'From Time': l.from_time,
        'To Time': l.to_time,
        'Duration': formatDuration(l.duration_minutes),
        Notes: l.notes,
        'Day Status': l.status?.status
      }));
      exportToExcel(exportData, 'EOD_Logs_Export');
    } else {
      alert('No logs found in this range.');
    }
    setLoading(false);
  };

  const fetchDefaulters = async () => {
    // A proper defaulters export for a date range requires querying profiles, statuses, logs and aggregating.
    // Given prototype constraints, we will skip full complex aggregation here or implement a naive one.
    alert('Defaulters export for date ranges requires complex aggregation not fully stubbed in this prototype, but it would query logs and calculate shortfall per employee per day.');
  };

  return (
    <div className={`page-container ${styles.container}`}>
      <h1 className={styles.title} style={{ marginBottom: '0.5rem' }}>Data Export</h1>
      
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.title}>Export EOD Logs</h2>
          <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
            <label className={styles.label}>From Date</label>
            <input type="date" className="surface input" value={logsFrom} onChange={e => setLogsFrom(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>To Date</label>
            <input type="date" className="surface input" value={logsTo} onChange={e => setLogsTo(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={fetchLogs} disabled={loading} style={{ marginTop: '0.5rem' }}>
            Export Logs to Excel
          </button>
        </div>

        <div className={styles.card}>
          <h2 className={styles.title}>Export Defaulters List</h2>
          <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
            <label className={styles.label}>From Date</label>
            <input type="date" className="surface input" value={defFrom} onChange={e => setDefFrom(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>To Date</label>
            <input type="date" className="surface input" value={defTo} onChange={e => setDefTo(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={fetchDefaulters} disabled={loading} style={{ marginTop: '0.5rem' }}>
            Export Defaulters to Excel
          </button>
        </div>
      </div>
    </div>
  );
}
