import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Route guard that only allows ADMIN users through.
 * Uses AuthContext so it respects the session restoration loading state.
 */
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-12 w-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = user?.role || localStorage.getItem('userRole');
  if (role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
