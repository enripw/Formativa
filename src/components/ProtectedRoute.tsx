import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireSuperAdmin = false,
  requireGlobalAdmin = false,
  requireTournamentsEnabled = false
}: { 
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requireGlobalAdmin?: boolean;
  requireTournamentsEnabled?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const location = useLocation();

  if (authLoading || settingsLoading) {
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

  if (requireTournamentsEnabled && settings.tournamentsEnabled === false && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
