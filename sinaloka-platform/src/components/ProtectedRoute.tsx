import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { Skeleton } from '@/src/components/UI';

export function ProtectedRoute() {
  const { user, isAuthenticated, isLoading, isImpersonating, mustChangePassword } = useAuth();
  const { slug } = useInstitution();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // On institution subdomains, redirect to the branded landing page instead of login
    if (slug && (location.pathname === '/' || location.pathname === '/dashboard')) {
      return <Navigate to="/welcome" replace />;
    }
    const currentPath = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  if (user?.role === 'SUPER_ADMIN' && !isImpersonating) {
    return <Navigate to="/super/institutions" replace />;
  }

  // Force password change before anything else (separate from onboarding wizard)
  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (user?.role === 'ADMIN' && user?.institution && !user.institution.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
