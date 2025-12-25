import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { useIncidentStore } from '@/stores/incidentStore';
import { calculateScore, getPriorityFromScore } from '@/config/appConfig';
import type { Proof, IncidentFormData } from '@/types/incident';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function NewIncident() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { config, addIncident, getNextNumero } = useIncidentStore();
  
  const [formData, setFormData] = useState<IncidentFormData>({
    dateIncident: new Date().toISOString().split('T')[0],
    institution: '',
    type: '',
    gravite: 'Moyenne',
    titre: '',
    faits: '',
    dysfonctionnement: '',
    transmisJP: false,
    preuves: []
  });

  const [newPreuve, setNewPreuve] = useState({
    type: 'document' as Proof['type'],
    label: '',
    url: ''
  });

  const score = calculateScore(
    formData.gravite,
    formData.type,
    formData.transmisJP,
    config.poidsGravite,
    config.poidsType
  );
  const priority = getPriorityFromScore(score);

  const updateField = <K extends keyof IncidentFormData>(
    field: K, 
    value: IncidentFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPreuve = () => {
    if (!newPreuve.label) return;
    
    const preuve: Proof = {
      id: crypto.randomUUID(),
      ...newPreuve
    };
    
    updateField('preuves', [...formData.preuves, preuve]);
    setNewPreuve({ type: 'document', label: '', url: '' });
  };

  const removePreuve = (id: string) => {
    updateField('preuves', formData.preuves.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.institution || !formData.type || !formData.titre) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }

    addIncident({
      dateIncident: formData.dateIncident,
      institution: formData.institution,
      type: formData.type,
      gravite: formData.gravite,
      statut: 'Ouvert',
      titre: formData.titre,
      faits: formData.faits,
      dysfonctionnement: formData.dysfonctionnement,
      transmisJP: formData.transmisJP,
      preuves: formData.preuves
    });

    toast({
      title: "Incident créé",
      description: `L'incident #${getNextNumero() - 1} a été enregistré.`
    });

    navigate('/incidents');
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        <PageHeader 
          title="Nouvel incident" 
          description={`Sera numéroté #${getNextNumero()}`}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classification</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateIncident">Date de l'incident *</Label>
                <Input
                  id="dateIncident"
                  type="date"
                  value={formData.dateIncident}
                  onChange={(e) => updateField('dateIncident', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">Institution *</Label>
                <Select 
                  value={formData.institution} 
                  onValueChange={(v) => updateField('institution', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {config.institutions.map(inst => (
                      <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type de dysfonctionnement *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => updateField('type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {config.types.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gravite">Gravité</Label>
                <Select 
                  value={formData.gravite} 
                  onValueChange={(v) => updateField('gravite', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.gravites.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <Switch
                    id="transmisJP"
                    checked={formData.transmisJP}
                    onCheckedChange={(v) => updateField('transmisJP', v)}
                  />
                  <Label htmlFor="transmisJP">Transmis au Juge de paix</Label>
                </div>
                <div className="text-sm">
                  Score calculé: <span className="font-bold">{score}</span> ({priority})
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contenu */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contenu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titre">Titre *</Label>
                <Input
                  id="titre"
                  value={formData.titre}
                  onChange={(e) => updateField('titre', e.target.value)}
                  placeholder="Titre descriptif de l'incident"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faits">Faits constatés</Label>
                <Textarea
                  id="faits"
                  value={formData.faits}
                  onChange={(e) => updateField('faits', e.target.value)}
                  placeholder="Description factuelle des événements..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dysfonctionnement">Dysfonctionnement</Label>
                <Textarea
                  id="dysfonctionnement"
                  value={formData.dysfonctionnement}
                  onChange={(e) => updateField('dysfonctionnement', e.target.value)}
                  placeholder="Nature du dysfonctionnement identifié..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preuves */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preuves ({formData.preuves.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Liste des preuves */}
              {formData.preuves.length > 0 && (
                <div className="space-y-2">
                  {formData.preuves.map((preuve) => (
                    <div 
                      key={preuve.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{preuve.label}</p>
                        <p className="text-xs text-muted-foreground capitalize">{preuve.type}</p>
                      </div>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        onClick={() => removePreuve(preuve.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Ajouter une preuve */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-lg border-2 border-dashed">
                <Select 
                  value={newPreuve.type} 
                  onValueChange={(v: Proof['type']) => setNewPreuve(p => ({ ...p, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="screenshot">Capture d'écran</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="link">Lien</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Libellé"
                  value={newPreuve.label}
                  onChange={(e) => setNewPreuve(p => ({ ...p, label: e.target.value }))}
                />

                <Input
                  placeholder="URL (optionnel)"
                  value={newPreuve.url}
                  onChange={(e) => setNewPreuve(p => ({ ...p, url: e.target.value }))}
                />

                <Button 
                  type="button" 
                  variant="outline"
                  onClick={addPreuve}
                  disabled={!newPreuve.label}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Annuler
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
