import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIncidentStore } from '@/stores/incidentStore';
import { toast } from 'sonner';

export default function EditIncident() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, updateIncident, loadFromSupabase, isLoading, config } = useIncidentStore();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    titre: '',
    dateIncident: '',
    institution: '',
    type: '',
    gravite: '',
    statut: '',
    priorite: 'moyen' as 'critique' | 'eleve' | 'moyen' | 'faible',
    faits: '',
    dysfonctionnement: ''
  });

  useEffect(() => {
    const load = async () => {
      await loadFromSupabase();
      setHasLoaded(true);
    };
    load();
  }, [loadFromSupabase]);

  const incident = incidents.find(i => i.id === id);

  useEffect(() => {
    if (incident) {
      setFormData({
        titre: incident.titre,
        dateIncident: incident.dateIncident,
        institution: incident.institution,
        type: incident.type,
        gravite: incident.gravite,
        statut: incident.statut,
        priorite: incident.priorite as 'critique' | 'eleve' | 'moyen' | 'faible',
        faits: incident.faits,
        dysfonctionnement: incident.dysfonctionnement
      });
    }
  }, [incident]);

  if (isLoading || !hasLoaded) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!incident) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Incident non trouvé</h2>
            <p className="text-sm text-muted-foreground mb-4">ID: {id}</p>
            <Button variant="outline" asChild>
              <Link to="/incidents">Retour à la liste</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateIncident(incident.id, formData);
      toast.success('Incident modifié avec succès');
      navigate(`/incidents/${incident.id}`);
    } catch (error) {
      toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="mb-4 md:mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-6">Modifier Incident #{incident.numero}</h1>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="titre">Titre</Label>
                <Input
                  id="titre"
                  value={formData.titre}
                  onChange={(e) => setFormData(prev => ({ ...prev, titre: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateIncident">Date de l'incident</Label>
                  <Input
                    id="dateIncident"
                    type="date"
                    value={formData.dateIncident}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateIncident: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="institution">Institution</Label>
                  <Select
                    value={formData.institution}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, institution: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.institutions.map((inst) => (
                        <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.types.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gravite">Gravité</Label>
                  <Select
                    value={formData.gravite}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, gravite: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.gravites.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="statut">Statut</Label>
                  <Select
                    value={formData.statut}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, statut: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.statuts.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priorite">Priorité</Label>
                  <Select
                    value={formData.priorite}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priorite: value as 'critique' | 'eleve' | 'moyen' | 'faible' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critique">Critique</SelectItem>
                      <SelectItem value="eleve">Élevée</SelectItem>
                      <SelectItem value="moyen">Moyenne</SelectItem>
                      <SelectItem value="faible">Faible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="faits">Faits constatés</Label>
                <Textarea
                  id="faits"
                  value={formData.faits}
                  onChange={(e) => setFormData(prev => ({ ...prev, faits: e.target.value }))}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="dysfonctionnement">Dysfonctionnement</Label>
                <Textarea
                  id="dysfonctionnement"
                  value={formData.dysfonctionnement}
                  onChange={(e) => setFormData(prev => ({ ...prev, dysfonctionnement: e.target.value }))}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
