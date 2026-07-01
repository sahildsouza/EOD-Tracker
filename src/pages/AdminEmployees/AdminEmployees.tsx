import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import styles from './AdminEmployees.module.css';
import { Search, Plus, Edit, Trash2, KeyRound, X, Users, Briefcase, MapPin } from 'lucide-react';
import Pagination from '../../components/Pagination/Pagination';
import Loader from '../../components/Loader/Loader';

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDesignation, setFilterDesignation] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterDesignation, filterLocation]);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [id, setId] = useState(''); // UUID for edit
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState('employee');
  const [designationId, setDesignationId] = useState('');
  const [workLocation, setWorkLocation] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const { data: d } = await supabase.from('designations').select('*');
    if (d) setDesignations(d);

    const { data: e, error: eErr } = await supabase.rpc('admin_list_users');
    if (eErr) {
      console.error("Error fetching users via RPC:", eErr);
      const { data: fb } = await supabase.from('profiles').select('*, designation:designations(name)');
      if (fb) setEmployees(fb);
    } else if (e) {
      setEmployees(e);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.work_location).filter(Boolean)));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchSearch = (e.full_name?.toLowerCase() || '').includes(search.toLowerCase()) || 
                          (e.employee_id?.toLowerCase() || '').includes(search.toLowerCase());
      const matchDesig = filterDesignation ? e.designation_id === filterDesignation : true;
      const matchLoc = filterLocation ? e.work_location === filterLocation : true;
      return matchSearch && matchDesig && matchLoc;
    });
  }, [employees, search, filterDesignation, filterLocation]);

  const paginatedEmployees = useMemo(() => {
    return filteredEmployees.slice((currentPage - 1) * 10, currentPage * 10);
  }, [filteredEmployees, currentPage]);

  const openAdd = () => {
    setIsEditing(false);
    setId(''); setFullName(''); setPhone(''); setEmail('');
    setEmployeeId(''); setRole('employee'); setDesignationId(''); setWorkLocation('');
    setError(''); setIsPanelOpen(true);
  };

  const openEdit = async (emp: any) => {
    setIsEditing(true);
    setId(emp.id); setFullName(emp.full_name); setPhone(emp.phone || '');
    setEmployeeId(emp.employee_id); setRole(emp.role); setDesignationId(emp.designation_id || '');
    setWorkLocation(emp.work_location || '');
    setEmail(emp.email || '');
    setError(''); setIsPanelOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');

    try {
      if (isEditing) {
        // Update Profile fields
        const { error: pErr } = await supabase.from('profiles').update({
          full_name: fullName,
          phone: phone,
          role: role,
          designation_id: designationId || null,
          work_location: workLocation
        }).eq('id', id);
        if (pErr) throw pErr;

        // Update Auth Email
        if (email) {
          const { error: eErr } = await supabase.rpc('admin_update_user_email', {
            target_user_id: id,
            new_email: email
          });
          if (eErr) throw eErr;
        }
      } else {
        // Create secondary client to avoid logging out the admin
        const adminAuthClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            }
          }
        );

        const { data: authData, error: authError } = await adminAuthClient.auth.signUp({
          email,
          password: 'Password123!', // Temporary password for new accounts
          options: {
            data: {
              employee_id: employeeId,
              full_name: fullName,
              role: role
            }
          }
        });

        if (authError) throw authError;

        // The trigger on auth.users creates the profile. Update the remaining fields:
        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').update({
            phone: phone,
            designation_id: designationId || null,
            work_location: workLocation
          }).eq('id', authData.user.id);
          
          if (profileError) throw profileError;
        }
      }
      setIsPanelOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (empId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user? This will also delete their logs.')) return;
    
    setLoading(true);
    const { error: rpcError } = await supabase.rpc('admin_delete_user', { target_user_id: empId });
    if (rpcError) {
      alert(`Failed to delete employee: ${rpcError.message}`);
    } else {
      await fetchData();
    }
    setLoading(false);
  };

  const handleResetPassword = async (empId: string) => {
    // Requires email.
    alert('Password reset link sent (simulated).');
  };

  return (
    <div className={`page-container ${styles.container}`}>
      {/* Hero Header Card */}
      {/* Hero Banner Card matching Image 1 */}
      <div className="bannerCard" style={{ '--banner-accent': '#3B82F6' } as React.CSSProperties}>
        <div className="bannerIconBox" style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#3B82F6' }}>
          <Users size={24} />
        </div>
        <p className="bannerText">
          Configure employee profiles, assign organizational designations, and manage system role permissions.
        </p>
      </div>

      {/* Main List Container Card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden'
      }}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          {/* Top Row: Search Input */}
          <div className={styles.searchRow}>
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search directory by name or employee ID..." 
              className={styles.searchInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Bottom Row: Responsive Controls Alignment */}
          <div className={styles.controlsBar}>
            <div className={styles.filterGroup}>
              {/* Designation Filter */}
              <div className={styles.filterBox}>
                <Briefcase size={14} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                <select 
                  className={styles.filterSelect}
                  value={filterDesignation}
                  onChange={e => setFilterDesignation(e.target.value)}
                >
                  <option value="">Designation</option>
                  {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Work Location Filter */}
              <div className={styles.filterBox}>
                <MapPin size={14} style={{ color: '#8B5CF6', flexShrink: 0 }} />
                <select 
                  className={styles.filterSelect}
                  value={filterLocation}
                  onChange={e => setFilterLocation(e.target.value)}
                >
                  <option value="">Location</option>
                  {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
            </div>

            {/* Add Employee Button */}
            <div className={styles.actionButtons}>
              <button className="btn-primary" onClick={openAdd}>
                <Plus size={16} /> Add Employee
              </button>
            </div>
          </div>
        </div>

        {/* Sleek Premium Directory Table */}
        {loading ? <Loader message="Fetching employee directory..." /> : filteredEmployees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <Users size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>No employees found</p>
            <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0' }}>Try adjusting your search query.</p>
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '720px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.9rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Team Member</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Employee ID</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>System Role</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Designation</th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Work Location</th>
                  <th style={{ padding: '0.9rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map((emp, idx) => {
                  const roleColor = emp.role === 'admin' ? '#EF4444' : emp.role === 'manager' ? '#F59E0B' : '#3B82F6';
                  const roleBg = emp.role === 'admin' ? 'rgba(239, 68, 68, 0.12)' : emp.role === 'manager' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)';
                  const roleBorder = emp.role === 'admin' ? 'rgba(239, 68, 68, 0.25)' : emp.role === 'manager' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(59, 130, 246, 0.25)';

                  return (
                    <tr 
                      key={emp.id}
                      style={{
                        borderBottom: idx === paginatedEmployees.length - 1 ? 'none' : '1px solid var(--border-color)',
                        transition: 'background-color 0.15s ease',
                        backgroundColor: 'var(--bg-surface)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.03)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div className="avatarBadge">
                            {emp.full_name ? emp.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{emp.full_name}</div>
                            {emp.email && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{emp.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="idBadge">{emp.employee_id}</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle' }}>
                        <span style={{
                          padding: '0.22rem 0.65rem', borderRadius: '6px',
                          fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                          backgroundColor: roleBg, color: roleColor, border: `1px solid ${roleBorder}`
                        }}>
                          {emp.role}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle', fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Briefcase size={15} style={{ color: 'var(--accent-color)', flexShrink: 0, opacity: emp.designation?.name ? 1 : 0.4 }} />
                          <span>{emp.designation?.name || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Unassigned</span>}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MapPin size={15} style={{ color: '#8B5CF6', flexShrink: 0, opacity: emp.work_location ? 1 : 0.4 }} />
                          <span>{emp.work_location || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Remote</span>}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <button 
                            onClick={() => openEdit(emp)} 
                            title="Edit Profile"
                            style={{ background: 'transparent', border: 'none', padding: '0.45rem', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--accent-color)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleResetPassword(emp.id)} 
                            title="Reset Password"
                            style={{ background: 'transparent', border: 'none', padding: '0.45rem', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-page)'; e.currentTarget.style.color = '#F59E0B'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                          >
                            <KeyRound size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(emp.id)} 
                            title="Delete User"
                            style={{ background: 'transparent', border: 'none', padding: '0.45rem', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#EF4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredEmployees.length > 0 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-page)' }}>
            <Pagination 
              currentPage={currentPage}
              totalItems={filteredEmployees.length}
              itemsPerPage={10}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Slide-over Form Panel */}
      {isPanelOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 2000, display: 'flex', justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '100%', maxWidth: '480px', backgroundColor: 'var(--bg-surface)',
            height: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 30px rgba(0,0,0,0.15)', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{isEditing ? 'Edit User' : 'Create User'}</div>
              <button 
                type="button" 
                onClick={() => setIsPanelOpen(false)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '6px' }}
                title="Close"
              >
                <X size={24} />
              </button>
            </div>

            {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Full Name</label>
                <input required style={{ padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }} value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Employee ID</label>
                <input required disabled={isEditing} style={{ padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', opacity: isEditing ? 0.7 : 1 }} value={employeeId} onChange={e => setEmployeeId(e.target.value.toUpperCase())} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Email Address</label>
                <input type="email" required style={{ padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }} value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Phone Number</label>
                <input style={{ padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }} value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>System Role</label>
                <select style={{ padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }} value={role} onChange={e => setRole(e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Designation</label>
                <select style={{ padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }} value={designationId} onChange={e => setDesignationId(e.target.value)}>
                  <option value="">-- None --</option>
                  {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Work Location</label>
                <input style={{ padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }} value={workLocation} onChange={e => setWorkLocation(e.target.value)} placeholder="e.g. Headquarters / Remote" />
              </div>

              <div style={{ flex: 1 }} />
              <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '1rem', marginTop: '1.5rem', fontSize: '1rem', fontWeight: 700 }}>
                {saving ? 'Saving User...' : 'Save User Profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
