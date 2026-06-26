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
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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

    const { data: e, error: eErr } = await supabase.from('profiles').select('*, designation:designations(name)');
    if (eErr) console.error("Error fetching profiles:", eErr);
    if (e) setEmployees(e);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => 
      e.full_name.toLowerCase().includes(search.toLowerCase()) || 
      e.employee_id.toLowerCase().includes(search.toLowerCase())
    );
  }, [employees, search]);

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
    
    // Auth users email isn't easily accessible via standard PostgREST join depending on schema,
    // so we might just leave email blank to preserve unless an edge function fetches it.
    // However, if we do a direct update on Profiles, that's fine. We cannot update Email easily
    // without Supabase Admin API. For this exercise, we will just update Profile fields.
    setEmail('admin-cannot-edit-email@local.internal'); // Placeholder
    
    setError(''); setIsPanelOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');

    try {
      if (isEditing) {
        // Update Profile only
        const { error: pErr } = await supabase.from('profiles').update({
          full_name: fullName,
          phone: phone,
          role: role,
          designation_id: designationId || null,
          work_location: workLocation
        }).eq('id', id);
        if (pErr) throw pErr;
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
      {/* Hero Header */}
      <div className={styles.heroCard}>
        <div className={styles.heroIconBadge}>
          <Users size={32} />
        </div>
        <div className={styles.heroInfo}>
          <h2 className={styles.heroTitle}>Employee Directory & Management</h2>
          <p className={styles.heroSubtitle}>Manage team profiles, assign organizational designations, configure role permissions, and maintain directory records.</p>
        </div>
        <div className={styles.heroActions}>
          <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', padding: '0.65rem 1.25rem', fontSize: '0.9rem', fontWeight: 600 }}>
            <Plus size={18} /> Create New User
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} style={{ color: 'var(--text-secondary)', marginRight: '0.65rem', flexShrink: 0 }} />
            <input 
              type="text" 
              placeholder="Search by Employee Name or ID..." 
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.9rem' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Showing <strong>{paginatedEmployees.length}</strong> of <strong>{filteredEmployees.length}</strong> team members
          </div>
        </div>

        <div className={styles.tableContainer}>
          {loading ? <Loader message="Fetching employee directory..." /> : filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <Users size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
              <p style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>No employees found</p>
              <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0' }}>Try adjusting your search query.</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <table className={styles.desktopTable}>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Employee ID</th>
                    <th>Role</th>
                    <th>Designation</th>
                    <th>Work Location</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.full_name}</td>
                      <td><span style={{ fontFamily: 'monospace', background: 'var(--bg-page)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{emp.employee_id}</span></td>
                      <td><span className={`${styles.roleBadge} ${styles[emp.role] || styles.employee}`}>{emp.role}</span></td>
                      <td style={{ fontWeight: 500 }}>{emp.designation?.name || <span style={{ opacity: 0.5 }}>-</span>}</td>
                      <td>{emp.work_location || <span style={{ opacity: 0.5 }}>Remote / Unassigned</span>}</td>
                      <td>
                        <div className={styles.actionBtns} style={{ justifyContent: 'center' }}>
                          <button className={styles.iconBtn} title="Edit Profile" onClick={() => openEdit(emp)}><Edit size={16} style={{ color: 'var(--accent-color)' }} /></button>
                          <button className={styles.iconBtn} title="Reset Password" onClick={() => handleResetPassword(emp.id)}><KeyRound size={16} style={{ color: '#F59E0B' }} /></button>
                          <button className={styles.iconBtn} title="Delete User" onClick={() => handleDelete(emp.id)}><Trash2 size={16} style={{ color: '#EF4444' }} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile View */}
              <div className={styles.mobileList}>
                {paginatedEmployees.map(emp => (
                  <div key={emp.id} className={styles.empCard}>
                    <div className={styles.empCardTop}>
                      <div>
                        <div className={styles.empName}>{emp.full_name}</div>
                        <div className={styles.empIdBadge}>ID: {emp.employee_id}</div>
                      </div>
                      <span className={`${styles.roleBadge} ${styles[emp.role] || styles.employee}`}>{emp.role}</span>
                    </div>
                    <div className={styles.empCardDetails}>
                      <div className={styles.detailItem}>
                        <Briefcase size={15} style={{ color: 'var(--accent-color)' }} /> 
                        <span>{emp.designation?.name || 'No Designation Assigned'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <MapPin size={15} style={{ color: '#8B5CF6' }} /> 
                        <span>{emp.work_location || 'Remote / Unassigned'}</span>
                      </div>
                    </div>
                    <div className={styles.empCardActions}>
                      <button className="btn-outline" onClick={() => openEdit(emp)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.55rem', fontWeight: 600 }}>
                        <Edit size={16} style={{ color: 'var(--accent-color)' }} /> Edit Profile
                      </button>
                      <button className="btn-outline" onClick={() => handleResetPassword(emp.id)} title="Reset Password" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.55rem 0.85rem' }}>
                        <KeyRound size={16} style={{ color: '#F59E0B' }} />
                      </button>
                      <button className="btn-outline" onClick={() => handleDelete(emp.id)} title="Delete User" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.55rem 0.85rem', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                        <Trash2 size={16} style={{ color: '#EF4444' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {filteredEmployees.length > 10 && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <Pagination 
                currentPage={currentPage}
                totalItems={filteredEmployees.length}
                itemsPerPage={10}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {isPanelOpen && (
        <div className={styles.overlay}>
          <div className={styles.slidePanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>{isEditing ? 'Edit User' : 'Create User'}</div>
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
              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <input required className="surface input" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Employee ID</label>
                <input required disabled={isEditing} className="surface input" value={employeeId} onChange={e => setEmployeeId(e.target.value.toUpperCase())} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input type="email" required disabled={isEditing} className="surface input" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Phone Number</label>
                <input className="surface input" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Role</label>
                <select className="surface input" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Designation</label>
                <select className="surface input" value={designationId} onChange={e => setDesignationId(e.target.value)}>
                  <option value="">-- None --</option>
                  {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Work Location</label>
                <input className="surface input" value={workLocation} onChange={e => setWorkLocation(e.target.value)} />
              </div>

              <div style={{ flex: 1 }} />
              <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '1rem', marginTop: '1.5rem' }}>
                {saving ? 'Saving...' : 'Save User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
