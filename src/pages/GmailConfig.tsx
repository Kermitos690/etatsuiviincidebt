import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, Settings, Check, X, RefreshCw, Plus, 
  ExternalLink, Shield, Clock, CalendarIcon, ChevronLeft, ChevronRight,
  Loader2, CheckCircle2, AlertCircle, AlertTriangle, Copy, Link2, RotateCcw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { INSTITUTIONAL_DOMAINS, SYNC_KEYWORDS, FILTER_PRESETS, type FilterPreset } from '@/config/appConfig';
import { format, setMonth, setYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GmailDiagnosticPanel } from '@/components/gmail/GmailDiagnosticPanel';

interface GmailConfig {
  connected: boolean;
  email?: string;
  lastSync?: string;
  syncEnabled: boolean;
  domains: string[];
  keywords: string[];
}

interface SyncStatus {
  id: string;
  status: 'processing' | 'analyzing' | 'completed' | 'error';
  total_emails: number;
  processed_emails: number;
  new_emails: number;
  stats: { 
    received: number; 
    sent: number; 
    replied: number; 
    forwarded: number;
    sync_completed?: boolean;
    analysis_started?: boolean;
    analysis_completed?: boolean;
    emails_analyzed?: number;
    incidents_created?: number;
    analysis_error?: boolean;
    // API filtering stats
    api_emails_found?: number;
    domains_count?: number;
    keywords_count?: number;
    filters_applied_at_api?: boolean;
    skippedByFilter?: number;
    skippedByBlacklist?: number;
  };
  progress: number;
  error_message?: string;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i);

export default function GmailConfig() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { signInWithGoogle } = useAuth();
  const [config, setConfig] = useState<GmailConfig>({
    connected: false,
    syncEnabled: false,
    domains: INSTITUTIONAL_DOMAINS,
    keywords: SYNC_KEYWORDS
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ count: number; query: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [syncFromDate, setSyncFromDate] = useState<Date | undefined>(new Date('2024-01-01'));
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [configId, setConfigId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // State for OAuth flow tracking and Plan B
  const [googleAuthUrl, setGoogleAuthUrl] = useState<string | null>(null);
  const [oauthStarted, setOauthStarted] = useState(false);
  const [planBLoading, setPlanBLoading] = useState(false);

  // Save config to database
  const saveConfigToDb = useCallback(async (domains: string[], keywords: string[], syncEnabled: boolean) => {
    if (!configId) return;
    
    try {
      const { error } = await supabase
        .from('gmail_config')
        .update({
          domains,
          keywords,
          sync_enabled: syncEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }, [configId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // State for OAuth error display
  const [oauthError, setOauthError] = useState<{
    error: string;
    message: string;
    suggestion: string;
    description?: string;
  } | null>(null);

  // Handle OAuth callback from mobile redirect (success or error)
  useEffect(() => {
    const connected = searchParams.get('connected');
    const email = searchParams.get('email');
    const oauthErrorParam = searchParams.get('oauth_error');
    const errorMessage = searchParams.get('error_message');
    const errorSuggestion = searchParams.get('error_suggestion');
    const errorDescription = searchParams.get('error_description');

    // Check if we're returning from OAuth (localStorage marker)
    const oauthStartedAt = localStorage.getItem('gmail_oauth_started_at');
    if (oauthStartedAt) {
      setOauthStarted(true);
      // Clear the marker after 5 minutes
      const startTime = parseInt(oauthStartedAt, 10);
      if (Date.now() - startTime > 5 * 60 * 1000) {
        localStorage.removeItem('gmail_oauth_started_at');
        setOauthStarted(false);
      }
    }

    const clearOauthParams = () => {
      // IMPORTANT: keep unrelated params (e.g. __lovable_token) or the preview session can break
      const next = new URLSearchParams(searchParams);
      ['connected', 'email', 'oauth_error', 'error_message', 'error_suggestion', 'error_description'].forEach(
        (k) => next.delete(k)
      );
      setSearchParams(next, { replace: true });
    };

    if (connected === 'true' && email) {
      setConfig((prev) => ({ ...prev, connected: true, email: decodeURIComponent(email) }));
      toast.success('Connexion Gmail réussie');
      clearOauthParams();
      // Clear OAuth marker
      localStorage.removeItem('gmail_oauth_started_at');
      setOauthStarted(false);
    } else if (oauthErrorParam) {
      // Handle OAuth error from redirect
      setOauthError({
        error: oauthErrorParam,
        message: errorMessage ? decodeURIComponent(errorMessage) : 'Erreur lors de la connexion Gmail',
        suggestion: errorSuggestion ? decodeURIComponent(errorSuggestion) : '',
        description: errorDescription ? decodeURIComponent(errorDescription) : undefined,
      });
      toast.error(errorMessage ? decodeURIComponent(errorMessage) : 'Erreur lors de la connexion Gmail');
      // Clear only OAuth params but keep error state for display
      clearOauthParams();
    }
  }, [searchParams, setSearchParams]);

  // Load config from database on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async (): Promise<boolean | null> => {
    try {
      // Ensure we have a fresh session before making the call
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        console.log('No valid session, skipping config load');
        return null;
      }

      // Refresh session if needed
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.log('Session refresh failed, user may need to re-login');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { action: 'get-config' },
      });
      if (error) throw error;

      if (data?.config) {
        setConfigId(data.config.id);
        setConfig({
          connected: data.connected,
          email: data.config.user_email,
          lastSync: data.config.last_sync,
          syncEnabled: data.config.sync_enabled || false,
          domains: data.config.domains?.length ? data.config.domains : INSTITUTIONAL_DOMAINS,
          keywords: data.config.keywords?.length ? data.config.keywords : SYNC_KEYWORDS,
        });
      }

      return typeof data?.connected === 'boolean' ? data.connected : null;
    } catch (error) {
      console.error('Failed to load config:', error);
      return null;
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);

    try {
      // Force session refresh to get a fresh JWT with valid claims
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.error('Session refresh failed:', refreshError);
        toast.error('Session expirée. Veuillez vous reconnecter.');
        // Redirect to auth to re-login
        window.location.href = '/auth?from=/gmail-config';
        return;
      }

      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { action: 'get-auth-url' },
      });
      
      if (error) {
        console.error('gmail-oauth error:', error);
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          window.location.href = '/auth?from=/gmail-config';
          return;
        }
        throw error;
      }

      if (!data?.url) {
        throw new Error("URL d'autorisation manquante");
      }

      // Store the URL for "Copy link" feature and mark OAuth as started
      setGoogleAuthUrl(data.url);
      localStorage.setItem('gmail_oauth_started_at', Date.now().toString());
      setOauthStarted(true);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = data.url;
        return;
      }

      const width = 600,
        height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.url,
        'Gmail Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        toast.error('Popup bloquée : ouverture dans un nouvel onglet');
        window.location.href = data.url;
        return;
      }

      let done = false;
      let intervalId: number | null = null;

      const cleanup = () => {
        if (intervalId) window.clearInterval(intervalId);
        intervalId = null;
        window.removeEventListener('message', handleMessage);
      };

      const finalizeSuccess = async () => {
        const connected = await loadConfig();
        if (connected) {
          done = true;
          try {
            popup.close();
          } catch {
            // ignore
          }
          cleanup();
          toast.success('Connexion Gmail réussie');
        }
      };

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type !== 'gmail-oauth-callback') return;

        if (event.data.success) {
          await finalizeSuccess();
        } else {
          done = true;
          cleanup();
          toast.error('Échec de la connexion Gmail');
        }
      };

      window.addEventListener('message', handleMessage);

      const startedAt = Date.now();
      intervalId = window.setInterval(async () => {
        if (done) return;

        // User closed the window
        if (popup.closed) {
          cleanup();
          return;
        }

        // Safety timeout (avoids infinite wait if postMessage is blocked)
        if (Date.now() - startedAt > 60_000) {
          cleanup();
          toast.error('Connexion Gmail trop longue : réessayez');
          return;
        }

        await finalizeSuccess();
      }, 1500);
    } catch (error) {
      console.error('Gmail auth error:', error);
      toast.error('Erreur lors de la connexion Gmail');
    } finally {
      setLoading(false);
    }
  };

  // Reload Gmail connection status
  const handleReloadStatus = async () => {
    setLoading(true);
    try {
      const connected = await loadConfig();
      if (connected) {
        toast.success('Gmail connecté !');
        localStorage.removeItem('gmail_oauth_started_at');
        setOauthStarted(false);
      } else {
        toast.info('Gmail non connecté. Vérifiez les logs backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Copy Google auth URL to clipboard
  const handleCopyGoogleLink = async () => {
    if (googleAuthUrl) {
      await navigator.clipboard.writeText(googleAuthUrl);
      toast.success('Lien Google copié !');
    } else {
      // Generate a new URL if we don't have one
      try {
        const { data, error } = await supabase.functions.invoke('gmail-oauth', {
          body: { action: 'get-auth-url' },
        });
        if (!error && data?.url) {
          setGoogleAuthUrl(data.url);
          await navigator.clipboard.writeText(data.url);
          toast.success('Lien Google copié !');
        }
      } catch {
        toast.error('Erreur lors de la génération du lien');
      }
    }
  };

  // Plan B: Use Google Sign-In with Gmail scopes (already implemented in useAuth)
  const handlePlanBGoogleSignIn = async () => {
    setPlanBLoading(true);
    try {
      toast.info('Connexion via Google Sign-In...');
      await signInWithGoogle();
      // After sign-in, the AuthCallback will store tokens via store-oauth-tokens
      // We need to wait and then reload config
      setTimeout(async () => {
        const connected = await loadConfig();
        if (connected) {
          toast.success('Gmail connecté via Google Sign-In !');
          localStorage.removeItem('gmail_oauth_started_at');
          setOauthStarted(false);
        }
        setPlanBLoading(false);
      }, 3000);
    } catch (error) {
      console.error('Plan B Google Sign-In error:', error);
      toast.error('Erreur lors de la connexion Google');
      setPlanBLoading(false);
    }
  };

  const pollSyncStatus = useCallback(async (syncId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-status', {
        body: { syncId }
      });
      
      if (error) throw error;
      
      if (data) {
        setSyncStatus(data);
        
        if (data.status === 'completed') {
          setSyncing(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setConfig(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          
          // Build completion message
          const stats = data.stats || {};
          let message = `${data.new_emails} nouveaux emails synchronisés`;
          if (stats.emails_analyzed) {
            message += `, ${stats.emails_analyzed} analysés par l'IA`;
          }
          if (stats.incidents_created) {
            message += `, ${stats.incidents_created} incidents créés`;
          }
          toast.success(message);
          
          // Clear status after delay
          setTimeout(() => setSyncStatus(null), 15000);
        } else if (data.status === 'error') {
          setSyncing(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          toast.error(`Erreur: ${data.error_message || 'Erreur inconnue'}`);
        }
        // Keep polling for 'processing' and 'analyzing' statuses
      }
    } catch (error) {
      console.error('Failed to poll sync status:', error);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    
    try {
      const afterDate = syncFromDate ? format(syncFromDate, 'yyyy/MM/dd') : null;
      
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        body: { 
          domains: config.domains, 
          keywords: config.keywords,
          afterDate
        }
      });
      
      if (error) throw error;
      
      if (data?.status === 'processing' && data?.syncId) {
        // Start polling
        setSyncStatus({
          id: data.syncId,
          status: 'processing',
          total_emails: data.totalEmails,
          processed_emails: 0,
          new_emails: 0,
          stats: { received: 0, sent: 0, replied: 0, forwarded: 0 },
          progress: 0
        });
        
        toast.info(`Traitement de ${data.totalEmails} emails en arrière-plan...`);
        
        // Poll every 2 seconds
        pollingRef.current = setInterval(() => {
          pollSyncStatus(data.syncId);
        }, 2000);
        
      } else if (data?.status === 'completed') {
        // No emails to process
        setSyncing(false);
        toast.success('Aucun email à synchroniser');
      }
      
    } catch (error) {
      console.error('Gmail sync error:', error);
      toast.error('Erreur lors de la synchronisation');
      setSyncing(false);
    }
  };

  const handleTestFilters = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const afterDate = syncFromDate ? format(syncFromDate, 'yyyy/MM/dd') : null;
      
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        body: { 
          domains: config.domains, 
          keywords: config.keywords,
          afterDate,
          countOnly: true
        }
      });
      
      if (error) throw error;
      
      if (data?.status === 'count_complete') {
        setTestResult({ count: data.count, query: data.query });
        if (data.count === 0) {
          toast.info('Aucun email ne correspond à vos filtres');
        } else {
          toast.success(`${data.count} emails correspondent à vos filtres`);
        }
      }
      
    } catch (error) {
      console.error('Filter test error:', error);
      toast.error('Erreur lors du test des filtres');
    } finally {
      setTesting(false);
    }
  };

  const addDomain = async () => {
    if (newDomain && !config.domains.includes(newDomain)) {
      const newDomains = [...config.domains, newDomain];
      setConfig(prev => ({ ...prev, domains: newDomains }));
      setNewDomain('');
      await saveConfigToDb(newDomains, config.keywords, config.syncEnabled);
      toast.success('Domaine ajouté et sauvegardé');
    }
  };

  const removeDomain = async (domain: string) => {
    const newDomains = config.domains.filter(d => d !== domain);
    setConfig(prev => ({ ...prev, domains: newDomains }));
    await saveConfigToDb(newDomains, config.keywords, config.syncEnabled);
  };

  const addKeyword = async () => {
    if (newKeyword && !config.keywords.includes(newKeyword)) {
      const newKeywords = [...config.keywords, newKeyword];
      setConfig(prev => ({ ...prev, keywords: newKeywords }));
      setNewKeyword('');
      await saveConfigToDb(config.domains, newKeywords, config.syncEnabled);
      toast.success('Mot-clé ajouté et sauvegardé');
    }
  };

  const removeKeyword = async (keyword: string) => {
    const newKeywords = config.keywords.filter(k => k !== keyword);
    setConfig(prev => ({ ...prev, keywords: newKeywords }));
    await saveConfigToDb(config.domains, newKeywords, config.syncEnabled);
  };

  const handleSyncEnabledChange = async (checked: boolean) => {
    setConfig(prev => ({ ...prev, syncEnabled: checked }));
    await saveConfigToDb(config.domains, config.keywords, checked);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row mesh-bg">
      <AppSidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Configuration Gmail</h1>
            <p className="text-muted-foreground mt-1">
              Connectez votre compte Gmail pour analyser automatiquement les emails
            </p>
          </div>

          {/* OAuth Error Alert */}
          {oauthError && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="font-semibold">{oauthError.message}</AlertTitle>
              <AlertDescription className="space-y-3">
                {oauthError.suggestion && (
                  <p className="text-sm">{oauthError.suggestion}</p>
                )}
                {oauthError.error === 'access_denied' && (
                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium">Pour corriger cette erreur :</p>
                    <ol className="text-sm list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Ouvrez <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console → Écran de consentement</a></li>
                      <li>Si le statut est "En test", cliquez sur "Ajouter des utilisateurs"</li>
                      <li>Ajoutez votre email : <code className="bg-background/50 px-1 py-0.5 rounded text-xs">Teba.gaetan@gmail.com</code></li>
                      <li>Enregistrez et réessayez "Connecter Gmail"</li>
                    </ol>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setOauthError(null)}
                  >
                    Fermer
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText('Teba.gaetan@gmail.com');
                      toast.success('Email copié !');
                    }}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copier l'email
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* OAuth Return Detection - Show when user is returning from Google */}
          {oauthStarted && !config.connected && (
            <Alert className="border-primary/50 bg-primary/10">
              <RotateCcw className="h-5 w-5 text-primary" />
              <AlertTitle className="font-semibold text-primary">Retour de Google détecté</AlertTitle>
              <AlertDescription className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Vous semblez revenir de la page d'authentification Google. 
                  Si vous avez autorisé l'accès, cliquez sur "Recharger l'état".
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={handleReloadStatus}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    Recharger l'état Gmail
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Relancer la connexion
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleCopyGoogleLink}
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Copier le lien Google
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem('gmail_oauth_started_at');
                      setOauthStarted(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Fermer
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Sync Progress Card */}
          {syncStatus && (
            <Card className={cn(
              "glass-card border-2 transition-all",
              (syncStatus.status === 'processing' || syncStatus.status === 'analyzing') && "border-primary/50",
              syncStatus.status === 'completed' && "border-green-500/50",
              syncStatus.status === 'error' && "border-destructive/50"
            )}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(syncStatus.status === 'processing' || syncStatus.status === 'analyzing') && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                      {syncStatus.status === 'completed' && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {syncStatus.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium">
                          {syncStatus.status === 'processing' && 'Synchronisation en cours...'}
                          {syncStatus.status === 'analyzing' && '🤖 Analyse IA en cours...'}
                          {syncStatus.status === 'completed' && 'Synchronisation terminée'}
                          {syncStatus.status === 'error' && 'Erreur de synchronisation'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {syncStatus.status === 'processing' && (
                            <>
                              {syncStatus.processed_emails} / {syncStatus.total_emails} emails traités
                              {syncStatus.new_emails > 0 && ` (${syncStatus.new_emails} nouveaux)`}
                            </>
                          )}
                          {syncStatus.status === 'analyzing' && (
                            <>
                              Analyse des {syncStatus.new_emails} nouveaux emails avec l'IA...
                            </>
                          )}
                          {syncStatus.status === 'completed' && syncStatus.stats?.analysis_completed && (
                            <>
                              {syncStatus.stats.emails_analyzed || 0} emails analysés
                              {(syncStatus.stats.incidents_created || 0) > 0 && (
                                <span className="text-orange-500 font-medium">
                                  {' '}• {syncStatus.stats.incidents_created} incidents créés
                                </span>
                              )}
                            </>
                          )}
                          {syncStatus.status === 'completed' && !syncStatus.stats?.analysis_completed && (
                            <>
                              {syncStatus.processed_emails} emails synchronisés
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {syncStatus.status === 'analyzing' ? '🔍' : `${syncStatus.progress}%`}
                    </span>
                  </div>
                  
                  <Progress 
                    value={syncStatus.status === 'analyzing' ? 100 : syncStatus.progress} 
                    className={cn("h-3", syncStatus.status === 'analyzing' && "animate-pulse")} 
                  />
                  
                  {syncStatus.stats && (syncStatus.stats.received > 0 || syncStatus.stats.sent > 0) && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                        📥 {syncStatus.stats.received} reçus
                      </Badge>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        📤 {syncStatus.stats.sent} envoyés
                      </Badge>
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                        ↩️ {syncStatus.stats.replied} réponses
                      </Badge>
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                        ↪️ {syncStatus.stats.forwarded} transférés
                      </Badge>
                      {syncStatus.stats.incidents_created !== undefined && syncStatus.stats.incidents_created > 0 && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                          🚨 {syncStatus.stats.incidents_created} incidents
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* API Filtering Statistics */}
                  {syncStatus.stats && syncStatus.stats.api_emails_found !== undefined && (
                    <div className="pt-3 border-t border-border/50 mt-2">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">📊 Statistiques de filtrage API</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 border-cyan-500/20">
                          🔍 {syncStatus.stats.api_emails_found} trouvés par Gmail
                        </Badge>
                        {syncStatus.stats.filters_applied_at_api && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            ✅ Filtres API actifs
                          </Badge>
                        )}
                        {syncStatus.stats.domains_count !== undefined && syncStatus.stats.domains_count > 0 && (
                          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                            🏢 {syncStatus.stats.domains_count} domaines
                          </Badge>
                        )}
                        {syncStatus.stats.keywords_count !== undefined && syncStatus.stats.keywords_count > 0 && (
                          <Badge variant="outline" className="bg-pink-500/10 text-pink-600 border-pink-500/20">
                            🔑 {syncStatus.stats.keywords_count} mots-clés
                          </Badge>
                        )}
                        {(syncStatus.stats.skippedByFilter || 0) > 0 && (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                            🚫 {syncStatus.stats.skippedByFilter} filtrés localement
                          </Badge>
                        )}
                        {(syncStatus.stats.skippedByBlacklist || 0) > 0 && (
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                            ⛔ {syncStatus.stats.skippedByBlacklist} blacklistés
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Connexion Google
              </CardTitle>
              <CardDescription>Authentifiez-vous avec votre compte Gmail</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full flex-shrink-0 ${config.connected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                    {config.connected ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{config.connected ? 'Connecté' : 'Non connecté'}</p>
                    {config.email && <p className="text-sm text-muted-foreground truncate">{config.email}</p>}
                  </div>
                </div>
                <Button onClick={handleGoogleAuth} disabled={loading} variant={config.connected ? 'outline' : 'default'} className="w-full sm:w-auto flex-shrink-0">
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  {config.connected ? 'Reconnecter' : 'Connecter Gmail'}
                </Button>
              </div>
              
              {/* Plan B: Google Sign-In with Gmail scopes (alternative method) */}
              {!config.connected && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">🔑 Plan B : Connexion via Google Sign-In</p>
                      <p className="text-xs text-muted-foreground">
                        Si le bouton ci-dessus ne fonctionne pas, utilisez cette méthode alternative.
                      </p>
                    </div>
                    <Button 
                      onClick={handlePlanBGoogleSignIn} 
                      disabled={planBLoading}
                      variant="outline"
                      className="w-full sm:w-auto flex-shrink-0 border-primary/50 hover:bg-primary/10"
                    >
                      {planBLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                      Connexion Google Sign-In
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">Accès en lecture seule. Les tokens sont stockés de manière sécurisée.</p>
              </div>
              
              {/* Diagnostic Panel */}
              <div className="pt-2">
                <GmailDiagnosticPanel />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Paramètres de synchronisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Synchronisation automatique</Label>
                  <p className="text-sm text-muted-foreground">Récupérer automatiquement les nouveaux emails</p>
                </div>
                <Switch checked={config.syncEnabled} onCheckedChange={handleSyncEnabledChange} />
              </div>
              <Separator />
              {/* Filter Presets - Multi-select */}
              <div className="space-y-3">
                <Label className="text-base">Filtres prédéfinis</Label>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez plusieurs filtres adaptés à votre cas d'usage (les domaines et mots-clés s'ajoutent)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {FILTER_PRESETS.map((preset) => {
                    // Check if this preset is "active" (all its domains AND keywords are in the config)
                    const hasAllDomains = preset.domains.every(d => config.domains.includes(d));
                    const hasAllKeywords = preset.keywords.every(k => config.keywords.includes(k));
                    const isActive = hasAllDomains && hasAllKeywords;
                    const isPartial = (preset.domains.some(d => config.domains.includes(d)) || 
                                       preset.keywords.some(k => config.keywords.includes(k))) && !isActive;
                    
                    return (
                      <Button
                        key={preset.id}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "flex flex-col items-center gap-1 h-auto py-3 transition-all relative",
                          isActive && "bg-primary text-primary-foreground",
                          isPartial && "border-primary/50 bg-primary/10",
                          !isActive && !isPartial && "hover:bg-primary/10 hover:border-primary/50"
                        )}
                        onClick={async () => {
                          if (isActive) {
                            // Remove this preset's filters
                            const newDomains = config.domains.filter(d => !preset.domains.includes(d));
                            const newKeywords = config.keywords.filter(k => !preset.keywords.includes(k));
                            setConfig(prev => ({ ...prev, domains: newDomains, keywords: newKeywords }));
                            await saveConfigToDb(newDomains, newKeywords, config.syncEnabled);
                            toast.success(`Filtres "${preset.name}" retirés`);
                          } else {
                            // Add this preset's filters
                            const newDomains = [...new Set([...config.domains, ...preset.domains])];
                            const newKeywords = [...new Set([...config.keywords, ...preset.keywords])];
                            setConfig(prev => ({ ...prev, domains: newDomains, keywords: newKeywords }));
                            await saveConfigToDb(newDomains, newKeywords, config.syncEnabled);
                            toast.success(`Filtres "${preset.name}" ajoutés`);
                          }
                        }}
                      >
                        {isActive && (
                          <div className="absolute top-1 right-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        <span className="text-xl">{preset.icon}</span>
                        <span className="text-xs font-medium">{preset.name}</span>
                        {isPartial && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 mt-1">
                            Partiel
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
                
                {/* Show active presets count */}
                {FILTER_PRESETS.filter(p => 
                  p.domains.every(d => config.domains.includes(d)) && 
                  p.keywords.every(k => config.keywords.includes(k))
                ).length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    <span>
                      {FILTER_PRESETS.filter(p => 
                        p.domains.every(d => config.domains.includes(d)) && 
                        p.keywords.every(k => config.keywords.includes(k))
                      ).length} filtre(s) actif(s)
                    </span>
                  </div>
                )}
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="preset-details" className="border-none">
                    <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-2">
                      Voir le détail des filtres prédéfinis
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {FILTER_PRESETS.map((preset) => {
                          const hasAllDomains = preset.domains.every(d => config.domains.includes(d));
                          const hasAllKeywords = preset.keywords.every(k => config.keywords.includes(k));
                          const isActive = hasAllDomains && hasAllKeywords;
                          
                          return (
                            <div 
                              key={preset.id} 
                              className={cn(
                                "p-3 rounded-lg space-y-2 border",
                                isActive ? "bg-primary/10 border-primary/30" : "bg-muted/50 border-transparent"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{preset.icon}</span>
                                  <span className="font-medium text-sm">{preset.name}</span>
                                </div>
                                {isActive && <Check className="h-4 w-4 text-primary" />}
                              </div>
                              <p className="text-xs text-muted-foreground">{preset.description}</p>
                              <div className="space-y-1">
                                <p className="text-xs">
                                  <span className="font-medium">Domaines:</span>{' '}
                                  <span className="text-muted-foreground">{preset.domains.slice(0, 4).join(', ')}{preset.domains.length > 4 ? ` +${preset.domains.length - 4}` : ''}</span>
                                </p>
                                <p className="text-xs">
                                  <span className="font-medium">Mots-clés:</span>{' '}
                                  <span className="text-muted-foreground">{preset.keywords.slice(0, 4).join(', ')}{preset.keywords.length > 4 ? ` +${preset.keywords.length - 4}` : ''}</span>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="text-base">Domaines institutionnels</Label>
                <div className="flex flex-wrap gap-2">
                  {config.domains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="flex items-center gap-1">
                      @{domain}
                      <button onClick={() => removeDomain(domain)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 w-full">
                  <Input placeholder="exemple.ch" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addDomain()} className="flex-1 sm:max-w-xs" />
                  <Button onClick={addDomain} size="icon" variant="outline" className="flex-shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="text-base">Mots-clés de détection</Label>
                <div className="flex flex-wrap gap-2">
                  {config.keywords.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="flex items-center gap-1">
                      {keyword}
                      <button onClick={() => removeKeyword(keyword)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 w-full">
                  <Input placeholder="mot-clé" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addKeyword()} className="flex-1 sm:max-w-xs" />
                  <Button onClick={addKeyword} size="icon" variant="outline" className="flex-shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Synchronisation manuelle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base">Synchroniser depuis</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full md:w-[280px] justify-start text-left font-normal",
                        !syncFromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {syncFromDate ? format(syncFromDate, "dd MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setCalendarMonth(prev => setYear(prev, prev.getFullYear() - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex gap-2">
                          <Select
                            value={calendarMonth.getMonth().toString()}
                            onValueChange={(value) => setCalendarMonth(prev => setMonth(prev, parseInt(value)))}
                          >
                            <SelectTrigger className="w-[110px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((month, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                  {month}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={calendarMonth.getFullYear().toString()}
                            onValueChange={(value) => setCalendarMonth(prev => setYear(prev, parseInt(value)))}
                          >
                            <SelectTrigger className="w-[80px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {YEARS.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setCalendarMonth(prev => setYear(prev, prev.getFullYear() + 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Calendar
                      mode="single"
                      selected={syncFromDate}
                      onSelect={setSyncFromDate}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      initialFocus
                      className={cn("p-3 pt-0 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-muted-foreground">
                  Les emails reçus après cette date seront synchronisés
                </p>
              </div>
              <Separator />
              
              {/* Filter Summary Before Sync */}
              <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="font-medium text-sm">Résumé des filtres actifs</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Domaines:</span>
                    <Badge variant={config.domains.length > 0 ? "default" : "destructive"} className="text-xs">
                      {config.domains.length > 0 ? `${config.domains.length} configurés` : "Aucun ⚠️"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Mots-clés:</span>
                    <Badge variant={config.keywords.length > 0 ? "default" : "secondary"} className="text-xs">
                      {config.keywords.length > 0 ? `${config.keywords.length} configurés` : "Aucun"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Depuis:</span>
                    <Badge variant="outline" className="text-xs">
                      {syncFromDate ? format(syncFromDate, "dd/MM/yyyy", { locale: fr }) : "Toujours"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Estimation:</span>
                    {testResult ? (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        ✅ {testResult.count} emails trouvés
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600 border-cyan-500/20">
                        {config.domains.length > 0 || config.keywords.length > 0 
                          ? "~100-500 emails" 
                          : "⚠️ Tous les emails"}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Test Filters Button */}
                <div className="flex items-center gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleTestFilters}
                    disabled={testing || !config.connected}
                    className="text-xs"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Test en cours...
                      </>
                    ) : (
                      <>
                        🔍 Tester les filtres
                      </>
                    )}
                  </Button>
                  {testResult && (
                    <span className="text-xs text-muted-foreground">
                      Requête: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{testResult.query.substring(0, 50)}...</code>
                    </span>
                  )}
                </div>
                
                {config.domains.length === 0 && config.keywords.length === 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs">
                      <strong>Attention:</strong> Sans filtres, tous vos emails seront téléchargés. 
                      Cela peut prendre beaucoup de temps et de ressources. 
                      Configurez des domaines et/ou mots-clés pour cibler les emails pertinents.
                    </p>
                  </div>
                )}
                
                {(config.domains.length > 0 || config.keywords.length > 0) && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs">
                      <strong>Filtres API actifs:</strong> Seuls les emails correspondant à vos critères seront téléchargés depuis Gmail.
                      {config.domains.length > 0 && ` Domaines: ${config.domains.slice(0, 3).join(', ')}${config.domains.length > 3 ? '...' : ''}.`}
                      {config.keywords.length > 0 && ` Mots-clés: ${config.keywords.slice(0, 3).join(', ')}${config.keywords.length > 3 ? '...' : ''}.`}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-medium">Dernière synchronisation</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {config.lastSync ? new Date(config.lastSync).toLocaleString('fr-CH') : 'Jamais'}
                  </p>
                </div>
                <Button 
                  onClick={handleSync} 
                  disabled={syncing || !config.connected} 
                  className="glow-button w-full sm:w-auto"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      En cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Synchroniser
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
