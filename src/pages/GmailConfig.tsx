import { useState, useEffect, useCallback } from 'react';
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
import { AppSidebar } from '@/components/layout/AppSidebar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, Settings, Check, X, RefreshCw, Plus, 
  ExternalLink, Shield, Clock, CalendarIcon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { INSTITUTIONAL_DOMAINS, SYNC_KEYWORDS } from '@/config/appConfig';
import { format, setMonth, setYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface GmailConfig {
  connected: boolean;
  email?: string;
  lastSync?: string;
  syncEnabled: boolean;
  domains: string[];
  keywords: string[];
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i);

export default function GmailConfig() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [config, setConfig] = useState<GmailConfig>({
    connected: false,
    syncEnabled: false,
    domains: INSTITUTIONAL_DOMAINS,
    keywords: SYNC_KEYWORDS
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [syncFromDate, setSyncFromDate] = useState<Date | undefined>(new Date('2024-01-01'));
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [configId, setConfigId] = useState<string | null>(null);

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

  // Handle OAuth callback from mobile redirect
  useEffect(() => {
    const connected = searchParams.get('connected');
    const email = searchParams.get('email');
    
    if (connected === 'true' && email) {
      setConfig(prev => ({ ...prev, connected: true, email: decodeURIComponent(email) }));
      toast.success('Connexion Gmail réussie');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Load config from database on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { action: 'get-config' }
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
          keywords: data.config.keywords?.length ? data.config.keywords : SYNC_KEYWORDS
        });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { action: 'get-auth-url' }
      });
      if (error) throw error;
      
      if (data?.url) {
        // Detect mobile devices
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
          // On mobile, use direct redirect (popups are often blocked)
          window.location.href = data.url;
        } else {
          // On desktop, use popup
          const width = 600, height = 700;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          
          const popup = window.open(data.url, 'Gmail Authorization', 
            `width=${width},height=${height},left=${left},top=${top}`);

          const handleMessage = async (event: MessageEvent) => {
            if (event.data.type === 'gmail-oauth-callback') {
              popup?.close();
              window.removeEventListener('message', handleMessage);
              if (event.data.success) {
                setConfig(prev => ({ ...prev, connected: true, email: event.data.email }));
                toast.success('Connexion Gmail réussie');
              } else {
                toast.error('Échec de la connexion Gmail');
              }
            }
          };
          window.addEventListener('message', handleMessage);
        }
      }
    } catch (error) {
      console.error('Gmail auth error:', error);
      toast.error('Erreur lors de la connexion Gmail');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Format date for Gmail query (YYYY/MM/DD)
      const afterDate = syncFromDate ? format(syncFromDate, 'yyyy/MM/dd') : null;
      
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        body: { 
          domains: config.domains, 
          keywords: config.keywords,
          afterDate,
          maxResults: 100
        }
      });
      if (error) throw error;
      toast.success(`${data?.emailsProcessed || 0} emails synchronisés`);
      setConfig(prev => ({ ...prev, lastSync: new Date().toISOString() }));
    } catch (error) {
      console.error('Gmail sync error:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
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
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">Accès en lecture seule. Les tokens sont stockés de manière sécurisée.</p>
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
                      {/* Year/Month selector */}
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-medium">Dernière synchronisation</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {config.lastSync ? new Date(config.lastSync).toLocaleString('fr-CH') : 'Jamais'}
                  </p>
                </div>
                <Button onClick={handleSync} disabled={syncing || !config.connected} className="glow-button w-full sm:w-auto">
                  {syncing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Synchroniser
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
