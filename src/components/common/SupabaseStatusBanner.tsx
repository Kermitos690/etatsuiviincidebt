import React from 'react';
import { AlertTriangle, Database, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SupabaseStatusBannerProps {
  isConfigured: boolean;
  className?: string;
}

/**
 * Banner to show when Supabase is not configured
 * Provides clear feedback instead of crashing
 */
export function SupabaseStatusBanner({ isConfigured, className = '' }: SupabaseStatusBannerProps) {
  if (isConfigured) return null;

  return (
    <Alert variant="default" className={`border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">Mode démonstration</AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        La connexion à la base de données n'est pas configurée. 
        L'application fonctionne en mode démo avec des fonctionnalités limitées.
        Les actions de base de données sont désactivées.
      </AlertDescription>
    </Alert>
  );
}

/**
 * Hook to check Supabase configuration status
 */
export function useSupabaseStatus() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const isConfigured = Boolean(url && key && url.includes('supabase.co'));
  const isDemoMode = !isConfigured;
  
  return {
    isConfigured,
    isDemoMode,
    hasUrl: Boolean(url),
    hasKey: Boolean(key),
  };
}

/**
 * Wrapper component that disables children interactions in demo mode
 */
export function DemoModeWrapper({ 
  children, 
  disabled = false,
  tooltip = 'Fonctionnalité non disponible en mode démo'
}: { 
  children: React.ReactNode;
  disabled?: boolean;
  tooltip?: string;
}) {
  const { isDemoMode } = useSupabaseStatus();
  
  if (isDemoMode || disabled) {
    return (
      <div 
        className="opacity-50 cursor-not-allowed" 
        title={tooltip}
        onClick={(e) => e.preventDefault()}
      >
        {children}
      </div>
    );
  }
  
  return <>{children}</>;
}
