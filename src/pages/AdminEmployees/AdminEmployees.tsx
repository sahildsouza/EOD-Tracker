import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import styles from './AdminEmployees.module.css';
import { Search, Plus, Edit, Trash2, KeyRound, X } from 'lucide-react';
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
    
    // Deleting from auth.users requires Admin API.
    // Deleting from profiles will work if we have RLS setup or if we do it via RPC.
    alert('User deletion requires Admin API (Edge Function). Prototype limitation.');
  };

  const handleResetPassword = async (empId: string) => {
    // Requires email.
    alert('Password reset link sent (simulated).');
  };

  return (
    <div className={`page-container ${styles.container}`}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Employees</h1>
          <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Create User
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', padding: '0.5rem', backgroundColor: 'var(--bg-page)', width: '300px' }}>
          <Search size={16} style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }} />
          <input 
            type="text" 
            placeholder="Search Name or ID..." 
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.tableContainer} style={{ marginTop: '1.5rem' }}>
          {loading ? <Loader message="Fetching employee directory..." /> : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Role</th>
                  <th>Designation</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map(emp => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 600 }}>{emp.full_name}</td>
                    <td>{emp.employee_id}</td>
                    <td style={{ textTransform: 'capitalize' }}>{emp.role}</td>
                    <td>{emp.designation?.name || '-'}</td>
                    <td>{emp.work_location || '-'}</td>
                    <td>
                      <div className={styles.actions}>
                        <button title="Edit" onClick={() => openEdit(emp)}><Edit size={16} style={{ color: 'var(--accent-color)' }} /></button>
                        <button title="Reset Password" onClick={() => handleResetPassword(emp.id)}><KeyRound size={16} style={{ color: 'var(--warning-color)' }} /></button>
                        <button title="Delete" onClick={() => handleDelete(emp.id)}><Trash2 size={16} style={{ color: 'var(--danger-color)' }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredEmployees.length}
            itemsPerPage={10}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {isPanelOpen && (
        <div className={styles.overlay}>
          <div className={styles.slidePanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>{isEditing ? 'Edit User' : 'Create User'}</div>
              <button onClick={() => setIsPanelOpen(false)}><X size={24} /></button>
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
