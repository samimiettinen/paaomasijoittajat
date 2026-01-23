import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, permissionsLoading, isAdmin, isVibeCoder, refreshPermissions } = useAuth();
  const location = useLocation();

  // Check if user has any valid role (admin or vibe_coder)
  const hasAccess = isAdmin || isVibeCoder;

  // Show skeleton while session OR permissions are loading
  if (isLoading || permissionsLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated but doesn't have access - show friendly message without aggressive reload
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center animate-pulse">
            <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Käyttöoikeudet tarkistetaan</h1>
            <p className="text-muted-foreground">
              Käyttöoikeuksiasi ei voitu vahvistaa. Tämä voi johtua hitaasta yhteydestä tai väliaikaisesta ongelmasta.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => refreshPermissions()}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all duration-200 font-medium hover:scale-105 active:scale-95"
            >
              Jatka tietoturvallista sessiota
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-all duration-200 font-medium hover:scale-105 active:scale-95"
            >
              Lataa sivu uudelleen
            </button>
          </div>
          <p className="text-xs text-muted-foreground animate-pulse">
            Jos ongelma jatkuu, ota yhteyttä ylläpitoon.
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
