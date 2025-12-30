import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SafeDataBoundaryProps {
  children: ReactNode;
  isLoading?: boolean;
  error?: Error | string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  onRetry?: () => void;
  loadingFallback?: ReactNode;
  emptyFallback?: ReactNode;
}

/**
 * SafeDataBoundary - Prevents blank screens for data-driven pages
 * Handles loading, error, and empty states gracefully
 */
export function SafeDataBoundary({
  children,
  isLoading = false,
  error = null,
  isEmpty = false,
  emptyMessage = 'Aucune donnée disponible',
  emptyIcon,
  onRetry,
  loadingFallback,
  emptyFallback,
}: SafeDataBoundaryProps) {
  // Loading state
  if (isLoading) {
    if (loadingFallback) return <>{loadingFallback}</>;
    
    return (
      <div className="w-full space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  // Error state
  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    return (
      <div className="flex items-center justify-center min-h-[300px] p-4">
        <Card className="max-w-md w-full glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Erreur de chargement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Une erreur s'est produite lors du chargement des données.
            </p>
            {import.meta.env.DEV && errorMessage && (
              <details className="text-xs bg-muted p-2 rounded-lg mb-4">
                <summary className="cursor-pointer font-medium mb-1">
                  Détails techniques
                </summary>
                <pre className="whitespace-pre-wrap overflow-auto max-h-24 text-destructive">
                  {errorMessage}
                </pre>
              </details>
            )}
          </CardContent>
          {onRetry && (
            <CardFooter>
              <Button onClick={onRetry} className="gap-2 w-full">
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    if (emptyFallback) return <>{emptyFallback}</>;
    
    return (
      <div className="flex items-center justify-center min-h-[300px] p-4">
        <Card className="max-w-md w-full glass-card">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                {emptyIcon || <Database className="h-8 w-8 text-muted-foreground" />}
              </div>
              <p className="text-muted-foreground">{emptyMessage}</p>
              {onRetry && (
                <Button variant="outline" onClick={onRetry} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render children when data is available
  return <>{children}</>;
}
