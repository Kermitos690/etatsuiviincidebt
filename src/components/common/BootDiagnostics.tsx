import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { safeStorage } from '@/lib/safeStorage';

interface DiagnosticState {
  jsRunning: boolean;
  storageOk: boolean;
  route: string;
  lastError: string | null;
  errorCount: number;
}

/**
 * Boot diagnostics overlay for debugging blank screen issues.
 * Only shows in development or when errors occur.
 */
export function BootDiagnostics() {
  const location = useLocation();
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>({
    jsRunning: true,
    storageOk: safeStorage.isAvailable(),
    route: '/',
    lastError: null,
    errorCount: 0,
  });
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    setDiagnostic((prev) => ({ ...prev, route: location.pathname }));
  }, [location.pathname]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setDiagnostic((prev) => ({
        ...prev,
        lastError: event.message,
        errorCount: prev.errorCount + 1,
      }));
      setShowOverlay(true);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason);
      setDiagnostic((prev) => ({
        ...prev,
        lastError: message,
        errorCount: prev.errorCount + 1,
      }));
      setShowOverlay(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Don't render if no errors and in production
  if (!showOverlay && import.meta.env.PROD) {
    return null;
  }

  // Development mode: always show a minimal indicator
  if (!showOverlay && import.meta.env.DEV) {
    return (
      <div className="fixed bottom-2 left-2 z-[9999] text-[10px] bg-green-500/20 text-green-700 px-2 py-1 rounded font-mono">
        ✓ JS OK | {diagnostic.route}
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-destructive/95 text-destructive-foreground p-3 text-sm font-mono">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="space-x-4">
          <span>🔴 Erreur détectée</span>
          <span>Route: {diagnostic.route}</span>
          <span>Storage: {diagnostic.storageOk ? '✓' : '✗'}</span>
          <span>Erreurs: {diagnostic.errorCount}</span>
        </div>
        <div className="flex items-center gap-2">
          {diagnostic.lastError && (
            <span className="truncate max-w-xs">{diagnostic.lastError}</span>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-2 py-1 bg-background text-foreground rounded text-xs hover:bg-muted"
          >
            Recharger
          </button>
          <button
            onClick={() => setShowOverlay(false)}
            className="px-2 py-1 bg-background/50 text-foreground rounded text-xs"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
