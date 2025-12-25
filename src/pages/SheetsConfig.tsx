import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, Check, X, RefreshCw, ExternalLink,
  Link2, Clock, ArrowUpDown, AlertCircle, Info
} from 'lucide-react';

interface SheetsConfig {
  connected: boolean;
  spreadsheetId: string;
  sheetName: string;
  syncEnabled: boolean;
  lastSync?: string;
  columnMapping: Record<string, string>;
}

const defaultColumnMapping = {
  numero: 'A', date_incident: 'B', institution: 'C', type: 'D',
  titre: 'E', gravite: 'F', statut: 'G', score: 'H',
  confidence: 'I', faits: 'J', dysfonctionnement: 'K'
};

export default function SheetsConfig() {
  const [config, setConfig] = useState<SheetsConfig>({
    connected: false,
    spreadsheetId: '',
    sheetName: 'Incidents',
    syncEnabled: false,
    columnMapping: defaultColumnMapping
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sheets-sync', {
        body: { action: 'get-config' }
      });
      if (error) throw error;
      if (data?.config) {
        setConfig({
          connected: data.connected,
          spreadsheetId: data.config.spreadsheet_id || '',
          sheetName: data.config.sheet_name || 'Incidents',
          syncEnabled: data.config.sync_enabled || false,
          lastSync: data.config.last_sync,
          columnMapping: data.config.column_mapping || defaultColumnMapping
        });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!config.spreadsheetId) {
      toast.error('Veuillez entrer l\'ID du Google Sheet');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sheets-sync', {
        body: { 
          action: 'connect',
          spreadsheetId: config.spreadsheetId,
          sheetName: config.sheetName
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        setConfig(prev => ({ ...prev, connected: true }));
        toast.success(`Connecté à "${data.title || 'Google Sheet'}"`);
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Sheets connection error:', error);
      toast.error('Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sheets-sync', {
        body: { 
          action: 'sync',
          spreadsheetId: config.spreadsheetId,
          sheetName: config.sheetName,
          columnMapping: config.columnMapping
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`${data?.rowsUpdated || 0} incidents synchronisés`);
        setConfig(prev => ({ ...prev, lastSync: new Date().toISOString() }));
      }
    } catch (error) {
      console.error('Sheets sync error:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const saveConfig = async () => {
    try {
      const { error } = await supabase.functions.invoke('sheets-sync', {
        body: { 
          action: 'save-config',
          spreadsheetId: config.spreadsheetId,
          sheetName: config.sheetName,
          columnMapping: config.columnMapping
        }
      });
      if (error) throw error;
      toast.success('Configuration sauvegardée');
    } catch (error) {
      console.error('Save config error:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const updateColumnMapping = (key: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      columnMapping: { ...prev.columnMapping, [key]: value.toUpperCase() }
    }));
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row mesh-bg">
        <AppSidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row mesh-bg">
      <AppSidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Configuration Google Sheets</h1>
            <p className="text-muted-foreground mt-1">
              Synchronisez vos incidents avec un Google Sheet comme registre officiel
            </p>
          </div>

          {/* Service Account Info */}
          <Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <strong>Configuration requise :</strong> Un Service Account Google est nécessaire. 
              Ajoutez le secret <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">GOOGLE_SHEETS_SERVICE_ACCOUNT</code> avec 
              le JSON du compte de service, puis partagez le Sheet avec l'email du service account.
            </AlertDescription>
          </Alert>

          {/* Connection Settings */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Connexion au Google Sheet
              </CardTitle>
              <CardDescription>
                Entrez l'ID de votre Google Sheet (visible dans l'URL)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ID du Spreadsheet</Label>
                <Input
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={config.spreadsheetId}
                  onChange={(e) => setConfig(prev => ({ ...prev, spreadsheetId: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  L'ID se trouve dans l'URL : docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
                </p>
              </div>

              <div className="space-y-2">
                <Label>Nom de la feuille</Label>
                <Input
                  placeholder="Incidents"
                  value={config.sheetName}
                  onChange={(e) => setConfig(prev => ({ ...prev, sheetName: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${config.connected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                    {config.connected ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium">{config.connected ? 'Connecté' : 'Non connecté'}</p>
                    {config.connected && <p className="text-sm text-muted-foreground">Feuille : {config.sheetName}</p>}
                  </div>
                </div>
                <Button onClick={handleConnect} disabled={loading || !config.spreadsheetId} variant={config.connected ? 'outline' : 'default'}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  {config.connected ? 'Reconnecter' : 'Connecter'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Column Mapping */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5 text-primary" />
                Mapping des colonnes
              </CardTitle>
              <CardDescription>
                Configurez les colonnes du Sheet correspondant à chaque champ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(config.columnMapping).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-sm capitalize">{key.replace(/_/g, ' ')}</Label>
                    <Input
                      value={value}
                      onChange={(e) => updateColumnMapping(key, e.target.value)}
                      className="w-16 uppercase text-center"
                      maxLength={2}
                    />
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={saveConfig} className="mt-4">
                Sauvegarder le mapping
              </Button>
            </CardContent>
          </Card>

          {/* Sync Settings */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-primary" />
                Synchronisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Synchronisation automatique</Label>
                  <p className="text-sm text-muted-foreground">Mettre à jour le Sheet à chaque modification</p>
                </div>
                <Switch 
                  checked={config.syncEnabled} 
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, syncEnabled: checked }))} 
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dernière synchronisation</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {config.lastSync ? new Date(config.lastSync).toLocaleString('fr-CH') : 'Jamais'}
                  </p>
                </div>
                <Button onClick={handleSync} disabled={syncing || !config.connected} className="glow-button">
                  {syncing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Synchroniser maintenant
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Table className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-300">Google Sheets = Registre Officiel</p>
                  <p className="text-blue-700 dark:text-blue-400">
                    Le Sheet sert de source de vérité. Chaque incident validé sera automatiquement 
                    ajouté avec toutes les métadonnées : numéro, date, institution, type, gravité, 
                    faits, dysfonctionnement, score et niveau de confiance IA.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
