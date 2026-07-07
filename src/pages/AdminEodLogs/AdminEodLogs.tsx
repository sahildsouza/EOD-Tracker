import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { calculateMergedMinutes, formatDuration } from '../../utils/timeUtils';
import { exportToExcel } from '../../utils/exportUtils';
import { parseISO, format } from 'date-fns';
import styles from './AdminEodLogs.module.css';
import { Search, Download, ChevronDown, ChevronRight, FileText, Calendar, Filter, Briefcase } from 'lucide-react';
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
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
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
            <Search size={16} className={styles.searchIcon} />
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
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(row => (
                    <React.Fragment key={row.id}>
                      <tr onClick={() => toggleRow(row.id)} className={styles.rowClickable}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); toggleRow(row.id); }} 
                              className={styles.expandBtn}
                              aria-label="Toggle log details"
                            >
                              {expandedRows.has(row.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
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
                      </tr>
                      {expandedRows.has(row.id) && (
                        <tr className={styles.expandRow}>
                          <td colSpan={6}>
                            <div className={styles.expandedContainer}>
                              <div className={styles.expandedHeader}>
                                <span className={styles.expandedTitle}>Logged Tasks ({row.logs.length})</span>
                                <span className={styles.expandedTotal}>Total: {row.total_hours_logged} hrs</span>
                              </div>
                              {row.logs.length === 0 ? (
                                <div className={styles.noLogs}>No tasks logged for this date.</div>
                              ) : (
                                <div className={styles.logsList}>
                                  {row.logs.map((log: any) => (
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {filteredData.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>No data found for selected criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Zero Horizontal Scrolling!) */}
            <div className={styles.mobileCardsWrapper}>
              {paginatedData.map(row => (
                <div key={row.id} className={styles.mobileCard} onClick={() => toggleRow(row.id)}>
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
                    <div className={styles.mobileExpandIndicator}>
                      <span>{expandedRows.has(row.id) ? 'Hide Details' : 'View Details'}</span>
                      {expandedRows.has(row.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>

                  {expandedRows.has(row.id) && (
                    <div className={styles.mobileCardExpanded} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.expandedHeader}>
                        <span className={styles.expandedTitle}>Logged Tasks ({row.logs.length})</span>
                      </div>
                      {row.logs.length === 0 ? (
                        <div className={styles.noLogs}>No tasks logged for this date.</div>
                      ) : (
                        <div className={styles.logsList}>
                          {row.logs.map((log: any) => (
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
                  )}
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
      </div>
    </div>
  );
}
