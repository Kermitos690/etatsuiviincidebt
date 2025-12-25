import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  Settings, 
  Check, 
  X, 
  RefreshCw, 
  Plus, 
  Trash2,
  ExternalLink,
  Shield,
  Clock
} from 'lucide-react';
import { INSTITUTIONAL_DOMAINS, SYNC_KEYWORDS } from '@/config/appConfig';

interface GmailConfig {
  connected: boolean;
  email?: string;
  lastSync?: string;
  syncEnabled: boolean;
  domains: string[];
  keywords: string[];
}

export default function GmailConfig() {
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

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { action: 'get-auth-url' }
      });

      if (error) throw error;
      
      if (data?.url) {
        // Open Google OAuth in a popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url,
          'Gmail Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for the callback
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
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        body: { 
          domains: config.domains,
          keywords: config.keywords 
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

  const addDomain = () => {
    if (newDomain && !config.domains.includes(newDomain)) {
      setConfig(prev => ({ ...prev, domains: [...prev.domains, newDomain] }));
      setNewDomain('');
      toast.success('Domaine ajouté');
    }
  };

  const removeDomain = (domain: string) => {
    setConfig(prev => ({ ...prev, domains: prev.domains.filter(d => d !== domain) }));
  };

  const addKeyword = () => {
    if (newKeyword && !config.keywords.includes(newKeyword)) {
      setConfig(prev => ({ ...prev, keywords: [...prev.keywords, newKeyword] }));
      setNewKeyword('');
      toast.success('Mot-clé ajouté');
    }
  };

  const removeKeyword = (keyword: string) => {
    setConfig(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== keyword) }));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row mesh-bg">
      <AppSidebar />
      
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Configuration Gmail</h1>
              <p className="text-muted-foreground mt-1">
                Connectez votre compte Gmail pour analyser automatiquement les emails institutionnels
              </p>
            </div>
          </div>

          {/* Connection Status */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Connexion Google
              </CardTitle>
              <CardDescription>
                Authentifiez-vous avec votre compte Gmail (lecture seule)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${config.connected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                    {config.connected ? (
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {config.connected ? 'Connecté' : 'Non connecté'}
                    </p>
                    {config.email && (
                      <p className="text-sm text-muted-foreground">{config.email}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  variant={config.connected ? 'outline' : 'default'}
                  className={!config.connected ? 'glow-button' : ''}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  {config.connected ? 'Reconnecter' : 'Connecter Gmail'}
                </Button>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">
                  Accès en lecture seule. Aucun email ne sera envoyé automatiquement.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sync Settings */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Paramètres de synchronisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sync Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Synchronisation automatique</Label>
                  <p className="text-sm text-muted-foreground">
                    Récupérer automatiquement les nouveaux emails toutes les heures
                  </p>
                </div>
                <Switch
                  checked={config.syncEnabled}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, syncEnabled: checked }))
                  }
                />
              </div>

              <Separator />

              {/* Domains Filter */}
              <div className="space-y-3">
                <Label className="text-base">Domaines institutionnels</Label>
                <p className="text-sm text-muted-foreground">
                  Emails provenant de ces domaines seront analysés
                </p>
                <div className="flex flex-wrap gap-2">
                  {config.domains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="flex items-center gap-1">
                      @{domain}
                      <button onClick={() => removeDomain(domain)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="exemple.ch"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addDomain()}
                    className="max-w-xs"
                  />
                  <Button onClick={addDomain} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Keywords Filter */}
              <div className="space-y-3">
                <Label className="text-base">Mots-clés de détection</Label>
                <p className="text-sm text-muted-foreground">
                  Emails contenant ces mots-clés seront priorisés
                </p>
                <div className="flex flex-wrap gap-2">
                  {config.keywords.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="flex items-center gap-1">
                      {keyword}
                      <button onClick={() => removeKeyword(keyword)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="mot-clé"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                    className="max-w-xs"
                  />
                  <Button onClick={addKeyword} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Sync */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Synchronisation manuelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Dernière synchronisation</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {config.lastSync 
                      ? new Date(config.lastSync).toLocaleString('fr-CH')
                      : 'Jamais'
                    }
                  </p>
                </div>
                <Button
                  onClick={handleSync}
                  disabled={syncing || !config.connected}
                  className="glow-button"
                >
                  {syncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Synchroniser maintenant
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
