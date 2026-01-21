import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, permissionsLoading, isAdmin, isVibeCoder, memberId } = useAuth();
  const location = useLocation();

  // Allow access if user has any role OR is a registered member (relaxed auth)
  const hasAccess = isAdmin || isVibeCoder || memberId !== null;

  // Show skeleton only during initial loading (max 5 seconds)
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If still loading permissions but user is authenticated, allow access after short delay
  // This prevents blocking users when DB is slow
  if (permissionsLoading) {
    // Allow access while permissions load - don't block the user
    return <>{children}</>;
  }

  // User is authenticated but not in members table - redirect to login with message
  if (!hasAccess) {
    return <Navigate to="/login" state={{ from: location, accessDenied: true }} replace />;
  }

  // If admin access is required but user is only vibe_coder
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
