import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/Layout/AppLayout';
import EmployeeGuard from './components/Guard/EmployeeGuard';

// Auth Pages
import Login from './pages/Login/Login';
import SetPassword from './pages/SetPassword/SetPassword';

// Employee Pages
import DailyStatus from './pages/DailyStatus/DailyStatus';
import EmployeeDashboard from './pages/EmployeeDashboard/EmployeeDashboard';
import EmployeeCalendar from './pages/EmployeeCalendar/EmployeeCalendar';
import EmployeeProfile from './pages/EmployeeProfile/EmployeeProfile';
import EmployeeSettings from './pages/EmployeeSettings/EmployeeSettings';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import AdminEodLogs from './pages/AdminEodLogs/AdminEodLogs';
import AdminDefaulters from './pages/AdminDefaulters/AdminDefaulters';
import AdminEmployees from './pages/AdminEmployees/AdminEmployees';
import AdminSettings from './pages/AdminSettings/AdminSettings';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return <div className="app-container"><div className="page-container">Loading...</div></div>;
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.must_change_password) {
    return <Navigate to="/set-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return <div className="app-container"><div className="page-container">Loading App...</div></div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/set-password" element={user && profile?.must_change_password ? <SetPassword /> : <Navigate to="/" replace />} />

        {/* Protected Routes inside AppLayout */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={
            profile?.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />
          } />

          {/* Employee Routes (Guard checks if they have filled daily status) */}
          <Route path="daily-status" element={<ProtectedRoute allowedRoles={['employee']}><DailyStatus /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeGuard><EmployeeDashboard /></EmployeeGuard></ProtectedRoute>} />
          <Route path="eod-logs" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeGuard><EmployeeCalendar /></EmployeeGuard></ProtectedRoute>} />
          <Route path="calendar" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeGuard><EmployeeCalendar /></EmployeeGuard></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeGuard><EmployeeProfile /></EmployeeGuard></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeGuard><EmployeeSettings /></EmployeeGuard></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="admin/eod-logs" element={<ProtectedRoute allowedRoles={['admin']}><AdminEodLogs /></ProtectedRoute>} />
          <Route path="admin/defaulters" element={<ProtectedRoute allowedRoles={['admin']}><AdminDefaulters /></ProtectedRoute>} />
          <Route path="admin/employees" element={<ProtectedRoute allowedRoles={['admin']}><AdminEmployees /></ProtectedRoute>} />
          <Route path="admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
