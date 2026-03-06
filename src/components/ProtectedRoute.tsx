import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireSuperAdmin = false,
  requireGlobalAdmin = false
}: { 
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requireGlobalAdmin?: boolean;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullPage message="Verificando sesión..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Superadmin is enripw@gmail.com and role 'admin'
  const isSuperAdmin = user.role === 'admin' && user.email === 'enripw@gmail.com';
  const isGlobalAdmin = user.role === 'admin';
  const isAdmin = user.role === 'admin' || user.role === 'team_admin';

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireGlobalAdmin && !isGlobalAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
