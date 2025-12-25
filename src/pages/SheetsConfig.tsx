import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  Settings, 
  Check, 
  X, 
  RefreshCw, 
  ExternalLink,
  Link2,
  Clock,
  ArrowUpDown
} from 'lucide-react';

interface SheetsConfig {
  connected: boolean;
  spreadsheetId: string;
  sheetName: string;
  syncEnabled: boolean;
  lastSync?: string;
  columnMapping: {
    institution: string;
    type: string;
    gravite: string;
    statut: string;
    faits: string;
    dysfonctionnement: string;
    impact: string;
    preuves: string;
    score: string;
    confidence: string;
    gmailRefs: string;
  };
}

const defaultColumnMapping = {
  institution: 'A',
  type: 'B',
  gravite: 'C',
  statut: 'D',
  faits: 'E',
  dysfonctionnement: 'F',
  impact: 'G',
  preuves: 'H',
  score: 'I',
  confidence: 'J',
  gmailRefs: 'K'
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
        toast.success('Connexion au Google Sheet réussie');
      }
    } catch (error) {
      console.error('Sheets connection error:', error);
      toast.error('Erreur lors de la connexion au Google Sheet');
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
      
      toast.success(`${data?.rowsUpdated || 0} incidents synchronisés`);
      setConfig(prev => ({ ...prev, lastSync: new Date().toISOString() }));
    } catch (error) {
      console.error('Sheets sync error:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const updateColumnMapping = (key: keyof typeof defaultColumnMapping, value: string) => {
    setConfig(prev => ({
      ...prev,
      columnMapping: { ...prev.columnMapping, [key]: value.toUpperCase() }
    }));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row mesh-bg">
      <AppSidebar />
      
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Configuration Google Sheets</h1>
              <p className="text-muted-foreground mt-1">
                Synchronisez vos incidents avec un Google Sheet comme registre officiel
              </p>
            </div>
          </div>

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
                    {config.connected && (
                      <p className="text-sm text-muted-foreground">
                        Feuille : {config.sheetName}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleConnect}
                  disabled={loading || !config.spreadsheetId}
                  variant={config.connected ? 'outline' : 'default'}
                  className={!config.connected ? 'glow-button' : ''}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(config.columnMapping).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-sm capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <Input
                      value={value}
                      onChange={(e) => updateColumnMapping(key as keyof typeof defaultColumnMapping, e.target.value)}
                      className="w-20 uppercase"
                      maxLength={2}
                    />
                  </div>
                ))}
              </div>
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
                <div className="space-y-0.5">
                  <Label className="text-base">Synchronisation automatique</Label>
                  <p className="text-sm text-muted-foreground">
                    Mettre à jour le Sheet automatiquement à chaque modification d'incident
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

          {/* Info */}
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Table className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-300">
                    Google Sheets = Registre Officiel
                  </p>
                  <p className="text-blue-700 dark:text-blue-400">
                    Le Sheet sert de source de vérité. Chaque incident validé sera automatiquement 
                    ajouté avec toutes les métadonnées : institution, type, gravité, faits, 
                    dysfonctionnement, score, niveau de confiance IA, et références Gmail.
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
