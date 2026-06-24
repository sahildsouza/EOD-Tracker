import React from 'react';
import { Navigate } from 'react-router-dom';
import { useDailyStatus } from '../../hooks/useDailyStatus';
import { useAuth } from '../../contexts/AuthContext';

export default function EmployeeGuard({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const { status, isLoading } = useDailyStatus();

  if (profile?.role !== 'employee') {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <div className="page-container">Loading Daily Status...</div>;
  }

  // If no status is selected for today, redirect to /daily-status
  if (!status && window.location.pathname !== '/daily-status') {
    return <Navigate to="/daily-status" replace />;
  }

  return <>{children}</>;
}
