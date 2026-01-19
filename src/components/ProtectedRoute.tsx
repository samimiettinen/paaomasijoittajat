import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const AUTO_RELOAD_SECONDS = 10;

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, permissionsLoading, isAdmin, isVibeCoder, adminLevel } = useAuth();
  const location = useLocation();
  const [countdown, setCountdown] = useState(AUTO_RELOAD_SECONDS);

  // Check if user has any valid role (admin or vibe_coder)
  const hasAccess = isAdmin || isVibeCoder;
  const showAccessDenied = user && !hasAccess && !isLoading && !permissionsLoading;

  useEffect(() => {
    if (!showAccessDenied) {
      setCountdown(AUTO_RELOAD_SECONDS);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showAccessDenied]);

  // Show skeleton while session OR permissions are loading
  if (isLoading || permissionsLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-destructive">Päivitä verkkoselain</h1>
          <p className="text-muted-foreground">
            Yhteyden vahvistus katkennut
          </p>
          <p className="text-sm text-muted-foreground">
            Sivu päivittyy automaattisesti {countdown} sekunnin kuluttua
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Päivitä nyt
          </button>
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
