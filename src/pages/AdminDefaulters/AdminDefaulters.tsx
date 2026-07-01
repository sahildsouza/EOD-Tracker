import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentDateIST } from '../../utils/dateUtils';
import { calculateMergedMinutes, isDateLocked } from '../../utils/timeUtils';
import { exportToExcel } from '../../utils/exportUtils';
import { parseISO, subDays, format } from 'date-fns';
import { Copy, Download, AlertTriangle, Search, Briefcase, Clock, Calendar, MapPin } from 'lucide-react';
import styles from './AdminDefaulters.module.css';
import Pagination from '../../components/Pagination/Pagination';
import Loader from '../../components/Loader/Loader';

export default function AdminDefaulters() {
  const [data, setData] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterDesignation, setFilterDesignation] = useState('');
  const [filterShift, setFilterShift] = useState('');

  // Defaulters list is explicitly for "yesterday"
  const yesterdayStr = format(subDays(parseISO(getCurrentDateIST()), 1), 'yyyy-MM-dd');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: d } = await supabase.from('designations').select('*');
      if (d) setDesignations(d);

      const { data: s } = await supabase.from('shifts').select('*');
      if (s) setShifts(s);

      // Fetch profiles with email via RPC if possible, fallback to standard table join
      let profiles: any[] = [];
      const { data: rpcUsers, error: rpcErr } = await supabase.rpc('admin_list_users');
      if (!rpcErr && rpcUsers) {
        profiles = rpcUsers.filter((u: any) => u.role === 'employee').map((u: any) => ({
          ...u,
          designation: u.designation || { name: '-' }
        }));
      } else {
        const { data: stdProfiles } = await supabase.from('profiles').select('*, designation:designations(name)').eq('role', 'employee');
        if (stdProfiles) profiles = stdProfiles;
      }

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
              email: profile.email || '',
              employee_id: profile.employee_id,
              designation: profile.designation?.name || '-',
              shift_name: status.shift?.name || '-',
              work_location: profile.work_location || 'Remote',
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

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchSearch = (d.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
                          (d.employee_id?.toLowerCase() || '').includes(search.toLowerCase()) ||
                          (d.email?.toLowerCase() || '').includes(search.toLowerCase());
      const matchDesig = filterDesignation ? d.designation === filterDesignation : true;
      const matchShift = filterShift ? d.shift_name === filterShift : true;
      return matchSearch && matchDesig && matchShift;
    });
  }, [data, search, filterDesignation, filterShift]);

  const paginatedData = useMemo(() => {
    return filteredData.slice((currentPage - 1) * 10, currentPage * 10);
  }, [filteredData, currentPage]);

  const handleCopyNames = () => {
    const text = filteredData.map((d, i) => `${i + 1}. ${d.full_name}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExport = () => {
    exportToExcel(filteredData.map(d => ({
      Date: yesterdayStr,
      Name: d.full_name,
      Email: d.email,
      'Employee ID': d.employee_id,
      Designation: d.designation,
      Shift: d.shift_name,
      'Hours Logged': d.hours_logged,
      'Shortfall (Hours)': d.shortfall_hours
    })), 'Defaulters_Report');
  };

  return (
    <div className={`page-container ${styles.container}`}>
      {/* Hero Header Card matching Image 1 */}
      <div className="bannerCard" style={{ '--banner-accent': '#EF4444' } as React.CSSProperties}>
        <div className="bannerIconBox" style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#EF4444' }}>
          <AlertTriangle size={24} />
        </div>
        <p className="bannerText">
          Monitor employees who logged fewer hours than their assigned shift duration for yesterday ({yesterdayStr}).
        </p>
      </div>

      {/* Main List Container Card */}
      <div className={styles.mainCard}>
        {/* Toolbar matching reference image */}
        <div className={styles.toolbar}>
          {/* Top Row: Search Input */}
          <div className={styles.searchRow}>
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text"
              placeholder="Search directory by name or employee ID..."
              className={styles.searchInput}
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Bottom Row: Controls */}
          <div className={styles.controlsBar}>
            <div className={styles.filterGroup}>
              {/* Designation Filter */}
              <div className={styles.filterBox}>
                <Briefcase size={14} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                <select 
                  className={styles.filterSelect}
                  value={filterDesignation}
                  onChange={e => { setFilterDesignation(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">Designation</option>
                  {designations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>

              {/* Assigned Shift Filter */}
              <div className={styles.filterBox}>
                <Clock size={14} style={{ color: '#8B5CF6', flexShrink: 0 }} />
                <select 
                  className={styles.filterSelect}
                  value={filterShift}
                  onChange={e => { setFilterShift(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">Assigned Shift</option>
                  {shifts.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button className="btn-outline" onClick={handleCopyNames} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
                <Copy size={16} /> {copySuccess ? 'Copied!' : 'Copy Names'}
              </button>
              <button className="btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.15rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
                <Download size={16} /> Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Directory Table / Cards */}
        {loading ? <Loader message="Calculating defaulters..." /> : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
            <AlertTriangle size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto', color: '#10B981' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No Defaulters Found!</div>
            <div>Great job! Every employee met or exceeded their shift requirements for yesterday.</div>
          </div>
        ) : (
          <>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>TEAM MEMBER</th>
                    <th>EMPLOYEE ID</th>
                    <th>DESIGNATION</th>
                    <th>ASSIGNED SHIFT</th>
                    <th>HOURS LOGGED</th>
                    <th>SHORTFALL</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(row => {
                    const initials = (row.full_name || 'E').split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
                    return (
                      <tr key={row.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div className="avatarBadge">{initials}</div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{row.full_name}</div>
                              {row.email && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{row.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="idBadge">{row.employee_id}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            <Briefcase size={15} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                            <span>{row.designation}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)' }}>
                            <Clock size={15} style={{ color: '#8B5CF6', flexShrink: 0 }} />
                            <span>{row.shift_name}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {row.hours_logged} hrs
                        </td>
                        <td>
                          <span className={styles.shortfallBadge}>
                            <AlertTriangle size={14} /> -{row.shortfall_hours} hrs
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-page)' }}>
              <Pagination 
                currentPage={currentPage}
                totalItems={filteredData.length}
                itemsPerPage={10}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
