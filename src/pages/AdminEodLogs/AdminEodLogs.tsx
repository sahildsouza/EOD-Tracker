import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { calculateMergedMinutes, formatDuration } from '../../utils/timeUtils';
import { exportToExcel } from '../../utils/exportUtils';
import { parseISO, format } from 'date-fns';
import styles from './AdminEodLogs.module.css';
import { Search, Download, FileText, Calendar, Filter, Briefcase, Eye, X, ChevronDown } from 'lucide-react';
import Pagination from '../../components/Pagination/Pagination';
import Loader from '../../components/Loader/Loader';

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
  
  const [selectedEmployeeForLogs, setSelectedEmployeeForLogs] = useState<any | null>(null);
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
      {/* Hero Banner Card matching Image 1 */}
      <div className="bannerCard" style={{ '--banner-accent': '#10B981' } as React.CSSProperties}>
        <div className="bannerIconBox" style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10B981' }}>
          <FileText size={24} />
        </div>
        <p className="bannerText">
          Review daily end-of-day task logs, monitor employee working statuses, and track detailed time allocations.
        </p>
      </div>

      <div className={styles.mainCard}>
        {/* Unified Sleek Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search directory by name or employee ID..." 
              className={styles.searchInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.filterControls}>
            {/* Date Filter */}
            <div className={styles.filterItem}>
              <Calendar size={14} className={styles.filterIconBlue} />
              <input 
                type="date" 
                className={styles.dateInput} 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div className={styles.filterItem}>
              <Filter size={14} className={styles.filterIconGreen} />
              <span className={styles.filterText}>
                {statusFilter ? (statusFilter === 'shift' ? 'Shift' : statusFilter === 'leave' ? 'Leave' : statusFilter === 'week-off' ? 'Week-off' : statusFilter) : 'All Statuses'}
              </span>
              <ChevronDown size={14} className={styles.filterArrow} />
              <select 
                className={styles.selectInputHidden} 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="shift">Shift</option>
                <option value="leave">Leave</option>
                <option value="week-off">Week-off</option>
                <option value="Not Started">Not Started</option>
              </select>
            </div>

            {/* Designation Filter */}
            <div className={styles.filterItem}>
              <Briefcase size={14} className={styles.filterIconAmber} />
              <span className={styles.filterText}>
                {designations.find(d => d.id === designationFilter)?.name || 'All Designations'}
              </span>
              <ChevronDown size={14} className={styles.filterArrow} />
              <select 
                className={styles.selectInputHidden} 
                value={designationFilter} 
                onChange={e => setDesignationFilter(e.target.value)}
              >
                <option value="">All Designations</option>
                {designations.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Export Button */}
            <button className={`btn-primary ${styles.exportBtn}`} onClick={handleExport}>
              <Download size={15} /> <span>Export Logs</span>
            </button>
          </div>
        </div>

        {loading ? <Loader message="Fetching EOD logs..." /> : (
          <>
            {/* Desktop Table View */}
            <div className={styles.desktopTableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>ID</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Shift</th>
                    <th>Total Hours</th>
                    <th style={{ textAlign: 'right' }}>Logs</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(row => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div className="avatarBadge">
                            {row.full_name ? row.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {row.full_name}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="idBadge">{row.employee_id}</span>
                      </td>
                      <td>{row.designation?.name || '-'}</td>
                      <td>
                        <span className={styles.catBadge} style={{ backgroundColor: row.daily_status === 'shift' ? 'var(--success-color)' : (row.daily_status === 'Not Started' ? 'var(--warning-color)' : 'var(--category-break)') }}>
                          {row.daily_status}
                        </span>
                      </td>
                      <td>{row.shift_name}</td>
                      <td style={{ fontWeight: 600 }}>{row.total_hours_logged} hrs</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeForLogs(row)}
                          className={styles.viewLogsBtn}
                        >
                          <Eye size={15} />
                          <span>View Logs</span>
                          <span className={styles.viewLogsBadge}>{row.logs.length}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>No data found for selected criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Zero Horizontal Scrolling!) */}
            <div className={styles.mobileCardsWrapper}>
              {paginatedData.map(row => (
                <div key={row.id} className={styles.mobileCard}>
                  <div className={styles.mobileCardHeader}>
                    <div className={styles.mobileCardUser}>
                      <div className="avatarBadge">
                        {row.full_name ? row.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className={styles.mobileUserInfo}>
                        <div className={styles.mobileUserName}>{row.full_name}</div>
                        <span className="idBadge">{row.employee_id}</span>
                      </div>
                    </div>
                    <div className={styles.mobileCardRight}>
                      <span className={styles.catBadge} style={{ backgroundColor: row.daily_status === 'shift' ? 'var(--success-color)' : (row.daily_status === 'Not Started' ? 'var(--warning-color)' : 'var(--category-break)') }}>
                        {row.daily_status}
                      </span>
                      <div className={styles.mobileHours}>{row.total_hours_logged} hrs</div>
                    </div>
                  </div>

                  <div className={styles.mobileCardSub}>
                    <span>{row.designation?.name || 'No Designation'}</span>
                    <span>•</span>
                    <span>{row.shift_name}</span>
                  </div>

                  <div className={styles.mobileCardFooter}>
                    <span className={styles.mobileLogsCount}>{row.logs.length} {row.logs.length === 1 ? 'task' : 'tasks'} logged</span>
                    <button
                      type="button"
                      onClick={() => setSelectedEmployeeForLogs(row)}
                      className={styles.viewLogsBtnMobile}
                    >
                      <Eye size={15} />
                      <span>View Logs ({row.logs.length})</span>
                    </button>
                  </div>
                </div>
              ))}
              {filteredData.length === 0 && (
                <div className={styles.noDataCard}>No data found for selected criteria.</div>
              )}
            </div>
          </>
        )}

        <div className={styles.paginationWrapper}>
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredData.length}
            itemsPerPage={10}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Pop-up Modal Window for All Logs */}
        {selectedEmployeeForLogs && (
          <div className={styles.modalOverlay} onClick={() => setSelectedEmployeeForLogs(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderLeft}>
                  <div className="avatarBadge">
                    {selectedEmployeeForLogs.full_name ? selectedEmployeeForLogs.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className={styles.modalTitle}>
                      {selectedEmployeeForLogs.full_name} 
                      <span className="idBadge" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>{selectedEmployeeForLogs.employee_id}</span>
                    </h3>
                    <div className={styles.modalSubtitle}>
                      <span>{date}</span> • <span>{selectedEmployeeForLogs.designation?.name || 'No Designation'}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForLogs(null)}
                  className={styles.modalCloseBtn}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalSummaryBar}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Daily Status</span>
                  <span className={styles.catBadge} style={{ backgroundColor: selectedEmployeeForLogs.daily_status === 'shift' ? 'var(--success-color)' : (selectedEmployeeForLogs.daily_status === 'Not Started' ? 'var(--warning-color)' : 'var(--category-break)') }}>
                    {selectedEmployeeForLogs.daily_status}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Assigned Shift</span>
                  <span className={styles.summaryValue}>{selectedEmployeeForLogs.shift_name}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Total Hours Logged</span>
                  <span className={styles.summaryHours}>{selectedEmployeeForLogs.total_hours_logged} hrs</span>
                </div>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.modalSectionTitle}>
                  <span>Logged Tasks ({selectedEmployeeForLogs.logs.length})</span>
                </div>
                
                {selectedEmployeeForLogs.logs.length === 0 ? (
                  <div className={styles.noLogsModal}>
                    <FileText size={36} style={{ color: 'var(--border-color)', marginBottom: '0.6rem' }} />
                    <p style={{ margin: 0 }}>No tasks logged for this employee on {date}.</p>
                  </div>
                ) : (
                  <div className={styles.modalLogsList}>
                    {selectedEmployeeForLogs.logs.map((log: any) => (
                      <div key={log.id} className={styles.logCard}>
                        <div className={styles.logCardTop}>
                          <div className={styles.logCardMeta}>
                            <span className={styles.catBadge} style={{ backgroundColor: CATEGORY_COLORS[log.category] || CATEGORY_COLORS['Others'] }}>
                              {log.category}
                            </span>
                            <span className={styles.logTime}>
                              {format(parseISO(log.from_time), 'HH:mm')} - {format(parseISO(log.to_time), 'HH:mm')}
                            </span>
                            <span className={styles.logDuration}>
                              ({formatDuration(log.duration_minutes)})
                            </span>
                          </div>
                        </div>
                        <div className={styles.logTitle}>{log.title || 'Untitled Task'}</div>
                        {log.notes && (
                          <div className={styles.logNotes}>{log.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForLogs(null)}
                  className="btn-outline"
                  style={{ padding: '0.5rem 1.25rem', fontWeight: 600 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
