import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Loader2, AlertTriangle, Lock, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useIncidentStore } from '@/stores/incidentStore';
import { canModifyIncident } from '@/mappers/incidents';
import { toast } from 'sonner';

export default function EditIncident() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, updateIncident, loadFromSupabase, isLoading, config } = useIncidentStore();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modificationReason, setModificationReason] = useState('');
  
  const [formData, setFormData] = useState({
    titre: '',
    dateIncident: '',
    institution: '',
    type: '',
    gravite: '',
    statut: '',
    priorite: 'moyen' as 'critique' | 'eleve' | 'moyen' | 'faible',
    faits: '',
    dysfonctionnement: '',
    analysisNotes: ''
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
        dysfonctionnement: incident.dysfonctionnement,
        analysisNotes: incident.analysisNotes || ''
      });
    }
  }, [incident]);

  // Check if incident can be modified
  const modifyCheck = incident ? canModifyIncident(incident) : { canModify: true };

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
    
    if (!modifyCheck.canModify) {
      toast.error(modifyCheck.reason);
      return;
    }

    setSaving(true);
    try {
      const result = await updateIncident(incident.id, formData, modificationReason || undefined);
      if (result.success) {
        toast.success('Incident modifié avec succès');
        navigate(`/incidents/${incident.id}`);
      } else {
        toast.error(result.error || 'Erreur lors de la modification');
      }
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

        <h1 className="text-2xl font-bold mb-4">Modifier Incident #{incident.numero}</h1>

        {/* Lock warning */}
        {!modifyCheck.canModify && (
          <Alert variant="destructive" className="mb-6">
            <Lock className="h-4 w-4" />
            <AlertTitle>Incident verrouillé</AlertTitle>
            <AlertDescription>{modifyCheck.reason}</AlertDescription>
          </Alert>
        )}

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
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                FAITS CONSTATÉS
              </CardTitle>
              <CardDescription>
                Éléments factuels et objectifs uniquement (dates, actions, documents). 
                Ces faits constituent la base probatoire du dossier.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="faits">Description factuelle</Label>
                <Textarea
                  id="faits"
                  value={formData.faits}
                  onChange={(e) => setFormData(prev => ({ ...prev, faits: e.target.value }))}
                  rows={4}
                  disabled={!modifyCheck.canModify}
                  placeholder="Décrire les faits de manière objective: dates, actions, documents reçus/envoyés..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                ANALYSE ET QUALIFICATION
              </CardTitle>
              <CardDescription>
                Interprétation juridique et qualification du dysfonctionnement.
                Cette section contient l'analyse, distincte des faits bruts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dysfonctionnement">Dysfonctionnement identifié</Label>
                <Textarea
                  id="dysfonctionnement"
                  value={formData.dysfonctionnement}
                  onChange={(e) => setFormData(prev => ({ ...prev, dysfonctionnement: e.target.value }))}
                  rows={4}
                  disabled={!modifyCheck.canModify}
                  placeholder="Qualification juridique du dysfonctionnement..."
                />
              </div>

              <div>
                <Label htmlFor="analysisNotes">Notes d'analyse IA (optionnel)</Label>
                <Textarea
                  id="analysisNotes"
                  value={formData.analysisNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, analysisNotes: e.target.value }))}
                  rows={3}
                  disabled={!modifyCheck.canModify}
                  placeholder="Notes d'analyse générées par l'IA..."
                  className="text-muted-foreground"
                />
              </div>
            </CardContent>
          </Card>

          {/* Modification reason for audit trail */}
          {modifyCheck.canModify && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Motif de modification (optionnel)</CardTitle>
                <CardDescription>
                  Ce motif sera enregistré dans l'historique des modifications pour traçabilité.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={modificationReason}
                  onChange={(e) => setModificationReason(e.target.value)}
                  rows={2}
                  placeholder="Ex: Correction suite à nouvelle information, rectification d'erreur de saisie..."
                />
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !modifyCheck.canModify}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : !modifyCheck.canModify ? (
                <Lock className="h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {modifyCheck.canModify ? 'Enregistrer' : 'Verrouillé'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
