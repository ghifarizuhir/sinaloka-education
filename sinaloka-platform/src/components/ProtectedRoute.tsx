import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { Skeleton } from '@/src/components/UI';

export function ProtectedRoute() {
  const { user, isAuthenticated, isLoading, isImpersonating } = useAuth();

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

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === 'SUPER_ADMIN' && !isImpersonating) {
    return <Navigate to="/super/institutions" replace />;
  }

  return <Outlet />;
}
