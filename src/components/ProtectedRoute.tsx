import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, permissionsLoading, isAdmin, isVibeCoder, adminLevel } = useAuth();
  const location = useLocation();

  // Show skeleton while session OR permissions are loading
  if (isLoading || permissionsLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has any valid role (admin or vibe_coder)
  const hasAccess = isAdmin || isVibeCoder;

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-destructive">Pääsy estetty</h1>
          <p className="text-muted-foreground">
            Sinulla ei ole tarvittavia oikeuksia. Ota yhteyttä järjestelmän ylläpitäjään.
          </p>
        </div>
      </div>
    );
  }

  // If admin access is required but user is only vibe_coder
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}