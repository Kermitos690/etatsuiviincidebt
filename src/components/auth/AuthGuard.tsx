import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Tutorial mode: bypass authentication ONLY via environment variable in development mode
// This prevents attackers from bypassing auth by adding ?tutorial=true
// SECURITY: Double protection - requires both development mode AND env variable
const TUTORIAL_MODE = import.meta.env.MODE === 'development' && 
                      import.meta.env.VITE_TUTORIAL_MODE === 'true';

if (TUTORIAL_MODE && typeof window !== 'undefined') {
  console.error('⚠️ TUTORIAL MODE ACTIVE - AUTHENTICATION DISABLED - DEVELOPMENT ONLY');
}

interface AuthGuardProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
  fallback?: ReactNode;
}

export function AuthGuard({ children, requiredRoles, fallback }: AuthGuardProps) {
  const { session, loading, profileLoading, roles, hasRole } = useAuth();
  const location = useLocation();

  // Tutorial mode bypass - skip all auth checks
  if (TUTORIAL_MODE) {
    console.log('[Tutorial Mode] Auth bypassed for:', location.pathname);
    return <>{children}</>;
  }

  // Show loading state
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check for required roles if specified
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    
    if (!hasRequiredRole) {
      // Show access denied or custom fallback
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
          <div className="glass-card p-8 max-w-md text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Accès refusé</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <p className="text-xs text-muted-foreground">
              Rôles requis: {requiredRoles.join(', ')}
            </p>
            <Button onClick={() => window.history.back()} variant="outline">
              Retour
            </Button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Higher-order component for role-based access
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles: AppRole[]
) {
  return function GuardedComponent(props: P) {
    return (
      <AuthGuard requiredRoles={requiredRoles}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

// Admin-only guard
export function AdminGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRoles={['admin']}>
      {children}
    </AuthGuard>
  );
}

// Auditor guard (admin or auditor)
export function AuditorGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRoles={['admin', 'auditor']}>
      {children}
    </AuthGuard>
  );
}
