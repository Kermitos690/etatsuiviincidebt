import { useState } from 'react';
import { Save, Plus, Trash2, RotateCcw } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIncidentStore } from '@/stores/incidentStore';
import { useToast } from '@/hooks/use-toast';
import { 
  DEFAULT_INSTITUTIONS, 
  DEFAULT_TYPES, 
  DEFAULT_STATUTS, 
  DEFAULT_GRAVITES,
  POIDS_GRAVITE,
  POIDS_TYPE 
} from '@/config/appConfig';

export default function Admin() {
  const { toast } = useToast();
  const { config, updateConfig } = useIncidentStore();
  
  const [googleSheetId, setGoogleSheetId] = useState(config.googleSheetId);
  const [institutions, setInstitutions] = useState(config.institutions);
  const [types, setTypes] = useState(config.types);
  const [statuts, setStatuts] = useState(config.statuts);
  const [gravites, setGravites] = useState(config.gravites);
  const [poidsType, setPoidsType] = useState(config.poidsType);
  const [poidsGravite, setPoidsGravite] = useState(config.poidsGravite);

  const [newInstitution, setNewInstitution] = useState('');
  const [newType, setNewType] = useState('');
  const [newStatut, setNewStatut] = useState('');

  const saveConfig = () => {
    updateConfig({
      googleSheetId,
      institutions,
      types,
      statuts,
      gravites,
      poidsType,
      poidsGravite
    });
    
    toast({ title: "Configuration sauvegardée" });
  };

  const resetToDefaults = () => {
    setInstitutions(DEFAULT_INSTITUTIONS);
    setTypes(DEFAULT_TYPES);
    setStatuts(DEFAULT_STATUTS);
    setGravites(DEFAULT_GRAVITES);
    setPoidsType(POIDS_TYPE);
    setPoidsGravite(POIDS_GRAVITE);
    
    toast({ title: "Valeurs par défaut restaurées" });
  };

  const addItem = (list: string[], setList: (v: string[]) => void, value: string, clear: () => void) => {
    if (value.trim() && !list.includes(value.trim())) {
      setList([...list, value.trim()]);
      clear();
    }
  };

  const removeItem = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        <PageHeader 
          title="Administration" 
          description="Configuration de l'application"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetToDefaults}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Défaut
              </Button>
              <Button onClick={saveConfig}>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </div>
          }
        />

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="listes">Listes</TabsTrigger>
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
          </TabsList>

          {/* Général */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Google Sheets</CardTitle>
                <CardDescription>
                  Configuration de la connexion Google Sheets (optionnel)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ID du Google Sheet</Label>
                  <Input
                    value={googleSheetId}
                    onChange={(e) => setGoogleSheetId(e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  />
                  <p className="text-xs text-muted-foreground">
                    L'ID se trouve dans l'URL du Google Sheet
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Listes */}
          <TabsContent value="listes" className="space-y-6">
            {/* Institutions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Institutions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newInstitution}
                    onChange={(e) => setNewInstitution(e.target.value)}
                    placeholder="Nouvelle institution"
                    onKeyDown={(e) => e.key === 'Enter' && addItem(institutions, setInstitutions, newInstitution, () => setNewInstitution(''))}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => addItem(institutions, setInstitutions, newInstitution, () => setNewInstitution(''))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {institutions.map((inst, i) => (
                    <div key={i} className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm">
                      {inst}
                      <button onClick={() => removeItem(institutions, setInstitutions, i)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Types de dysfonctionnement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="Nouveau type"
                    onKeyDown={(e) => e.key === 'Enter' && addItem(types, setTypes, newType, () => setNewType(''))}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => addItem(types, setTypes, newType, () => setNewType(''))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {types.map((t, i) => (
                    <div key={i} className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm">
                      {t}
                      <button onClick={() => removeItem(types, setTypes, i)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Statuts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statuts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newStatut}
                    onChange={(e) => setNewStatut(e.target.value)}
                    placeholder="Nouveau statut"
                    onKeyDown={(e) => e.key === 'Enter' && addItem(statuts, setStatuts, newStatut, () => setNewStatut(''))}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => addItem(statuts, setStatuts, newStatut, () => setNewStatut(''))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {statuts.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm">
                      {s}
                      <button onClick={() => removeItem(statuts, setStatuts, i)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scoring */}
          <TabsContent value="scoring" className="space-y-6">
            {/* Poids gravités */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Poids des gravités</CardTitle>
                <CardDescription>
                  Ces poids sont multipliés par 2 dans le calcul du score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gravites.map((g) => (
                    <div key={g} className="space-y-2">
                      <Label>{g}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={poidsGravite[g] || 1}
                        onChange={(e) => setPoidsGravite({
                          ...poidsGravite,
                          [g]: parseInt(e.target.value) || 1
                        })}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Poids types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Poids des types</CardTitle>
                <CardDescription>
                  Ces poids sont ajoutés au score de base
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {types.map((t) => (
                    <div key={t} className="space-y-2">
                      <Label className="text-xs">{t}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={poidsType[t] || 3}
                        onChange={(e) => setPoidsType({
                          ...poidsType,
                          [t]: parseInt(e.target.value) || 3
                        })}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Formule */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm">
                  <strong>Formule de scoring:</strong> (Poids Gravité × 2) + Poids Type + Pénalité
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Pénalité de +3 si non transmis JP et gravité Haute ou Critique
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
