import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, AppRole } from '@/hooks/useAuth';

/**
 * Tutorial mode:
 * - Bypasses authentication ONLY when explicitly enabled
 * - AND ONLY in development builds (never in production)
 *
 * Why:
 * - Prevent accidental public access if env var is set in production
 * - Keep a safe "demo" mode for local/dev previews
 */
const TUTORIAL_MODE =
  import.meta.env.DEV && import.meta.env.VITE_TUTORIAL_MODE === 'true';

interface AuthGuardProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
  fallback?: ReactNode;
}

export function AuthGuard({ children, requiredRoles, fallback }: AuthGuardProps) {
  const { session, loading, profileLoading, roles, hasRole } = useAuth();
  const location = useLocation();

  // DEV-only tutorial bypass
  if (TUTORIAL_MODE) {
    return <>{children}</>;
  }

  // Loading state
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

  // Not authenticated
  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (requiredRoles && requiredRoles.length > 0) {
    const allowed = requiredRoles.some((role) => hasRole(role));

    if (!allowed) {
      if (fallback) return <>{fallback}</>;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
            </div>

            <div className="mt-4 text-center space-y-2">
              <h1 className="text-xl font-semibold">Accès refusé</h1>
              <p className="text-sm text-muted-foreground">
                Votre compte n’a pas les droits nécessaires pour accéder à cette page.
              </p>

              <div className="mt-4 text-left text-xs text-muted-foreground space-y-2">
                <div>
                  <div className="font-medium">Rôles requis :</div>
                  <div className="mt-1">{requiredRoles.join(', ')}</div>
                </div>

                <div>
                  <div className="font-medium">Vos rôles :</div>
                  <div className="mt-1">
                    {roles && roles.length > 0 ? roles.join(', ') : 'Aucun rôle détecté'}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <Button variant="secondary" onClick={() => window.history.back()}>
                  Retour
                </Button>
                <Button asChild>
                  <a href="/">Accueil</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // OK
  return <>{children}</>;
}

/**
 * Convenience guards
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  return <AuthGuard requiredRoles={['admin']}>{children}</AuthGuard>;
}

export function AuditorGuard({ children }: { children: ReactNode }) {
  return <AuthGuard requiredRoles={['admin', 'auditor']}>{children}</AuthGuard>;
}