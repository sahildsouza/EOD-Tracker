import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { calculateMergedMinutes } from '../../utils/timeUtils';
import { exportToExcel } from '../../utils/exportUtils';
import { parseISO, format } from 'date-fns';
import styles from './AdminEodLogs.module.css';
import { Search, Download, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import Pagination from '../../components/Pagination/Pagination';

const CATEGORY_COLORS: Record<string, string> = {
  Meeting: 'var(--category-meeting)',
  Support: 'var(--category-support)',
  Troubleshooting: 'var(--category-troubleshooting)',
  Break: 'var(--category-break)',
  Activity: 'var(--category-activity)',
  Others: 'var(--category-others)',
};

export default function AdminEodLogs() {
  const [date, setDate] = useState(getCurrentDateIST());
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [designations, setDesignations] = useState<any[]>([]);
  const [designationFilter, setDesignationFilter] = useState('');
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, designationFilter, date]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch profiles (employees only)
    const { data: profiles } = await supabase.from('profiles').select('*, designation:designations(name)').eq('role', 'employee');
    // Fetch statuses
    const { data: statuses } = await supabase.from('daily_statuses').select('*, shift:shifts(name, duration_hours)').eq('date', date);
    // Fetch logs
    const { data: logs } = await supabase.from('log_entries').select('*').eq('date', date).order('from_time', { ascending: true });

    if (profiles) {
      const merged = profiles.map(p => {
        const dStatus = statuses?.find(s => s.user_id === p.id);
        const pLogs = logs?.filter(l => l.user_id === p.id) || [];
        
        const totalMins = calculateMergedMinutes(pLogs.map(l => ({ from: parseISO(l.from_time), to: parseISO(l.to_time) })));
        
        return {
          ...p,
          daily_status: dStatus?.status || 'Not Started',
          shift_name: dStatus?.shift?.name || '-',
          logs: pLogs,
          total_hours_logged: (totalMins / 60).toFixed(2),
        };
      });
      setData(merged);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    const fetchLookups = async () => {
      const { data: desigs } = await supabase.from('designations').select('*');
      if (desigs) setDesignations(desigs);
    };
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchData();
    
    if (date === getCurrentDateIST()) {
      const channel = supabase.channel('eod_logs_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'log_entries', filter: `date=eq.${date}` }, () => {
          fetchData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_statuses', filter: `date=eq.${date}` }, () => {
          fetchData();
        })
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    }
  }, [date]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = item.full_name.toLowerCase().includes(search.toLowerCase()) || item.employee_id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter ? item.daily_status === statusFilter : true;
      const matchDesig = designationFilter ? item.designation_id === designationFilter : true;
      return matchSearch && matchStatus && matchDesig;
    });
  }, [data, search, statusFilter, designationFilter]);

  const paginatedData = useMemo(() => {
    return filteredData.slice((currentPage - 1) * 10, currentPage * 10);
  }, [filteredData, currentPage]);

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const toggleLog = (id: string) => {
    const newSet = new Set(expandedLogs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedLogs(newSet);
  };

  const handleExport = () => {
    const exportData = filteredData.map(d => ({
      'Date': date,
      'Employee Name': d.full_name,
      'Employee ID': d.employee_id,
      'Designation': d.designation?.name || '',
      'Work Location': d.work_location || '',
      'Daily Status': d.daily_status,
      'Shift': d.shift_name,
      'Total Hours Logged': d.total_hours_logged,
      'Logs Count': d.logs.length
    }));
    exportToExcel(exportData, 'EOD_Logs_Report');
  };

  return (
    <div className={`page-container ${styles.container}`}>
      <div className={styles.card}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>EOD Logs</h1>
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.searchBox}>
            <Search size={16} style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }} />
            <input 
              type="text" 
              placeholder="Search Name or ID..." 
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.controlsRow}>
            <input 
              type="date" 
              className={styles.controlItem} 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
            />
            <select className={styles.controlItem} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="shift">Shift</option>
              <option value="leave">Leave</option>
              <option value="week-off">Week-off</option>
              <option value="Not Started">Not Started</option>
            </select>

            <select className={styles.controlItem} value={designationFilter} onChange={e => setDesignationFilter(e.target.value)}>
              <option value="">All Designations</option>
              {designations.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <button className={`btn-primary ${styles.controlItem}`} onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        <div className={styles.tableContainer} style={{ marginTop: '1.5rem' }}>
          {loading ? <p>Loading data...</p> : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Employee Name</th>
                  <th>ID</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Shift</th>
                  <th>Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map(row => (
                  <React.Fragment key={row.id}>
                    <tr>
                      <td>
                        <button onClick={() => toggleRow(row.id)} style={{ color: 'var(--text-secondary)' }}>
                          {expandedRows.has(row.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                      </td>
                      <td style={{ fontWeight: 600 }}>{row.full_name}</td>
                      <td>{row.employee_id}</td>
                      <td>{row.designation?.name}</td>
                      <td>
                        <span className={styles.catBadge} style={{ backgroundColor: row.daily_status === 'shift' ? 'var(--success-color)' : (row.daily_status === 'Not Started' ? 'var(--warning-color)' : 'var(--category-break)') }}>
                          {row.daily_status}
                        </span>
                      </td>
                      <td>{row.shift_name}</td>
                      <td style={{ fontWeight: 600 }}>{row.total_hours_logged} hrs</td>
                    </tr>
                    {expandedRows.has(row.id) && (
                      <tr className={styles.expandRow}>
                        <td colSpan={7}>
                          <div className={styles.detailsBox}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Log Details</h4>
                            {row.logs.length === 0 ? (
                              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No logs entered.</p>
                            ) : (
                              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {row.logs.map((log: any) => (
                                  <li key={log.id} className={styles.logDetailsRow}>
                                    <div className={styles.logDetailsHeader}>
                                      <div className={styles.logDetailsInfo}>
                                        <span className={styles.catBadge} style={{ width: '125px', textAlign: 'center', backgroundColor: CATEGORY_COLORS[log.category] || CATEGORY_COLORS['Others'] }}>{log.category}</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{format(parseISO(log.from_time), 'HH:mm')} - {format(parseISO(log.to_time), 'HH:mm')} <span style={{ fontSize: '0.75rem' }}>({log.duration_minutes}m)</span></span>
                                      </div>
                                      <button className={styles.iconBtn} onClick={() => toggleLog(log.id)} title="View Title and Notes">
                                        {expandedLogs.has(log.id) ? <EyeOff size={18} /> : <Eye size={18} />}
                                      </button>
                                    </div>
                                    
                                    {expandedLogs.has(log.id) && (
                                      <div className={styles.logExpandedBox}>
                                        <div>
                                          <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Title</strong>
                                          <div className={styles.logTitle}>{log.title}</div>
                                        </div>
                                        {log.notes && (
                                          <div>
                                            <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Notes</strong>
                                            <div className={styles.logNotes}>{log.notes}</div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filteredData.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No data found for selected criteria.</td></tr>
                )}
              </tbody>
            </table>
          )}
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredData.length}
            itemsPerPage={10}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
